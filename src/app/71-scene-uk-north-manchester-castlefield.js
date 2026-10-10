/* ============================================================
   COMPOSED SCENES (v2, by hand) uk-north / Manchester, Castlefield: four views of the canal basin, its viaducts and its fort.
   docs/dev/SCENE_ENGINE_V2.md. The ground plans and the in-perspective objects (viaducts, Merchants' Bridge, narrowboats,
   the Roman gate, the shipping holes, the frames) are SCENE_MCF in 70-scene-lib-manchester-castlefield.js; the warehouses
   and the towers are the engine's generated buildings on real-sized footprints (red-brick 'mill', 'modern-glass').
   Registered by 72-anim-pack-uk-north-manchester-castlefield.js.

     1 basin       Slate Wharf, looking east down the basin: boats on the north quay, Merchants' Bridge, the two viaducts
                   striding over the water, Beetham Tower and the Deansgate towers beyond
     2 viaducts    the towpath at Castlefield Junction, looking west-south-west under three viaducts, layer on layer
     3 warehouses  from the crown of Merchants' Bridge up the reach to the Middle Warehouse and Merchants' Warehouse
     4 fort        Castlefield Arena's lawn, the reconstructed north gate of Mamucium, the tram viaduct striding past behind it
   The trams and trains run on timed pixel paths along the deck (real speed, a scale by row), drawn between the back and the
   front of their viaduct (the front is one depth band nearer), so they pass between the girders and behind the parapets.
   PURE: functions only; each builds its scene data once, lazily.
     https://www.castlefield.org.uk
   ============================================================ */
/** The pieces of a view drawn from its camera (pinned pixel placements, their layer from their depth) and its trams and trains. */
function _sceneMcfPieces(view) {
  const M = SCENE_MCF, V = M.views[view], c = V.camera, place = [], actors = [];
  const r1 = (v) => Math.round(v * 10) / 10, r3 = (v) => Math.round(v * 1000) / 1000;
  const BANDS = ['horizon', 'far', 'mid', 'near', 'fore'];
  const layerOf = (d) => (d < 15 ? 'fore' : d < 50 ? 'near' : d < 200 ? 'mid' : d < 800 ? 'far' : 'horizon');
  const nearer = (b) => BANDS[Math.min(BANDS.length - 1, BANDS.indexOf(b) + 1)];
  M.via.forEach((S, i) => {
    if (S.view !== view) return;
    const p = V.proj(S.anchor[0], S.anchor[1], S.base), back = S.layer || layerOf(Math.hypot(S.anchor[0], S.anchor[1]));
    if (p[0] < -2400 || p[0] > 4000) return;
    const tint = ['#5a4636', Math.round((i * 37 % 7) / 100 * 100) / 100];
    place.push({ obj: 'structure.mcf-railbridge', variant: i, x: r1(p[0]), y: r1(p[1]), s: 1, pin: true, layer: back, shadow: false, anim: false, reflect: !!V.water, tint });
    place.push({ obj: 'structure.mcf-railbridge-front', variant: i, x: r1(p[0]), y: r1(p[1]), s: 1, pin: true, layer: nearer(back), shadow: false, anim: false, reflect: !!V.water, tint });
    if (S.type !== 'arc') place.push({ obj: 'structure.mcf-railbridge-pier', variant: i, x: r1(p[0]), y: r1(p[1]), s: 1, pin: true, layer: nearer(back), shadow: false, anim: false, reflect: !!V.water, tint });
  });
  M.boats.forEach((B, i) => {
    if (B.view !== view) return;
    const p = V.proj(B.x, B.d, c.water);
    place.push({ obj: 'boat.mcf-narrowboat', variant: i, x: r1(p[0]), y: r1(p[1]), s: 1, pin: true, layer: layerOf(B.d), shadow: false, anim: B.smoke ? undefined : false, reflect: true });
  });
  M.bridges.forEach((B, i) => {
    if (B.view !== view) return;
    const L = Math.hypot(B.B[0] - B.A[0], B.B[1] - B.A[1]), t = [(B.B[0] - B.A[0]) / L, (B.B[1] - B.A[1]) / L], n = [t[1], -t[0]];
    const mx = (B.A[0] + B.B[0]) / 2 + n[0] * B.bow * 0.7, md = (B.A[1] + B.B[1]) / 2 + n[1] * B.bow * 0.7, p = V.proj(mx, md, c.water);
    place.push({ obj: 'structure.mcf-merchants-bridge', variant: i, x: r1(p[0]), y: r1(p[1]), s: 1, pin: true, layer: 'near', shadow: false, anim: false, reflect: true });
  });
  M.holes.forEach((Hh, i) => {
    if (Hh.view !== view) return;
    const p = V.proj(Hh.x, Hh.d, c.water);
    // over the warehouse's face: one band nearer than the building (whose depth sort is by its nearest corner)
    place.push({ obj: 'structure.mcf-shipping-hole', variant: i, x: r1(p[0]), y: r1(p[1]), s: 1, pin: true, layer: 'near', shadow: false, anim: false, reflect: true });
  });
  M.gates.forEach((Gt, i) => {
    if (Gt.view !== view) return;
    const p = V.proj(Gt.at[0], Gt.at[1], 0);
    place.push({ obj: 'landmark.mcf-roman-gate', variant: i, x: r1(p[0]), y: r1(p[1]), s: 1, pin: true, layer: layerOf(Math.hypot(Gt.at[0], Gt.at[1])), shadow: false, anim: false, subject: true });
  });
  (M.setts || []).forEach((S, i) => {
    if (S.view !== view) return;
    const p = V.proj(0, S.d1, 0);
    place.push({ obj: 'ground.mcf-setts', variant: i, x: r1(p[0]), y: r1(p[1]), s: 1, pin: true, layer: 'fore', shadow: false, anim: false, reflect: false });
  });
  M.frames.forEach((F, i) => { if (F.view === view) place.push({ obj: 'structure.mcf-frame', variant: i, x: 0, y: 900, s: 1, pin: true, layer: 'front', shadow: false, anim: false, reflect: false }); });
  /** A tram or train along a viaduct (timed pixel path: real speed, a scale by row, a wait out of the frame between runs). */
  const runner = (obj, type, opt) => {
    const segs = M.via.filter(S => S.view === view && S.type === type);
    if (!segs.length) return;
    const A = segs[0].spans[0].a, last = segs[segs.length - 1].spans, B = last[last.length - 1].b, H = segs[0].H;
    const L = Math.hypot(B[0] - A[0], B[1] - A[1]), t = [(B[0] - A[0]) / L, (B[1] - A[1]) / L], n = [t[1], -t[0]];
    const realH = obj === 'rail.train' ? 3.8 : 3.5, spriteH = obj === 'rail.train' ? 43 : 125, u = (opt.u || 0) * segs[0].w / 2, step = opt.step || 24;
    const pts = [], tab = [];
    for (let s = opt.s0 || 0; s <= (opt.s1 || L) + 0.01; s += step) {
      const x = A[0] + t[0] * s + n[0] * u, d = A[1] + t[1] * s + n[1] * u;
      if (d < 6) continue;
      const p = V.proj(x, d, H);
      pts.push([r1(p[0]), r1(p[1])]);
      tab.push([r1(p[1]), r3(V.f / d * realH / spriteH)]);
    }
    if (pts.length < 2) return;
    if (opt.back) pts.reverse();
    tab.sort((a, b) => a[0] - b[0]);
    const path = pts.map((p, i) => (i ? [p[0], p[1], 0, 0, Math.round(step / opt.speed * 10) / 10] : [p[0], p[1], 0]));
    path[path.length - 1][2] = opt.wait || 40;
    actors.push({ obj, layer: opt.layer || 'mid', path, speed: 60, loop: 'loop', s: 1, sByY: tab, variant: opt.variant || 0, seed: opt.seed, offset: opt.offset || 0 });
  };
  return { place, actors, runner, layerOf };
}

/** The generated buildings of a list [[foot, style, storeys, seed, extra]]. */
function _sceneMcfBuildings(list) {
  return list.map(([foot, style, storeys, seed, extra]) => Object.assign({ foot, style, storeys, seed }, extra || {}));
}
const _SCENE_MCF_KITS = ['urban', 'people', 'water', 'birds', 'temperate'];
/**
 * Add the hand-placed movers of a view as behaviour presets (sceneBehave, 70-scene-lib-behaviours.js): routes in ground metres,
 * true scale from depth, eased starts and stops, pauses, kept on their water or walkable ground and round every blocker.
 * Each entry: { kind: 'one' | 'pair' | 'dog', ...spec }.
 */
function _sceneMcfBehave(data, view, list) {
  if (typeof sceneBehave === 'undefined') return data;
  // the perspective narrowboats are pixel pieces: their screen box read back to the ground swallows the whole quay beside a
  // boat seen end-on, so the routes avoid each boat's true footprint (its hull outline along its heading) instead
  const D2R = Math.PI / 180, hulls = SCENE_MCF.boats.filter(b => b.view === view).map(b => {
    const t = [Math.sin(b.hd * D2R), Math.cos(b.hd * D2R)], n = [t[1], -t[0]], w = b.trip ? 1.7 : 1.15, L = b.len / 2;
    const c = (s, u) => [b.x + t[0] * s + n[0] * u, b.d + t[1] * s + n[1] * u];
    return { poly: [c(-L, -w), c(L, -w), c(L, w), c(-L, w)], obj: 'boat.mcf-narrowboat' };
  });
  // placed people at their true height (the default size factor draws a seated or standing figure a third too tall)
  // (people sitting, and children, are drawn at an adult's height unless their factor says otherwise)
  const KP = { 'person.bench-sitter': 0.8, 'person.bench-reader': 0.8, 'person.picnicker': 0.58, 'person.child-ball': 0.66, 'person.child-jumping': 0.68, 'person.child-scooter': 0.7, 'person.cafe-goer': 0.82 };
  data.place.forEach((p, i) => { if (/^person\./.test(p.obj) && p.k == null && !p.pin) p.k = KP[p.obj] || 1; if (p.obj === 'person.cafe-goer' && p.variant == null) p.variant = i % 4; });
  const D = Object.assign({}, data, { place: data.place.filter(p => !/^boat\.mcf-|^structure\.mcf-/.test(p.obj)) });
  for (const e of list) {
    const fn = e.kind === 'pair' ? sceneBehave.pair : e.kind === 'dog' ? sceneBehave.walkWithDog : sceneBehave.actors;
    const spec = Object.assign({}, e, { avoid: hulls.concat(e.avoid || []) }); delete spec.kind;
    for (const a of fn(D, spec)) { delete a.$behave; data.actors.push(a); }
  }
  return data;
}
/** The deck of Merchants' Bridge as a walkable 'bridge' strip over the water (ground metres), and points along its middle. */
function _sceneMcfDeck(B, u0, u1, n, side) {
  const L = Math.hypot(B.B[0] - B.A[0], B.B[1] - B.A[1]), t = [(B.B[0] - B.A[0]) / L, (B.B[1] - B.A[1]) / L], nn = [t[1], -t[0]];
  const at = (u, off) => { const bw = B.bow * 4 * u * (1 - u); return [Math.round((B.A[0] + t[0] * u * L + nn[0] * (bw + off)) * 100) / 100, Math.round((B.A[1] + t[1] * u * L + nn[1] * (bw + off)) * 100) / 100]; };
  const pts = []; for (let i = 0; i <= n; i++) pts.push(at(u0 + (u1 - u0) * i / n, side || 0));
  const poly = []; for (let i = 0; i <= 12; i++) poly.push(at(i / 12, -B.w / 2)); for (let i = 12; i >= 0; i--) poly.push(at(i / 12, B.w / 2));
  return { pts, poly };
}

/* ---------- 1: the basin from Slate Wharf ---------- */
function sceneUkNorthMcfBasin() {
  const M = SCENE_MCF, V = M.views.basin, cam = Object.assign({}, V.camera);
  const K = _sceneMcfPieces('basin'), place = K.place, actors = K.actors;
  K.runner('vehicle.metrolink-m5000', 'lat', { s0: -10, s1: 330, speed: 11, wait: 34, u: -0.4, seed: 101, offset: 0.15 });
  K.runner('vehicle.metrolink-m5000', 'lat', { s0: -10, s1: 330, speed: 11, wait: 52, u: 0.4, back: true, variant: 0, seed: 102, offset: 0.6 });
  K.runner('rail.train', 'arc', { s0: 0, s1: 230, speed: 14, wait: 70, seed: 103, offset: 0.35 });
  const water = [{ id: 'basin', kind: 'canal', poly: V.water, edge: 'quay', ripple: 0.14, mirror: 0.85, rings: true, base: ['#7e9a94', '#4e6e66', '#2e4a44'], clarity: 0 }];
  const surfaces = [
    { id: 'land', kind: 'plaza', rest: true },
    { id: 'quay-n', kind: 'plaza', poly: [[-15, 5], [-25, 32], [-29, 70], [-30, 120], [-27, 180], [-20, 250], [-34, 250], [-40, 180], [-38, 120], [-36, 70], [-32, 32], [-20, 5]] },
    { id: 'wharf', kind: 'plaza', poly: [[-20, 5], [20, 5], [20, 8.8], [-20, 8.8]] },
    { id: 'tow-s', kind: 'towpath', poly: [[12, 8.4], [21, 32], [25, 70], [24, 120], [19, 180], [12, 250], [15.5, 250], [22.5, 180], [27.5, 120], [28.5, 70], [24.6, 32], [16, 8.4]] },
    { id: 'green-s', kind: 'park', poly: [[16, 6], [24.8, 32], [28.6, 70], [28, 112], [70, 112], [70, 6]] },
  ];
  const buildings = _sceneMcfBuildings([
    [[[-35, 22], [-35, 58], [-58, 58], [-58, 22]], 'mill', 5, 2],
    [[[-36.5, 64], [-36.5, 104], [-62, 104], [-62, 64]], 'mill', 6, 4],
    [[[-37, 110], [-37, 148], [-62, 148], [-62, 110]], 'mill', 4, 11],
    [[[-39, 154], [-39, 186], [-64, 186], [-64, 154]], 'modern-glass', 6, 12],
    [[[62, 262], [62, 300], [96, 300], [96, 262]], 'modern-glass', 12, 7],
    [[[-44, 740], [-18, 740], [-18, 766], [-44, 766]], 'modern-glass', 40, 31],
    [[[-8, 772], [16, 772], [16, 796], [-8, 796]], 'modern-glass', 34, 32],
    [[[24, 752], [48, 752], [48, 776], [24, 776]], 'modern-glass', 40, 33],
  ]);
  place.push({ obj: 'landmark.beetham-tower-blade', at: [-150, 560], fix: true, anim: false });
  // plane trees in pits along the north quay, a plane and a birch on the green before the viaduct
  for (const [x, d, k, f, t] of [[-32.5, 60, 0.95, false, 0.04], [-34.4, 98, 1.05, true, 0.1], [-35.4, 140, 0.9, false, 0]]) place.push({ obj: 'tree.plane-avenue', at: [x, d], k, variant: 0, pit: true, anim: false, flip: f, tint: ['#6a6a3a', t] });
  place.push({ obj: 'tree.plane-avenue', at: [27, 40], k: 0.8, variant: 0, anim: false, flip: true }, { obj: 'tree.bank-alder', at: [31, 60], k: 0.85, variant: 2, anim: false });
  // the quays: heritage lamps, mooring bollards, a bench and its reader, people at the bar tables under the warehouses
  place.push({ obj: 'street.lamppost', at: [-4.9, 7.6], variant: 1 }, { obj: 'street.lamppost', at: [-27.4, 44], variant: 1 }, { obj: 'street.lamppost', at: [-30.6, 102], variant: 1 }, { obj: 'street.lamppost', at: [23, 52], variant: 1 });
  for (const [x, d, v] of [[-24.2, 30, 3], [-26.4, 50, 3], [-28.6, 72, 3]]) place.push({ obj: 'street.bollard', at: [x, d], variant: v, anim: false });
  place.push({ obj: 'street.bench', at: [-34, 70], face: 'right' }, { obj: 'person.bench-reader', at: [-34, 70.05], face: 'right' });
  place.push({ obj: 'person.phone-idler', at: [-27.2, 54] }, { obj: 'person.cafe-goer', at: [-32.2, 41.4], flip: true, variant: 1 }, { obj: 'person.cafe-goer', at: [-32.8, 47], variant: 2 });
  place.push({ obj: 'street.mqn-parasol', at: [-33.2, 48.4], variant: 0 }, { obj: 'street.mcf-litter-bin', at: [-26.9, 36.5], variant: 0 });
  place.push({ obj: 'person.angler', at: [20.2, 30], face: 'left' }, { obj: 'person.phone-idler', at: [23.4, 34] }, { obj: 'person.photographer', at: [-31.4, 84], face: 'right' });
  // Slate Wharf itself: the camera stands two strides from the coping (a narrow strip of setts, so the water and its
  // reflections fill the lower frame): the coping's lifebuoy, a planter, pigeons on the setts
  place.push({ obj: 'street.mqn-lifebuoy', at: [-4.5, 8.1] }, { obj: 'street.mqn-planter-grass', at: [4.4, 6.4] });
  for (const [x, d, v, f, k] of [[-0.9, 6.5, 0, false, 0.9], [0.4, 7.4, 1, true, 1.1], [-1.6, 7.2, 1, false, 0.85], [1, 6.2, 0, true, 1]]) place.push({ obj: 'bird.pigeon-feral', at: [x, d], variant: v, flip: f, k, anim: false });
  // people stopped on Merchants' Bridge (its deck is above the eye, so they are pinned at the deck's height; walkers there
  // would read to the motion lint as feet above the horizon): a photographer, someone on the phone, a pair at the rail
  { const B = M.bridges[0];
    for (const [u, off, o, f] of [[0.3, -0.9, 'person.photographer', true], [0.47, -0.9, 'person.phone-idler', false], [0.62, -0.9, 'person.phone-idler', true]]) {
      const q = _sceneMcfDeck(B, u, u, 1, off).pts[0], dd = q[1], hh = B.deck + B.rise * 4 * u * (1 - u), P = V.proj(q[0], dd, hh);
      const s = typeof sceneMoverScale === 'function' ? sceneMoverScale(o, 1, V.f / dd) : 0.3;
      place.push({ obj: o, x: Math.round(P[0] * 10) / 10, y: Math.round(P[1] * 10) / 10, s: Math.round(s * 1000) / 1000, pin: true, layer: 'fore', flip: f, shadow: false, variant: u > 0.5 ? 3 : 1 });
    } }
  place.push({ obj: 'water.fish-ring', at: [6, 26], k: 1.4, anim: { flicker: { period: 7.1 } } });
  actors.push({ obj: 'boat.narrowboat', ground: [[-16, 150], [12, 158]], speedM: 0.9, loop: 'pingpong', seed: 117, offset: 0.4, floats: true });
  // on the water: a paddleboarder and a kayaker from the basin's water-sports club, out and back along the basin
  actors.push({ obj: 'boat.narrowboat', ground: [[-8, 104], [6, 80], [5, 62]], speedM: 0.8, loop: 'pingpong', seed: 110, offset: 0.75, floats: true });
  actors.push({ obj: 'person.paddleboarder', ground: [[-8, 34], [4, 52], [-2, 78]], speedM: 0.7, loop: 'pingpong', seed: 108, offset: 0.1, floats: true });
  actors.push({ obj: 'person.kayaker', ground: [[10, 60], [-6, 70], [-12, 96]], speedM: 1.0, loop: 'pingpong', seed: 109, offset: 0.6, floats: true });
  const scatter = [
    { obj: { 'plant.grass': 4, 'plant.grass-long': 2, 'plant.shrub': 1, 'plant.daisies': 1 }, on: ['green-s'], d: [10, 110], n: 42, minGap: 1.2, dist: 'screen', cluster: { centres: 12, spread: 7 }, seed: 121, anim: false, k: [0.7, 1.35], tint: { col: '#8a8a40', k: [0, 0.14] } },
    { obj: { 'plant.planter': 2, 'plant.shrub': 1 }, on: ['quay-n'], d: [30, 160], n: 9, dist: 'ground', cluster: { centres: 6, spread: 6 }, seed: 122, anim: false, k: [0.8, 1.1], tint: { col: '#6a5a3a', k: [0, 0.12] } },
    { obj: { 'plant.grass': 3, 'plant.daisies': 1 }, on: ['tow-s'], d: [12, 90], n: 24, dist: 'ground', cluster: { centres: 6, spread: 4 }, seed: 123, anim: false, k: [0.7, 1], tint: { col: '#8a8a40', k: [0, 0.12] } },
    { obj: { 'ground.leaves': 2, 'ground.leaf-litter': 2 }, on: ['quay-n'], d: [14, 60], n: 18, tint: { col: '#8a5a2a', k: [0, 0.16] }, dist: 'ground', cluster: { centres: 7, spread: 2.5 }, seed: 124, anim: false, k: [0.8, 1.3] },
  ];
  place.push({ obj: 'plant.mcf-plane-bough', x: 1600, y: -10, s: 1, pin: true, layer: 'front', shadow: false, flip: true, variant: 0 });
  const data = {
    v: 2, id: 'castlefield-basin', view: { lat: cam.lat, lon: cam.lon }, camera: cam,
    at: 'afternoon', season: 'auto', setting: 'urban', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season', signage: false,
    kits: _SCENE_MCF_KITS,
    sky: { stars: 120, clouds: { n: 4, y: [40, 280], speed: 5 }, sunR: 24, moonR: 18 },
    surfaces, water, buildings, place, scatter, actors,
    flocks: [{ obj: 'bird.gull', n: 4, area: [200, 80, 1300, 260], speed: 26, s: 0.32, seed: 131, layer: 'mid' }],
    flows: [
      { id: 'quays', kind: 'walk', on: ['quay-n', 'tow-s'], lanes: [{ path: [[-29.6, 48], [-31.2, 70], [-32.2, 100], [-30.5, 150]], dir: 1 }, { path: [[19, 22], [23.2, 40], [26.4, 70], [26, 110], [21, 170]], dir: 1 }, { path: [[32, 66], [40, 90], [52, 118]], dir: 1 }],
        density: 3, profile: 'town', mix: { 'person.walker': 4, 'person.couple': 2, 'person.dog-walker': 1, 'person.student': 1, 'person.shopper': 1 }, both: true, max: 12, seed: 141 },
      { id: 'cycles', kind: 'cycle', on: 'tow-s', lanes: [{ path: [[20.4, 24], [24.2, 40], [27.4, 70], [27, 110]], dir: 1 }], density: 0.5, profile: 'commuter', mix: { 'person.cyclist': 1 }, max: 2, seed: 142 },
    ],
  };
  // the movers by behaviour: a dog walker and a chatting pair
  // on the north quay, the water birds
  return _sceneMcfBehave(data, 'basin', [
    { kind: 'dog', route: [[-29.2, 40], [-31, 60], [-32.4, 90], [-33, 120]], seed: 106, offset: 0.3 },
    { kind: 'pair', obj: 'person.walker', route: [[-32.6, 112], [-32, 84], [-30.6, 58], [-29.4, 42]], seed: 107, offset: 0.55, variant: 3 },
    { kind: 'one', obj: 'bird.goose', preset: 'goose-swim', route: [[-3, 21], [2, 19.6], [6, 22]], seed: 111 },
    { kind: 'one', obj: 'bird.goose', preset: 'goose-swim', route: [[-2, 23.6], [3, 22], [7, 24.4]], variant: 1, seed: 112, offset: 0.2 },
    { kind: 'one', obj: 'bird.mallard', preset: 'duck', route: [[-9, 19], [-5, 18.4], [-7, 22]], acts: ['look', 'preen'], k: 1.42, seed: 113 },
    { kind: 'one', obj: 'bird.mallard', preset: 'duck', route: [[10, 22], [6, 25], [9, 28]], acts: ['look', 'preen'], k: 1.42, variant: 1, seed: 114, offset: 0.4 },
    { kind: 'one', obj: 'bird.swan', preset: 'swan', route: [[-10, 44], [2, 40], [12, 46]], seed: 115 },
    { kind: 'one', obj: 'bird.swan', preset: 'swan', route: [[-9, 48], [3, 44], [13, 50]], seed: 116, offset: 0.08 },
    { kind: 'one', obj: 'bird.coot', preset: 'coot', route: [[14, 34], [8, 38], [12, 42]], acts: ['look'], k: 1.42, seed: 118 },
    { kind: 'one', obj: 'bird.coot', preset: 'coot', route: [[-14, 60], [-6, 64]], acts: ['look'], k: 1.42, seed: 119, offset: 0.5 },
  ]);
}

/* ---------- 2: under the viaducts at Castlefield Junction ---------- */
function sceneUkNorthMcfViaducts() {
  const M = SCENE_MCF, V = M.views.viaducts, cam = Object.assign({}, V.camera);
  const K = _sceneMcfPieces('viaducts'), place = K.place, actors = K.actors;
  K.runner('vehicle.metrolink-m5000', 'lat', { s0: 0, s1: 165, speed: 10, wait: 30, u: -0.4, seed: 201, offset: 0.1, layer: 'mid', step: 10 });
  K.runner('vehicle.metrolink-m5000', 'lat', { s0: 0, s1: 165, speed: 10, wait: 44, u: 0.4, back: true, variant: 1, seed: 202, offset: 0.55, layer: 'mid', step: 10 });
  K.runner('rail.train', 'arc', { s0: 0, s1: 190, speed: 13, wait: 60, seed: 203, offset: 0.3, layer: 'mid', step: 14 });
  const water = [{ id: 'cut', kind: 'canal', poly: V.water, edge: 'quay', ripple: 0.12, mirror: 0.88, rings: true, base: ['#7a9690', '#4a6a62', '#2a443e'], clarity: 0 }];
  const surfaces = [
    { id: 'land', kind: 'plaza', rest: true },
    { id: 'tow', kind: 'towpath', poly: [[6, 2], [6.2, 30], [5.6, 60], [3.5, 100], [-2, 150], [-12, 210], [-8, 210], [2, 150], [7.5, 100], [9.6, 60], [10.2, 30], [10, 2]] },
    { id: 'bank-r', kind: 'verge', poly: [[10, 2], [10.2, 30], [9.6, 60], [7.5, 100], [2, 150], [12, 150], [16, 100], [24, 60], [28, 2]] },
    { id: 'square', kind: 'plaza', poly: [[-5.5, 2], [-6, 30], [-7, 60], [-10, 100], [-16, 150], [-60, 150], [-60, 2]] },
    { id: 'lawn-l', kind: 'park', poly: [[-14, 30], [-16, 56], [-40, 56], [-40, 30]] },
  ];
  const buildings = _sceneMcfBuildings([
    [[[-46, 140], [-20, 150], [-30, 180], [-56, 170]], 'mill', 5, 17],
    [[[22, 150], [48, 150], [48, 176], [22, 176]], 'mill', 4, 19],
    [[[-60, 300], [-30, 300], [-30, 330], [-60, 330]], 'modern-glass', 14, 43],
    [[[-10, 420], [20, 420], [20, 450], [-10, 450]], 'modern-glass', 18, 44],
    [[[30, 380], [56, 380], [56, 406], [30, 406]], 'modern-glass', 11, 45],
  ]);
  for (const [x, d, k, v, o, f] of [[-22, 40, 0.75, 0, 'tree.plane-avenue', false], [14, 30, 0.85, 1, 'tree.bank-birch', true], [13, 52, 0.7, 0, 'tree.bank-willow', false], [10, 124, 0.9, 1, 'tree.bank-alder', true], [-20, 122, 0.9, 0, 'tree.bank-oak', true], [16, 92, 0.85, 0, 'tree.plane-avenue', true]]) place.push({ obj: o, at: [x, d], k, variant: v, anim: false, flip: f, pit: x < 0 });
  place.push({ obj: 'street.lamppost', at: [10.6, 18], variant: 1 }, { obj: 'street.lamppost', at: [-7.5, 20], variant: 1 }, { obj: 'street.lamppost', at: [10.4, 40], variant: 1 }, { obj: 'street.lamppost', at: [-8.4, 46], variant: 1 });
  place.push({ obj: 'street.bench', at: [-9, 17], face: 'right' }, { obj: 'person.bench-sitter', at: [-9, 17.05], face: 'right' }, { obj: 'person.angler', at: [6.7, 24], face: 'left' });
  place.push({ obj: 'person.child-scooter', at: [-15, 36] }, { obj: 'person.photographer', at: [-26, 52], face: 'away' }, { obj: 'person.phone-idler', at: [-12.5, 30], face: 'right' });
  // the square under the arches: bins, cycle stands, planters, bar tables and their drinkers by the wall, pigeons
  place.push({ obj: 'street.mcf-litter-bin', at: [-6.6, 11.2], variant: 1 }, { obj: 'street.mqn-bike-hoop', at: [-7.4, 13.6], variant: 0 }, { obj: 'street.mqn-bike-hoop', at: [-8.2, 15], variant: 2 });
  place.push({ obj: 'street.mqn-planter-grass', at: [-6.6, 24] }, { obj: 'street.mqn-parasol', at: [-19, 24], variant: 1 }, { obj: 'street.mqn-parasol', at: [-23, 27], variant: 0 });
  for (const [x, d, f] of [[-18.2, 23.4, false], [-19.8, 24.6, true], [-22.2, 26.4, false], [-23.8, 27.6, true]]) place.push({ obj: 'person.cafe-goer', at: [x, d], flip: f });
  place.push({ obj: 'street.mcf-litter-bin', at: [10.8, 30], variant: 0 }, { obj: 'street.mqn-lifebuoy', at: [10.6, 52] });
  for (const [x, d, v, f] of [[-6.2, 7.8, 0, false], [-5.9, 9.2, 2, true], [6.9, 8.6, 1, false], [7.4, 10.2, 3, true], [-7.2, 10.2, 4, false]]) place.push({ obj: 'bird.pigeon-feral', at: [x, d], variant: v, flip: f, k: 0.9 + (v % 3) * 0.08, anim: false });
  place.push({ obj: 'water.fish-ring', at: [1, 18], k: 1.2, anim: { flicker: { period: 6.6 } } });
  const scatter = [
    { obj: { 'plant.grass': 3, 'plant.grass-long': 3, 'plant.wildflowers': 1, 'plant.shrub': 1 }, on: ['bank-r'], d: [6, 150], n: 80, dist: 'screen', cluster: { centres: 16, spread: 7 }, seed: 231, anim: false, k: [0.6, 1.35], tint: { col: '#8a8a40', k: [0, 0.14] } },
    { obj: { 'plant.grass': 4, 'plant.daisies': 1, 'plant.shrub': 1 }, on: ['lawn-l'], d: [28, 60], n: 40, dist: 'screen', cluster: { centres: 5, spread: 4 }, seed: 232, anim: false, tint: { col: '#8a8a40', k: [0, 0.12] } },
    { obj: { 'plant.grass': 2, 'plant.grass-long': 1, 'ground.leaves': 1, 'ground.leaf-litter': 1 }, on: ['tow', 'square'], d: [6, 60], n: 64, dist: 'ground', cluster: { centres: 8, spread: 3 }, seed: 233, anim: false, k: [0.7, 1], tint: { col: '#8a8a40', k: [0, 0.12] } },
    { obj: { 'plant.planter': 2, 'plant.shrub': 1 }, on: ['square'], d: [10, 60], n: 10, dist: 'ground', cluster: { centres: 4, spread: 4 }, seed: 234, anim: false, k: [0.8, 1.1] },
  ];
  place.push({ obj: 'plant.mcf-plane-bough', x: 0, y: -10, s: 1, pin: true, layer: 'front', shadow: false, variant: 1 });
  const data = {
    v: 2, id: 'castlefield-viaducts', view: { lat: cam.lat, lon: cam.lon }, camera: cam,
    at: 'afternoon', season: 'auto', setting: 'urban', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season', signage: false,
    kits: _SCENE_MCF_KITS,
    sky: { stars: 120, clouds: { n: 4, y: [30, 200], speed: 5 }, sunR: 24, moonR: 18 },
    surfaces, water, buildings, place, scatter, actors,
    flocks: [{ obj: 'bird.pigeon', n: 5, area: [300, 40, 1200, 180], speed: 34, s: 0.3, seed: 241, layer: 'mid' }],
    flows: [
      { id: 'walkers', kind: 'walk', on: ['tow', 'square'], lanes: [{ path: [[8, 14], [8.1, 30], [7.6, 60], [5.5, 100], [0, 150]], dir: 1 }, { path: [[-8.4, 26], [-10.4, 40], [-12, 70], [-16, 110]], dir: 1 }, { path: [[-40, 36], [-20, 34], [-9, 33]], dir: 1 }],
        density: 3, profile: 'town', mix: { 'person.walker': 4, 'person.dog-walker': 2, 'person.jogger': 1, 'person.student': 1, 'person.commuter': 1 }, both: true, max: 12, seed: 251 },
      { id: 'cycles', kind: 'cycle', on: 'tow', lanes: [{ path: [[8.6, 16], [8.7, 30], [8.2, 60], [6.2, 100]], dir: 1 }], density: 0.5, profile: 'commuter', mix: { 'person.cyclist': 1 }, max: 2, seed: 252 },
    ],
  };
  // the movers by behaviour: the towpath's walkers (a dog walker, a brisk commuter, an elderly stroller), a pair chatting
  // across the square, the water birds a body length off the boats and the quays
  return _sceneMcfBehave(data, 'viaducts', [
    { kind: 'dog', route: [[7.8, 16], [8, 34], [7.4, 62], [5.2, 100]], seed: 261, offset: 0.15 },
    { kind: 'one', obj: 'person.walker', preset: 'brisk', variant: 4, route: [[8.4, 96], [8.8, 60], [9, 30], [9, 15]], seed: 262, offset: 0.5 },
    { kind: 'one', obj: 'person.elderly-walker', preset: 'elderly', route: [[-9.6, 40], [-9, 30], [-8.6, 22]], seed: 263, offset: 0.3 },
    { kind: 'pair', obj: 'person.walker', route: [[-30, 40], [-22, 36], [-14, 33]], seed: 264, offset: 0.65, variant: 2 },
    { kind: 'one', obj: 'bird.goose', preset: 'goose-swim', route: [[2, 16], [-1, 22], [1, 30]], seed: 221 },
    { kind: 'one', obj: 'bird.goose', preset: 'goose-swim', route: [[2.8, 18], [-0.2, 24], [1.8, 32]], seed: 222, offset: 0.06, variant: 1 },
    { kind: 'one', obj: 'bird.mallard', preset: 'duck', route: [[-2.4, 19], [0, 18.2], [3, 20]], acts: ['look', 'preen'], k: 1.42, seed: 223 },
    { kind: 'one', obj: 'bird.moorhen', preset: 'moorhen', route: [[3.6, 54], [3.2, 64]], k: 1.42, seed: 224 },
    { kind: 'one', obj: 'bird.coot', preset: 'coot', route: [[-2, 58], [1, 66]], acts: ['look'], k: 1.42, seed: 225, offset: 0.4 },
  ]);
}

/* ---------- 3: from Merchants' Bridge up the reach to the warehouses ---------- */
function sceneUkNorthMcfWarehouses() {
  const M = SCENE_MCF, V = M.views.warehouses, cam = Object.assign({}, V.camera);
  const K = _sceneMcfPieces('warehouses'), place = K.place, actors = K.actors;
  K.runner('vehicle.metrolink-m5000', 'lat', { s0: 0, s1: 225, speed: 10, wait: 30, u: -0.4, seed: 301, offset: 0.2, step: 15, layer: 'far' });
  K.runner('vehicle.metrolink-m5000', 'lat', { s0: 0, s1: 225, speed: 10, wait: 46, u: 0.4, back: true, variant: 1, seed: 302, offset: 0.62, step: 15, layer: 'far' });
  const water = [{ id: 'reach', kind: 'canal', poly: V.water, edge: 'quay', ripple: 0.12, mirror: 0.88, rings: true, base: ['#86a29a', '#557870', '#33524a'], clarity: 0 }];
  const surfaces = [
    { id: 'land', kind: 'plaza', rest: true },
    { id: 'quay-l', kind: 'plaza', poly: [[-9.5, 88], [-9.5, 160], [-9, 260], [-16, 260], [-16, 88]] },
    { id: 'wharf-r', kind: 'plaza', poly: [[9, 4], [9.5, 60], [9.5, 120], [10, 170], [12, 210], [26, 210], [26, 4]] },
    { id: 'lawn-r', kind: 'park', poly: [[16, 18], [26, 18], [26, 36], [16, 36]] },
    { id: 'road', kind: 'road', path: [[-80, 186], [80, 186]], width: 7, markings: 'centre' },
  ];
  const buildings = _sceneMcfBuildings([
    // the Middle Warehouse: straight up from the water (its face on the quay line), six storeys
    [[[-9.6, 28], [-9.6, 86], [-36, 86], [-36, 28]], 'mill', 6, 20, { subject: true }],
    [[[-12, 96], [-12, 140], [-40, 140], [-40, 96]], 'mill', 5, 22],
    [[[-12, 148], [-12, 176], [-38, 176], [-38, 148]], 'modern-glass', 7, 53],
    // Merchants' Warehouse beyond the wharf on the right, four storeys, its neighbours and the pub by the lock
    [[[20, 40], [20, 78], [40, 78], [40, 40]], 'mill', 4, 23],
    [[[16, 120], [16, 140], [32, 140], [32, 120]], 'victorian-terrace', 3, 55],
    [[[24, 92], [24, 112], [44, 112], [44, 92]], 'mill', 5, 25],
    [[[-40, 262], [-10, 262], [-10, 290], [-40, 290]], 'mill', 6, 28],
    [[[20, 300], [50, 300], [50, 330], [20, 330]], 'modern-glass', 10, 58],
  ]);
  place.push({ obj: 'landmark.beetham-tower-blade', at: [205, 506], fix: true, anim: false });
  for (const [x, d, k, f, t] of [[13, 92, 0.9, false, 0], [14, 158, 0.95, true, 0], [-13, 190, 0.9, false, 0]]) place.push({ obj: 'tree.plane-avenue', at: [x, d], k, variant: 0, anim: false, flip: f, pit: x > 0 && d > 40 || x < 0, tint: ['#6a6a3a', t] });
  // the cafe terrace on the wharf: people at tables, benches; lamps and bollards along the quays
  for (const [x, d, f] of [[12.6, 30, false], [14, 37, true], [12.8, 46, false], [14.6, 31.4, true], [13.4, 44.2, true], [15.2, 56, false], [16.4, 57.6, true]]) place.push({ obj: 'person.cafe-goer', at: [x, d], flip: f });
  for (const [x, d] of [[15.6, 33], [15.8, 42]]) place.push({ obj: 'street.bench', at: [x, d], face: 'left' });
  for (const [x, d, v] of [[13.6, 33.6, 1], [13.8, 45.2, 0], [15.8, 57, 1]]) place.push({ obj: 'street.mqn-parasol', at: [x, d], variant: v });
  place.push({ obj: 'street.mcf-litter-bin', at: [10.4, 40], variant: 0 }, { obj: 'street.mcf-litter-bin', at: [10.4, 88], variant: 1 }, { obj: 'street.mqn-bike-hoop', at: [17.6, 66], variant: 2 }, { obj: 'street.mqn-bike-hoop', at: [18, 70], variant: 0 });
  place.push({ obj: 'street.mqn-planter-grass', at: [16.6, 22] }, { obj: 'street.mqn-planter-grass', at: [17.4, 78], flip: true }, { obj: 'street.mqn-lifebuoy', at: [9.9, 34] });
  place.push({ obj: 'person.angler', at: [-10.4, 104], face: 'right' }, { obj: 'person.picnicker', at: [20, 26] });
  place.push({ obj: 'street.lamppost', at: [10.8, 22], variant: 1 }, { obj: 'street.lamppost', at: [10.8, 60], variant: 1, anim: false }, { obj: 'street.lamppost', at: [-10.6, 100], variant: 1, anim: false }, { obj: 'street.lamppost', at: [11, 100], variant: 1, anim: false });
  for (const [x, d] of [[9.7, 26], [9.8, 48], [9.8, 70], [-9.8, 120], [-9.8, 140]]) place.push({ obj: 'street.bollard', at: [x, d], variant: 2, anim: false });
  place.push({ obj: 'person.phone-idler', at: [11, 72], anim: false }, { obj: 'person.photographer', at: [10.6, 84], face: 'left', anim: false });
  for (const [x, d, v, f] of [[16, 50, 0, false], [16.6, 51, 2, true], [15.4, 52.2, 4, false], [17.2, 49.4, 1, true]]) place.push({ obj: 'bird.pigeon-feral', at: [x, d], variant: v, flip: f, k: 0.9 + (v % 3) * 0.1 });
  actors.push({ obj: 'person.kayaker', ground: [[3, 30], [2, 90], [3, 150]], speedM: 0.9, loop: 'pingpong', seed: 315, offset: 0.3, floats: true });
  place.push({ obj: 'water.fish-ring', at: [-2, 36], k: 1.4, anim: { flicker: { period: 7.7 } } });
  place.push({ obj: 'plant.mcf-plane-bough', x: 1600, y: -10, s: 1, pin: true, layer: 'front', shadow: false, flip: true, variant: 1, anim: false });
  const scatter = [
    { obj: { 'plant.grass': 4, 'plant.daisies': 1, 'plant.shrub': 1 }, on: ['lawn-r'], d: [18, 36], n: 50, dist: 'screen', cluster: { centres: 6, spread: 4 }, seed: 321, anim: false, k: [0.55, 1.4], tint: { col: '#8a8a40', k: [0, 0.12] } },
    { obj: { 'plant.planter': 2, 'plant.shrub': 1 }, on: ['wharf-r', 'quay-l'], d: [20, 170], n: 14, dist: 'ground', cluster: { centres: 6, spread: 5 }, seed: 322, anim: false, k: [0.6, 1.3] },
  ];
  const data = {
    v: 2, id: 'castlefield-warehouses', view: { lat: cam.lat, lon: cam.lon }, camera: cam,
    at: 'afternoon', season: 'auto', setting: 'urban', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season', signage: false,
    kits: _SCENE_MCF_KITS,
    sky: { stars: 120, clouds: { n: 4, y: [30, 250], speed: 5 }, sunR: 24, moonR: 18 },
    surfaces, water, buildings, place, scatter, actors,
    flocks: [{ obj: 'bird.gull', n: 3, area: [300, 60, 1300, 220], speed: 24, s: 0.3, seed: 331, layer: 'far' }],
    flows: [
      { id: 'walkers', kind: 'walk', on: ['quay-l', 'wharf-r'], lanes: [{ path: [[11, 22], [11.5, 60], [12, 110], [13.5, 170]], dir: 1 }, { path: [[14, 24], [16.5, 52], [18, 84], [19, 116]], dir: 1 }, { path: [[-11, 92], [-11.5, 170], [-11, 250]], dir: 1 }],
        density: 3.2, profile: 'town', mix: { 'person.walker': 4, 'person.couple': 2, 'person.dog-walker': 1, 'person.student': 1, 'person.shopper': 1, 'person.buggy-walker': 1 }, both: true, max: 14, seed: 341 },
      { id: 'traffic', kind: 'drive', on: 'road', density: 0.9, profile: 'town', mix: { 'vehicle.car': 5, 'vehicle.car-city': 2, 'vehicle.taxi-black': 1 }, max: 4, seed: 342 },
    ],
  };
  // the movers by behaviour: a dog walker and a pair along the wharf, the swans and mallards a body length off the boats
  return _sceneMcfBehave(data, 'warehouses', [
    { kind: 'dog', route: [[11.4, 24], [11.8, 60], [12.4, 104], [13.6, 160]], seed: 351, offset: 0.25 },
    { kind: 'pair', obj: 'person.walker', route: [[19, 110], [17.6, 80], [16.4, 60]], seed: 352, offset: 0.6, variant: 4 },
    { kind: 'one', obj: 'person.elderly-walker', preset: 'elderly', route: [[-11, 150], [-11.4, 200], [-11, 250]], seed: 353, offset: 0.1 },
    { kind: 'one', obj: 'bird.swan', preset: 'swan', route: [[1, 70], [-1, 46], [1.5, 24]], seed: 311 },
    { kind: 'one', obj: 'bird.swan', preset: 'swan', route: [[2.2, 74], [0.4, 50], [2.6, 28]], seed: 312, offset: 0.06 },
    { kind: 'one', obj: 'bird.mallard', preset: 'duck', route: [[3.6, 26], [1, 23], [-2, 27]], acts: ['look', 'preen'], k: 1.42, seed: 313 },
    { kind: 'one', obj: 'bird.mallard', preset: 'duck', route: [[4.2, 27], [1.6, 24], [-1.4, 28]], acts: ['look', 'preen'], k: 1.42, seed: 314, variant: 1, offset: 0.04 },
    { kind: 'one', obj: 'bird.coot', preset: 'coot', route: [[3, 104], [-1, 112]], acts: ['look'], k: 1.42, seed: 316 },
    { kind: 'one', obj: 'bird.moorhen', preset: 'moorhen', route: [[-5.8, 76], [-5.6, 86]], k: 1.42, seed: 317 },
  ]);
}

/* ---------- 4: the Roman fort's north gate from Castlefield Arena ---------- */
function sceneUkNorthMcfFort() {
  const M = SCENE_MCF, V = M.views.fort, cam = Object.assign({}, V.camera);
  const K = _sceneMcfPieces('fort'), place = K.place, actors = K.actors;
  K.runner('vehicle.metrolink-m5000', 'lat', { s0: 0, s1: 280, speed: 11, wait: 32, u: 0.4, seed: 401, offset: 0.25, step: 16, layer: 'mid' });
  K.runner('vehicle.metrolink-m5000', 'lat', { s0: 0, s1: 280, speed: 11, wait: 50, u: -0.4, back: true, variant: 1, seed: 402, offset: 0.7, step: 16, layer: 'mid' });
  const surfaces = [
    { id: 'land', kind: 'lawn', rest: true },
    { id: 'path', kind: 'path', path: [[-3, 5], [1, 14], [5, 26], [8, 36.5]], width: 2.6 },
    { id: 'path-x', kind: 'path', path: [[-40, 26], [-12, 30], [4, 33], [30, 31]], width: 2.2 },
    { id: 'beds', kind: 'garden', poly: [[-30, 34], [-10, 35], [-10, 36.5], [-30, 36]] },
    { id: 'yard', kind: 'plaza', poly: [[-200, 60], [200, 50], [200, 96], [-200, 112]] },
    { id: 'pave', kind: 'pavement', poly: [[-200, 112], [200, 96], [200, 99], [-200, 115]] },
    { id: 'road', kind: 'road', path: [[-200, 119.5], [200, 103.5]], width: 8, markings: 'centre' },
    { id: 'pave-f', kind: 'pavement', poly: [[-200, 124], [200, 108], [200, 111], [-200, 127]] },
    { id: 'plots', kind: 'plot', poly: [[-200, 127], [200, 111], [200, 900], [-200, 900]] },
  ];
  const buildings = _sceneMcfBuildings([
    [[[-40, 130], [-10, 128], [-10, 150], [-40, 152]], 'mill', 4, 29],
    [[[-4, 126], [24, 124], [24, 144], [-4, 146]], 'victorian-terrace', 3, 62],
    [[[30, 122], [64, 118], [64, 146], [30, 150]], 'mill', 5, 30],
    [[[72, 116], [110, 112], [110, 142], [72, 146]], 'mill', 6, 31],
    [[[118, 140], [160, 136], [160, 170], [118, 174]], 'modern-glass', 9, 66],
    [[[-20, 300], [20, 300], [20, 340], [-20, 340]], 'modern-glass', 14, 67],
    [[[40, 420], [80, 420], [80, 460], [40, 460]], 'modern-glass', 20, 68],
  ]);
  place.push({ obj: 'landmark.beetham-tower-blade', at: [-160, 470], fix: true, anim: false });
  // trees: a big plane at the arena's left edge, planes and birches round the lawn and along the road
  for (const [x, d, k, v, o, pit, f] of [[-21, 30, 1.0, 0, 'tree.plane-avenue', false, false], [-30, 52, 0.9, 1, 'tree.bank-oak', false, true], [34, 52, 0.95, 0, 'tree.plane-avenue', false, true], [22, 30, 0.75, 1, 'tree.bank-birch', false, false], [-60, 114, 0.95, 1, 'tree.bank-oak', true, false], [44, 100, 0.9, 0, 'tree.plane-avenue', true, true]]) place.push({ obj: o, at: [x, d], k, variant: v, anim: false, pit: pit && o !== 'tree.bank-oak', flip: f });
  // the arena's life on a fine day: picnics on the grass, a family and a school party at the gate, tourists photographing
  // it, a reader on the bench, children with a ball, pigeons on the path (no standing adult nearer than 15 m: the care cap)
  place.push({ obj: 'person.phone-idler', at: [-12, 24], flip: true }, { obj: 'person.child-ball', at: [6.4, 17] }, { obj: 'person.child-jumping', at: [4.6, 18.4] }, { obj: 'person.photographer', at: [3.5, 30], face: 'away' });
  place.push({ obj: 'street.bench', at: [-9, 22], face: 'right' }, { obj: 'person.bench-sitter', at: [-9.3, 22.05], face: 'right' }, { obj: 'person.bench-reader', at: [-8.6, 22.05], face: 'right', flip: true }, { obj: 'person.child-scooter', at: [1.8, 14.2] }, { obj: 'person.picnicker', at: [13.8, 21.6], flip: true }, { obj: 'person.phone-idler', at: [-15.5, 26] });
  place.push({ obj: 'person.couple', at: [11.4, 33.6], anim: { walk: false } }, { obj: 'person.student', at: [16.6, 34.4], flip: true, anim: { walk: false } }, { obj: 'person.photographer', at: [-2.4, 33.2], face: 'right' });
  place.push({ obj: 'person.elderly-couple', at: [-18, 31.4], anim: { walk: false } }, { obj: 'person.couple', at: [20.5, 27.5], anim: { walk: false } });
  place.push({ obj: 'street.bench', at: [10.5, 18.5], face: 'left' }, { obj: 'person.bench-reader', at: [10.5, 18.55], face: 'left' });
  place.push({ obj: 'street.bench', at: [-11.5, 31.6], face: 'right' }, { obj: 'person.bench-sitter', at: [-11.5, 31.65], face: 'right' }, { obj: 'street.mcf-litter-bin', at: [-9.6, 31.8], variant: 0 }, { obj: 'street.mcf-litter-bin', at: [12.6, 18.4], variant: 1 });
  place.push({ obj: 'street.lamppost', at: [-5, 32], variant: 1 }, { obj: 'street.lamppost', at: [17, 34.6], variant: 1 }, { obj: 'street.lamppost', at: [-40, 107], variant: 1 }, { obj: 'street.lamppost', at: [40, 104], variant: 1 });
  for (const [x, d, v, f] of [[-0.6, 9.4, 0, false], [0.3, 10.2, 1, true], [-1.4, 10.8, 2, false], [1.1, 11.2, 3, true], [0.1, 12.4, 4, false]]) place.push({ obj: 'bird.pigeon-feral', at: [x, d], variant: v, flip: f, k: 0.9 + (v % 3) * 0.08 });
  const scatter = [
    { obj: { 'plant.grass': 4, 'plant.daisies': 3, 'plant.grass-long': 1 }, on: ['land'], avoid: ['path', 'path-x'], d: [7.4, 40], n: 230, dist: 'screen', cluster: { centres: 44, spread: 6 }, seed: 421, anim: false, k: [0.7, 1], tint: { col: '#8a8a40', k: [0, 0.14] } },
    { obj: { 'ground.leaves': 2, 'ground.leaf-litter': 2 }, on: ['land', 'path', 'path-x'], d: [7.4, 36], n: 40, dist: 'ground', cluster: { centres: 9, spread: 3 }, seed: 424, anim: false, k: [0.8, 1.3], tint: { col: '#8a5a2a', k: [0, 0.16] } },
    { obj: { 'plant.shrub': 2, 'plant.wildflowers': 2, 'plant.grass-long': 1 }, on: ['beds'], d: [30, 40], n: 22, k: [0.7, 1.45], dist: 'screen', cluster: { centres: 7, spread: 4 }, seed: 422, anim: false, tint: { col: '#8a6a40', k: [0, 0.12] } },
    { obj: { 'plant.planter': 2, 'plant.shrub': 1 }, on: ['yard'], d: [55, 110], n: 12, dist: 'ground', cluster: { centres: 5, spread: 6 }, seed: 423, anim: false, k: [0.8, 1.1] },
  ];
  place.push({ obj: 'plant.mcf-plane-bough', x: 1600, y: -10, s: 1, pin: true, layer: 'front', shadow: false, flip: true, variant: 1 });
  const data = {
    v: 2, id: 'castlefield-fort', view: { lat: cam.lat, lon: cam.lon }, camera: cam,
    at: 'afternoon', season: 'auto', setting: 'urban', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season', signage: false,
    kits: ['urban', 'people', 'birds', 'temperate'],
    sky: { stars: 120, clouds: { n: 4, y: [30, 260], speed: 5 }, sunR: 24, moonR: 18 },
    surfaces, buildings, place, scatter, actors,
    flocks: [{ obj: 'bird.pigeon', n: 6, area: [200, 80, 1300, 260], speed: 30, s: 0.3, seed: 431, layer: 'mid' }],
    flows: [
      { id: 'walkers', kind: 'walk', on: ['pave', 'pave-f'], lanes: [{ path: [[2.6, 18.5], [5, 26], [8, 36.5]], dir: 1 }, { path: [[-40, 26], [-12, 30], [4, 33], [30, 31]], dir: 1 }, { path: [[-150, 112.4], [150, 100.4]], dir: 1 }, { path: [[-150, 120.9], [150, 108.9]], dir: -1 }], density: 2, profile: 'town', mix: { 'person.walker': 4, 'person.dog-walker': 2, 'person.couple': 2, 'person.jogger': 2, 'person.family': 1, 'person.student': 1 }, both: true, max: 12, seed: 441 },
      { id: 'traffic', kind: 'drive', on: 'road', density: 1.2, profile: 'commuter', mix: { 'vehicle.car': 5, 'vehicle.car-city': 3, 'vehicle.taxi-black': 1 }, bus: { obj: 'vehicle.bus-double-decker', every: 6 }, max: 6, seed: 442 },
    ],
  };
  // the movers by behaviour: a dog walker up the path to the gate, a pair along the cross path, a jogger, a child running
  // about on the grass, an elderly walker
  return _sceneMcfBehave(data, 'fort', [
    { kind: 'dog', route: [[2.4, 17], [4.6, 24], [7.2, 34]], seed: 451, offset: 0.2 },
    { kind: 'pair', obj: 'person.walker', route: [[-36, 26.6], [-16, 29.6], [0, 32.4]], seed: 452, offset: 0.5, variant: 1 },
    { kind: 'one', obj: 'person.jogger', preset: 'jogger', route: [[30, 31], [10, 33.2], [-12, 30], [-40, 26]], seed: 453, offset: 0.35 },
    { kind: 'one', obj: 'person.elderly-walker', preset: 'elderly', route: [[24, 31.2], [14, 32.6], [6, 33.4]], seed: 454, offset: 0.7 },
    { kind: 'one', obj: 'animal.dog', preset: 'dog-trot', route: [[-4, 18], [-10, 21], [-2, 23]], seed: 455, offset: 0.1 },
  ]);
}
