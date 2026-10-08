/* ============================================================
   COMPOSED SCENES, Sheffield second set, part B (docs/dev/SCENE_ENGINE.md section 3).
   Each scene is its own composition (no archetype). Five locations in this part:
     6 west-street-tram   a Supertram crossing West Street past the stop, students waiting
     7 ecclesall-stop     a bus pulling in at a stop on Ecclesall Road, the road rising
     8 sharrow-vale       the shopfronts of Sharrow Vale Road from the kerb, close to
     9 kelham-cobbles     the Kelham Island pub on its cobbles, the works chimney beyond
    10 neepsend-night     a lit lane between the old works in Neepsend, at night
   Registered by 72-anim-pack-uk-area-sheffield2.js (pack uk-area-sheffield2).
   Data only (PURE). No names on shops or pubs, no logos, no text, no crests.
   ============================================================ */
(function () {
  if (typeof sceneSh2Make !== 'function' || typeof sceneSh2Add !== 'function') return;

  /* 6. West Street: the tram crosses the frame on its rails; the shelter stands at the stop by the pavement. */
  function westStreetTram() {
    const d = sceneSh2Make({ id: 'west-street-tram', lat: 53.3807, lon: -1.4800, heading: 250, H: 430, at: 'morning', fov: 76, clouds: 5 });
    sceneSh2Ground(d, 'mid', sceneSh2Rect(-160, 430, 1760, 600), sceneSh2Lin('@pave.1', '@pave.2', 430, 600));
    sceneSh2Ground(d, 'near', sceneSh2Rect(-160, 600, 1760, 700), sceneSh2Lin('@road.1', '@road.0', 600, 700));
    sceneSh2Ground(d, 'near', sceneSh2Rect(-160, 610, 1760, 612), '@rail');
    sceneSh2Ground(d, 'near', sceneSh2Rect(-160, 632, 1760, 634), '@rail');
    sceneSh2Ground(d, 'near', sceneSh2Rect(-160, 700, 1760, 900), sceneSh2Lin('@pave.2', '@pave.0', 700, 900));
    for (const x of [200, 760, 1320]) sceneSh2Ground(d, 'near', sceneSh2Rect(x, 540, x + 4, 600), '@wire');
    sceneSh2Ground(d, 'mid', sceneSh2Rect(-160, 540, 1760, 546), '@wire');
    sceneSh2Put(d, 'landmark.sheffield2-division-corner', 220, 470, 'mid', 6101, { s: 0.95 });
    sceneSh2Put(d, 'building.sheffield2-shoprow', 1290, 520, 'mid', 6103, { s: 1.25, v: 3, flip: true });
    sceneSh2Put(d, 'building.sheffield2-shoprow', 720, 480, 'far', 6105, { s: 0.8, v: 0 });
    sceneSh2Put(d, 'structure.sheffield2-shelter', 900, 752, 'near', 6107, { s: 1.15 });
    sceneSh2Put(d, 'tree.plane', 1500, 640, 'mid', 6109, { s: 1.0, v: 1 });
    sceneSh2Lamp(d, 60, 690, 360, 'near', 6111);
    sceneSh2Bar(d, { seed: 6100, cover: { 'street.bollard': 1, 'plant.planter': 1, 'bird.pigeon': 2, 'bird.herring-gull': 1, 'street.bench': 1, 'plant.shrub': 1 }, n: 280, fore: { 'plant.planter': 1, 'plant.grass': 2 }, foreN: 22 });
    d.actors.push({ obj: 'vehicle.sheffield-supertram', layer: 'near', path: [[1900, 642], [-300, 642]], speed: 44, loop: 'loop', s: 1.15, seed: 6113, offset: 0.3, flip: true });
    sceneSh2Walk(d, 'person.student', 820, 1000, 782, 'near', 6115, { speed: 6, loop: 'pingpong' });
    sceneSh2Walk(d, 'person.student', 1000, 880, 796, 'near', 6117, { speed: 4, loop: 'pingpong' });
    sceneSh2Walk(d, 'person.cyclist', 1700, -140, 740, 'fore', 6119, { speed: 34, flip: true });
    sceneSh2Walk(d, 'person.student', -140, 1700, 850, 'fore', 6121, { speed: 13 });
    sceneSh2Walk(d, 'person.walker', 1700, -140, 690, 'mid', 6122, { speed: 14, flip: true });
    sceneSh2Flock(d, 'bird.small-flight', 4, [240, 130, 1400, 300], 6123, { speed: 24 });
    return d;
  }

  /* 7. Ecclesall Road: a bus stop on the near pavement, the bus pulling in, the road climbing away between the cafes. */
  function ecclesallStop() {
    const d = sceneSh2Make({ id: 'ecclesall-stop', lat: 53.3700, lon: -1.4930, heading: 230, H: 360, at: 'morning', fov: 74, clouds: 6 });
    sceneSh2Ground(d, 'mid', sceneSh2Rect(-160, 380, 1760, 520), sceneSh2Lin('@pave.1', '@pave.2', 380, 520));
    sceneSh2Ground(d, 'near', 'M-160 520L1760 520L1760 640L-160 640Z', sceneSh2Lin('@road.1', '@road.0', 520, 640));
    sceneSh2Ground(d, 'near', sceneSh2Rect(-160, 640, 1760, 900), sceneSh2Lin('@pave.2', '@pave.0', 640, 900));
    sceneSh2Ground(d, 'near', sceneSh2Rect(-160, 638, 1760, 642), '@kerb');
    sceneSh2Put(d, 'building.sheffield2-shoprow', 180, 470, 'far', 7101, { s: 1.0, v: 1 });
    sceneSh2Put(d, 'building.sheffield2-shoprow', 1000, 470, 'mid', 7103, { s: 1.05, v: 2, flip: true });
    sceneSh2Put(d, 'building.sheffield2-pub', 1500, 500, 'mid', 7105, { s: 0.85, v: 2 });
    sceneSh2Put(d, 'landmark.sheffield2-division-corner', 620, 420, 'far', 7107, { s: 0.85 });
    sceneSh2Put(d, 'tree.plane', 380, 500, 'mid', 7109, { s: 1.0, v: 0 });
    sceneSh2Put(d, 'tree.plane', 1380, 480, 'mid', 7110, { s: 0.9, v: 2 });
    sceneSh2Put(d, 'structure.sheffield2-shelter', 330, 812, 'near', 7111, { s: 1.5, flip: false });
    sceneSh2Put(d, 'street.lamppost', 1250, 760, 'near', 7113, { h: 300 });
    sceneSh2Put(d, 'street.bench', 1260, 820, 'near', 7115, { s: 1.0 });
    sceneSh2Bar(d, { seed: 7100, cover: { 'plant.planter': 2, 'street.bollard': 1, 'bird.pigeon': 2, 'bird.herring-gull': 1, 'plant.shrub': 1, 'street.bench': 1 }, n: 260, fore: { 'plant.shrub': 1, 'plant.grass': 2, 'plant.planter': 1 }, foreN: 24 });
    sceneSh2Walk(d, 'vehicle.bus-double-decker', 1900, 560, 600, 'near', 7117, { speed: 14, flip: true, s: 1.0 });
    sceneSh2Walk(d, 'person.cafe-goer', 1000, 1100, 670, 'near', 7119, { speed: 4, loop: 'pingpong' });
    sceneSh2Walk(d, 'person.dog-walker', -140, 1700, 735, 'near', 7121, { speed: 13 });
    sceneSh2Walk(d, 'person.elderly-couple', 1700, 1100, 850, 'fore', 7123, { speed: 8, flip: true });
    sceneSh2Walk(d, 'person.cyclist', -140, 1700, 690, 'near', 7124, { speed: 34 });
    sceneSh2Walk(d, 'person.jogger', 1700, -140, 560, 'mid', 7125, { speed: 22, flip: true });
    sceneSh2Flock(d, 'bird.small-flight', 4, [260, 120, 1400, 280], 7127, { speed: 22 });
    return d;
  }

  /* 8. Sharrow Vale Road: from the kerb, close and low; the shop row fills the right of the frame, a scooter parked on the pavement. */
  function sharrowVale() {
    const d = sceneSh2Make({ id: 'sharrow-vale', lat: 53.3693, lon: -1.4985, heading: 280, H: 520, at: 'afternoon', fov: 82, clouds: 5 });
    sceneSh2Ground(d, 'mid', sceneSh2Rect(-160, 500, 1760, 660), sceneSh2Lin('@pave.1', '@pave.2', 500, 660));
    sceneSh2Ground(d, 'near', 'M-160 660L1760 660L1760 780L-160 780Z', sceneSh2Lin('@road.1', '@road.0', 660, 780));
    sceneSh2Ground(d, 'near', sceneSh2Rect(-160, 780, 1760, 900), sceneSh2Lin('@pave.2', '@pave.0', 780, 900));
    sceneSh2Ground(d, 'near', sceneSh2Rect(-160, 776, 1760, 782), '@kerb');
    sceneSh2Put(d, 'building.sheffield2-shoprow', 1380, 880, 'near', 8101, { s: 2.0, v: 2, flip: true });
    sceneSh2Put(d, 'building.sheffield2-shoprow', 300, 640, 'mid', 8103, { s: 0.9, v: 1 });
    sceneSh2Put(d, 'building.sheffield2-pub', 880, 600, 'mid', 8105, { s: 0.55, v: 0 });
    sceneSh2Put(d, 'landmark.sheffield2-division-corner', 60, 470, 'far', 8107, { s: 0.7, flip: true });
    sceneSh2Put(d, 'vehicle.scooter', 720, 858, 'near', 8109, { s: 1.35, flip: true });
    sceneSh2Put(d, 'street.bollard', 1130, 850, 'near', 8111, { s: 1.2 });
    sceneSh2Put(d, 'plant.planter', 540, 880, 'near', 8113, { s: 1.6, v: 1 });
    sceneSh2Put(d, 'plant.planter', 1020, 900, 'fore', 8115, { s: 1.8, v: 0 });
    sceneSh2Bar(d, { seed: 8100, far: { 'tree.distant': 1, 'tree.far-broad': 1, 'tree.far-birch': 1 }, farN: 20, cover: { 'plant.planter': 2, 'street.bollard': 1, 'street.bench': 1, 'bird.pigeon': 1, 'bird.herring-gull': 1, 'plant.shrub': 1, 'plant.grass': 1 }, n: 260, fore: { 'plant.planter': 2, 'plant.shrub': 1 }, foreN: 20 });
    sceneSh2Walk(d, 'person.shopper', 1700, 920, 840, 'near', 8117, { speed: 12, flip: true });
    sceneSh2Walk(d, 'person.buggy-walker', -140, 500, 800, 'near', 8119, { speed: 9 });
    sceneSh2Walk(d, 'person.cyclist', -140, 1700, 712, 'near', 8121, { speed: 34 });
    sceneSh2Walk(d, 'person.student', 1700, 600, 600, 'mid', 8122, { speed: 12, flip: true });
    sceneSh2Flock(d, 'bird.small-flight', 3, [260, 120, 1400, 320], 8123, { speed: 20 });
    sceneSh2Walk(d, 'person.walker', -140, 1700, 880, 'fore', 8124, { speed: 13 });
    sceneSh2Walk(d, 'person.cyclist', 1700, -140, 760, 'near', 8125, { speed: 36, flip: true });
    return d;
  }

  /* 9. Kelham Island: the pub on its cobbles at golden hour, the works chimney and a works range behind. */
  function kelhamCobbles() {
    const d = sceneSh2Make({ id: 'kelham-cobbles', lat: 53.3900, lon: -1.4705, heading: 20, H: 470, at: 'golden', fov: 72, clouds: 5 });
    sceneSh2Ground(d, 'mid', sceneSh2Rect(-160, 470, 1760, 640), sceneSh2Lin('@brick.2', '@brick.1', 470, 640));
    sceneSh2Ground(d, 'near', sceneSh2Rect(-160, 640, 1760, 780), sceneSh2Lin('@cobble.1', '@cobble.0', 640, 780));
    sceneSh2Ground(d, 'near', sceneSh2Rect(-160, 780, 1760, 900), sceneSh2Lin('@pave.2', '@pave.0', 780, 900));
    sceneSh2Put(d, 'building.sheffield-works', 1340, 630, 'mid', 9101, { s: 1.1, v: 0 });
    sceneSh2Put(d, 'landmark.sheffield2-chimney', 1050, 620, 'mid', 9103, { s: 1.0, flip: true });
    sceneSh2Put(d, 'building.sheffield2-pub', 560, 880, 'near', 9105, { s: 2.0, v: 1 });
    sceneSh2Put(d, 'street.bollard', 1260, 790, 'near', 9107, { s: 0.9 });
    sceneSh2Put(d, 'street.lamppost', 1460, 760, 'near', 9109, { h: 330 });
    sceneSh2Put(d, 'street.bench', 1200, 860, 'near', 9111, { s: 1.1, flip: true });
    sceneSh2Put(d, 'plant.planter', 1480, 860, 'fore', 9113, { s: 1.4, v: 2 });
    sceneSh2Bar(d, { seed: 9100, cover: { 'street.bollard': 2, 'street.bench': 1, 'plant.planter': 2, 'plant.grass': 2, 'plant.fern': 1, 'bird.pigeon': 1, 'bird.herring-gull': 1 }, n: 260, fore: { 'plant.planter': 1, 'plant.grass': 1, 'plant.fern': 1 }, foreN: 18 });
    sceneSh2Walk(d, 'person.couple', 1700, -140, 760, 'near', 9115, { speed: 11, flip: true });
    sceneSh2Walk(d, 'person.takeaway-walker', -140, 1700, 710, 'mid', 9117, { speed: 12 });
    sceneSh2Walk(d, 'person.student', 1000, 1600, 868, 'fore', 9119, { speed: 10 });
    sceneSh2Walk(d, 'person.cyclist', 1700, -140, 690, 'mid', 9121, { speed: 34, flip: true });
    sceneSh2Flock(d, 'bird.small-flight', 3, [200, 110, 1200, 300], 9123, { speed: 22 });
    sceneSh2Walk(d, 'person.dog-walker', -140, 1700, 800, 'near', 9124, { speed: 13 });
    sceneSh2Walk(d, 'person.student', 1700, 900, 880, 'fore', 9125, { speed: 10, flip: true });
    return d;
  }

  /* 10. Neepsend at night: a lit lane between the works walls, a lit pub at the end, the lamps and a taxi. */
  function neepsendNight() {
    const d = sceneSh2Make({ id: 'neepsend-night', lat: 53.3925, lon: -1.4775, heading: 300, H: 430, at: 'night', fov: 74, clouds: 4 });
    sceneSh2Ground(d, 'mid', sceneSh2Rect(-160, 430, 1760, 560), sceneSh2Lin('@brick.2', '@brick.1', 430, 560));
    sceneSh2Ground(d, 'near', 'M700 430L840 430L1500 900L340 900Z', sceneSh2Lin('@road.1', '@road.0', 430, 900));
    sceneSh2Ground(d, 'near', 'M-160 560L700 430L340 900L-160 900Z', sceneSh2Lin('@pave.2', '@pave.0', 430, 900));
    sceneSh2Ground(d, 'near', 'M1760 560L840 430L1500 900L1760 900Z', sceneSh2Lin('@pave.2', '@pave.0', 430, 900));
    sceneSh2Put(d, 'building.sheffield-works', 120, 560, 'far', 10101, { s: 1.0, v: 1 });
    sceneSh2Put(d, 'building.sheffield-works', 1480, 700, 'near', 10103, { s: 1.5, v: 0, flip: true });
    sceneSh2Put(d, 'building.sheffield2-pub', 780, 500, 'far', 10105, { s: 0.75, v: 2 });
    sceneSh2Put(d, 'landmark.sheffield2-chimney', 1240, 520, 'far', 10107, { s: 0.9, flip: true });
    sceneSh2Put(d, 'street.lamppost', 260, 740, 'near', 10109, { h: 360 });
    sceneSh2Put(d, 'street.lamppost', 1290, 580, 'mid', 10111, { h: 280 });
    sceneSh2Put(d, 'street.lamppost', 610, 600, 'mid', 10113, { h: 240 });
    sceneSh2Put(d, 'vehicle.taxi-black', 920, 700, 'mid', 10115, { s: 0.7, flip: true });
    sceneSh2Bar(d, { seed: 10100, cover: { 'street.bollard': 1, 'street.lamppost': 1, 'plant.planter': 2, 'plant.grass': 2, 'plant.shrub': 1, 'bird.pigeon-feral': 1, 'bird.pigeon': 1 }, n: 260, fore: { 'street.bollard': 1, 'plant.grass': 2 }, foreN: 16 });
    sceneSh2Walk(d, 'person.couple', 1700, 900, 812, 'near', 10117, { speed: 11, flip: true });
    sceneSh2Walk(d, 'person.student', 300, 1100, 720, 'mid', 10119, { speed: 9, loop: 'pingpong' });
    sceneSh2Walk(d, 'person.takeaway-walker', -140, 700, 880, 'fore', 10121, { speed: 13 });
    sceneSh2Walk(d, 'person.cyclist', 1700, 200, 690, 'mid', 10122, { speed: 30, flip: true });
    sceneSh2Flock(d, 'bird.small-flight', 3, [260, 120, 1300, 300], 10123, { speed: 20 });
    sceneSh2Walk(d, 'person.couple', -140, 600, 760, 'near', 10124, { speed: 11 });
    sceneSh2Walk(d, 'person.student', 1000, 1700, 880, 'fore', 10125, { speed: 12, flip: true });
    return d;
  }

  const B = [
    [westStreetTram, { id: 'west-street-tram', label: 'A tram on West Street', site: 'A Supertram crossing West Street past the stop, students waiting', tags: ['tram', 'transport', 'students', 'west-street', 'stop', 'morning'], mood: 'cheerful', colour: 'blue', ukPlace: 'west-street', ukView: 'tram', viewReason: 'A Supertram crossing West Street past the stop in the morning', ukKind: 'heritage' }],
    [ecclesallStop, { id: 'ecclesall-bus-stop', label: 'A bus on Ecclesall Road', site: 'A bus pulling in at a stop on Ecclesall Road', tags: ['buses', 'cafes', 'ecclesall-road', 'shops', 'street', 'morning'], mood: 'calm', colour: 'green', ukPlace: 'ecclesall-road', ukView: 'roadside', viewReason: 'A bus at the stop, the cafes and the road climbing away', ukKind: 'landmark' }],
    [sharrowVale, { id: 'sharrow-vale-kerb', label: 'Sharrow Vale Road from the kerb', site: 'The shopfronts of Sharrow Vale Road, seen from the kerb', tags: ['shops', 'independent', 'cafes', 'sharrow-vale', 'kerb', 'street'], mood: 'cheerful', colour: 'amber', ukPlace: 'sharrow-vale', ukView: 'close', viewReason: 'The independent shops from the kerb, a scooter on the pavement', ukKind: 'landmark' }],
    [kelhamCobbles, { id: 'kelham-island-pub', label: 'The Kelham Island pub', site: 'The pub on its cobbles in Kelham Island, the works chimney beyond', tags: ['pubs', 'cobbles', 'industry', 'kelham', 'chimney', 'golden-hour'], mood: 'cheerful', colour: 'amber', ukPlace: 'kelham-pubs', ukView: 'close', viewReason: 'The corner pub on the cobbles at golden hour', ukKind: 'heritage' }],
    [neepsendNight, { id: 'neepsend-lane-night', label: 'Neepsend at night', site: 'A lit lane between the old works in Neepsend at night', tags: ['pubs', 'nightlife', 'industry', 'neepsend', 'lane', 'night'], mood: 'dreamy', colour: 'violet', ukPlace: 'neepsend', ukView: 'night', viewReason: 'The lit lane between the works walls, a pub at the end', ukKind: 'heritage' }],
  ];
  for (const [build, meta] of B) sceneSh2Add(meta, build);
})();
