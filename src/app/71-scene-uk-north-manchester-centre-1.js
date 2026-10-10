/* ============================================================
   COMPOSED SCENE (v2, by hand) uk-north-west / Manchester civic quarter, view 1: Albert Square and the Town Hall.
   docs/dev/SCENE_ENGINE_V2.md. Ground plan and landmarks in 70-scene-lib-manchester-centre.js.

   The view: from the south-west corner of Albert Square (by Southmill Street), looking north-east across the square at
   Waterhouse's Town Hall front at an angle: the long Gothic front runs away to the left, the clock tower right of centre,
   the Albert Memorial standing out in the square in front of it. Princess Street leads away on the left between the
   Town Hall's north end and the Victorian commercial blocks on its far side: the leading line, with buses and black cabs
   on it. Framing: a statue on its granite pedestal close on the left (one of the square's Victorian worthies), a
   lamp standard on the right. The life: the lunchtime crowd crossing the square, people on the benches, pigeons on the
   setts and round the memorial's steps, a photographer lining up the tower, a busker, a child running at the pigeons,
   a dog walker. In December (the market item) the square is full of the Christmas market's wooden chalets.
   PURE: defines sceneUkMcrCentre1(market) -> the scene data, called once per item, lazily.
   ============================================================ */
function sceneUkMcrCentre1(market) {
  const M = SCENE_MCR, V = SCENE_MCR_VIEWS.v1, cam = V.camera, C = M.cam(cam);
  const R1 = v => Math.round(v * 10) / 10, R2 = v => Math.round(v * 100) / 100;
  const N = V.thN, S = V.thS, L = Math.hypot(S[0] - N[0], S[1] - N[1]), u = [(S[0] - N[0]) / L, (S[1] - N[1]) / L], n = [u[1], -u[0]];
  const at = (s, off) => [R2(N[0] + u[0] * s + n[0] * off), R2(N[1] + u[1] * s + n[1] * off)];   // along the front (s), out from it (off)
  const pst = (t, k) => [R2(N[0] + n[0] * t - u[0] * k), R2(N[1] + n[1] * t - u[1] * k)];          // along Princess Street (t), north of the front line (k)
  const data = {
    v: 2, id: market ? 'mcr-centre-1-market' : 'mcr-centre-1',
    view: { lat: cam.lat, lon: cam.lon },
    camera: Object.assign({}, cam),
    at: 'afternoon', season: 'auto', setting: 'urban', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season', signage: false,
    kits: ['urban', 'people', 'birds'],
    sky: { stars: 120, clouds: { n: 5, y: [30, 260], speed: 5 }, sunR: 22, moonR: 16 },
    palette: M.palette(),
    surfaces: [
      { id: 'land', kind: 'plaza', rest: true },
      { id: 'princess', kind: 'tramway', path: [pst(-60, 9), pst(170, 9)], width: 9, tracks: 2, markings: 'none' },
      { id: 'pave-n', kind: 'pavement', beside: 'princess', side: 'left', width: 3.6, kerb: 0.12 },
      { id: 'pave-s', kind: 'pavement', beside: 'princess', side: 'right', width: 3.4, kerb: 0.12 },
      { id: 'th-walk', kind: 'pavement', poly: [at(-2, -1), at(L + 4, -1), at(L + 4, 7), at(-2, 7)] },
      { id: 'square', kind: 'plaza', poly: [at(-2, 7), at(L + 6, 7), at(L + 6, 150), at(-2, 150)] },
    ],
    water: [], ground: [], place: [], scatter: [], actors: [], flocks: [],
    buildings: [],
    flows: [
      { id: 'crowd', kind: 'walk', on: ['square', 'th-walk'], density: 3.2, profile: 'town', mix: { 'person.walker': 6, 'person.commuter': 4, 'person.shopper': 3, 'person.student': 2, 'person.couple': 2, 'person.elderly-walker': 1, 'person.takeaway-walker': 2, 'person.buggy-walker': 1, 'person.family': 1 }, speed: [1.0, 1.5], both: true, max: 26, seed: 11 },
      { id: 'pavements', kind: 'walk', on: ['pave-n', 'pave-s'], density: 2.4, profile: 'town', mix: 'kit', speed: [1.1, 1.5], both: true, max: 12, seed: 12 },
      { id: 'trams', kind: 'tram', on: 'princess', timetable: { every: 4, dwell: 0 }, obj: 'vehicle.metrolink-m5000', speed: [5, 7], seed: 14 },
      { id: 'traffic', kind: 'drive', on: 'princess', density: 0.9, profile: 'town', mix: { 'vehicle.car-city': 5, 'vehicle.taxi-black': 3, 'vehicle.car': 2 }, bus: { obj: 'vehicle.bus-double-decker', every: 5 }, speed: [5, 9], max: 6, seed: 13 },
    ],
  };
  const Pl = data.place, A = data.actors;
  // ---- the square's paving: pale granite bands parallel to the front every 6 m and across it every 9 m (the setts between)
  const inSq = (x, d) => { const o = (x - N[0]) * n[0] + (d - N[1]) * n[1], s0 = (x - N[0]) * u[0] + (d - N[1]) * u[1]; return o > 7.5 && s0 > -1 && s0 < L + 5; };
  data.ground.push(...M.paving(cam, N, u, n, -2, L + 5, [8, 20, 32, 44, 56, 68, 80, 92, 104, 116, 128], 0.22, '@plaza.1', inSq));
  data.ground.push(...M.paving(cam, N, n, u, 8, 150, [4, 22, 40, 58, 76, 94, 112, 130], 0.22, '@plaza.1', inSq));
  data.ground.push(...M.paving(cam, N, u, n, -2, L + 5, [7.6], 0.5, '@pavement.1', null));
  // the setts close to us: courses across the view every half metre, the joints staggered by course (a texture, not a grid)
  { const rows = []; for (let d = 6.2; d < 18; d += 0.6) rows.push(d);
    data.ground.push(...M.paving(cam, [0, 0], [1, 0], [0, 1], -18, 18, rows, 0.035, '@plaza.1', null));
    const r = M.rnd(5); let joints = '';
    for (let d = 6.2; d < 11; d += 0.6) for (let x = -9 + r() * 1.1; x < 9; x += 1.2 + r() * 0.6) { const a = C.p(x, d, 0), b = C.p(x, d + 0.6, 0); joints += 'M' + Math.round(a[0]) + ' ' + Math.round(a[1]) + 'L' + Math.round(b[0]) + ' ' + Math.round(b[1]) + 'L' + Math.round(b[0] + 1) + ' ' + Math.round(b[1]) + 'L' + Math.round(a[0] + 1) + ' ' + Math.round(a[1]) + 'Z'; }
    data.ground.push({ layer: 'fore', d: joints, fill: '@plaza.1' }); }
  // near walking lines across the square (the flows' own wander lines stay far: these bring the crowd up close)
  data.flows[0].lanes = [{ path: [[-34, 16], [-8, 14], [24, 17]], dir: 1 }, { path: [[-40, 27], [0, 23], [40, 29]], dir: -1 }, { path: [[-12, 12], [6, 30], [20, 60]], dir: 1 }, { path: [[30, 13], [10, 36], [-6, 70]], dir: -1 }];
  // ---- the Victorian commercial blocks along the far (north) side of Princess Street: the left wall of the view
  { const fr = [22, 17, 20, 15, 24, 18, 21], st = [5, 6, 5, 4, 6, 5, 5]; let t = -4;
    fr.forEach((w, i) => { const k = 9 + 4.5 + 3.6 + 0.4; data.buildings.push({ style: 'mcr-palazzo', foot: [pst(t + w, k), pst(t, k), pst(t, k + 18), pst(t + w, k + 18)], front: 0, storeys: st[i], seed: 300 + i * 7, roof: i % 3 === 1 ? 'mansard' : 'flat' }); t += w + (i === 2 ? 1.2 : 0.2); }); }
  // the far end of Princess Street beyond the Town Hall: two more blocks closing the vista
  data.buildings.push({ style: 'mcr-palazzo', foot: [pst(-30, -12), pst(-30, 12), pst(-48, 12), pst(-48, -12)], front: 0, storeys: 6, seed: 391 });
  // ---- the Town Hall and the Albert Memorial (in this camera's perspective, pinned at their nearest ground points)
  { const a = C.p(S[0], S[1], 0); Pl.push({ obj: 'landmark.mcr-town-hall-v1', x: R1(a[0]), y: R1(a[1]), s: 1, pin: true, layer: 'mid', shadow: false, anim: false, subject: true }); }
  { const m = SCENE_MCR_MEMORIAL[0], a = C.p(m.at[0], m.at[1], 0); Pl.push({ obj: 'landmark.mcr-albert-memorial', variant: 0, x: R1(a[0]), y: R1(a[1] + 6), s: 1, pin: true, layer: 'mid', shadow: false, anim: false }); }
  // ---- the square's statues on their pedestals (Gladstone seated, Bright, Fraser, Heywood standing), not in a line
  Pl.push({ obj: 'street.mcr-statue', variant: 1, at: at(L * 0.18, 26), k: 1 },
    { obj: 'street.mcr-statue', variant: 0, at: at(L * 0.34, 44), k: 1 },
    { obj: 'street.mcr-statue', variant: 2, at: at(L * 0.72, 40), k: 1 });
  // ---- lamp standards round the square (irregular, as the old ones stand), benches with people
  [[L * 0.08, 12], [L * 0.27, 9], [L * 0.6, 10], [L * 0.86, 13], [L * 0.45, 58], [L * 0.95, 48]].forEach(([s0, o], i) => Pl.push({ obj: 'street.lamppost', at: at(s0, o), k: 1.1, variant: i % 2 ? 1 : 3, flip: i % 2 === 0 }));
  Pl.push({ obj: 'street.bench', at: at(L * 0.28, 33), k: 1 }, { obj: 'person.bench-reader', at: at(L * 0.62, 25), k: 1 });
  if (!market) {
    // the lunchtime square: a photographer lining up the tower, a child at the pigeons, a dog walker, a skateboarder
    Pl.push({ obj: 'person.photographer', at: at(L * 0.55, 62), k: 1, face: 'right' },
      { obj: 'person.child-ball', at: at(L * 0.68, 47), k: 1 });
    // pigeons: a flock working the setts by the memorial, more by the statues and on the near flags
    const m = SCENE_MCR_MEMORIAL[0].at;
    Pl.push(...M.pigeons(41, [[m[0] - 4, m[1] - 9, 8, 4], [m[0] + 6, m[1] - 4, 4, 3], [-2.5, 15, 5, 3], [1.5, 10.5, 7, 4], [-9, 27, 4, 3]], (x, d) => [x, d]));
  } else {
    // ---- the Christmas market: rows of wooden chalets across the square (lanes between them), the bar, the big tree
    // rows across the near square in this camera's own metres, an aisle left open toward the memorial and the tower
    const r = M.rnd(77);
    for (const d of [23, 32, 43, 56, 72]) {
      const aisle = -0.2 * d, half = 0.95 * d;
      for (let x = -half; x < half; x += 7 + r() * 1.6) {
        if (Math.abs(x - aisle) < 0.13 * d + 2.6) continue;
        const i = Math.round(x * 7 + d);
        Pl.push({ obj: r() < 0.4 ? 'structure.mcr-market-hut' : 'structure.mcr-market-chalet', at: [R2(x + (r() - 0.5) * 0.6), R2(d + (r() - 0.5) * 1.2)], k: R2(0.72 + r() * 0.6), variant: Math.floor(r() * 4), flip: i % 2 === 0, tint: ['#3a2a1a', R2(r() * 0.14)], anim: false });
      }
    }
    Pl.push({ obj: 'tree.mcr-xmas-tree', at: [-10, 52], k: 1 });
    // the market crowd: browsing lines between the rows of chalets (both ways), denser than any day in the square
    data.flows[0].lanes = [{ path: [[-30, 19], [0, 18.5], [30, 20]], dir: 1 }, { path: [[-34, 28], [0, 27], [34, 28.5]], dir: -1 }, { path: [[-40, 38.5], [0, 37.5], [40, 39]], dir: 1 }, { path: [[-5, 14], [-5, 30], [-6, 60]], dir: -1 }];
    data.flows[0].density = 5; data.flows[0].max = 32;
    Pl.push({ obj: 'person.shopper', at: at(L * 0.3, 26), k: 1 }, { obj: 'person.couple', at: at(L * 0.7, 37), k: 1 }, { obj: 'person.phone-idler', at: at(L * 0.16, 42), k: 1 }, { obj: 'person.buggy-walker', at: at(L * 0.6, 56), k: 1 });
    Pl.push(...M.pigeons(42, [[1.5, 10.5, 5, 3]], (x, d) => [x, d]));
  }
  // ---- close by: a bench and its sitter, planted trees on the Princess Street side, bollards, a person on the phone
  Pl.push({ obj: 'street.bench', at: [6.2, 10.2], k: 1 }, { obj: 'person.bench-sitter', at: [7.4, 10.3], k: 0.8, variant: 1 },
    { obj: 'tree.mcr-street-tree', at: [-44, 66], k: 1, variant: 2, pit: true },
    { obj: 'street.bollard', at: [-21, 58], k: 1 }, { obj: 'street.bollard', at: [-19.5, 56.6], k: 1 }, { obj: 'street.bollard', at: [-17.8, 55.4], k: 1 },
     { obj: 'structure.mcr-planter', at: [3.4, 9.2], k: 1, variant: 0, flip: true });
  if (!market) Pl.push(...M.pigeons(44, [[-1.5, 7.4, 4, 2.2]], (x, d) => [x, d]));
  // ---- pigeons wheeling over the square, gulls high over the roofs
  data.flocks.push({ obj: 'bird.small-flight', n: 9, area: [300, 380, 900, 560], speed: 60, s: 0.5, seed: 61, layer: 'mid' });
  data.flocks.push({ obj: 'bird.gull', n: 3, area: [200, 60, 1400, 260], speed: 26, s: 0.35, seed: 62, layer: 'far' });
  // ---- pass 2 (the review: too empty): the square's ground varies (worn pale granite, newer dark slabs, wet and stained
  // patches), leaves and litter blow about, the new square's street trees and furniture, and the near crowd from behaviours
  const F = SCENE_MCR_FILL;
  data.ground.push(...F.tone(cam, { seed: 1101, n: market ? 40 : 80, box: [-60, 60, 5.2, 140], w: [3, 2, 2, 1] }));
  data.scatter.push({ obj: { 'ground.leaf-litter': 1, 'ground.leaves': 1 }, on: ['square', 'th-walk', 'land'], d: [5.4, 40], n: 26, dist: 'ground', cluster: { centres: 6, spread: 3 }, k: [0.7, 1.1], seed: 1102, anim: false, tint: { col: '#7a6a50', k: [0, 0.1] } });
  // the street trees down the Princess Street side (the 2024 square's new planting), lamps and bins between them
  Pl.push({ obj: 'tree.mcr-street-tree', at: [-14, 20], k: 0.95, variant: 0, pit: true }, { obj: 'tree.mcr-street-tree', at: [-25.5, 35], k: 1, variant: 2, flip: true, pit: true },

    { obj: 'street.mcr-bin', at: [-5.6, 9.4], k: 1, variant: 1 }, { obj: 'street.mcr-bin', at: [6.2, 16.5], k: 1 }, { obj: 'street.mcr-bin', at: [-12, 30], k: 1 },
    { obj: 'street.mcr-cycle-stand', at: [-10.5, 17], k: 1, variant: 1 }, { obj: 'street.mcr-totem', at: [4.6, 12.6], k: 1, variant: 0 },
    { obj: 'street.bench', at: [-1.8, 19.5], k: 1 });
  if (!market) Pl.push({ obj: 'tree.mcr-street-tree', at: [-30, 45], k: 0.9, variant: 1, pit: true }, { obj: 'structure.mcr-planter', at: [-13.5, 25.5], k: 1, variant: 1 });
  data.flows[0].density = market ? 12 : 10; data.flows[0].max = market ? 40 : 38;
  // the crowd's wander lines only along the Town Hall's front (far); the rest walk the near and middle square on its desire
  // lines (the agent budget is 60: spent where people read as people, not as specks across 150 m of granite)
  data.flows[0].on = ['th-walk'];
  data.flows[0].lanes.push({ path: [[-16, 10.4], [0, 10.0], [16, 10.6]], dir: 1 }, { path: [[18, 11.8], [0, 11.4], [-18, 11.5]], dir: -1 },
    ...(market ? [] : [{ path: [[-24, 17], [-6, 18.5], [14, 16], [30, 19]], dir: 1 }, { path: [[24, 31], [4, 34], [-20, 32]], dir: -1 }, { path: [[-8, 13], [2, 20], [14, 34], [30, 46]], dir: 1 }]));
  data.flows[1].max = 8;
  // the near walkers (the crowd flows carry the rest): behaviour presets, no nearer than 10.5 m (a person stays a scale cue)
  data.actors.push(...F.life(data, market ? [
    { obj: 'person.couple', preset: 'stroll', route: [[15, 13.8], [4, 13.6], [-14, 14]], seed: 1115, offset: 0.2, variant: 1 },
  ] : [
    { obj: 'person.walker', preset: 'brisk', route: [[-12, 12.6], [0, 12.4], [12, 12.8]], seed: 1111, offset: 0.1, variant: 1 },
    { obj: 'person.couple', preset: 'stroll', route: [[15, 14.2], [4, 13.8], [-14, 14]], seed: 1115, offset: 0.2, variant: 1 },
    { obj: 'person.dog-walker', preset: 'dog-walker', route: [[14, 26], [4, 24.5], [-8, 25.5]], seed: 1117, offset: 0.6 },
    { obj: 'person.elderly-walker', preset: 'elderly', route: [[-6, 23], [6, 22.5], [16, 24]], seed: 1114, offset: 0.7 },
  ]));
  // ---- framing: a statue on its pedestal close on the left, a lamp standard on the right
  Pl.push({ obj: 'street.mcr-statue', variant: 0, x: 150, y: 960, s: 2.4, pin: true, layer: 'front', shadow: false, anim: false });
  Pl.push({ obj: 'street.lamppost', x: 1500, y: 930, s: 2.6, pin: true, layer: 'front', shadow: false, variant: 1 });
  return data;
}
