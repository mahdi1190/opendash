/* ============================================================
   COMPOSED SCENE (v2, by hand) uk-north-west / Manchester civic quarter, view 4: Deansgate and the John Rylands Library.
   docs/dev/SCENE_ENGINE_V2.md. Ground plan and the library in 70-scene-lib-manchester-centre.js (SCENE_MCR_VIEWS.v4).

   The view: from Deansgate's east pavement, looking south-west across the road at an angle. Deansgate sweeps from the near
   left to the far right (the leading line), the John Rylands Library's red sandstone Gothic front along its far side: the
   two wings of traceried windows, the entrance arch and the great oriel between the pinnacled towers. North of it (left)
   Deansgate's Victorian commercial fronts; south of it (right, far) the Spinningfields glass. Framing: a lamp standard
   and the bus stop's shelter on our pavement, the kerb across the foot. The life: Deansgate's buses (double-deckers),
   black cabs and cars both ways, cyclists, the crowd on both pavements, people at the crossing by the library, pigeons.
   PURE: defines sceneUkMcrCentre4() -> the scene data, called once, lazily.
   ============================================================ */
function sceneUkMcrCentre4() {
  const M = SCENE_MCR, V = SCENE_MCR_VIEWS.v4, cam = V.camera, C = M.cam(cam), P = V.P;
  const R1 = v => Math.round(v * 10) / 10, R2 = v => Math.round(v * 100) / 100;
  const line = (k) => [P(-60, k), P(0, k), P(60, k), P(160, k)];
  const data = {
    v: 2, id: 'mcr-centre-4',
    view: { lat: cam.lat, lon: cam.lon },
    camera: Object.assign({}, cam),
    at: 'afternoon', season: 'auto', setting: 'urban', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season', signage: false,
    kits: ['urban', 'people', 'birds'],
    sky: { stars: 120, clouds: { n: 5, y: [30, 220], speed: 5 }, sunR: 22, moonR: 16 },
    palette: M.palette(),
    surfaces: [
      { id: 'land', kind: 'pavement', rest: true },
      { id: 'deansgate', kind: 'road', path: line(V.road), width: V.roadW, markings: 'centre' },
      { id: 'pave-e', kind: 'pavement', beside: 'deansgate', side: 'right', width: 6, kerb: 0.12 },
      { id: 'pave-w', kind: 'pavement', beside: 'deansgate', side: 'left', width: 4.4, kerb: 0.12 },
      { id: 'xing', kind: 'road', path: [P(26, 7.6), P(26, 20.4)], width: 3.2, markings: 'zebra', crossing: true },
    ],
    water: [], ground: [], place: [], scatter: [], actors: [], flocks: [], buildings: [],
    flows: [
      { id: 'traffic', kind: 'drive', on: 'deansgate', density: 1.2, profile: 'town', mix: { 'vehicle.car-city': 5, 'vehicle.taxi-black': 3, 'vehicle.car': 2 }, bus: { obj: 'vehicle.bus-double-decker', every: 3 }, speed: [4, 8], max: 9, seed: 41 },
      { id: 'cycles', kind: 'cycle', on: [], density: 0.6, profile: 'commuter', mix: { 'person.cyclist-commuter': 2, 'person.cyclist': 1 }, max: 3, seed: 42, lanes: [{ path: line(9.8), dir: 1 }, { path: line(11.2).slice().reverse(), dir: -1 }] },
      { id: 'east', kind: 'walk', on: ['pave-e'], density: 9, profile: 'town', mix: { 'person.walker': 4, 'person.commuter': 4, 'person.student': 3, 'person.shopper': 3, 'person.couple': 2, 'person.takeaway-walker': 2, 'person.buggy-walker': 1, 'person.dog-walker': 1 }, speed: [1.0, 1.5], both: true, max: 18, seed: 43 },
      { id: 'west', kind: 'walk', on: [], density: 7, profile: 'town', mix: 'kit', speed: [1.0, 1.5], both: true, max: 12, seed: 44, lanes: [{ path: [P(-60, 21.6), P(0, 21.6), P(25, 21.8), P(26.5, 23.6)], dir: 1 }, { path: [P(26.5, 23.4), P(24, 22.8), P(0, 22.8), P(-60, 22.8)], dir: 1 },
        { path: [P(43, 24.2), P(46, 22), P(80, 21.6), P(160, 21.6)], dir: 1 }, { path: [P(160, 22.8), P(80, 22.8), P(50, 23), P(47, 24.2)], dir: 1 }] },
    ],
  };
  const Pl = data.place;
  // the pavements' flagstones (joints across and along) and the double yellow lines by both kerbs
  data.ground.push(...M.paving(cam, [0, 0], V.u, V.n, -20, 160, [0.4, 1.4, 2.4, 3.4, 4.4, 5.4, 6.4, 7.4], 0.04, '#9a9488', null));
  data.ground.push(...M.paving(cam, [0, 0], V.u, V.n, -20, 160, [V.road - V.roadW / 2 + 0.35, V.road - V.roadW / 2 + 0.55, V.road + V.roadW / 2 - 0.35, V.road + V.roadW / 2 - 0.55], 0.1, '#e8c440', null));
  // ---- the John Rylands Library on the far side
  { const a = SCENE_MCR_SPEC.rylands[0].a, p = C.p(a[0], a[1], 0); Pl.push({ obj: 'landmark.mcr-john-rylands', x: R1(p[0]), y: R1(p[1]), s: 1, pin: true, layer: 'near', shadow: false, anim: false, subject: true }); }
  // Deansgate's other fronts on the far side: Victorian commercial blocks north (left), modern glass to the south (right)
  const block = (t0, w, k0, dp, style, st, seed, roof) => data.buildings.push({ style, foot: [P(t0, k0), P(t0 + w, k0), P(t0 + w, k0 + dp), P(t0, k0 + dp)], front: 0, storeys: st, seed, roof: roof || 'flat' });
  block(-8, 12, 24.5, 16, 'mcr-palazzo', 4, 701); block(4.2, 10, 24.5, 18, 'mcr-palazzo', 5, 702, 'mansard'); block(14.4, 13.2, 24.5, 18, 'mcr-palazzo', 4, 703);
  block(71, 26, 24.5, 24, 'modern-glass', 9, 704); block(98, 30, 24.5, 26, 'modern-glass', 12, 705); block(130, 30, 24.5, 26, 'mcr-palazzo', 6, 706);
  // ---- street furniture: lamps (not in step), a bus stop, bins, a cycle hire stand, the crossing's signal poles
  Pl.push({ obj: 'street.lamppost', at: P(10, 7.4), k: 1.15, variant: 2 }, { obj: 'street.lamppost', at: P(46, 7.4), k: 1.15, variant: 2, flip: true }, { obj: 'street.lamppost', at: P(36, 20.4), k: 1.15, variant: 2 }, { obj: 'street.lamppost', at: P(12, 20.4), k: 1.15, variant: 2, flip: true },
    { obj: 'street.bollard', at: P(24, 7.5), k: 1 }, { obj: 'street.bollard', at: P(28, 7.5), k: 1 }, { obj: 'street.bollard', at: P(24.4, 20.3), k: 1 }, { obj: 'street.bollard', at: P(27.8, 20.3), k: 1 },
    { obj: 'tree.plane-avenue', at: P(60, 22), k: 0.9, variant: 2, pit: true });
  // ---- people stopped: at the crossing, at the library's door, a busker on our side; pigeons along the kerb
  Pl.push({ obj: 'person.phone-idler', at: P(25, 21.4), k: 1 }, { obj: 'person.couple', at: P(27, 6.2), k: 1, anim: false }, { obj: 'person.photographer', at: P(38, 22.4), k: 1 },
    { obj: 'person.student', at: P(14, 5.4), k: 1, anim: false }, { obj: 'person.elderly-couple', at: P(44, 22.8), k: 1, anim: false });
  Pl.push(...M.pigeons(49, [[4, 6.2, 5, 3], [12, 6.6, 3, 2], [16, 4.2, 4, 2.4]], (t, k) => P(t, k)));
  data.flocks.push({ obj: 'bird.small-flight', n: 6, area: [200, 280, 900, 520], speed: 55, s: 0.45, seed: 48, layer: 'mid' });
  data.flocks.push({ obj: 'bird.gull', n: 2, area: [300, 60, 1500, 200], speed: 24, s: 0.35, seed: 49, layer: 'far' });
  // ---- pass 2 (the review: too empty): the flags vary (newer, worn, wet and gum-spotted runs), leaves blow along the kerbs,
  // street trees on both pavements (the young planes at the Spinningfields end), bins, a cycle stand, a wayfinding totem,
  // the near walkers from behaviours
  const F = SCENE_MCR_FILL, kOf = (x, d) => x * V.n[0] + d * V.n[1];
  data.ground.push(...F.tone(cam, { seed: 4101, n: 70, box: [-30, 80, 4, 120], w: [3, 2, 2, 1], cols: ['@tone.0', '@tone.1', '@tone.2', '@tone.3'], clip: (x, d) => { const k = kOf(x, d); return k < 7.6 || (k > 20.4 && k < 24.2); } }));
  data.ground.push(...F.tone(cam, { seed: 4103, n: 30, box: [-30, 80, 6, 120], cols: ['@road.0', '@road.1'], w: [1, 1], size: 1.4, clip: (x, d) => { const k = kOf(x, d); return k > 8.6 && k < 19.4; } }));
  data.scatter.push({ obj: { 'ground.leaf-litter': 1, 'ground.leaves': 1 }, on: ['pave-e', 'pave-w', 'land'], d: [5, 40], n: 22, dist: 'ground', cluster: { centres: 5, spread: 3 }, k: [0.7, 1.1], seed: 4102, anim: false, tint: { col: '#7a6a50', k: [0, 0.1] } });
  Pl.push({ obj: 'tree.mcr-street-tree', at: P(33, 5.6), k: 1, variant: 1, pit: true }, { obj: 'tree.mcr-street-tree', at: P(88, 22.2), k: 0.95, variant: 0, pit: true, flip: true }, { obj: 'tree.mcr-street-tree', at: P(112, 22.6), k: 1, variant: 2, pit: true },
    { obj: 'street.mcr-bin', at: P(18, 6.8), k: 1, variant: 1, flip: true }, { obj: 'street.mcr-bin', at: P(54, 20.8), k: 1 },
    { obj: 'street.mcr-cycle-stand', at: P(22, 3.1), k: 1, variant: 0, flip: true }, { obj: 'street.mcr-totem', at: P(23, 6.9), k: 1, variant: 1, flip: true });
  data.actors.push(...F.life(data, [
    { obj: 'person.walker', preset: 'brisk', route: [P(13, 4.6), P(30, 4.4), P(60, 4.8)], seed: 4111, offset: 0.3, variant: 5 },
    { obj: 'person.buggy-walker', preset: 'stroll', route: [P(52, 5.6), P(30, 5.8), P(13, 5.4)], seed: 4112, offset: 0.7, variant: 2 },
    { obj: 'person.dog-walker', preset: 'dog-walker', route: [P(0, 22.2), P(8, 22), P(24, 22.4)], seed: 4113, offset: 0.5 },
  ]));
  // ---- framing: the bus shelter on our pavement at the left, a lamp standard close on the right
  Pl.push({ obj: 'street.mcr-tram-shelter', x: 150, y: 905, s: 1.5, pin: true, layer: 'front', shadow: false, variant: 0 });
  Pl.push({ obj: 'street.lamppost', x: 1530, y: 940, s: 2.4, pin: true, layer: 'front', shadow: false, variant: 2 });
  return data;
}
