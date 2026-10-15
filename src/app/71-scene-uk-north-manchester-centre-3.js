/* ============================================================
   COMPOSED SCENE (v2, by hand) uk-north-west / Manchester civic quarter, view 3: Peter Street and the Midland Hotel.
   docs/dev/SCENE_ENGINE_V2.md. Ground plan and landmarks in 70-scene-lib-manchester-centre.js (SCENE_MCR_SPEC.*[0] of v3).

   The view: from the top of the Central Library's portico steps, looking south-west over St Peter's Square's tram stop and
   across Peter Street to the Midland Hotel's red brick and brown terracotta, its corner turret on Lower Mosley Street.
   The tram line is the leading line: it runs from under our feet down the stop between its platforms and away past the
   Midland's flank, trams coming head on and going away. One St Peter's Square's glass wall rises on the left; Peter
   Street's Victorian blocks run off on the right, and the Beetham Tower's blade stands far off over the roofs.
   Framing: one of the portico's giant columns up the right edge, the step edge across the foot. The life: trams in and out,
   people on the platforms, the crowd on the square, buses, black cabs and bikes along Peter Street, pigeons on the steps.
   PURE: defines sceneUkMcrCentre3() -> the scene data, called once, lazily.
   ============================================================ */
function sceneUkMcrCentre3() {
  const M = SCENE_MCR, cam = SCENE_MCR_VIEWS.v3.camera, C = M.cam(cam);
  const R1 = v => Math.round(v * 10) / 10, R2 = v => Math.round(v * 100) / 100;
  const TR = [[3, 4], [1, 30], [-5, 60], [-15, 100], [-30, 160], [-50, 240]];
  const data = {
    v: 2, id: 'mcr-centre-3',
    view: { lat: cam.lat, lon: cam.lon },
    camera: Object.assign({}, cam),
    at: 'afternoon', season: 'auto', setting: 'urban', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season', signage: false,
    kits: ['urban', 'people', 'birds'],
    sky: { stars: 120, clouds: { n: 5, y: [30, 220], speed: 5 }, sunR: 22, moonR: 16 },
    palette: M.palette(),
    surfaces: [
      { id: 'land', kind: 'plaza', rest: true },
      { id: 'peter', kind: 'road', path: [[-160, 72], [0, 64], [160, 56]], width: 10, markings: 'centre' },
      { id: 'pave-n', kind: 'pavement', beside: 'peter', side: 'right', width: 4, kerb: 0.12 },
      { id: 'pave-s', kind: 'pavement', beside: 'peter', side: 'left', width: 4.5, kerb: 0.12 },
      { id: 'tram', kind: 'tramway', path: TR, width: 7, tracks: 2, markings: 'none' },
      { id: 'plat-l', kind: 'platform', path: [[-4.4, 8], [-5.6, 30], [-8.6, 52]], width: 3.6 },
      { id: 'plat-r', kind: 'platform', path: [[10, 8], [8.6, 30], [5, 52]], width: 3.6 },
      { id: 'sq-l', kind: 'plaza', poly: [[-44, 6], [-7, 6], [-8.4, 30], [-11.6, 52], [-44, 54]] },
      { id: 'sq-r', kind: 'plaza', poly: [[12.4, 6], [44, 6], [44, 50], [7.8, 50], [11, 30]] },
    ],
    water: [], ground: [], place: [], scatter: [], actors: [], flocks: [], buildings: [],
    flows: [
      { id: 'trams', kind: 'tram', on: 'tram', timetable: { every: 2, dwell: 45, stops: [{ along: 0.07 }] }, obj: 'vehicle.metrolink-m5000', seed: 31 },
      { id: 'traffic', kind: 'drive', on: 'peter', density: 1, profile: 'town', mix: { 'vehicle.car-city': 5, 'vehicle.taxi-black': 3, 'vehicle.car': 2 }, bus: { obj: 'vehicle.bus-double-decker', every: 4 }, speed: [5, 9], max: 7, seed: 32 },
      { id: 'pavements', kind: 'walk', on: [], density: 3, profile: 'town', mix: 'kit', speed: [1.1, 1.5], both: true, max: 12, seed: 33,
        lanes: [{ path: [[2.5, 57], [80, 53], [160, 49]], dir: 1 }, { path: [[160, 49.6], [80, 53.6], [2.5, 57.6]], dir: -1 }, { path: [[-160, 65.2], [-80, 61.2], [-9.5, 57.6]], dir: 1 }, { path: [[-9.5, 71.4], [-80, 75], [-160, 79]], dir: -1 }] },
      { id: 'square', kind: 'walk', on: ['sq-r'], density: 11, profile: 'town', mix: { 'person.commuter': 4, 'person.walker': 4, 'person.student': 2, 'person.shopper': 2, 'person.couple': 1, 'person.takeaway-walker': 1, 'person.buggy-walker': 1 }, speed: [1, 1.5], both: true, max: 24, seed: 34,
        lanes: [{ path: [[-24, 13], [-12, 15], [-10, 30], [-13, 50]], dir: 1 }, { path: [[30, 12], [16, 18], [14, 34], [12, 48]], dir: -1 }, { path: [[-34, 20], [-20, 19.5], [-10.5, 19]], dir: 1 }, { path: [[34, 26], [22, 24], [13, 22]], dir: -1 }, { path: [[-30, 40], [-12, 38]], dir: 1 }] },
      { id: 'platforms', kind: 'walk', on: ['plat-l', 'plat-r'], density: 7, profile: 'commuter', mix: { 'person.walker': 3, 'person.student': 1, 'person.shopper': 1 }, speed: [0.7, 1.1], both: true, max: 8, seed: 36 },
    ],
  };
  const Pl = data.place;
  const pin = (obj, x, d, v, layer, extra) => { const p = C.p(x, d, 0); Pl.push(Object.assign({ obj, variant: v || 0, x: R1(p[0]), y: R1(p[1]), s: 1, pin: true, layer, shadow: false, anim: false }, extra || {})); };
  // ---- the Midland Hotel across Peter Street, One St Peter's Square on the left, the Beetham Tower far off
  { const n = SCENE_MCR_NEAR(SCENE_MCR_SPEC.midland[0].foot); pin('landmark.mcr-midland-hotel', n[0], n[1], 0, 'mid', { subject: true }); }
  { const n = SCENE_MCR_NEAR(SCENE_MCR_SPEC.glass[0].foot); pin('building.mcr-glass-tower', n[0], n[1], 0, 'near'); }
  // the far end of Lower Mosley Street between the glass and the Midland: modern offices and the convention quarter
  data.buildings.push({ style: 'modern-glass', foot: [[-46, 160], [-22, 160], [-22, 190], [-46, 190]], storeys: 9, seed: 631 }, { style: 'modern-glass', foot: [[-80, 230], [-44, 230], [-44, 270], [-80, 270]], storeys: 12, seed: 632 }, { style: 'mcr-palazzo', foot: [[-28, 200], [-8, 200], [-8, 230], [-28, 230]], storeys: 5, seed: 633 });
  // Peter Street's palazzi running off on the right (the Free Trade Hall's long front among them), Lower Mosley Street's left
  { const st = [5, 4, 6, 5]; let x = 74; [26, 30, 18, 24].forEach((w, i) => { data.buildings.push({ style: 'mcr-palazzo', foot: [[x, 52 - x * 0.05], [x + w, 52 - (x + w) * 0.05], [x + w, 34 - (x + w) * 0.05], [x, 34 - x * 0.05]].reverse(), storeys: st[i], seed: 610 + i, roof: i === 1 ? 'mansard' : 'flat' }); x += w + 0.4; }); }
  data.buildings.push({ style: 'mcr-palazzo', foot: [[-60, 150], [-34, 150], [-34, 182], [-60, 182]], storeys: 6, seed: 621 }, { style: 'mcr-palazzo', foot: [[-74, 190], [-46, 190], [-46, 230], [-74, 230]], storeys: 5, seed: 622 });
  // ---- the stop: canopies on both platforms, people waiting
  Pl.push({ obj: 'street.mcr-tram-shelter', on: 'plat-l', along: 0.45, u: 0.5, k: 1, variant: 0 }, { obj: 'street.mcr-tram-shelter', on: 'plat-r', along: 0.6, u: 0.5, k: 1, variant: 1 });
  Pl.push({ obj: 'person.phone-idler', on: 'plat-l', along: 0.3, u: 0.4, k: 1 }, { obj: 'person.elderly-walker', on: 'plat-r', along: 0.35, u: 0.5, k: 1, anim: false, variant: 2 }, { obj: 'person.student', on: 'plat-r', along: 0.8, u: 0.4, k: 1, anim: false });
  // ---- the square: lamp standards (not in a row), the trees by the stop, a bench, pigeons on the setts and the steps
  Pl.push({ obj: 'street.lamppost', at: [-17.5, 24.5], k: 1.2 }, { obj: 'street.lamppost', at: [17, 31], k: 1.2 }, { obj: 'street.lamppost', at: [-20, 50], k: 1.2 },
    { obj: 'tree.mcr-street-tree', at: [-19, 33], k: 0.95, variant: 2, pit: true }, { obj: 'tree.mcr-street-tree', at: [22, 44], k: 1, variant: 1, pit: true },
    { obj: 'structure.mcr-planter', at: [-11, 13], k: 1, variant: 1 }, { obj: 'person.bench-sitter', at: [-10, 12.8], k: 1, variant: 0 });
  Pl.push(...M.pigeons(37, [[-3.6, 9, 6, 2.4], [-6, 12, 4, 3], [6, 9.4, 3, 2], [-6, 20, 4, 3]], (x, d) => [x, d]));
  data.flocks.push({ obj: 'bird.small-flight', n: 8, area: [300, 260, 1100, 460], speed: 55, s: 0.45, seed: 38, layer: 'mid' });
  data.flocks.push({ obj: 'bird.gull', n: 2, area: [300, 60, 1500, 200], speed: 24, s: 0.35, seed: 39, layer: 'far' });
  // ---- pass 2 (the review: too empty): the square's ground varies, leaves blow about, bins, cycle stands, a wayfinding totem,
  // more street trees, the near walkers from behaviours; the setts between the rails take the same variation
  const F = SCENE_MCR_FILL;
  const xc = d => d < 30 ? 3 - 2 * d / 26 : d < 60 ? 1 - 6 * (d - 30) / 30 : -5 - (d - 60) / 4;   // the tram line's centre at depth d
  data.ground.push(...F.tone(cam, { seed: 3101, n: 70, box: [-44, 44, 4, 60], w: [3, 2, 2, 1], clip: (x, d) => Math.abs(x - xc(d)) > 8.2 }));
  // the trackbed's own setts: darker and paler runs between and beside the rails
  data.ground.push(...F.tone(cam, { seed: 3103, n: 40, box: [-12, 8, 4, 70], cols: ['@tramway.0', '@tramway.1'], w: [1, 1], size: 0.8, clip: (x, d) => Math.abs(x - xc(d)) < 3.2 }));
  data.scatter.push({ obj: { 'ground.leaf-litter': 1, 'ground.leaves': 1 }, on: ['sq-l', 'sq-r'], d: [5, 40], n: 22, dist: 'ground', cluster: { centres: 5, spread: 3 }, k: [0.7, 1.1], seed: 3102, anim: false, tint: { col: '#7a6a50', k: [0, 0.1] } });
  Pl.push({ obj: 'tree.mcr-street-tree', at: [17.5, 15], k: 1, variant: 0, pit: true, flip: true },
    { obj: 'street.mcr-bin', at: [-8.4, 12.4], k: 1, variant: 1 }, { obj: 'street.mcr-bin', at: [14.6, 21.5], k: 1 },
    { obj: 'street.mcr-cycle-stand', at: [-14, 22.5], k: 1, variant: 1 }, { obj: 'street.mcr-totem', at: [12.9, 21], k: 1, variant: 0 },
    { obj: 'person.bench-reader', at: [21, 30], k: 0.85, variant: 1 });
  data.actors.push(...F.life(data, [
    { obj: 'person.walker', preset: 'brisk', route: [[-30, 13.4], [-20, 13.2], [-10, 13.6]], seed: 3111, offset: 0.2, variant: 4 },
    { obj: 'person.shopper', preset: 'stroll', route: [[34, 16], [24, 15.4], [14, 16.4]], seed: 3112, offset: 0.65, variant: 1 },
    { obj: 'person.dog-walker', preset: 'dog-walker', route: [[30, 27], [22, 26], [14.5, 25]], seed: 3113, offset: 0.4 },
  ]));
  // ---- framing: the portico's column up the right edge, the step edge along the foot
  Pl.push({ obj: 'structure.mcr-portico-column', x: 1580, y: 900, s: 0.98, pin: true, layer: 'front', shadow: false, anim: false });
  return data;
}
