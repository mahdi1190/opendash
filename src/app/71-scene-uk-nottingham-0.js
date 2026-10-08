/* ============================================================
   COMPOSED SCENES uk / Nottingham (docs/dev/SCENE_ENGINE.md 3 and 8). TWELVE scenes, each a different real place:
     1  castle-rock          Nottingham Castle: the rock and the mansion seen from the road below it (looking up)
     2  ye-olde-trip         Ye Olde Trip to Jerusalem: the inn at the foot of the rock, from the stone steps of Brewhouse Yard
     3  old-market-square    the Old Market Square: the fountain pool in the foreground, the Council House across the tram rails
     4  maid-marian-trams    the tram rails of Maid Marian Way, looking down the road towards the castle rock
     5  stoney-street        Stoney Street in the Lace Market: a cobbled canyon between the lace warehouses
     6  hockley-shops        Hockley: a row of shopfronts and Victorian terraces seen from the pavement at dusk
     7  wollaton-deer-park   Wollaton Park: the deer on the grass slope below Wollaton Hall, at low eye level
     8  trent-bridge         Trent Bridge: the cast-iron arches over the river, from the towpath, rowers on the water
     9  wilford-bridge       the Wilford Suspension Bridge over the Trent, from the riverbank with the boathouse
    10  major-oak            the Major Oak in its ring fence, from the forest floor
    11  sherwood-pines       a pine ride in Sherwood Pines, the tower of Edwinstowe church at the far end
    12  goose-fair           the Goose Fair on the Forest Recreation Ground: the rides and the big wheel at dusk
   Each row is built by the NOTTS kit (70-scene-lib-area-nottingham.js): a skeleton (view, sky, layers, palette),
   then the scene's OWN ground, placements, scatter, actors and flocks. No archetype composes the picture.
   Data only (PURE): the season comes from the date ('auto'), the light from the live sky. Registered by
   72-anim-pack-uk-area-nottingham.js. Lint and look:
     node tools/anim-pack.mjs scene lint --pack uk-area-nottingham --perf
     node tools/anim-pack.mjs scene sheet --pack uk-area-nottingham --contact
   Care: no text, no club colours or marks, no signage; people are tiny anonymous walkers.
   ============================================================ */
const UK_NOTTINGHAM_SCENES = (function () {
  const N = NOTTS;
  const lin = N.lin;
  const rows = [];
  // o: the place fields and the caption; build: () => scene data (lazy)
  const row = (id, o, build) => rows.push({ id, lat: o.lat, lon: o.lon, town: o.town, label: o.label, kind: o.kind, colour: o.colour, tags: o.tags,
    ukPlace: o.ukPlace, ukView: o.ukView, reason: o.reason, build });

  row('castle-rock', { lat: 52.9489, lon: -1.1560, town: 'Nottingham', label: 'Nottingham Castle', kind: 'signature', colour: 'red', ukPlace: 'nottingham-castle', ukView: 'wide',
    reason: 'The castle on its sandstone rock, seen from the road below',
    tags: ['castle', 'castle rock', 'sandstone', 'road', 'buses', 'looking up'] }, () => {
    const k = N.make({ id: 'castle-rock', cover: { 'plant.grass': 3, 'ground.leaves': 2, 'plant.planter': 1, 'plant.bracken': 1 }, lat: 52.9489, lon: -1.1560, heading: 40, H: 430, at: 'afternoon', setting: 'urban' });
    return k.rect('mid', -160, 520, 1760, 600, 'wall')
      .rect('near', -160, 600, 1760, 700, lin('pave', 600, 700))
      .rect('near', -160, 700, 1760, 708, 'kerb')
      .rect('near', -160, 708, 1760, 905, lin('tarmac', 708, 905))
      .place('landmark.nottingham-castle', 900, 600, 640, 'mid', { seed: 3 })
      .place('tree.plane', 110, 600, 420, 'mid', { seed: 5 })
      .place('tree.plane', 1520, 610, 380, 'mid', { seed: 6, flip: true })
      .place('street.lamppost', 300, 706, 330, 'near', { seed: 7 })
      .place('street.lamppost', 1230, 704, 330, 'near', { seed: 8, flip: true })
      .drive('vehicle.bus', 'near', [[1900, 790], [-300, 790]], 44, 190, { seed: 9, flip: true })
      .drive('vehicle.car-city', 'near', [[-300, 852], [1900, 852]], 56, 130, { seed: 10 })
      .drive('vehicle.taxi-black', 'near', [[1900, 826], [-300, 826]], 48, 118, { seed: 11, flip: true })
      .walk('person.cyclist', 'near', 752, -120, 1720, 24, { seed: 12 })
      .walk('person.shopper', 'near', 668, -120, 1720, 11, { seed: 13, back: true, k: 0.92 })
      .walk('person.student', 'near', 640, -120, 1720, 10, { seed: 14, k: 0.9 })
      .walk('person.buggy-walker', 'near', 690, 1720, -120, 8, { seed: 15 })
      .walk('person.elderly-walker', 'mid', 618, -120, 1720, 6, { seed: 16, k: 0.85 })
      .scatter({ 'street.bollard': 3, 'street.bench': 1 }, 'near', [-100, 698, 1700, 704], 16, { minGap: 90, s: [0.5, 1.0] })
      .scatter('plant.planter', 'near', [-140, 600, 1700, 690], 9, { minGap: 150, s: [0.6, 0.8] })
      .scatter('plant.grass', 'mid', [-140, 556, 1700, 600], 70, { minGap: 9, s: [0.5, 0.75], extra: { anim: 'strip' } })
      .scatter({ 'ground.leaves': 1, 'ground.puddle': 2 }, 'near', [-120, 606, 1700, 690], 22, { minGap: 40, s: [0.6, 0.9] })
      .scatter('bird.pigeon', 'near', [60, 800, 1500, 880], 6, { minGap: 60, s: [0.7, 1.0] })
      .scatter('ground.puddle', 'near', [-120, 740, 1700, 860], 5, { minGap: 150 })
      .flock('bird.small-flight', 5, [160, 100, 1440, 300], 26, 0.5, 'far')
      .flock('bird.herring-gull-flight', 4, [80, 140, 1500, 380], 20, 0.7, 'mid')
      .walk('person.walker', 'near', 878, 1720, -120, 12, { seed: 41, k: 0.95 })
      .done();
  });

  row('ye-olde-trip', { lat: 52.9494, lon: -1.1528, town: 'Nottingham', label: 'Ye Olde Trip to Jerusalem', kind: 'heritage', colour: 'amber', ukPlace: 'trip-to-jerusalem', ukView: 'close-evening',
    reason: 'The inn cut into the rock, up the steps of Brewhouse Yard',
    tags: ['inn', 'pub', 'castle rock', 'steps', 'sandstone', 'history', 'caves'] }, () => {
    const k = N.make({ id: 'ye-olde-trip', cover: { 'plant.fern': 2, 'plant.grass': 2, 'ground.leaves': 1, 'plant.planter': 1 }, lat: 52.9494, lon: -1.1528, heading: 330, H: 300, at: 'golden', setting: 'urban' });
    return k.ground('mid', 'M-160 300 L380 300 L520 520 L470 905 L-160 905Z', lin('stone', 300, 905))
      .ground('mid', 'M-100 430 Q-10 380 90 430 V520 H-100Z', '#3a261e')
      .ground('mid', 'M130 560 Q200 520 270 560 V640 H130Z', '#3a261e')
      .rect('mid', 640, 600, 1760, 660, lin('cobble', 600, 660))
      .rect('near', 700, 800, 1760, 905, lin('cobble', 800, 905))
      .place('landmark.trip-to-jerusalem', 1060, 640, 430, 'mid', { seed: 3 })
      .place('structure.sandstone-steps', 610, 905, 300, 'near', { seed: 4 })
      .place('street.lantern-string', 980, 380, 130, 'mid', { seed: 5 })
      .scatter('plant.fern', 'mid', [-160, 330, 420, 560], 26, { minGap: 26, s: [0.5, 0.8] })
      .scatter('plant.bracken', 'mid', [-160, 540, 300, 700], 14, { minGap: 30, s: [0.5, 0.8] })
      .walk('person.couple', 'near', 850, 60, 1360, 9, { pingpong: true, seed: 21 })
      .walk('person.walker', 'near', 905, -120, 1720, 10, { seed: 22, k: 1.02 })
      .walk('person.student', 'mid', 650, 760, 1400, 12, { pingpong: true, seed: 23 })
      .walk('person.dog-walker', 'near', 760, 1720, -120, 12, { seed: 24 })
      .scatter('bird.pigeon', 'near', [820, 820, 1700, 900], 8, { minGap: 50, s: [0.7, 1.0] })
      .scatter({ 'street.bollard': 3, 'street.bench': 1 }, 'near', [700, 780, 1700, 790], 10, { minGap: 120, s: [0.5, 1.0] })
      .scatter({ 'ground.leaves': 1, 'ground.puddle': 2 }, 'near', [-140, 820, 600, 900], 18, { minGap: 40 })
      .scatter('plant.planter', 'near', [700, 820, 1700, 880], 6, { minGap: 150 })
      .flock('bird.small-flight', 6, [60, 60, 1400, 240], 24, 0.5, 'far')
      .flock('bird.herring-gull-flight', 3, [400, 140, 1400, 300], 20, 0.7, 'mid')
      .walk('person.walker', 'near', 875, 1720, -120, 12, { seed: 42, k: 0.95 })
      .done();
  });

  row('old-market-square', { lat: 52.9531, lon: -1.1499, town: 'Nottingham', label: 'Old Market Square', kind: 'landmark', colour: 'blue', ukPlace: 'old-market-square', ukView: 'wide',
    reason: 'The fountain pool in front, the Council House across the tram rails',
    tags: ['old market square', 'fountains', 'council house', 'trams', 'square', 'crowd'] }, () => {
    const k = N.make({ id: 'old-market-square', cover: { 'ground.leaves': 1, 'ground.puddle': 1, 'street.bollard': 1, 'street.bench': 1, 'plant.grass': 1, 'plant.planter': 1 }, lat: 52.9531, lon: -1.1499, heading: 240, H: 470, at: 'noon', setting: 'urban' });
    return k.rect('mid', -160, 470, 1760, 560, lin('pave', 470, 560))
      .rect('near', -160, 560, 1760, 905, lin('pave', 560, 905))
      .rect('near', -160, 610, 1760, 616, 'rail')
      .rect('near', -160, 632, 1760, 638, 'rail')
      .place('landmark.market-square-fountains', 720, 800, 150, 'near', { seed: 3 })
      .place('landmark.nottingham-council-house', 1240, 560, 380, 'mid', { seed: 4 })
      .place('tree.plane', 60, 540, 400, 'mid', { seed: 5 })
      .place('tree.plane', 1560, 520, 320, 'far', { seed: 6, flip: true })
      .drive('vehicle.nottingham-tram', 'mid', [[-300, 596], [1900, 596]], 30, 120, { seed: 7 })
      .drive('vehicle.nottingham-tram', 'near', [[1900, 662], [-300, 662]], 26, 150, { seed: 8, flip: true })
      .walk('person.shopper', 'mid', 520, -120, 1720, 10, { seed: 11 })
      .walk('person.student', 'mid', 548, 1720, -120, 9, { seed: 12 })
      .walk('person.couple', 'near', 700, -120, 1720, 7, { seed: 13, k: 1.05 })
      .walk('person.walker', 'near', 830, 1720, -120, 12, { seed: 14 })
      .walk('person.child-scooter', 'near', 770, -120, 1720, 15, { seed: 16, k: 0.8 })
      .walk('person.walker', 'near', 745, 1720, -120, 13, { seed: 17 })
      .place('person.walker', 1420, 860, 120, 'near', { seed: 18 })
      .scatter('bird.pigeon', 'near', [-120, 640, 1700, 900], 14, { minGap: 60, s: [0.6, 1.0] })
      .scatter('street.bench', 'near', [-100, 880, 1700, 900], 3, { minGap: 300, s: [0.6, 0.7] })
      .scatter({ 'ground.leaves': 1, 'ground.puddle': 2 }, 'near', [-140, 700, 1700, 900], 20, { minGap: 40 })
      .scatter('plant.planter', 'mid', [-140, 500, 1700, 520], 5, { minGap: 250 })
      .flock('bird.herring-gull-flight', 5, [100, 120, 1500, 380], 20, 0.7, 'far')
      .flock('bird.small-flight', 4, [400, 80, 1200, 200], 24, 0.5, 'far')
      .walk('person.walker', 'near', 872, 1720, -120, 12, { seed: 43, k: 0.95 })
      .done();
  });

  row('maid-marian-trams', { lat: 52.9522, lon: -1.1478, town: 'Nottingham', label: 'Trams on Maid Marian Way', kind: 'heritage', colour: 'blue', ukPlace: 'nottingham-tram', ukView: 'wide-morning',
    reason: 'The tram rails of the city road, the castle rock at the far end',
    tags: ['tram', 'rails', 'city road', 'castle', 'overhead wire', 'morning'] }, () => {
    const k = N.make({ id: 'maid-marian-trams', coverN: 200, cover: { 'ground.leaves': 1, 'ground.puddle': 1, 'street.bollard': 1, 'plant.planter': 1, 'plant.grass': 1 }, lat: 52.9522, lon: -1.1478, heading: 180, H: 500, at: 'morning', setting: 'urban' });
    return k.ground('far', 'M-160 300 Q800 260 1760 300 V304 Q800 264 -160 304Z', '#3a3e44')
      .rect('far', -160, 500, 1760, 560, lin('wall', 500, 560))
      .ground('near', 'M-160 500 L700 540 L300 905 L-160 905Z', lin('pave', 500, 905))
      .ground('near', 'M1760 500 L900 540 L1300 905 L1760 905Z', lin('pave', 500, 905))
      .ground('near', 'M-160 905 L700 540 L900 540 L1760 905Z', lin('tarmac', 540, 905))
      .ground('near', 'M430 905 L790 520 L796 520 L452 905Z', lin('rail', 520, 905))
      .ground('near', 'M1148 905 L806 520 L812 520 L1170 905Z', lin('rail', 520, 905))
      .place('landmark.nottingham-castle', 840, 500, 300, 'far', { seed: 7 })
      .place('building.terrace-victorian', 110, 540, 330, 'mid', { seed: 3 })
      .place('building.terrace-victorian', 520, 500, 260, 'far', { seed: 4, flip: true })
      .place('building.lace-market-warehouse', 1380, 560, 380, 'mid', { seed: 5, variant: 1, flip: true })
      .place('building.lace-market-warehouse', 1700, 600, 420, 'near', { seed: 6, variant: 0 })
      .place('street.tram-shelter', 1340, 760, 170, 'near', { seed: 12 })
      .place('street.lamppost', 380, 620, 260, 'mid', { seed: 13 })
      .place('street.lamppost', 1240, 600, 240, 'mid', { seed: 14, flip: true })
      .drive('vehicle.nottingham-tram', 'mid', [[1900, 640], [-300, 640]], 34, 120, { seed: 8 })
      .drive('vehicle.car', 'near', [[-300, 860], [1900, 860]], 48, 120, { seed: 9 })
      .drive('vehicle.taxi', 'near', [[1900, 800], [-300, 800]], 40, 112, { seed: 10, flip: true })
      .walk('person.student', 'near', 720, -120, 380, 10, { pingpong: true, seed: 15 })
      .walk('person.walker', 'mid', 600, -120, 420, 8, { pingpong: true, seed: 16 })
      .walk('person.walker', 'near', 820, 1400, 1720, 12, { pingpong: true, seed: 17 })
      .walk('person.cyclist', 'near', 880, -120, 1720, 20, { seed: 18 })
      .scatter({ 'street.bollard': 3, 'street.bench': 1 }, 'near', [1300, 800, 1700, 820], 10, { minGap: 80, s: [0.5, 1.0] })
      .scatter('ground.puddle', 'near', [500, 840, 1100, 890], 5, { minGap: 120 })
      .scatter({ 'ground.leaves': 1, 'ground.puddle': 2 }, 'near', [-140, 740, 1700, 900], 16, { minGap: 50 })
      .scatter('plant.planter', 'mid', [1240, 560, 1500, 600], 4, { minGap: 120 })
      .scatter('bird.pigeon', 'near', [-120, 680, 1700, 900], 8, { minGap: 70 })
      .flock('bird.small-flight', 4, [200, 80, 1400, 320], 24, 0.5, 'far')
      .flock('bird.herring-gull-flight', 3, [300, 140, 1300, 360], 20, 0.7, 'mid')
      .walk('person.walker', 'near', 868, 1720, -120, 12, { seed: 44, k: 0.95 })
      .done();
  });

  row('stoney-street', { lat: 52.9516, lon: -1.1447, town: 'Nottingham', label: 'Stoney Street, the Lace Market', kind: 'heritage', colour: 'red', ukPlace: 'lace-market', ukView: 'wide',
    reason: 'A cobbled canyon between the lace warehouses',
    tags: ['lace market', 'warehouses', 'cobbles', 'victorian', 'street', 'lanterns'] }, () => {
    const k = N.make({ id: 'stoney-street', cover: { 'ground.leaves': 1, 'ground.puddle': 1, 'plant.planter': 1, 'plant.grass': 1 }, lat: 52.9516, lon: -1.1447, heading: 150, H: 380, at: 'golden', setting: 'urban' });
    return k.ground('near', 'M-160 905 L430 600 L1170 600 L1760 905Z', lin('cobble', 600, 905))
      .ground('near', 'M-160 520 L330 560 L430 600 L300 905 H-160Z', lin('pave', 520, 905))
      .ground('near', 'M1760 520 L1270 560 L1170 600 L1300 905 H1760Z', lin('pave', 520, 905))
      .place('building.lace-market-warehouse', 60, 600, 720, 'near', { seed: 3, variant: 0 })
      .place('building.lace-market-warehouse', 430, 560, 330, 'mid', { seed: 4, variant: 1 })
      .place('building.lace-market-warehouse', 640, 500, 240, 'far', { seed: 5, variant: 0 })
      .place('building.lace-market-warehouse', 1560, 600, 720, 'near', { seed: 6, variant: 1, flip: true })
      .place('building.lace-market-warehouse', 1190, 560, 330, 'mid', { seed: 7, variant: 0, flip: true })
      .place('building.lace-market-warehouse', 1000, 500, 230, 'far', { seed: 8, variant: 1 })
      .place('landmark.nottingham-castle', 800, 470, 210, 'far', { seed: 9 })
      .place('street.lantern-string', 820, 500, 120, 'mid', { seed: 10 })
      .walk('person.cyclist', 'near', 770, -120, 1720, 22, { seed: 11 })
      .walk('person.couple', 'mid', 690, 520, 1100, 8, { pingpong: true, seed: 12 })
      .walk('person.student', 'near', 860, 1720, -120, 11, { seed: 13, k: 1.02 })
      .walk('person.phone-idler', 'mid', 650, 600, 980, 5, { pingpong: true, seed: 14 })
      .walk('person.walker', 'near', 780, -120, 460, 12, { pingpong: true, seed: 15, k: 0.95 })
      .scatter('plant.planter', 'near', [-140, 640, 260, 720], 6, { minGap: 100 })
      .scatter({ 'street.bollard': 3, 'street.bench': 1 }, 'near', [1290, 640, 1700, 660], 8, { minGap: 70 })
      .scatter({ 'ground.leaves': 1, 'ground.puddle': 2 }, 'near', [-120, 700, 1700, 900], 24, { minGap: 40 })
      .scatter('bird.pigeon', 'near', [520, 700, 1100, 900], 7, { minGap: 60 })
      .flock('bird.small-flight', 6, [300, 80, 1300, 300], 24, 0.5, 'far')
      .walk('person.walker', 'near', 874, 1720, -120, 12, { seed: 45, k: 0.95 })
      .flock('bird.small-flight', 4, [200, 120, 1400, 320], 22, 0.5, 'far')
      .done();
  });

  row('hockley-shops', { lat: 52.9533, lon: -1.1421, town: 'Nottingham', label: 'Hockley', kind: 'heritage', colour: 'red', ukPlace: 'hockley', ukView: 'close-evening',
    reason: 'Lit shopfronts and Victorian terraces seen from the pavement at dusk',
    tags: ['hockley', 'shops', 'terraces', 'evening', 'brick', 'pavement'] }, () => {
    const k = N.make({ id: 'hockley-shops', cover: { 'plant.planter': 2, 'street.bollard': 2, 'ground.leaves': 1, 'ground.puddle': 1, 'plant.grass': 2 }, lat: 52.9533, lon: -1.1421, heading: 100, H: 560, at: 'dusk', setting: 'urban' });
    return k.rect('mid', -160, 300, 1760, 620, lin('wall', 300, 620))
      .rect('near', -160, 640, 1760, 780, lin('pave', 640, 780))
      .rect('near', -160, 780, 1760, 800, 'kerb')
      .rect('near', -160, 800, 1760, 905, lin('tarmac', 800, 905))
      .place('building.terrace-victorian', 230, 620, 330, 'mid', { seed: 3 })
      .place('building.terrace-victorian', 700, 620, 330, 'mid', { seed: 4, flip: true })
      .place('building.terrace-victorian', 1180, 620, 330, 'mid', { seed: 5 })
      .place('building.shopfront', 330, 740, 340, 'near', { seed: 6 })
      .place('building.shopfront', 1040, 740, 340, 'near', { seed: 7, flip: true })
      .place('building.shopfront', 760, 680, 300, 'mid', { seed: 8 })
      .place('building.lace-market-warehouse', 1500, 640, 380, 'mid', { seed: 9, variant: 0 })
      .drive('vehicle.car-city', 'near', [[1900, 880], [-300, 880]], 34, 120, { seed: 10 })
      .walk('person.cyclist', 'near', 860, 1720, -120, 22, { seed: 11 })
      .walk('person.shopper', 'near', 720, -120, 1720, 11, { seed: 12, k: 0.9 })
      .walk('person.cafe-goer', 'near', 690, 820, 1400, 8, { pingpong: true, seed: 13 })
      .walk('person.takeaway-walker', 'near', 760, -120, 1720, 9, { seed: 14, back: true, k: 0.95 })
      .scatter({ 'street.bollard': 3, 'street.bench': 1 }, 'near', [-120, 760, 1700, 778], 14, { minGap: 110, s: [0.5, 1.0] })
      .scatter('plant.planter', 'near', [-120, 650, 1700, 700], 6, { minGap: 200 })
      .scatter({ 'ground.leaves': 1, 'ground.puddle': 2 }, 'near', [-120, 800, 1700, 900], 20, { minGap: 50 })
      .scatter('bird.pigeon', 'near', [-120, 660, 1700, 880], 7, { minGap: 90 })
      .flock('bird.small-flight', 5, [200, 140, 1400, 400], 24, 0.5, 'far')
      .walk('person.walker', 'near', 884, 1720, -120, 12, { seed: 46, k: 0.95 })
      .flock('bird.small-flight', 4, [200, 140, 1400, 380], 22, 0.5, 'far')
      .done();
  });

  row('wollaton-deer-park', { lat: 52.9441, lon: -1.2080, town: 'Nottingham', label: 'Wollaton deer park', kind: 'landscape', colour: 'green', ukPlace: 'wollaton-park', ukView: 'wide-morning',
    reason: 'Deer on the grass slope below Wollaton Hall, at deer height',
    tags: ['wollaton', 'deer', 'park', 'hall', 'parkland', 'morning'] }, () => {
    const k = N.make({ id: 'wollaton-deer-park', coverN: 120, cover: { 'plant.grass': 3, 'plant.bracken': 1, 'plant.wildflowers': 1 }, lat: 52.9441, lon: -1.2080, heading: 10, H: 320, at: 'morning', setting: 'natural' });
    return k.ground('far', 'M-160 320 Q500 300 900 330 T1760 320 V620 H-160Z', lin('grass', 320, 620))
      .rect('mid', -160, 600, 1760, 700, lin('grass', 600, 700))
      .rect('near', -160, 690, 1760, 905, lin('grass', 690, 905))
      .ground('near', 'M700 905 Q760 800 880 760 Q960 740 1100 735 L1120 748 Q980 770 920 790 Q820 826 790 905Z', lin('path', 735, 905))
      .place('landmark.wollaton-hall', 1090, 560, 330, 'mid', { seed: 3 })
      .place('tree.ancient-oak', 220, 680, 470, 'near', { seed: 4, flip: true })
      .place('tree.bank-oak', 1500, 520, 320, 'mid', { seed: 5 })
      .place('tree.oak', 660, 470, 220, 'far', { seed: 6 })
      .place('animal.deer', 420, 580, 80, 'mid', { seed: 7 })
      .place('animal.deer', 640, 660, 120, 'near', { seed: 8, flip: true, variant: 1 })
      .place('animal.deer', 1180, 610, 90, 'mid', { seed: 9, variant: 1 })
      .place('animal.deer', 1400, 730, 150, 'near', { seed: 10 })
      .place('animal.deer', 900, 790, 170, 'near', { seed: 11, flip: true })
      .walk('person.walker', 'mid', 640, -120, 1720, 10, { seed: 12, k: 0.9 })
      .walk('person.jogger', 'near', 860, 1720, -120, 15, { seed: 13 })
      .walk('person.hiker', 'mid', 700, -120, 1720, 9, { seed: 15, k: 0.95 })
      .walk('person.walker', 'near', 930, 1720, -120, 11, { seed: 16 })
      .walk('person.dog-walker', 'near', 760, -120, 1720, 12, { seed: 14, k: 0.95 })
      .scatter('plant.bracken', 'near', [-150, 700, 1750, 905], 40, { minGap: 20, s: [0.6, 0.9], extra: { anim: 'strip' } })
      .scatter('plant.grass', 'near', [-150, 690, 1750, 905], 90, { minGap: 10, s: [0.6, 1.0], extra: { anim: 'strip' } })
      .scatter('plant.wildflowers', 'fore', [-150, 820, 1750, 905], 30, { minGap: 24, s: [0.8, 1.1] })
      .scatter('plant.grass', 'mid', [-150, 620, 1750, 690], 60, { minGap: 9, s: [0.5, 0.7], extra: { anim: 'strip' } })
      .scatter('plant.shrub', 'mid', [-150, 630, 600, 680], 5, { minGap: 120 })
      .flock('bird.small-flight', 5, [120, 100, 1400, 260], 22, 0.5, 'far')
      .walk('person.walker', 'near', 871, 1720, -120, 12, { seed: 47, k: 0.95 })
      .done();
  });

  row('trent-bridge', { lat: 52.9383, lon: -1.1368, town: 'Nottingham', label: 'Trent Bridge', kind: 'landmark', colour: 'blue', ukPlace: 'trent-bridge', ukView: 'wide',
    reason: 'Cast-iron arches over the Trent, rowers below, from the towpath',
    tags: ['trent', 'bridge', 'river', 'rowing', 'towpath', 'ironwork'] }, () => {
    const k = N.make({ id: 'trent-bridge', coverN: 200, cover: { 'plant.reed': 1, 'plant.grass': 3, 'plant.bulrush': 1, 'plant.wildflowers': 1 }, lat: 52.9383, lon: -1.1368, heading: 300, H: 380, at: 'golden', setting: 'mixed' });
    return k.water('mid', 500, 640)
      .rect('near', -160, 640, 1760, 720, lin('grass', 640, 720))
      .rect('near', -160, 720, 1760, 760, lin('path', 720, 760))
      .rect('fore', -160, 760, 1760, 905, lin('grass', 760, 905))
      .place('landmark.trent-bridge', 800, 520, 200, 'mid', { seed: 3, reflect: true })
      .place('tree.bank-willow', 110, 560, 420, 'mid', { seed: 4 })
      .place('tree.bank-alder', 1560, 600, 330, 'mid', { seed: 5, flip: true })
      .place('street.lamppost', 400, 720, 280, 'near', { seed: 12 })
      .place('street.lamppost', 1300, 730, 280, 'near', { seed: 13, flip: true })
      .place('bird.mallard', 300, 600, 45, 'mid', { seed: 11, reflect: true })
      .walk('person.rower', 'mid', 560, -120, 1720, 15, { seed: 6 })
      .walk('person.rower', 'mid', 590, 1720, -120, 18, { seed: 7, k: 1.05 })
      .drive('boat.narrowboat', 'mid', [[1900, 610], [-300, 610]], 7, 120, { seed: 8 })
      .walk('person.cyclist', 'near', 740, -120, 1720, 20, { seed: 9 })
      .walk('person.walker', 'near', 705, 1720, -120, 10, { seed: 10, k: 0.95 })
      .walk('person.jogger', 'fore', 805, -120, 1720, 12, { seed: 14, k: 1.1 })
      .scatter('plant.reed', 'near', [-150, 600, 260, 700], 30, { minGap: 14 })
      .scatter('plant.reed', 'near', [1380, 600, 1760, 700], 30, { minGap: 14 })
      .scatter('plant.bulrush', 'mid', [-150, 630, 1750, 650], 30, { minGap: 30 })
      .scatter('plant.grass', 'near', [-150, 650, 1750, 720], 100, { minGap: 8, s: [0.5, 0.8], extra: { anim: 'strip' } })
      .scatter('plant.wildflowers', 'fore', [-150, 780, 1750, 905], 60, { minGap: 22, s: [0.8, 1.1] })
      .scatter('street.bench', 'near', [400, 740, 1200, 760], 2, { minGap: 400 })
      .scatter({ 'tree.distant': 2, 'tree.far-birch': 1, 'tree.far-broad': 1 }, 'far', [-150, 380, 1750, 420], 16, { minGap: 50, s: [0.25, 0.45] })
      .flock('bird.herring-gull-flight', 4, [100, 120, 1500, 320], 20, 0.7, 'mid')
      .flock('bird.small-flight', 5, [300, 80, 1400, 260], 26, 0.5, 'far')
      .walk('person.walker', 'near', 876, 1720, -120, 12, { seed: 48, k: 0.95 })
      .done();
  });

  row('wilford-bridge', { lat: 52.9245, lon: -1.1262, town: 'Nottingham', label: 'Wilford Suspension Bridge', kind: 'landmark', colour: 'blue', ukPlace: 'wilford-bridge', ukView: 'wide',
    reason: 'The chain suspension bridge over the Trent from the riverbank',
    tags: ['wilford', 'suspension bridge', 'trent', 'boathouse', 'herons', 'riverbank'] }, () => {
    const k = N.make({ id: 'wilford-bridge', coverN: 200, cover: { 'plant.reed': 2, 'plant.grass': 3, 'plant.bulrush': 1 }, lat: 52.9245, lon: -1.1262, heading: 200, H: 400, at: 'afternoon', setting: 'mixed' });
    return k.water('mid', 520, 660)
      .rect('near', -160, 660, 1760, 720, lin('grass', 660, 720))
      .rect('near', -160, 720, 1760, 740, lin('path', 720, 740))
      .rect('fore', -160, 740, 1760, 905, lin('grass', 740, 905))
      .place('structure.bridge-suspension', 780, 540, 300, 'mid', { seed: 3, reflect: true })
      .place('building.warehouse-canal', 1340, 600, 190, 'mid', { seed: 4, flip: true })
      .place('tree.bank-willow', 90, 600, 420, 'mid', { seed: 5 })
      .place('tree.bank-alder', 430, 560, 300, 'far', { seed: 6 })
      .place('bird.heron', 260, 690, 110, 'near', { seed: 7 })
      .place('person.angler', 1040, 700, 150, 'near', { seed: 8 })
      .place('bird.mallard', 1150, 640, 42, 'mid', { seed: 14, reflect: true })
      .walk('person.kayaker', 'mid', 600, -120, 1720, 14, { seed: 9 })
      .walk('person.paddleboarder', 'mid', 620, 1720, -120, 10, { seed: 10 })
      .walk('person.walker', 'near', 790, -120, 1720, 10, { seed: 11, k: 0.95 })
      .walk('person.dog-walker', 'near', 760, 1720, -120, 11, { seed: 12 })
      .walk('person.cyclist', 'near', 805, -120, 1720, 20, { seed: 13 })
      .drive('bird.swan', 'mid', [[460, 640], [760, 640]], 3, 70, { pingpong: true, seed: 15 })
      .scatter({ 'tree.far-broad': 2, 'tree.far-birch': 1, 'tree.far-pine': 1 }, 'far', [-150, 400, 1750, 450], 18, { minGap: 50, s: [0.3, 0.5] })
      .scatter('plant.reed', 'near', [-150, 640, 300, 700], 34, { minGap: 10 })
      .scatter('plant.reed', 'near', [1200, 640, 1760, 700], 30, { minGap: 10 })
      .scatter('plant.grass', 'near', [-150, 720, 1750, 740], 80, { minGap: 8, s: [0.5, 0.8], extra: { anim: 'strip' } })
      .scatter('plant.bulrush', 'mid', [-150, 640, 1750, 650], 24, { minGap: 40 })
      .scatter('plant.wildflowers', 'fore', [-150, 760, 1750, 905], 60, { minGap: 22, s: [0.8, 1.1] })
      .scatter({ 'ground.leaves': 1, 'ground.puddle': 2 }, 'fore', [-150, 760, 1750, 900], 20, { minGap: 60 })
      .place('street.bench', 560, 760, 90, 'near', { seed: 16 })
      .flock('bird.gull', 4, [120, 120, 1400, 300], 24, 0.5, 'mid')
      .flock('bird.small-flight', 4, [260, 80, 1500, 260], 26, 0.5, 'far')
      .walk('person.walker', 'near', 866, 1720, -120, 12, { seed: 49, k: 0.95 })
      .done();
  });

  row('major-oak', { lat: 53.2049, lon: -1.0722, town: 'Edwinstowe', label: 'The Major Oak', kind: 'landmark', colour: 'green', ukPlace: 'major-oak', ukView: 'wide',
    reason: 'The great oak of Sherwood in its ring fence, from the forest floor',
    tags: ['sherwood', 'oak', 'forest', 'ring fence', 'bracken', 'deer'] }, () => {
    const k = N.make({ id: 'major-oak', coverN: 200, cover: { 'plant.bracken': 3, 'plant.fern': 1, 'plant.grass': 1 }, lat: 53.2049, lon: -1.0722, heading: 190, H: 260, at: 'afternoon', setting: 'natural' });
    return k.ground('far', 'M-160 260 Q600 240 1000 262 T1760 250 V420 H-160Z', lin('floor', 260, 420))
      .rect('mid', -160, 420, 1760, 560, lin('grass', 420, 560))
      .rect('near', -160, 560, 1760, 905, lin('floor', 560, 905))
      .ground('near', 'M1320 905 L1090 760 L1160 730 L1520 905Z', lin('path', 730, 905))
      .place('landmark.major-oak', 760, 690, 580, 'mid', { seed: 3 })
      .place('tree.ancient-oak', 80, 720, 520, 'near', { seed: 4, flip: true })
      .place('tree.ancient-oak', 1580, 640, 420, 'mid', { seed: 5 })
      .place('structure.fence', 540, 760, 60, 'near', { seed: 15 })
      .place('structure.fence', 640, 790, 60, 'near', { seed: 16, flip: true })
      .place('structure.fence', 760, 800, 60, 'near', { seed: 17 })
      .place('structure.fence', 880, 790, 60, 'near', { seed: 18, flip: true })
      .place('structure.fence', 980, 760, 60, 'near', { seed: 19 })
      .place('animal.deer', 430, 620, 70, 'mid', { seed: 6 })
      .place('animal.deer', 1130, 600, 80, 'mid', { seed: 7, flip: true, variant: 1 })
      .place('person.picnicker', 1280, 840, 120, 'near', { seed: 13 })
      .walk('person.photographer', 'near', 800, -120, 1720, 5, { seed: 8 })
      .walk('person.family', 'near', 860, 1720, -120, 10, { seed: 9 })
      .walk('person.dog-walker', 'mid', 620, -120, 1720, 10, { seed: 10, k: 0.9 })
      .walk('person.child-ball', 'near', 900, 400, 1500, 14, { pingpong: true, seed: 11, k: 0.85 })
      .walk('person.cyclist', 'mid', 700, 1720, -120, 16, { seed: 17, k: 0.9 })
      .walk('person.hiker', 'mid', 560, 1720, -120, 8, { seed: 12, k: 0.95 })
      .scatter('plant.bracken', 'near', [-150, 600, 1750, 905], 50, { minGap: 18, s: [0.7, 1.1], extra: { anim: 'strip' } })
      .scatter('plant.fern', 'mid', [-150, 460, 1750, 600], 30, { minGap: 20, s: [0.5, 0.8], extra: { anim: 'strip' } })
      .scatter('ground.log', 'near', [-100, 820, 1700, 900], 2, { minGap: 600, s: [0.5, 0.7] })
      .scatter({ 'ground.leaves': 1, 'ground.puddle': 2 }, 'near', [-120, 580, 1700, 900], 30, { minGap: 24, s: [0.8, 1.2] })
      .flock('bird.small-flight', 5, [200, 100, 1500, 240], 22, 0.5, 'far')
      .walk('person.walker', 'near', 880, 1720, -120, 12, { seed: 50, k: 0.95 })
      .done();
  });

  row('sherwood-pines', { lat: 53.2230, lon: -1.0540, town: 'Edwinstowe', label: 'Sherwood Pines', kind: 'landscape', colour: 'green', ukPlace: 'sherwood-forest', ukView: 'wide-morning',
    reason: 'A pine ride in Sherwood Pines, the tower of Edwinstowe church at the far end',
    tags: ['sherwood', 'pines', 'forest ride', 'heath', 'edwinstowe', 'cycling'] }, () => {
    const k = N.make({ id: 'sherwood-pines', coverN: 200, cover: { 'plant.heather': 1, 'plant.gorse': 1, 'plant.bilberry': 1, 'plant.grass': 2 }, lat: 53.2230, lon: -1.0540, heading: 330, H: 430, at: 'morning', setting: 'natural' });
    return k.ground('far', 'M-160 430 Q500 420 800 432 T1760 430 V520 H-160Z', lin('floor', 430, 520))
      .rect('mid', -160, 520, 1760, 600, lin('grass', 520, 600))
      .rect('near', -160, 600, 1760, 905, lin('sand', 600, 905))
      .ground('near', 'M360 905 L770 520 L790 520 L1120 905Z', lin('path', 520, 905))
      .place('tree.pine', 40, 900, 680, 'near', { seed: 3 })
      .place('tree.pine-veteran', 1560, 900, 640, 'near', { seed: 4, flip: true })
      .place('tree.pine', 250, 760, 460, 'mid', { seed: 5 })
      .place('tree.pine', 1380, 740, 430, 'mid', { seed: 6, flip: true })
      .place('tree.pine', 430, 620, 300, 'mid', { seed: 7 })
      .place('tree.pine', 1160, 600, 260, 'mid', { seed: 8, flip: true })
      .place('tree.pine-veteran', 560, 560, 220, 'far', { seed: 9 })
      .place('landmark.edwinstowe-church', 1000, 470, 150, 'far', { seed: 10 })
      .scatter('tree.far-pine', 'far', [-150, 420, 1750, 470], 30, { minGap: 24, s: [0.3, 0.5] })
      .scatter('plant.gorse', 'near', [-150, 760, 300, 905], 30, { minGap: 24, s: [0.5, 0.9] })
      .scatter('plant.gorse', 'near', [1200, 760, 1750, 905], 30, { minGap: 24, s: [0.5, 0.9] })
      .scatter('plant.bilberry', 'mid', [-150, 560, 1750, 640], 40, { minGap: 20, s: [0.4, 0.7] })
      .scatter('plant.heather', 'near', [-150, 640, 300, 760], 30, { minGap: 20 })
      .scatter('plant.bracken', 'mid', [-150, 600, 1750, 650], 30, { minGap: 26, extra: { anim: 'strip' } })
      .scatter('plant.grass', 'near', [-150, 600, 1750, 700], 80, { minGap: 12, s: [0.5, 0.8], extra: { anim: 'strip' } })
      .scatter('ground.log', 'near', [-100, 830, 1700, 900], 2, { minGap: 500 })
      .walk('person.cyclist', 'near', 860, -120, 1720, 26, { seed: 11 })
      .walk('person.hiker', 'mid', 620, 1720, -120, 8, { seed: 12 })
      .walk('person.jogger', 'near', 760, -120, 1720, 13, { seed: 13, k: 0.95 })
      .walk('person.dog-walker', 'mid', 580, -120, 1720, 9, { seed: 14, k: 0.9 })
      .flock('bird.small-flight', 6, [200, 120, 1400, 300], 24, 0.5, 'far')
      .walk('person.walker', 'near', 872, 1720, -120, 12, { seed: 51, k: 0.95 })
      .done();
  });

  row('goose-fair', { lat: 52.9720, lon: -1.1670, town: 'Nottingham', label: 'The Goose Fair', kind: 'tradition', colour: 'red', ukPlace: 'goose-fair', ukView: 'close-evening',
    reason: 'The rides and the big wheel on the Forest Recreation Ground at dusk',
    tags: ['goose fair', 'fair', 'rides', 'big wheel', 'october', 'crowd'] }, () => {
    const k = N.make({ id: 'goose-fair', cover: { 'plant.grass': 2, 'ground.leaves': 1, 'ground.puddle': 1, 'plant.planter': 1 }, lat: 52.9720, lon: -1.1670, heading: 290, H: 470, at: 'dusk', setting: 'urban' });
    return k.rect('mid', -160, 470, 1760, 560, lin('grass', 470, 560))
      .rect('near', -160, 560, 1760, 905, lin('grass', 560, 905))
      .ground('near', 'M560 905 L700 760 L1100 760 L1240 905Z', lin('pave', 760, 905))
      .place('landmark.goose-fair-rides', 620, 600, 320, 'mid', { seed: 3 })
      .place('structure.goose-fair-wheel', 1320, 560, 420, 'mid', { seed: 4 })
      .place('street.lantern-string', 480, 500, 140, 'far', { seed: 5 })
      .place('street.lantern-string', 1000, 520, 160, 'mid', { seed: 6, flip: true })
      .scatter('street.market-stall', 'near', [260, 790, 1420, 840], 6, { minGap: 160, s: [0.6, 0.8] })
      .walk('person.couple', 'near', 860, -120, 1720, 8, { seed: 7 })
      .walk('person.child-scooter', 'near', 900, 1720, -120, 14, { seed: 8, k: 0.8 })
      .walk('person.student', 'near', 820, -120, 1720, 10, { seed: 9, k: 0.95 })
      .walk('person.family', 'near', 700, 1720, -120, 6, { seed: 10, k: 0.92 })
      .walk('person.shopper', 'mid', 590, -120, 1720, 6, { seed: 11 })
      .walk('person.elderly-couple', 'near', 780, 1400, 200, 6, { pingpong: true, seed: 12 })
      .walk('person.takeaway-walker', 'near', 880, -120, 1720, 11, { seed: 13, k: 0.95 })
      .scatter({ 'street.bollard': 3, 'street.bench': 1 }, 'near', [300, 770, 1400, 800], 6, { minGap: 120 })
      .scatter({ 'ground.leaves': 1, 'ground.puddle': 2 }, 'near', [-120, 740, 1700, 900], 20, { minGap: 40 })
      .scatter('plant.grass', 'near', [-120, 560, 1700, 700], 60, { minGap: 14, s: [0.5, 0.8], extra: { anim: 'strip' } })
      .flock('bird.herring-gull-flight', 4, [100, 120, 1500, 320], 20, 0.7, 'far')
      .walk('person.walker', 'near', 864, 1720, -120, 12, { seed: 52, k: 0.95 })
      .done();
  });

  return rows;
})();
