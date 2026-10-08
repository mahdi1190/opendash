/* ============================================================
   COMPOSED SCENES: Woking, Surrey, the second batch (docs/dev/SCENE_ENGINE.md sections 3 and 8).
   Seven DIFFERENT real places, each composed for its own spot (no shared template):
     1 woking-commercial-way  a shopping street, paved, looking down it to the Victoria Square towers (street level)
     2 woking-kingfield       a non-league match day from the car park corner (low, across the fence to the stand)
     3 woking-old-village     the flint church of Old Woking from the churchyard gate (looking up at the tower)
     4 woking-necropolis      the platform of the Brookwood cemetery station at dawn (a long view along the track)
     5 woking-canal-lock      a lock on the Basingstoke Canal from the towpath (across the water)
     6 woking-wey-byfleet     the river Wey at Byfleet: a brick bridge, anglers and boats on the water
     7 woking-hook-heath      a sandy heath ride, a veteran pine on the skyline (low, in the heather)
   Each scene is a THUNK (built when shown or linted). The season comes from the date ('auto'), the light
   from the live sky. Registered by 72-anim-pack-uk-area-woking-b.js (pack uk-area-woking-b).
   Objects come from the shared library and 70-scene-lib-area-woking-b.js. Data only (PURE).
   ============================================================ */
(function () {
  if (typeof sceneAdd !== 'function' || typeof sceneObj !== 'function' || typeof scenePersonScale !== 'function') return;
  if (!sceneObj('landmark.woking-towers') || !sceneObj('landmark.old-woking-church')) return;
  const PACK = 'uk-area-woking-b';
  const TINT = { col: '#8a7a40', k: [0, 0.16] };

  /* ---------- helpers (the scene's own; the archetypes are not used: each composition is its own) ---------- */
  const H = id => { const o = sceneObj(id); return o && o.size ? o.size[1] : 60; };
  const vr = id => { const o = sceneObj(id); return o && o.variants > 1 ? [0, 1] : [0]; };
  const shd = id => { const o = sceneObj(id); return !!(o && o.shadow); };
  const layers = () => [{ id: 'horizon', depth: 0.08, haze: 0.45 }, { id: 'far', depth: 0.2, haze: 0.24 }, { id: 'mid', depth: 0.45, haze: 0.1 }, { id: 'near', depth: 0.75, haze: 0 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 }];
  /** The palette: the ground fills in four seasons (the delta E rule needs a real summer to winter change). */
  const pal = () => ({
    base: {
      pave: ['#bdb6aa', '#a79f92', '#cdc7bb'], road: ['#5a5d61', '#484b4f', '#6a6d71'], tarmac: ['#4c4f53', '#3d4043', '#5a5d61'],
      lawn: ['#6e9246', '#5a7c3a', '#486832'], grass: ['#6a8a44', '#557236', '#42602c'], path: ['#b49c76', '#9a8462', '#c6b08a'],
      sand: ['#cbb48a', '#b59e74', '#dcc79e'], platform: ['#8a8176', '#746c62', '#9e968a'], ballast: ['#8c8a84', '#77756f'],
      water: ['#3f6f7e', '#2d5661'], bank: ['#5d6a3a', '#4a5530'], heath: ['#6b6a3c', '#55542e'], base: ['#8a8478', '#746e63'],
    },
    spring: { lawn: ['#78a048', '#628a3c', '#4e7432'], grass: ['#74983e', '#5a7a30', '#466228'], bank: ['#6e8a40', '#587230'], heath: ['#7c8a40', '#66723a'] },
    autumn: { lawn: ['#7e8a44', '#687236', '#545c2c'], grass: ['#8a7e40', '#6e6232', '#54502a'], bank: ['#7a6c3a', '#5f5428'], heath: ['#8a7a3c', '#6e6230'] },
    winter: { lawn: ['#8a9480', '#727c6a', '#5e6858'], grass: ['#8a9080', '#6e766a', '#586058'], bank: ['#7c7e70', '#62645a'], heath: ['#8c8c76', '#72735f'] },
  });
  const base = (p) => ({
    v: 1, id: p.id, view: { lat: p.lat, lon: p.lon, heading: p.heading, fov: 78, horizon: p.horizon, lift: 1 },
    at: p.at || 'day', season: 'auto', tropic: 'summer', setting: p.setting, signage: false, palette: pal(),
    layers: layers(), sky: { stars: 200, clouds: { n: p.clouds || 4, y: [40, Math.max(200, p.horizon - 140)], speed: 5 }, sunR: 24, moonR: 18 },
    ground: [], water: [], place: [], scatter: [], actors: [], flocks: [], particles: 'season', weather: 'live', camera: { pan: 0, period: 90 },
  });
  const pY = (d, id, y) => scenePersonScale(H(id), y, d.view);
  /** A hand-placed object (its shadow follows the object's own shadow definition). */
  const put = (d, obj, layer, x, y, s, o) => d.place.push(Object.assign({ obj, x, y, s, layer, variant: 0, seed: (x * 7 + y * 3) % 997, anim: false, shadow: shd(obj) }, o || {}));
  /** A person standing at the depth of his feet (the scale comes from the view). */
  /** A hand-placed object that keeps its own hooks (wind sway, a turn, a flap): a few per scene. */
  const live = (d, obj, layer, x, y, s, o) => put(d, obj, layer, x, y, s, Object.assign({ anim: null }, o || {}));
  const person = (d, obj, layer, x, y, o) => put(d, obj, layer, x, y, pY(d, obj, y), Object.assign({ flip: x % 2 === 0 }, o || {}));
  /** A seeded scatter rule over an area (poly [[x,y]..] or rect [x0,y0,x1,y1]); tint only when the rule asks for it. */
  const sc = (d, obj, layer, seed, area, n, o) => {
    const first = typeof obj === 'string' ? obj : Object.keys(obj)[0];
    const r = Object.assign({ obj, layer, seed, area, n, minGap: 12, s: [0.6, 1.25], flip: 0.5, variant: vr(first), anim: false, shadow: shd(first) }, o || {});
    if (!r.tint && n >= 20) r.tint = TINT;
    d.scatter.push(r);
  };
  /** An actor walking a path (sByY scales vehicles and animals by the depth at their feet). */
  const walk = (d, obj, layer, path, speed, o) => d.actors.push(Object.assign({ obj, layer, path, speed, loop: 'pingpong', s: 1, sByY: true, anim: false, seed: (path[0][0] | 0) % 89 + 3, offset: ((path[0][1] * 13) % 100) / 100 }, o || {}));
  const flock = (d, obj, layer, n, area, speed, s, seed) => d.flocks.push({ obj, n, area, speed, s, seed, layer });
  const lake = (d, layer, poly, y0, y1, base, o) => d.water.push(Object.assign({ layer, d: poly, y0, y1, base, reflect: true, shimmer: 26, lightPath: false }, o || {}));

  /* ================================================================
     1. Commercial Way: a paved shopping street, street level. The towers close the vista at the end.
     ================================================================ */
  function s1() {
    const d = base({ id: 'woking-commercial-way', lat: 51.3192, lon: -0.5604, heading: 255, horizon: 420, at: 'day', setting: 'urban', clouds: 5 });
    d.ground.push({ layer: 'horizon', d: 'M-160 428H1760V900H-160Z', fill: '@base.0' });
    // the paved street, a narrow tarmac bus lane up the middle to the vanishing point
    d.ground.push({ layer: 'near', d: 'M-160 900V436H1760V900Z', fill: '@pave.0' });
    d.ground.push({ layer: 'near', d: 'M816 900L984 900L904 436L896 436Z', fill: '@road.0' });
    d.ground.push({ layer: 'near', d: 'M-160 762H1760V768H-160Z M-160 600H1760V603H-160Z', fill: '@pave.2' });
    // the far shopfronts across the street, the terraces and the towers at the end of the vista
    put(d, 'building.shopfront', 'horizon', 120, 432, 0.5, { flip: true, variant: 1 });
    put(d, 'building.terrace-victorian', 'horizon', 330, 434, 0.52);
    put(d, 'building.shopfront', 'horizon', 1290, 432, 0.56);
    put(d, 'building.shopfront', 'horizon', 1460, 434, 0.58, { flip: true, variant: 1 });
    put(d, 'landmark.woking-towers', 'horizon', 1000, 434, 0.9);
    put(d, 'building.shopfront', 'mid', 40, 520, 1.0);
    put(d, 'building.shopfront', 'mid', -90, 486, 0.92, { flip: true });
    put(d, 'building.shopfront', 'mid', 1420, 524, 1.02);
    put(d, 'building.shopfront', 'mid', 1640, 486, 0.95, { flip: true });
    put(d, 'building.shopfront', 'near', -60, 760, 1.5, { flip: false });
    put(d, 'building.shopfront', 'near', 1650, 720, 1.4, { flip: true });
    // lamps and the trees in planters along the kerbs
    put(d, 'street.lamppost', 'mid', 612, 600, 0.9);
    put(d, 'street.lamppost', 'near', 502, 760, 1.2);
    put(d, 'street.lamppost', 'mid', 1150, 640, 0.92);
    put(d, 'street.lamppost', 'near', 1302, 820, 1.3);
    put(d, 'tree.bank-birch', 'mid', 690, 600, 0.95, { flip: true });
    put(d, 'tree.bank-oak', 'near', 1230, 760, 1.2, { flip: false });
    live(d, 'tree.bank-birch', 'mid', 1010, 612, 0.9, { flip: false });
    live(d, 'bird.pigeon', 'near', 880, 884, 1.5, { flip: false });
    // the paved street is covered from edge to edge: bollards, planters, shrubs and benches (static, the cover)
    sc(d, 'plant.planter', 'near', 11, { rect: [-160, 600, 1760, 900] }, 110, { s: [0.5, 0.8], minGap: 14, mask: { avoid: [{ rect: [800, 600, 1000, 900] }] } });
    sc(d, 'plant.shrub', 'near', 15, { rect: [-160, 600, 1760, 900] }, 70, { s: [0.5, 0.8], minGap: 20, mask: { avoid: [{ rect: [800, 600, 1000, 900] }] } });
    sc(d, 'tree.bank-distant', 'far', 16, { rect: [-160, 470, 1760, 520] }, 6, { s: [0.5, 0.8], minGap: 80 });
    sc(d, 'plant.planter', 'mid', 12, { rect: [-160, 560, 1760, 640] }, 40, { s: [0.6, 1.0], minGap: 14, sByY: [[560, 0.45], [640, 0.75]] });
    sc(d, { 'street.bollard': 1, 'plant.shrub': 1 }, 'fore', 13, { rect: [-160, 840, 1760, 900] }, 18, { s: [1.1, 1.6], minGap: 60, sByY: [[840, 1.05], [900, 1.5]] });
    put(d, 'street.bench', 'fore', 300, 872, 1.45, { flip: false });
    put(d, 'street.bench', 'near', 1420, 820, 1.2, { flip: true });
    // the bus in the lane, a car behind it, a taxi, a few people (kept few) and the dog, the pigeons over the street
    walk(d, 'vehicle.bus', 'near', [[930, 440], [905, 640], [868, 900]], 46, { loop: 'pingpong' });
    walk(d, 'vehicle.car', 'mid', [[890, 438], [930, 520], [1010, 610]], 34, { loop: 'loop' });
    walk(d, 'vehicle.taxi', 'near', [[1040, 900], [960, 560]], 40, { loop: 'loop' });
    walk(d, 'animal.dog', 'near', [[-120, 840], [380, 760], [620, 700]], 16, { loop: 'pingpong', offset: 0.2 });
    walk(d, 'person.shopper', 'near', [[-120, 880], [460, 780], [640, 740]], 22, { loop: 'pingpong', offset: 0.1 });
    walk(d, 'person.shopper', 'mid', [[1700, 790], [1280, 640], [1170, 612]], 19, { loop: 'pingpong', offset: 0.4 });
    person(d, 'person.walker', 'mid', 1420, 596);
    person(d, 'person.couple', 'near', 1260, 806);
    flock(d, 'bird.pigeon', 'horizon', 8, [120, 160, 1500, 330], 26, 0.5, 21);
    flock(d, 'bird.gull', 'horizon', 4, [560, 110, 1400, 260], 34, 0.45, 23);
    return d;
  }

  /* ================================================================
     2. Kingfield: a non-league match day, from the car park. A low view across the fence to the stand.
     ================================================================ */
  function s2() {
    const d = base({ id: 'woking-kingfield', lat: 51.3203, lon: -0.5694, heading: 20, horizon: 520, at: 'afternoon', setting: 'urban', clouds: 4 });
    d.ground.push({ layer: 'horizon', d: 'M-160 520H1760V900H-160Z', fill: '@lawn.2' });
    d.ground.push({ layer: 'mid', d: 'M-160 560L1760 552V628L-160 640Z', fill: '@lawn.0' });
    // the car park in the foreground, its bays painted in pale lines
    d.ground.push({ layer: 'near', d: 'M-160 640H1760V900H-160Z', fill: '@tarmac.1' });
    const bays = []; for (let x = -120; x < 1700; x += 118) bays.push(`M${x} 690V790H${x + 3}V690z`);
    d.ground.push({ layer: 'near', d: bays.join(''), fill: '#e6e4da' });
    d.ground.push({ layer: 'near', d: 'M-160 672H1760V676H-160z', fill: '#e6e4da' });
    // the stand and the pylons across the pitch
    put(d, 'landmark.kingfield-floodlights', 'mid', 800, 560, 1.0, { flip: false, reflect: false });
    put(d, 'structure.fence', 'mid', 120, 610, 1.0);
    put(d, 'structure.fence', 'mid', 1300, 604, 1.0);
    put(d, 'street.lamppost', 'near', 1420, 720, 1.35);
    put(d, 'street.lamppost', 'near', 180, 800, 1.5);
    live(d, 'tree.bank-birch', 'far', 1240, 548, 1.1, { flip: true });
    live(d, 'bird.pigeon', 'near', 610, 830, 1.4, { flip: false });
    live(d, 'bird.pigeon', 'near', 1180, 866, 1.5, { flip: true });
    // trees behind the far fence, a mix of species, and the grass of the touchline
    sc(d, { 'tree.bank-oak': 2, 'tree.bank-birch': 1, 'tree.far-broad': 1 }, 'far', 31, { rect: [-160, 500, 1760, 560] }, 18, { s: [0.3, 0.55], minGap: 30 });
    sc(d, { 'plant.grass': 3, 'plant.wildflowers': 1, 'plant.shrub': 1 }, 'mid', 32, { rect: [-160, 556, 1760, 636] }, 170, { s: [0.6, 1.2], minGap: 9, mask: { avoid: [{ rect: [380, 500, 1220, 600] }] } });
    // the cars in the bays: parked along the whole car park, a few leaving on the drive (moving)
    sc(d, { 'vehicle.car': 4, 'vehicle.taxi': 1, 'vehicle.bus': 1 }, 'near', 33, { rect: [-160, 660, 1760, 900] }, 110, { s: [0.8, 1.35], minGap: 36 });
    sc(d, { 'vehicle.car': 1, 'street.bench': 1 }, 'near', 36, { rect: [-160, 690, 1760, 760] }, 18, { s: [0.6, 1.5], minGap: 30 });
    sc(d, { 'street.bollard': 1, 'street.lamp': 1, 'plant.grass': 1 }, 'fore', 34, { rect: [-160, 850, 1760, 900] }, 22, { s: [1.0, 1.7], minGap: 50, sByY: [[850, 1.0], [900, 1.6]] });
    sc(d, { 'street.bollard': 1, 'plant.shrub': 1 }, 'near', 35, { rect: [-160, 672, 1760, 720] }, 18, { s: [0.7, 1.1], minGap: 14 });
    walk(d, 'vehicle.car', 'near', [[-120, 760], [420, 752], [1700, 766]], 26, { loop: 'loop', offset: 0.3 });
    walk(d, 'vehicle.car', 'near', [[1700, 828], [1200, 806], [600, 824]], 22, { loop: 'pingpong', offset: 0.6 });
    walk(d, 'vehicle.taxi', 'mid', [[1100, 610], [800, 600], [1220, 606]], 14, { loop: 'pingpong', offset: 0.5 });
    // the fans: three by the gate and two walking on the car park, and a pair at the fence
    person(d, 'person.football-fan', 'near', 430, 784, { flip: true });
    person(d, 'person.football-fan', 'near', 860, 730);
    person(d, 'person.football-fan', 'near', 1500, 874, { flip: false });
    person(d, 'person.couple', 'near', 960, 724);
    walk(d, 'person.football-fan', 'near', [[-80, 740], [520, 694], [860, 744]], 26, { loop: 'pingpong', offset: 0.1 });
    walk(d, 'person.walker', 'mid', [[1100, 600], [820, 590], [1120, 596]], 18, { loop: 'pingpong', offset: 0.6 });
    flock(d, 'bird.small-flight', 'horizon', 7, [200, 120, 1500, 340], 34, 0.5, 44);
    flock(d, 'bird.herring-gull-flight', 'horizon', 4, [400, 150, 1400, 300], 30, 0.5, 46);
    return d;
  }

  /* ================================================================
     3. Old Woking: the flint church from the churchyard gate, looking up at the tower (low horizon).
     ================================================================ */
  function s3() {
    const d = base({ id: 'woking-old-village', lat: 51.3157, lon: -0.5736, heading: 175, horizon: 600, at: 'golden', setting: 'mixed', clouds: 3 });
    d.ground.push({ layer: 'horizon', d: 'M-160 600H1760V900H-160Z', fill: '@lawn.0' });
    d.ground.push({ layer: 'near', d: 'M-160 760Q500 730 900 752T1760 740V900H-160Z', fill: '@lawn.1' });
    // the churchyard path: stone flags from the gate up to the porch
    d.ground.push({ layer: 'near', d: 'M650 900L940 900L842 604L808 604Z', fill: '@path.0' });
    d.ground.push({ layer: 'near', d: 'M676 900L706 900L676 880z M860 900L900 900L850 874z', fill: '@path.2' });
    // the village green rolling away to the right, the far hedge line
    d.ground.push({ layer: 'far', d: 'M-160 606Q400 596 900 602T1760 592V640H-160Z', fill: '@grass.1' });
    put(d, 'landmark.old-woking-church', 'mid', 800, 612, 1.05, { flip: false });
    put(d, 'structure.stone-wall', 'near', -20, 782, 1.0, { flip: false });
    put(d, 'structure.stone-wall', 'near', 1500, 796, 1.1, { flip: true });
    live(d, 'tree.ancient-oak', 'far', 80, 620, 1.2, { flip: false });
    live(d, 'animal.rabbit', 'near', 1280, 884, 0.8, { flip: false });
    put(d, 'tree.bank-alder', 'mid', 1340, 592, 1.1, { flip: true });
    put(d, 'tree.birch-heath', 'far', 1560, 600, 0.9);
    put(d, 'street.bench', 'near', 1130, 838, 1.05, { flip: false });
    put(d, 'street.lamp', 'near', 640, 710, 1.1);
    // the green's grass and flowers in the mixed species, the hedge and the shrubs, the far oaks
    sc(d, { 'plant.grass': 4, 'plant.wildflowers': 1 }, 'near', 41, { poly: [[-160, 700], [1760, 700], [1760, 900], [-160, 900]] }, 290, { s: [0.7, 1.3], minGap: 7, tint: { col: '#8a7a40', k: [0, 0.16] }, mask: { avoid: [{ poly: [[700, 900], [890, 900], [830, 700], [810, 700]] }] } });
    sc(d, { 'plant.grass': 1, 'plant.wildflowers': 1 }, 'near', 47, { poly: [[-160, 700], [1760, 700], [1760, 900], [-160, 900]] }, 60, { s: [0.8, 1.2], minGap: 10, mask: { avoid: [{ poly: [[700, 900], [890, 900], [830, 700], [810, 700]] }] } });
    sc(d, { 'plant.grass': 1, 'plant.wildflowers': 1 }, 'fore', 42, { rect: [-160, 840, 1760, 900] }, 24, { s: [1.0, 1.5], minGap: 26, sByY: [[840, 1.0], [900, 1.5]] });
    sc(d, { 'tree.bank-oak': 2, 'tree.far-birch': 1 }, 'far', 44, { rect: [-160, 580, 1760, 602] }, 10, { s: [0.45, 0.8], minGap: 40 });
    // a few people (the bench reader, an elderly walker), two dogs and the rooks over the tower
    person(d, 'person.bench-reader', 'near', 1156, 818);
    person(d, 'person.elderly-walker', 'near', 1000, 850);
    person(d, 'person.dog-walker', 'mid', 1420, 690);
    walk(d, 'animal.dog', 'near', [[-120, 860], [560, 818], [940, 882]], 22, { loop: 'pingpong', offset: 0.2 });
    walk(d, 'animal.rabbit', 'near', [[1560, 866], [1380, 856], [1460, 874]], 6, { loop: 'pingpong', offset: 0.5, s: 0.7, sByY: false });
    walk(d, 'animal.rabbit', 'mid', [[320, 650], [220, 640], [360, 648]], 5, { loop: 'pingpong', offset: 0.1, s: 0.55, sByY: false });
    flock(d, 'bird.small-flight', 'far', 8, [360, 260, 1280, 420], 30, 0.45, 61);
    flock(d, 'bird.pigeon', 'far', 4, [200, 300, 1500, 440], 24, 0.4, 62);
    return d;
  }

  /* ================================================================
     4. Brookwood: the cemetery station platform at dawn. The track runs left to right under the trees.
     ================================================================ */
  function s4() {
    const d = base({ id: 'woking-necropolis', lat: 51.2948, lon: -0.6050, heading: 300, horizon: 470, at: 'dawn', setting: 'mixed', clouds: 6 });
    d.ground.push({ layer: 'horizon', d: 'M-160 470H1760V900H-160Z', fill: '@grass.2' });
    // the cemetery lawns beyond the track, the track bed and the rails, the platform edge, the platform
    d.ground.push({ layer: 'far', d: 'M-160 520Q700 500 1760 520V690H-160Z', fill: '@lawn.1' });
    d.ground.push({ layer: 'mid', d: 'M-160 690H1760V738H-160Z', fill: '@ballast.0' });
    d.ground.push({ layer: 'mid', d: 'M-160 706H1760V709H-160zM-160 726H1760V729H-160z', fill: '#4a4e52' });
    d.ground.push({ layer: 'near', d: 'M-160 748H1760V800H-160Z', fill: '@platform.1' });
    d.ground.push({ layer: 'near', d: 'M-160 800H1760V900H-160Z', fill: '@platform.0' });
    d.ground.push({ layer: 'near', d: 'M-160 796H1760V802H-160Z', fill: '#e2dccf' });
    // the station building and its canopy across the track, the platform furniture
    put(d, 'landmark.necropolis-station', 'mid', 620, 668, 0.95, { flip: false });
    put(d, 'rail.canopy', 'near', 1220, 790, 1.2, { flip: false });
    put(d, 'street.station-clock', 'near', 1500, 786, 1.25);
    put(d, 'street.bench', 'near', 340, 846, 1.2, { flip: false });
    put(d, 'street.lamp', 'near', 80, 782, 1.25);
    put(d, 'street.lamp', 'near', 1460, 778, 1.3);
    live(d, 'tree.cedar', 'far', 1420, 500, 1.2, { flip: false });
    live(d, 'bird.pigeon', 'near', 880, 812, 1.5, { flip: true });
    // the cemetery trees, cedars and pines on the skyline, and the cover of the lawns and hedges
    sc(d, { 'tree.cedar': 2, 'tree.distant-pine': 2, 'tree.far-broad': 1 }, 'horizon', 51, { rect: [-160, 440, 1760, 520] }, 44, { s: [0.5, 1.0], minGap: 18, mask: { noise: { scale: 240, cut: 0.3 } } });
    sc(d, { 'tree.cedar': 1, 'tree.far-pine': 1 }, 'far', 52, { rect: [-160, 480, 1760, 560] }, 16, { s: [0.4, 1.3], minGap: 60 });
    sc(d, 'plant.grass', 'mid', 53, { rect: [-160, 626, 1760, 690] }, 290, { s: [0.8, 1.2], minGap: 6, mask: { avoid: [{ rect: [520, 600, 720, 690] }] } });
    sc(d, { 'plant.wildflowers': 1 }, 'mid', 57, { rect: [-160, 626, 1760, 690] }, 110, { s: [0.6, 1.4], minGap: 16 });
    sc(d, 'plant.grass', 'near', 54, { rect: [-160, 744, 1760, 800] }, 30, { s: [0.5, 0.8], minGap: 12, mask: { avoid: [{ rect: [1200, 740, 1300, 800] }] } });
    sc(d, 'plant.grass', 'fore', 55, { rect: [-160, 830, 1760, 900] }, 30, { s: [1.0, 1.4], minGap: 30, sByY: [[830, 0.95], [900, 1.4]] });
    // three people (a commuter, a walker, a bench sitter), a dog, the pigeons and a flock over the trees, the train on the track
    person(d, 'person.walker', 'near', 160, 874);
    person(d, 'person.bench-sitter', 'near', 352, 834, { flip: true });
    person(d, 'person.walker', 'near', 1040, 870);
    walk(d, 'rail.train', 'mid', [[1900, 718], [-260, 718]], 80, { loop: 'loop', s: 1.0, sByY: false });
    walk(d, 'animal.dog', 'near', [[-120, 884], [900, 872], [1700, 880]], 16, { loop: 'pingpong', offset: 0.3 });
    flock(d, 'bird.small-flight', 'horizon', 8, [260, 300, 1300, 440], 36, 0.42, 71);
    flock(d, 'bird.pigeon', 'mid', 6, [-100, 560, 1700, 640], 28, 0.45, 72);
    return d;
  }

  /* ================================================================
     5. A canal lock from the towpath, across the water. The chamber holds a narrowboat.
     ================================================================ */
  function s5() {
    const d = base({ id: 'woking-canal-lock', lat: 51.3262, lon: -0.5476, heading: 60, horizon: 440, at: 'afternoon', setting: 'natural', clouds: 3 });
    d.ground.push({ layer: 'horizon', d: 'M-160 440H1760V900H-160Z', fill: '@lawn.0' });
    d.ground.push({ layer: 'far', d: 'M-160 520Q480 500 960 514T1760 504V600H-160Z', fill: '@bank.0' });
    lake(d, 'mid', 'M-160 600Q500 588 1000 598T1760 592V700Q1000 712 600 706T-160 716Z', 600, 716, ['#7fa8b0', '#3f7480', '#22505c']);
    // the towpath in the foreground: a worn grass path and its edge stones
    d.ground.push({ layer: 'near', d: 'M-160 716Q620 706 1760 722V900H-160Z', fill: '@path.1' });
    d.ground.push({ layer: 'near', d: 'M-160 712Q620 702 1760 718V724Q620 708 -160 720Z', fill: '@path.2' });
    put(d, 'landmark.basingstoke-lock', 'mid', 800, 712, 1.1, { flip: false, reflect: true });
    put(d, 'boat.narrowboat', 'mid', 790, 706, 0.8, { flip: false, reflect: true });
    put(d, 'tree.bank-alder', 'far', 210, 604, 1.2, { flip: false, reflect: true });
    put(d, 'tree.bank-willow', 'far', 1380, 606, 1.25, { flip: true, reflect: true });
    put(d, 'tree.bank-oak', 'far', 1560, 596, 1.0, { flip: false, reflect: true });
    put(d, 'tree.bank-willow', 'mid', 520, 676, 0.9, { flip: true, reflect: true });
    put(d, 'tree.bank-birch', 'mid', 1260, 664, 0.8, { flip: false, reflect: true });
    live(d, 'tree.bank-willow', 'far', 980, 606, 1.1, { flip: false, reflect: true });
    live(d, 'bird.mallard', 'mid', 240, 690, 0.9, { flip: false, reflect: true });
    put(d, 'street.bollard', 'near', 1120, 840, 1.0);
    put(d, 'street.bollard', 'near', 480, 858, 1.2);
    // the reeds and the bulrushes at the water's edge, the towpath grass and hedges, the far trees
    sc(d, { 'plant.reed': 3, 'plant.bulrush': 1, 'plant.water-crowfoot': 1 }, 'mid', 61, { rect: [-160, 630, 1760, 716] }, 200, { s: [0.7, 1.2], minGap: 8, reflect: true, mask: { avoid: [{ rect: [600, 600, 980, 716] }] } });
    sc(d, { 'plant.grass': 3, 'plant.towpath-hedge': 1 }, 'near', 62, { rect: [-160, 724, 1760, 900] }, 170, { s: [0.7, 1.2], minGap: 10, mask: { avoid: [{ rect: [520, 800, 760, 900] }] } });
    sc(d, { 'plant.grass': 2, 'plant.reed': 1, 'plant.towpath-hedge': 1 }, 'fore', 63, { rect: [-160, 856, 1760, 900] }, 26, { s: [1.0, 1.45], minGap: 40, sByY: [[856, 1.0], [900, 1.45]] });
    sc(d, { 'tree.bank-birch': 1, 'tree.bank-distant': 1 }, 'far', 64, { rect: [-160, 520, 1760, 560] }, 12, { s: [0.6, 1.3], minGap: 60, reflect: true });
    // the angler on the bank, a walker and a dog-walker (people kept to three), the narrowboat, two swans, the gulls
    person(d, 'person.angler', 'near', 1040, 790, { flip: true });
    walk(d, 'person.walker', 'near', [[1700, 880], [1140, 820], [360, 840]], 18, { loop: 'pingpong', offset: 0.3 });
    walk(d, 'person.dog-walker', 'mid', [[-120, 748], [360, 738], [620, 748]], 14, { loop: 'pingpong', offset: 0.8 });
    walk(d, 'boat.narrowboat', 'mid', [[-240, 656], [1760, 656]], 9, { loop: 'loop', s: 0.7, sByY: false, reflect: true });
    walk(d, 'bird.swan', 'mid', [[1640, 646], [1020, 650], [1500, 642]], 10, { loop: 'pingpong', s: 0.45, sByY: false, offset: 0.4 });
    walk(d, 'bird.swan', 'mid', [[300, 672], [640, 676], [440, 670]], 8, { loop: 'pingpong', s: 0.4, sByY: false, offset: 0.7 });
    flock(d, 'bird.gull', 'horizon', 5, [600, 240, 1500, 380], 30, 0.4, 81);
    flock(d, 'bird.small-flight', 'horizon', 7, [-100, 220, 900, 360], 34, 0.42, 82);
    return d;
  }

  /* ================================================================
     6. The river Wey at Byfleet: a brick bridge over the water, anglers on the bank, a dinghy and a kayak.
     ================================================================ */
  function s6() {
    const d = base({ id: 'woking-wey-byfleet', lat: 51.3320, lon: -0.5004, heading: 90, horizon: 500, at: 'day', setting: 'natural', clouds: 5 });
    d.ground.push({ layer: 'horizon', d: 'M-160 500H1760V900H-160Z', fill: '@lawn.1' });
    d.ground.push({ layer: 'far', d: 'M-160 520Q300 500 620 520T1100 512T1760 506V560H-160Z', fill: '@bank.1' });
    lake(d, 'mid', 'M-160 616Q400 602 900 620T1760 610V704Q1000 718 640 712T-160 720Z', 610, 720, ['#8fb6bc', '#4a7f88', '#27545e'], { shimmer: 30, lightPath: true });
    // the near bank: grass, a worn path down to the water, and the reed bed
    d.ground.push({ layer: 'near', d: 'M-160 712Q500 704 1760 718V900H-160Z', fill: '@grass.0' });
    d.ground.push({ layer: 'near', d: 'M1280 900L1420 900L1380 740L1330 740Z', fill: '@path.0' });
    put(d, 'landmark.wey-bridge', 'mid', 860, 642, 1.15, { flip: false, reflect: true });
    put(d, 'tree.far-broad', 'far', 260, 544, 1.2, { flip: false });
    put(d, 'tree.bank-willow', 'far', 1420, 554, 1.2, { flip: true, reflect: true });
    put(d, 'tree.bank-alder', 'far', 60, 560, 1.15, { flip: false, reflect: true });
    live(d, 'tree.bank-oak', 'far', 720, 548, 1.0, { flip: true });
    live(d, 'bird.mallard', 'mid', 1100, 690, 0.9, { flip: true, reflect: true });
    put(d, 'street.bollard', 'near', 1260, 800, 1.1);
    sc(d, { 'plant.reed': 1, 'plant.bulrush': 1 }, 'mid', 71, { rect: [-160, 640, 1760, 716] }, 150, { s: [0.7, 1.25], minGap: 8, tint: { col: '#8a7a40', k: [0, 0.16] }, reflect: true, mask: { avoid: [{ rect: [760, 600, 1000, 720] }] } });
    sc(d, { 'plant.grass': 3, 'plant.towpath-hedge': 1 }, 'near', 72, { rect: [-160, 722, 1760, 900] }, 190, { s: [0.7, 1.2], minGap: 10, tint: { col: '#8a7a40', k: [0, 0.16] }, mask: { avoid: [{ poly: [[1280, 900], [1420, 900], [1380, 740], [1330, 740]] }] } });
    sc(d, { 'plant.grass': 1, 'plant.towpath-hedge': 1 }, 'fore', 74, { rect: [-160, 856, 1760, 900] }, 24, { s: [1.0, 1.5], minGap: 36, sByY: [[856, 1.0], [900, 1.5]] });
    sc(d, { 'tree.bank-distant': 1, 'tree.far-birch': 1 }, 'far', 73, { rect: [-160, 520, 1760, 560] }, 18, { s: [0.5, 0.9], minGap: 40, reflect: true });
    // two anglers on the bank, a walker, a kayak, a dinghy twice on the river, a swan, a mallard, the gulls
    person(d, 'person.angler', 'near', 540, 776, { flip: false });
    put(d, 'animal.dog', 'near', 300, 828, pY(d, 'animal.dog', 828) * 1.6, { flip: false });
    person(d, 'person.walker', 'near', 1500, 760);
    person(d, 'person.angler', 'near', 1640, 808, { flip: true });
    walk(d, 'person.walker', 'near', [[-120, 800], [1280, 780], [1700, 828]], 18, { loop: 'pingpong', offset: 0.2 });
    walk(d, 'person.kayaker', 'mid', [[1700, 652], [280, 650]], 16, { loop: 'pingpong', s: 0.6, sByY: false, reflect: true, offset: 0.4 });
    walk(d, 'boat.dinghy', 'mid', [[-240, 668], [1760, 668]], 12, { loop: 'loop', s: 0.55, sByY: false, reflect: true });
    walk(d, 'boat.dinghy', 'mid', [[1760, 690], [-240, 690]], 9, { loop: 'loop', s: 0.5, sByY: false, reflect: true, offset: 0.5 });
    walk(d, 'bird.swan', 'mid', [[1380, 700], [1000, 704], [1200, 698]], 9, { loop: 'pingpong', s: 0.45, sByY: false, offset: 0.2 });
    walk(d, 'bird.mallard', 'mid', [[120, 690], [700, 700], [360, 694]], 9, { loop: 'pingpong', s: 0.5, sByY: false, offset: 0.2 });
    flock(d, 'bird.small-flight', 'horizon', 6, [300, 240, 1500, 420], 32, 0.45, 91);
    flock(d, 'bird.herring-gull-flight', 'horizon', 4, [-100, 300, 900, 430], 30, 0.45, 92);
    return d;
  }

  /* ================================================================
     7. Hook Heath: a sandy ride through the heather, the veteran pine up on the skyline. Low, in the heather.
     ================================================================ */
  function s7() {
    const d = base({ id: 'woking-hook-heath', lat: 51.3098, lon: -0.5986, heading: 150, horizon: 600, at: 'morning', setting: 'natural', clouds: 4 });
    d.ground.push({ layer: 'horizon', d: 'M-160 600H1760V900H-160Z', fill: '@heath.1' });
    d.ground.push({ layer: 'far', d: 'M-160 612Q600 600 1760 618V660H-160Z', fill: '@heath.0' });
    // the sandy ride: it narrows from the bottom to the pine and the far woods
    d.ground.push({ layer: 'near', d: 'M520 900L1080 900L900 650L730 650Z', fill: '@sand.0' });
    d.ground.push({ layer: 'near', d: 'M740 900L790 900L752 680Z M930 900L960 900L912 690Z', fill: '@sand.2' });
    live(d, 'tree.pine-veteran', 'mid', 1140, 672, 1.05, { flip: true });
    put(d, 'tree.birch-heath', 'far', 300, 590, 1.0, { flip: false });
    put(d, 'tree.birch-heath', 'far', 1580, 596, 0.9, { flip: true });
    put(d, 'tree.distant-pine', 'horizon', 580, 602, 0.8, { flip: false });
    put(d, 'tree.distant-pine', 'horizon', 1420, 600, 0.7, { flip: false });
    put(d, 'bird.dartford-warbler', 'near', 1010, 720, 0.85, { flip: false });
    live(d, 'bird.stonechat', 'near', 690, 800, 0.9, { flip: false });
    // the heather, gorse and bracken of the heath (the cover, several species), the far pines and birches
    sc(d, 'plant.heather', 'near', 81, { poly: [[-160, 700], [1760, 700], [1760, 900], [-160, 900]] }, 300, { s: [0.6, 1.25], minGap: 6, mask: { avoid: [{ poly: [[600, 900], [1000, 900], [880, 650], [760, 650]] }] } });
    sc(d, { 'plant.gorse': 1, 'plant.bracken': 1 }, 'near', 87, { poly: [[-160, 700], [1760, 700], [1760, 900], [-160, 900]] }, 140, { s: [0.5, 1.3], minGap: 14 });
    sc(d, 'plant.heather', 'near', 86, { poly: [[520, 900], [1080, 900], [900, 650], [730, 650]] }, 40, { s: [0.5, 0.9], minGap: 12 });
    sc(d, 'plant.heather', 'mid', 82, { rect: [-160, 640, 1760, 700] }, 110, { s: [0.5, 0.9], minGap: 9, mask: { avoid: [{ poly: [[730, 650], [900, 650], [1080, 900], [520, 900]] }] } });
    sc(d, 'plant.heather', 'fore', 85, { rect: [-160, 856, 1760, 900] }, 30, { s: [1.0, 1.5], minGap: 30, sByY: [[856, 1.0], [900, 1.5]] });
    sc(d, { 'tree.distant-pine': 2, 'tree.birch-heath': 1 }, 'far', 83, { rect: [-160, 596, 1760, 640] }, 15, { s: [0.5, 1.0], minGap: 30 });
    sc(d, 'plant.grass', 'horizon', 84, { rect: [-160, 600, 1760, 612] }, 12, { s: [0.4, 0.6], minGap: 20 });
    // two walkers (a hiker and a jogger), a dog, the warblers and the flocks of small birds over the heath
    walk(d, 'person.hiker', 'near', [[-200, 880], [560, 800], [860, 700]], 14, { loop: 'pingpong', offset: 0.1 });
    walk(d, 'person.jogger', 'mid', [[1700, 660], [1200, 640], [1010, 648]], 16, { loop: 'pingpong', offset: 0.5 });
    walk(d, 'animal.dog', 'near', [[1700, 852], [1180, 816], [1500, 840]], 18, { loop: 'pingpong', offset: 0.7 });
    flock(d, 'bird.small-flight', 'horizon', 8, [400, 220, 1500, 420], 30, 0.42, 93);
    flock(d, 'bird.small-flight', 'far', 6, [-100, 380, 700, 540], 26, 0.4, 94);
    return d;
  }

  const SCENES = [
    { meta: { id: 'woking-commercial-way', label: 'Commercial Way, Woking', site: 'Commercial Way, Woking, looking down the shopping street to the towers', mood: 'calm', colour: 'slate', town: 'Woking' },
      tags: ['woking', 'commercial way', 'shopping street', 'high street', 'victoria square towers', 'town centre'], fn: s1 },
    { meta: { id: 'woking-kingfield', label: 'Match day at Kingfield', site: 'The floodlights of Kingfield, Woking, from the car park', mood: 'cheerful', colour: 'green', town: 'Woking' },
      tags: ['woking', 'kingfield', 'football', 'match day', 'floodlights', 'car park'], fn: s2 },
    { meta: { id: 'woking-old-village', label: 'Old Woking church', site: 'The flint church of Old Woking from the churchyard gate', mood: 'calm', colour: 'amber', town: 'Woking' },
      tags: ['woking', 'old woking', 'flint church', 'churchyard', 'village green', 'spire'], fn: s3 },
    { meta: { id: 'woking-necropolis', label: 'The cemetery station at dawn', site: 'The Necropolis station platform, Brookwood cemetery, at dawn', mood: 'dreamy', colour: 'indigo', town: 'Brookwood' },
      tags: ['brookwood', 'necropolis', 'cemetery station', 'platform', 'dawn', 'track'], fn: s4 },
    { meta: { id: 'woking-canal-lock', label: 'A lock on the Basingstoke Canal', site: 'A lock on the Basingstoke Canal near Woking, from the towpath', mood: 'calm', colour: 'teal', town: 'Woking' },
      tags: ['basingstoke canal', 'lock', 'towpath', 'narrowboat', 'woking', 'canal'], fn: s5 },
    { meta: { id: 'woking-wey-byfleet', label: 'The Wey at Byfleet', site: 'The river Wey at Byfleet, the brick bridge and the anglers', mood: 'cheerful', colour: 'blue', town: 'Byfleet' },
      tags: ['byfleet', 'river wey', 'bridge', 'anglers', 'dinghy', 'riverbank'], fn: s6 },
    { meta: { id: 'woking-hook-heath', label: 'Hook Heath in the heather', site: 'A sandy ride through the heather on Hook Heath, Woking', mood: 'calm', colour: 'orange', town: 'Woking' },
      tags: ['hook heath', 'woking', 'heather', 'sandy ride', 'veteran pine', 'heath'], fn: s7 },
  ];
  for (const it of SCENES) sceneAdd(PACK, Object.assign({}, it.meta, { tags: it.tags }), it.fn);
})();
