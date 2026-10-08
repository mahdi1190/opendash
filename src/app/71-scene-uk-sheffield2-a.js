/* ============================================================
   COMPOSED SCENES, Sheffield second set, part A (docs/dev/SCENE_ENGINE.md section 3).
   Each scene is its own composition (no archetype): its own camera, horizon,
   landmark and foreground. Five locations in this part:
     1 tudor-crucible   the Crucible Theatre from the corner of Tudor Square, looking up
     2 moor-market      the Moor Market hall behind its stall row, at street level
     3 sheaf-steel      the steel water wall on Sheaf Square from the stepped pools
     4 station-rank     the station arcade across the taxi rank, at dusk
     5 division-street  Division Street down its length, the shopfronts in perspective
   Registered by 72-anim-pack-uk-area-sheffield2.js (pack uk-area-sheffield2).
   Data only (PURE). No names on shops, no logos, no text, no crests.
   ============================================================ */
(function () {
  if (typeof sceneSh2Make !== 'function' || typeof sceneSh2Add !== 'function') return;

  /* 1. The Crucible Theatre, Tudor Square: a low camera at the corner; the ribbed storey fills the top right. */
  function crucible() {
    const d = sceneSh2Make({ id: 'tudor-crucible', lat: 53.3803, lon: -1.4655, heading: 80, H: 560, at: 'golden', fov: 80, clouds: 4 });
    sceneSh2Ground(d, 'mid', sceneSh2Rect(-160, 540, 1760, 700), sceneSh2Lin('@pave.2', '@pave.1', 540, 700));
    sceneSh2Ground(d, 'near', sceneSh2Rect(-160, 700, 1760, 900), sceneSh2Lin('@cobble.2', '@cobble.0', 700, 900));
    sceneSh2Put(d, 'landmark.sheffield2-crucible', 1010, 800, 'mid', 4103, { s: 2.0 });
    sceneSh2Lamp(d, 180, 690, 330, 'mid', 4105);
    sceneSh2Put(d, 'tree.plane', -40, 920, 'front', 4111, { s: 1.6, v: 1, extra: { anim: { sway: { k: 0.6 } } } });
    sceneSh2Put(d, 'street.bench', 300, 820, 'near', 4107, { s: 1.0 });
    sceneSh2Bar(d, { seed: 4100, verge: [872, 900], cover: { 'street.bollard': 2, 'plant.planter': 1, 'bird.pigeon': 2, 'bird.pigeon-feral': 1, 'street.bench': 1, 'plant.shrub': 1 }, n: 240, fore: { 'plant.planter': 1, 'street.bollard': 1, 'plant.grass': 1 }, foreN: 24 });
    sceneSh2Walk(d, 'person.student', -120, 1700, 790, 'near', 4115, { speed: 13 });
    sceneSh2Walk(d, 'person.walker', 1700, 200, 868, 'fore', 4117, { speed: 16 });
    sceneSh2Walk(d, 'person.couple', 300, 1260, 850, 'near', 4119, { speed: 11 });
    sceneSh2Walk(d, 'person.jogger', 1500, -140, 720, 'mid', 4122, { speed: 28, flip: true });
    sceneSh2Walk(d, 'person.cyclist', -140, 1700, 735, 'near', 4123, { speed: 36 });
    sceneSh2Walk(d, 'person.walker', 200, 1100, 892, 'front', 4124, { speed: 9 });
    sceneSh2Flock(d, 'bird.small-flight', 5, [200, 120, 1500, 380], 4121, { speed: 24 });
    return d;
  }

  /* 2. The Moor Market: a row of stalls in front of the hall, shoppers passing between. */
  function moorMarket() {
    const d = sceneSh2Make({ id: 'moor-market', lat: 53.3768, lon: -1.4721, heading: 200, H: 430, at: 'afternoon', clouds: 6 });
    sceneSh2Ground(d, 'mid', sceneSh2Rect(-160, 470, 1760, 600), sceneSh2Lin('@pave.1', '@pave.2', 470, 600));
    sceneSh2Ground(d, 'near', sceneSh2Rect(-160, 600, 1760, 900), sceneSh2Lin('@pave.2', '@pave.0', 600, 900));
    sceneSh2Put(d, 'landmark.sheffield2-moor-market', 1000, 560, 'mid', 4203, { s: 1.2 });
    sceneSh2Put(d, 'tree.plane', 60, 610, 'mid', 4204, { s: 0.9, v: 2 });
    sceneSh2Put(d, 'street.sheffield2-festoon', 360, 350, 'mid', 4205, { s: 1.1, v: 0 });
    sceneSh2Put(d, 'street.sheffield2-festoon', 1180, 330, 'mid', 4207, { s: 1.0, v: 1 });
    [[120, 700, 1.4, 0], [520, 668, 1.15, 1], [860, 650, 1.0, 2], [1240, 672, 1.2, 3]].forEach(([x, y, s, v], i) =>
      sceneSh2Put(d, 'street.market-stall', x, y, 'near', 4211 + i * 3, { s, v, flip: i % 2 === 1 }));
    sceneSh2Put(d, 'street.bollard', 700, 760, 'near', 4221, { s: 0.9 });
    sceneSh2Put(d, 'street.bollard', 1420, 750, 'near', 4223, { s: 0.85 });
    sceneSh2Bar(d, { seed: 4200, cover: { 'street.bollard': 1, 'plant.planter': 1, 'bird.pigeon-feral': 2, 'bird.pigeon': 1, 'street.lantern-string': 1, 'plant.shrub': 1 }, n: 300, fore: { 'plant.planter': 2, 'plant.shrub': 1, 'plant.grass': 1 }, foreN: 26 });
    ['person.shopper', 'person.buggy-walker', 'person.shopper', 'person.elderly-walker', 'person.shopper', 'person.walker'].forEach((id, i) =>
      sceneSh2Walk(d, id, i % 2 ? 1700 : -140, i % 2 ? -140 : 1700, 760 + (i % 3) * 36, i % 3 === 2 ? 'fore' : 'near', 4231 + i * 5, { speed: 14 + i, flip: i % 2 === 1 }));
    sceneSh2Flock(d, 'bird.small-flight', 4, [260, 120, 1400, 320], 4241, { speed: 22 });
    sceneSh2Walk(d, 'person.buggy-walker', -140, 1700, 880, 'fore', 4242, { speed: 12 });
    sceneSh2Walk(d, 'person.dog-walker', 1700, -140, 705, 'mid', 4243, { speed: 13, flip: true });
    return d;
  }

  /* 3. The steel water wall, Sheaf Square: from the stepped pools, looking up the wall; the water runs down. */
  function sheafSteel() {
    const d = sceneSh2Make({ id: 'sheaf-steel', lat: 53.3787, lon: -1.4625, heading: 120, H: 300, at: 'morning', fov: 78, clouds: 6 });
    sceneSh2Ground(d, 'mid', sceneSh2Rect(-160, 300, 1760, 560), sceneSh2Lin('@stone.0', '@pave.1', 300, 560));
    sceneSh2Put(d, 'landmark.sheffield2-cutting-edge', 760, 520, 'mid', 4303, { s: 1.65, extra: { reflect: true } });
    sceneSh2Put(d, 'tree.plane', 130, 480, 'mid', 4304, { s: 0.85, v: 0 });
    sceneSh2Put(d, 'tree.plane', 1460, 470, 'mid', 4306, { s: 0.8, v: 1 });
    sceneSh2Water(d, 'mid', 500, 620, { base: ['#9cc0c8', '#5a8c98', '#2c5a68'], shimmer: 30 });
    sceneSh2Water(d, 'near', 680, 770, { base: ['#a4c8cf', '#628e9a', '#2e5c6a'], shimmer: 36 });
    sceneSh2Ground(d, 'near', sceneSh2Rect(-160, 770, 1760, 782), '@stone.1');
    sceneSh2Ground(d, 'near', sceneSh2Rect(-160, 620, 1760, 630), '@stone.1');
    sceneSh2Put(d, 'plant.planter', 80, 860, 'fore', 4305, { s: 1.5 });
    sceneSh2Put(d, 'plant.planter', 1480, 830, 'fore', 4307, { s: 1.3, v: 1 });
    sceneSh2Bar(d, { seed: 4300, reflect: true, cover: { 'street.bollard': 1, 'street.bench': 1, 'plant.planter': 1, 'bird.pigeon': 2, 'bird.gull': 1, 'plant.shrub': 1 }, n: 300, fore: { 'plant.planter': 1, 'plant.grass': 2 }, foreN: 26 });
    sceneSh2Walk(d, 'person.photographer', -120, 1700, 716, 'near', 4311, { speed: 6 });
    sceneSh2Walk(d, 'person.walker', 1700, -120, 672, 'mid', 4313, { speed: 12 });
    sceneSh2Walk(d, 'person.child-ball', 220, 1080, 850, 'fore', 4315, { speed: 20, loop: 'pingpong' });
    sceneSh2Flock(d, 'bird.gull', 5, [200, 100, 1400, 260], 4317, { speed: 26, s: 0.6 });
    sceneSh2Walk(d, 'person.photographer', 1500, 100, 860, 'fore', 4318, { speed: 8, flip: true });
    sceneSh2Walk(d, 'person.couple', 1700, -120, 760, 'near', 4319, { speed: 12, flip: true });
    sceneSh2Walk(d, 'person.dog-walker', -120, 1700, 690, 'mid', 4320, { speed: 13 });
    sceneSh2Walk(d, 'person.jogger', 1700, -120, 812, 'near', 4321, { speed: 28, flip: true });
    return d;
  }

  /* 4. The station arcade across the taxi rank, at dusk: lit arches, the rank in the road, people with bags. */
  function stationRank() {
    const d = sceneSh2Make({ id: 'station-rank', lat: 53.3784, lon: -1.4620, heading: 110, H: 450, at: 'dusk', fov: 72, clouds: 5 });
    sceneSh2Ground(d, 'mid', sceneSh2Rect(-160, 450, 1760, 610), sceneSh2Lin('@pave.1', '@pave.0', 450, 610));
    sceneSh2Ground(d, 'near', sceneSh2Rect(-160, 610, 1760, 720), sceneSh2Lin('@road.0', '@road.1', 610, 720));
    sceneSh2Ground(d, 'near', sceneSh2Rect(-160, 720, 1760, 900), sceneSh2Lin('@pave.2', '@pave.0', 720, 900));
    sceneSh2Put(d, 'landmark.sheffield2-station', 720, 548, 'mid', 4403, { s: 1.06 });
    sceneSh2Ground(d, 'near', sceneSh2Rect(-160, 690, 1760, 694), '@line');
    sceneSh2Ground(d, 'near', sceneSh2Rect(-160, 720, 1760, 724), '@kerb');
    sceneSh2Put(d, 'vehicle.taxi-black', 1080, 648, 'near', 4407, { s: 0.92, flip: true });
    sceneSh2Put(d, 'vehicle.taxi-black', 340, 640, 'near', 4409, { s: 0.84, v: 1 });
    sceneSh2Lamp(d, 1420, 700, 380, 'near', 4411);
    sceneSh2Lamp(d, 150, 700, 340, 'mid', 4413);
    sceneSh2Put(d, 'street.station-clock', 620, 520, 'mid', 4415, { s: 0.9 });
    sceneSh2Put(d, 'tree.plane', 1560, 640, 'mid', 4416, { s: 1.0, v: 2 });
    sceneSh2Bar(d, { seed: 4400, verge: [700, 716], cover: { 'street.bollard': 2, 'plant.planter': 2, 'bird.pigeon': 2, 'bird.pigeon-feral': 1, 'plant.shrub': 1, 'street.lamppost': 1 }, n: 240, fore: { 'plant.shrub': 1, 'plant.grass': 2 }, foreN: 30 });
    sceneSh2Walk(d, 'person.student', -120, 1700, 760, 'near', 4419, { speed: 15 });
    sceneSh2Walk(d, 'person.walker', 1700, -120, 800, 'fore', 4421, { speed: 17 });
    sceneSh2Walk(d, 'person.student', 1650, 300, 706, 'mid', 4423, { speed: 11, flip: true });
    sceneSh2Walk(d, 'person.takeaway-walker', 540, 1620, 842, 'near', 4425, { speed: 13 });
    sceneSh2Put(d, 'street.bench', 1480, 830, 'near', 4429, { s: 0.9, flip: true });
    sceneSh2Flock(d, 'bird.small-flight', 4, [260, 120, 1400, 300], 4431, { speed: 24 });
    sceneSh2Walk(d, 'person.cyclist', 1700, -140, 740, 'near', 4432, { speed: 38, flip: true });
    sceneSh2Walk(d, 'person.shopper', -120, 1100, 850, 'fore', 4433, { speed: 10 });
    return d;
  }

  /* 5. Division Street down its length: a vanishing point near the middle, the shop rows smaller away from us. */
  function divisionStreet() {
    const d = sceneSh2Make({ id: 'division-street', lat: 53.3790, lon: -1.4780, heading: 270, H: 470, at: 'afternoon', fov: 74, clouds: 6 });
    sceneSh2Ground(d, 'mid', sceneSh2Rect(-160, 470, 1760, 900), sceneSh2Lin('@pave.1', '@pave.2', 470, 900));
    sceneSh2Ground(d, 'near', 'M790 470L880 470L1480 900L320 900Z', sceneSh2Lin('@road.1', '@road.0', 470, 900));
    sceneSh2Ground(d, 'near', 'M780 470L790 470L330 900L300 900Z', '@kerb');
    sceneSh2Ground(d, 'near', 'M890 470L880 470L1500 900L1520 900Z', '@kerb');
    sceneSh2Put(d, 'landmark.sheffield2-division-corner', 835, 500, 'mid', 4501, { s: 0.95 });
    const L = [[-40, 780, 1.55, 1], [360, 640, 0.95, 2]];
    const R = [[1640, 780, 1.55, 0], [1260, 640, 0.95, 1]];
    L.forEach(([x, y, s, v], i) => sceneSh2Put(d, 'building.sheffield2-shoprow', x, y, i === 0 ? 'near' : 'mid', 4503 + i * 3, { s, v }));
    R.forEach(([x, y, s, v], i) => sceneSh2Put(d, 'building.sheffield2-shoprow', x, y, i === 0 ? 'near' : 'mid', 4511 + i * 3, { s, v, flip: true }));
    sceneSh2Put(d, 'building.sheffield2-pub', 640, 548, 'mid', 4517, { s: 0.6, v: 1 });
    sceneSh2Put(d, 'building.sheffield2-pub', 220, 700, 'near', 4521, { s: 1.4, v: 1 });
    sceneSh2Put(d, 'street.sheffield2-festoon', 330, 380, 'mid', 4523, { s: 1.05, v: 0 });
    sceneSh2Put(d, 'street.sheffield2-festoon', 1000, 370, 'far', 4525, { s: 0.8, v: 1 });
    sceneSh2Put(d, 'tree.green-birch', 520, 600, 'mid', 4527, { s: 0.7, v: 0 });
    sceneSh2Put(d, 'tree.green-birch', 1090, 560, 'mid', 4528, { s: 0.6, v: 1 });
    sceneSh2Lamp(d, 1440, 780, 340, 'near', 4529);
    sceneSh2Bar(d, { seed: 4500, cover: { 'bird.pigeon': 3, 'street.bollard': 1, 'street.bench': 1, 'plant.planter': 1, 'bird.pigeon-feral': 1, 'plant.grass': 1 }, n: 300, fore: { 'street.bollard': 1, 'plant.planter': 1, 'plant.grass': 1 }, foreN: 18 });
    ['person.shopper', 'person.student', 'person.couple', 'person.shopper', 'person.cyclist'].forEach((id, i) => {
      const left = i % 2 === 0, y = 700 + (i % 3) * 58;
      sceneSh2Walk(d, id, left ? 1500 : 1700, left ? 200 : -140, y, i % 3 === 2 ? 'fore' : 'near', 4531 + i * 5, { speed: id.includes('cyclist') ? 36 : 12 + i, flip: left });
    });
    sceneSh2Flock(d, 'bird.small-flight', 4, [360, 150, 1220, 330], 4543, { speed: 22, s: 0.5 });
    sceneSh2Walk(d, 'person.shopper', -140, 1700, 880, 'fore', 4544, { speed: 12 });
    sceneSh2Walk(d, 'person.student', 1700, -140, 640, 'mid', 4545, { speed: 12, flip: true });
    sceneSh2Walk(d, 'person.cyclist', 1700, -140, 690, 'near', 4546, { speed: 40, flip: true });
    return d;
  }

  const A = [
    [crucible, { id: 'tudor-crucible', label: 'The Crucible from Tudor Square', site: 'The Crucible Theatre from the corner of Tudor Square', tags: ['theatre', 'snooker', 'modernism', 'tudor-square', 'culture', 'landmark'], mood: 'calm', colour: 'slate', ukPlace: 'tudor-square', ukView: 'close', viewReason: 'The ribbed theatre rising above the square at golden hour', ukKind: 'landmark' }],
    [moorMarket, { id: 'moor-market-stalls', label: 'The Moor Market stalls', site: 'The stall row in front of the Moor Market hall', tags: ['market', 'shopping', 'stalls', 'the-moor', 'shoppers', 'landmark'], mood: 'cheerful', colour: 'amber', ukPlace: 'moor-market', ukView: 'wide', viewReason: 'The market hall behind its row of stalls on a busy afternoon', ukKind: 'landmark' }],
    [sheafSteel, { id: 'sheaf-steel-pools', label: 'The steel wall on Sheaf Square', site: 'The steel water wall from the stepped pools on Sheaf Square', tags: ['fountain', 'steel', 'sheaf-square', 'water', 'signature', 'station'], mood: 'cheerful', colour: 'blue', ukPlace: 'sheaf-square', ukView: 'close', viewReason: 'The water running down the steel face, seen from the pools', ukKind: 'signature' }],
    [stationRank, { id: 'station-taxi-rank', label: 'The station arcade at dusk', site: 'Sheffield station arcade across the taxi rank at dusk', tags: ['station', 'railway', 'taxis', 'victorian', 'arrival', 'dusk'], mood: 'dreamy', colour: 'amber', ukPlace: 'sheffield-station', ukView: 'evening', viewReason: 'The stone arcade of the station with the rank in front at dusk', ukKind: 'heritage' }],
    [divisionStreet, { id: 'division-street-run', label: 'Division Street, down the street', site: 'Division Street from the middle, the shopfronts in perspective', tags: ['shops', 'bars', 'victorian', 'street', 'shoppers', 'perspective'], mood: 'cheerful', colour: 'amber', ukPlace: 'division-street', ukView: 'wide', viewReason: 'Shop rows drawn back to the far end of Division Street', ukKind: 'landmark' }],
  ];
  for (const [build, meta] of A) sceneSh2Add(meta, build);
})();
