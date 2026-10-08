/* ============================================================
   COMPOSED SCENES, Sheffield second set, part C (docs/dev/SCENE_ENGINE.md section 3).
   Each scene is its own composition (no archetype). Five locations in this part:
     11 leopold-steps   Leopold Square from the top of its steps, looking down at dusk
     12 bramall-turnstiles  fans walking up a terraced street to the ground on match day
     13 meadowhall-park  the green domes across the car park from the bus lane
     14 weston-lake      the museum across the lake in Weston Park, reeds and ducks
     15 hillsborough-boat the house across the Hillsborough Park lake, a rowing boat in the morning
   Registered by 72-anim-pack-uk-area-sheffield2.js (pack uk-area-sheffield2).
   Data only (PURE). No names, no crests, no logos, no text. People are silhouettes.
   ============================================================ */
(function () {
  if (typeof sceneSh2Make !== 'function' || typeof sceneSh2Add !== 'function') return;

  /* 11. Leopold Square: a high camera on the top step; the square's tiers fall away below. */
  function leopoldSteps() {
    const d = sceneSh2Make({ id: 'leopold-steps', lat: 53.3805, lon: -1.4775, heading: 150, H: 250, at: 'dusk', fov: 78, clouds: 4 });
    sceneSh2Ground(d, 'far', sceneSh2Rect(-160, 200, 1760, 262), sceneSh2Lin('@hills.1', '@far.0', 200, 262));
    sceneSh2Ground(d, 'mid', sceneSh2Rect(-160, 260, 1760, 420), sceneSh2Lin('@stone.1', '@stone.0', 260, 420));
    // the steps: four tiers, each lower and wider than the one above
    [[420, 500], [500, 580], [580, 680]].forEach(([y0, y1], i) => sceneSh2Ground(d, 'near', sceneSh2Rect(-160 + i * 60, y0, 1760 - i * 60, y1), sceneSh2Lin('@stone.0', '@stone.1', y0, y1)));
    sceneSh2Ground(d, 'fore', sceneSh2Rect(-160, 680, 1760, 900), sceneSh2Lin('@pave.2', '@pave.0', 680, 900));
    sceneSh2Put(d, 'landmark.sheffield2-division-corner', 300, 360, 'mid', 1101, { s: 0.95, flip: true });
    sceneSh2Put(d, 'building.sheffield2-shoprow', 1260, 330, 'mid', 1103, { s: 1.0, v: 0 });
    sceneSh2Put(d, 'building.sheffield2-pub', 720, 350, 'mid', 1105, { s: 0.8, v: 1 });
    sceneSh2Put(d, 'street.sheffield2-festoon', 420, 300, 'mid', 1107, { s: 1.1, v: 0 });
    sceneSh2Put(d, 'street.sheffield2-festoon', 1040, 296, 'mid', 1109, { s: 1.0, v: 1 });
    sceneSh2Lamp(d, 80, 420, 260, 'mid', 1111);
    sceneSh2Lamp(d, 1500, 470, 300, 'near', 1113);
    sceneSh2Put(d, 'street.bench', 760, 530, 'near', 1115, { s: 1.0 });
    sceneSh2Put(d, 'person.bench-sitter', 760, 500, 'near', 1116, { s: 1.0 });
    sceneSh2Put(d, 'plant.planter', 1380, 620, 'near', 1117, { s: 1.5, v: 1 });
    sceneSh2Bar(d, { seed: 1100, far: { 'tree.distant': 2, 'tree.far-pine': 1, 'tree.far-broad': 1 }, farN: 16, cover: { 'street.bollard': 1, 'street.bench': 1, 'plant.planter': 2, 'plant.shrub': 1, 'bird.pigeon': 2, 'bird.herring-gull': 1 }, n: 300, fore: { 'plant.planter': 1, 'plant.grass': 1, 'street.bollard': 1 }, foreN: 18 });
    sceneSh2Walk(d, 'person.student', 1700, -140, 540, 'near', 1121, { speed: 9, flip: true });
    sceneSh2Walk(d, 'person.cafe-goer', 880, 1020, 540, 'near', 1122, { speed: 3, loop: 'pingpong' });
    sceneSh2Walk(d, 'person.couple', -140, 1700, 800, 'fore', 1123, { speed: 10 });
    sceneSh2Walk(d, 'person.takeaway-walker', 1600, 200, 720, 'near', 1124, { speed: 12, flip: true });
    sceneSh2Walk(d, 'person.phone-idler', 1200, 1216, 610, 'near', 1125, { speed: 2, loop: 'pingpong' });
    sceneSh2Flock(d, 'bird.small-flight', 3, [260, 90, 1400, 200], 1127, { speed: 20 });
    return d;
  }

  /* 12. Bramall Lane on match day: fans walking up a terraced street; the ground's stand at the top right. */
  function bramallTurnstiles() {
    const d = sceneSh2Make({ id: 'bramall-turnstiles', lat: 53.3703, lon: -1.4709, heading: 160, H: 380, at: 'afternoon', fov: 74, clouds: 6 });
    sceneSh2Ground(d, 'mid', sceneSh2Rect(-160, 380, 1760, 520), sceneSh2Lin('@stone.0', '@pave.1', 380, 520));
    sceneSh2Ground(d, 'near', 'M-160 520L1760 520L1760 700L-160 700Z', sceneSh2Lin('@road.1', '@road.0', 520, 700));
    sceneSh2Ground(d, 'near', sceneSh2Rect(-160, 700, 1760, 900), sceneSh2Lin('@pave.2', '@pave.0', 700, 900));
    sceneSh2Ground(d, 'near', sceneSh2Rect(-160, 698, 1760, 702), '@kerb');
    sceneSh2Put(d, 'landmark.sheffield2-bramall-lane', 1080, 528, 'mid', 1201, { s: 0.95, flip: true });
    sceneSh2Put(d, 'building.terrace-northern', 120, 470, 'mid', 1203, { s: 1.2, v: 0 });
    sceneSh2Put(d, 'building.terrace-northern', 480, 500, 'mid', 1205, { s: 1.0, v: 2 });
    sceneSh2Put(d, 'building.terrace-northern', 1500, 470, 'far', 1207, { s: 1.0, v: 3, flip: true });
    sceneSh2Put(d, 'street.bollard', 700, 760, 'near', 1209, { s: 1.1 });
    sceneSh2Put(d, 'street.bollard', 980, 748, 'near', 1211, { s: 1.0 });
    sceneSh2Put(d, 'street.lamppost', 1360, 600, 'mid', 1213, { h: 300 });
    sceneSh2Bar(d, { seed: 1200, cover: { 'street.bollard': 1, 'street.bench': 1, 'street.lamppost': 1, 'plant.planter': 1, 'bird.pigeon': 2, 'bird.herring-gull': 1, 'plant.grass': 1 }, n: 300, fore: { 'street.bollard': 1, 'plant.grass': 2 }, foreN: 18 });
    // the crowd: eight fans on the pavement and in the road, all walking towards the ground
    ['person.football-fan', 'person.football-fan', 'person.football-fan', 'person.takeaway-walker', 'person.football-fan', 'person.family', 'person.football-fan', 'person.walker'].forEach((id, i) => {
      const left = i % 2 === 0, y = i % 3 === 0 ? 700 + i * 4 : 610 + (i % 4) * 14;
      sceneSh2Walk(d, id === 'person.family' ? 'person.walker' : id, left ? -140 : 1700, left ? 1500 : -140, y, i % 3 === 2 ? 'fore' : 'near', 1215 + i * 5, { speed: 14 + i, flip: !left });
    });
    sceneSh2Flock(d, 'bird.small-flight', 3, [240, 120, 1400, 300], 1251, { speed: 20 });
    return d;
  }

  /* 13. Meadowhall from the bus lane across the car park: the green domes behind the parking lines. */
  function meadowhallPark() {
    const d = sceneSh2Make({ id: 'meadowhall-park', lat: 53.4140, lon: -1.4120, heading: 30, H: 440, at: 'day', fov: 76, clouds: 7 });
    sceneSh2Ground(d, 'mid', sceneSh2Rect(-160, 440, 1760, 600), sceneSh2Lin('@ground.1', '@ground.0', 440, 600));
    sceneSh2Ground(d, 'near', sceneSh2Rect(-160, 600, 1760, 760), sceneSh2Lin('@road.1', '@road.0', 600, 760));
    sceneSh2Ground(d, 'near', sceneSh2Rect(-160, 606, 1760, 608), '@line');
    sceneSh2Ground(d, 'near', sceneSh2Rect(-160, 680, 1760, 682), '@line');
    sceneSh2Ground(d, 'fore', sceneSh2Rect(-160, 760, 1760, 900), sceneSh2Lin('@pave.2', '@pave.0', 760, 900));
    sceneSh2Put(d, 'landmark.sheffield2-meadowhall', 900, 600, 'mid', 1301, { s: 1.1 });
    sceneSh2Put(d, 'tree.plane', 240, 560, 'mid', 1303, { s: 1.0, v: 1 });
    sceneSh2Put(d, 'tree.plane', 1480, 580, 'mid', 1305, { s: 1.1, v: 2 });
    sceneSh2Lamp(d, 600, 640, 380, 'near', 1307);
    sceneSh2Lamp(d, 1200, 650, 380, 'near', 1309);
    sceneSh2Put(d, 'street.bollard', 160, 800, 'fore', 1311, { s: 1.4 });
    sceneSh2Bar(d, { seed: 1300, cover: { 'street.bollard': 1, 'plant.planter': 1, 'bird.pigeon': 2, 'bird.herring-gull': 1, 'plant.shrub': 1, 'street.lamppost': 1 }, n: 300, fore: { 'plant.planter': 1, 'plant.grass': 1 }, foreN: 16 });
    sceneSh2Put(d, 'vehicle.bus', 1280, 690, 'near', 1313, { s: 1.0, flip: true });
    sceneSh2Walk(d, 'person.shopper', -140, 1700, 830, 'fore', 1315, { speed: 12 });
    sceneSh2Walk(d, 'person.shopper', 1700, -140, 710, 'near', 1317, { speed: 13, flip: true });
    sceneSh2Walk(d, 'person.student', -140, 1700, 760, 'near', 1320, { speed: 12 });
    sceneSh2Walk(d, 'person.buggy-walker', 200, 1100, 866, 'fore', 1318, { speed: 10 });
    sceneSh2Walk(d, 'person.cyclist', -140, 1700, 740, 'near', 1319, { speed: 30 });
    sceneSh2Flock(d, 'bird.gull', 3, [200, 100, 1400, 300], 1321, { speed: 26, s: 0.6 });
    return d;
  }

  /* 14. Weston Park: the museum over the still lake, the reeds in front and ducks on the water. */
  function westonLake() {
    const d = sceneSh2Make({ id: 'weston-lake', lat: 53.3830, lon: -1.4890, heading: 330, H: 470, at: 'afternoon', fov: 74, clouds: 6 });
    sceneSh2Ground(d, 'far', sceneSh2Rect(-160, 440, 1760, 500), sceneSh2Lin('@wood.0', '@wood.2', 440, 500));
    sceneSh2Cover(d, 'far', [-160, 448, 1760, 500], { 'tree.bank-oak': 2, 'tree.bank-birch': 1, 'tree.pond-oak': 1 }, 14, [0.4, 0.7], 1401, { flip: 0.5 });
    sceneSh2Ground(d, 'mid', sceneSh2Rect(-160, 480, 1760, 600), sceneSh2Lin('@ground.0', '@ground.1', 480, 600));
    sceneSh2Water(d, 'mid', 560, 690, { base: ['#8aa8a0', '#4e6e68', '#2a4a46'], shimmer: 20 });
    sceneSh2Put(d, 'landmark.sheffield2-weston-museum', 1000, 580, 'far', 1403, { s: 1.25, extra: { reflect: true } });
    sceneSh2Put(d, 'tree.pond-willow', 210, 580, 'mid', 1405, { s: 1.2, v: 0, extra: { reflect: true } });
    sceneSh2Put(d, 'tree.pond-birch', 1480, 560, 'mid', 1407, { s: 1.1, v: 1, extra: { reflect: true } });
    sceneSh2Put(d, 'bird.heron', 1210, 590, 'mid', 1409, { s: 0.6, flip: true, extra: { reflect: true } });
    sceneSh2Bar(d, { seed: 1400, reflect: true, verge: [700, 716], cover: { 'plant.reed': 1, 'plant.grass': 2, 'plant.wildflowers': 1, 'plant.bulrush': 1, 'water.lily': 1, 'water.fish-ring': 1, 'plant.shrub': 1 }, n: 175, fore: { 'plant.grass': 2, 'plant.fern': 1, 'plant.wildflowers': 1 }, foreN: 14 });
    sceneSh2Water(d, 'near', 720, 770, { base: ['#7a9c96', '#40645e', '#22423e'], shimmer: 24 });
    sceneSh2Walk(d, 'person.birdwatcher', 1500, 1470, 540, 'mid', 1411, { speed: 1, loop: 'pingpong', flip: true });
    sceneSh2Walk(d, 'person.picnicker', 240, 262, 860, 'fore', 1413, { speed: 1, loop: 'pingpong' });
    sceneSh2Walk(d, 'person.walker', -140, 1700, 812, 'fore', 1415, { speed: 12 });
    sceneSh2Walk(d, 'person.dog-walker', 1700, -140, 740, 'near', 1417, { speed: 13, flip: true });
    d.actors.push({ obj: 'bird.mallard', layer: 'mid', path: [[260, 620], [640, 640]], speed: 5, loop: 'pingpong', s: 0.36, seed: 1419, offset: 0.2 });
    d.actors.push({ obj: 'bird.mallard', layer: 'mid', path: [[1240, 660], [880, 668]], speed: 4, loop: 'pingpong', s: 0.4, seed: 1421, variant: 1, offset: 0.6, flip: true });
    d.actors.push({ obj: 'bird.swan', layer: 'mid', path: [[400, 700], [1280, 700]], speed: 4, loop: 'pingpong', s: 0.42, seed: 1423, offset: 0.35 });
    sceneSh2Flock(d, 'bird.small-flight', 3, [240, 130, 1300, 300], 1425, { speed: 20 });
    return d;
  }

  /* 15. Hillsborough Park: the Georgian house across the lake in the morning, a rowing boat on the still water. */
  function hillsboroughBoat() {
    const d = sceneSh2Make({ id: 'hillsborough-boat', lat: 53.4055, lon: -1.5010, heading: 300, H: 430, at: 'morning', fov: 74, clouds: 6 });
    sceneSh2Ground(d, 'far', sceneSh2Rect(-160, 400, 1760, 460), sceneSh2Lin('@wood.1', '@wood.2', 400, 460));
    sceneSh2Cover(d, 'far', [-160, 410, 1760, 460], { 'tree.bank-alder': 2, 'tree.bank-oak': 1, 'tree.pond-pine': 1 }, 14, [0.35, 0.6], 1501, { flip: 0.5 });
    sceneSh2Ground(d, 'mid', sceneSh2Rect(-160, 440, 1760, 580), sceneSh2Lin('@ground.0', '@ground.2', 440, 580));
    sceneSh2Water(d, 'mid', 580, 720, { base: ['#9ab8c0', '#5a8290', '#2e5260'], shimmer: 16 });
    sceneSh2Put(d, 'landmark.sheffield2-hillsborough-house', 520, 560, 'far', 1503, { s: 1.5, extra: { reflect: true } });
    sceneSh2Put(d, 'tree.pond-birch', 1300, 540, 'mid', 1505, { s: 1.1, v: 2, extra: { reflect: true } });
    sceneSh2Put(d, 'tree.pond-willow', 1560, 600, 'mid', 1507, { s: 1.3, v: 1, extra: { reflect: true } });
    sceneSh2Bar(d, { seed: 1500, reflect: true, verge: [720, 740], cover: { 'plant.reed': 1, 'plant.grass': 2, 'plant.bulrush': 1, 'plant.wildflowers': 1, 'plant.shrub': 1, 'street.bench': 1, 'street.lamppost': 1 }, n: 260, fore: { 'plant.grass': 2, 'plant.wildflowers': 1 }, foreN: 26 });
    sceneSh2Water(d, 'near', 740, 800, { base: ['#8aa6b0', '#4e7480', '#2a4a54'], shimmer: 22 });
    d.actors.push({ obj: 'boat.dinghy', layer: 'mid', path: [[180, 650], [1180, 690]], speed: 5, loop: 'pingpong', s: 0.9, seed: 1509, offset: 0.2, flip: false });
    d.actors.push({ obj: 'person.rower', layer: 'mid', path: [[180, 650], [1180, 690]], speed: 5, loop: 'pingpong', s: 0.36, seed: 1511, variant: 0, offset: 0.2 });
    d.actors.push({ obj: 'bird.mallard', layer: 'mid', path: [[320, 760], [900, 770]], speed: 4, loop: 'pingpong', s: 0.4, seed: 1513, offset: 0.4 });
    d.actors.push({ obj: 'bird.coot', layer: 'near', path: [[1100, 790], [1500, 800]], speed: 3, loop: 'pingpong', s: 0.44, seed: 1515, offset: 0.1, flip: true });
    sceneSh2Walk(d, 'person.walker', -140, 1700, 850, 'fore', 1517, { speed: 11 });
    sceneSh2Walk(d, 'person.jogger', 1700, -140, 800, 'near', 1519, { speed: 26, flip: true });
    sceneSh2Flock(d, 'bird.small-flight', 3, [240, 120, 1300, 300], 1521, { speed: 20 });
    return d;
  }

  const C = [
    [leopoldSteps, { id: 'leopold-square-steps', label: 'Leopold Square from the steps', site: 'Leopold Square from the top of its steps, at dusk', tags: ['nightlife', 'bars', 'steps', 'square', 'lights', 'dusk'], mood: 'dreamy', colour: 'violet', ukPlace: 'leopold-square', ukView: 'evening', viewReason: 'The square from the top step at dusk, the lamps coming on', ukKind: 'landmark' }],
    [bramallTurnstiles, { id: 'bramall-lane-match-day', label: 'Bramall Lane on match day', site: 'Fans walking up a terraced street to the ground on match day', tags: ['football', 'match-day', 'stadium', 'terraces', 'crowd', 'bramall-lane'], mood: 'cheerful', colour: 'red', ukPlace: 'bramall-lane', ukView: 'match-day', viewReason: 'Fans walking up the terraced street towards the ground', ukKind: 'landmark' }],
    [meadowhallPark, { id: 'meadowhall-car-park', label: 'Meadowhall from the bus lane', site: 'The green domes of Meadowhall across the car park from the bus lane', tags: ['shopping', 'domes', 'car-park', 'bus', 'don-valley', 'landmark'], mood: 'cheerful', colour: 'green', ukPlace: 'meadowhall', ukView: 'wide', viewReason: 'The green domes across the car park on a weekday', ukKind: 'landmark' }],
    [westonLake, { id: 'weston-park-lake', label: 'Weston Park museum across the lake', site: 'The museum across the lake in Weston Park, reeds and ducks', tags: ['museum', 'park', 'lake', 'reeds', 'ducks', 'gallery'], mood: 'calm', colour: 'green', ukPlace: 'weston-park', ukView: 'lake', viewReason: 'The museum over the still lake, the reeds in front', ukKind: 'landscape' }],
    [hillsboroughBoat, { id: 'hillsborough-park-boat', label: 'Hillsborough Park lake at dawn', site: 'The house across the Hillsborough Park lake, a rowing boat in the morning', tags: ['park', 'lake', 'boat', 'georgian', 'rowing', 'morning'], mood: 'calm', colour: 'green', ukPlace: 'hillsborough-park', ukView: 'lake', viewReason: 'The Georgian house across the lake, a rowing boat out early', ukKind: 'landscape' }],
  ];
  for (const [build, meta] of C) sceneSh2Add(meta, build);
})();
