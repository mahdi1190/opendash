/* ============================================================
   COMPOSED SCENES, Norwich city (part 1 of 2): six distinct real places in the city.
   Each scene is its own build function (no shared composition; the helpers in
   71-scene-uk-norwich-0base.js only give the palette, the sky, the default land bands and
   placement shorthands). Each place is a different real spot and a different camera:

     1. norwich-cathedral-close  the Cathedral Close lawn, looking up the spire from the gravel path
     2. norwich-castle-mound     the foot of the castle mound, the keep high above a climbing path
     3. norwich-market           the Market Place from high above, the striped stalls in rows receding
     4. norwich-elm-hill         Elm Hill: the cobbled lane closing on the spire at its far end
     5. norwich-tombland         Tombland: close to the Erpingham Gate, the Close glimpsed through the arch
     6. norwich-forum            the Forum square from its far end, the glass horseshoe off-centre

   Scene data only (PURE). The season comes from the date ('auto'), the light from the live sky.
   Registered by 72-anim-pack-uk-area-norwich.js (pack uk-area-norwich).
   ============================================================ */
(function () {
  if (typeof sceneAdd !== 'function' || typeof sceneObj !== 'function') return;
  const PACK = 'uk-area-norwich';
  const ps = (d, id, y) => scenePersonScale(sceneObj(id).size[1], y, d.view);

  function cathedralClose() {
    const d = nwLand(nwData({ id: 'norwich-cathedral-close', lat: 52.6312, lon: 1.2990, heading: 160, H: 600, at: 'afternoon', setting: 'mixed', clouds: 6 }), 600);
    nwGround(d, 'near', 'M-160 900L-160 790Q420 740 690 650L760 650Q900 760 1120 900Z', '@path.0');
    nwPut(d, 'landmark.norwich-cathedral', 'mid', 1040, 640, 700);
    nwPut(d, 'structure.stone-wall', 'near', 230, 800, 120);
    nwPut(d, 'tree.plane-avenue', 'near', 60, 700, 560);
    nwPut(d, 'tree.plane', 'mid', 520, 640, 330);
    nwFloor(d, ['plant.grass', 'plant.bracken'], 600, 300);
    nwScat(d, 'bird.pigeon', 'near', [200, 740, 1200, 880], 8, 0.9, 1.1, { minGap: 60 });
    nwFlock(d, 'bird.pigeon', 'far', 6, [300, 120, 1100, 260], 26, 0.6);
    nwPerson(d, 'person.photographer', 'near', 560, 835);
    nwAct(d, 'person.walker', 'near', [[-120, 840], [1700, 820]], 16, ps(d, 'person.walker', 840), { flip: false });
    nwAct(d, 'person.dog-walker', 'near', [[1700, 860], [-120, 866]], 14, ps(d, 'person.dog-walker', 866), { flip: true });
    nwAct(d, 'person.walker', 'mid', [[1500, 700], [1100, 706]], 12, ps(d, 'person.walker', 706), { flip: true });
    return d;
  }

  function castleMound() {
    const d = nwLand(nwData({ id: 'norwich-castle-mound', lat: 52.6284, lon: 1.2952, heading: 25, H: 660, at: 'morning', setting: 'mixed', clouds: 7 }), 660);
    nwGround(d, 'mid', 'M-160 900L-160 700Q300 600 600 790Q900 640 1760 690L1760 900Z', '@lawn.0');
    nwGround(d, 'near', 'M1100 900L1290 900L1000 790L960 790Z', '@path.0');
    nwPut(d, 'landmark.norwich-castle', 'far', 430, 700, 470);
    nwPut(d, 'tree.cherry', 'near', 1400, 740, 380);
    nwPut(d, 'tree.cherry', 'mid', -40, 760, 420);
    nwPut(d, 'structure.stone-wall', 'near', 1210, 812, 110, { flip: true });
    nwPerson(d, 'person.bench-reader', 'near', 380, 830);
    nwScat(d, ['plant.grass', 'plant.bracken'], 'near', [-150, 760, 1750, 900], 170, 0.6, 1.0, { minGap: 20 });
    nwScat(d, ['plant.grass', 'plant.bracken'], 'fore', [-150, 850, 1750, 905], 220, 0.85, 1.35, { minGap: 16, tint: null });
    nwScat(d, 'tree.cherry', 'mid', [-160, 790, 1760, 800], 5, 0.25, 0.4, { minGap: 200 });
    nwFlock(d, 'bird.gull', 'far', 5, [200, 80, 1500, 300], 34, 0.6);
    nwFlock(d, 'bird.pigeon', 'far', 4, [500, 300, 1300, 420], 24, 0.6);
    nwFlock(d, 'bird.gull', 'far', 2, [900, 160, 1500, 260], 40, 0.5);
    nwAct(d, 'person.jogger', 'near', [[-130, 868], [1720, 858]], 30, ps(d, 'person.jogger', 868));
    nwAct(d, 'person.walker', 'mid', [[1720, 760], [-120, 752]], 15, ps(d, 'person.walker', 752), { flip: true });
    nwAct(d, 'person.walker', 'mid', [[-120, 732], [1720, 728]], 14, ps(d, 'person.walker', 730), { flip: false });
    nwAct(d, 'animal.dog', 'near', [[-120, 828], [1720, 834]], 22, 0.11, { flip: false });
    return d;
  }

  function market() {
    const d = nwLand(nwData({ id: 'norwich-market', lat: 52.6283, lon: 1.2925, heading: 90, H: 330, at: 'morning', setting: 'urban', clouds: 5 }), 330);
    nwGround(d, 'mid', 'M-160 340L1760 340L1760 900L-160 900Z', '@cobble.0');
    nwPut(d, 'landmark.norwich-castle', 'far', 1080, 330, 300);
    nwPut(d, 'building.shopfront', 'far', 60, 430, 250);
    nwPut(d, 'building.shopfront', 'far', 1560, 420, 260, { flip: true });
    nwScat(d, 'building.shopfront', 'far', [-140, 380, 1740, 400], 4, 0.5, 1.1, { minGap: 260, flip: 0.5 });
    nwPut(d, 'building.norwich-market', 'far', 420, 430, 90, { variant: 0 });
    nwPut(d, 'building.norwich-market', 'far', 760, 436, 86, { variant: 1, flip: true });
    nwPut(d, 'building.norwich-market', 'mid', 250, 620, 170, { variant: 2 });
    nwPut(d, 'building.norwich-market', 'mid', 1170, 610, 180, { variant: 0, flip: true });
    nwPut(d, 'building.norwich-market', 'near', 720, 900, 250, { variant: 1 });
    nwFloor(d, ['ground.leaves', 'ground.puddle', 'street.bollard', 'street.bench', 'street.lamp'], 330, 120);
    nwScat(d, 'bird.pigeon', 'near', [0, 700, 1600, 900], 10, 0.9, 1.2, { minGap: 50 });
    nwFlock(d, 'bird.gull', 'far', 4, [200, 60, 1400, 240], 30, 0.6);
    nwAct(d, 'person.shopper', 'near', [[-120, 790], [1720, 776]], 14, ps(d, 'person.shopper', 790), { flip: false });
    nwAct(d, 'person.buggy-walker', 'near', [[1720, 850], [-120, 846]], 10, ps(d, 'person.buggy-walker', 848), { flip: true });
    nwAct(d, 'person.shopper', 'mid', [[300, 690], [1100, 684]], 9, ps(d, 'person.shopper', 690), { flip: true });
    nwPerson(d, 'person.student', 'mid', 1420, 700);
    return d;
  }

  function elmHill() {
    const d = nwLand(nwData({ id: 'norwich-elm-hill', lat: 52.6326, lon: 1.2968, heading: 110, H: 420, at: 'afternoon', setting: 'urban', clouds: 4 }), 420);
    nwGround(d, 'near', 'M-160 900L-160 620L690 440L910 440L1760 620L1760 900Z', '@cobble.0');
    nwPut(d, 'landmark.norwich-cathedral', 'far', 800, 468, 200);
    nwPut(d, 'building.elm-hill-house', 'near', 60, 650, 500, { variant: 0 });
    nwPut(d, 'building.elm-hill-house', 'mid', 330, 548, 300, { variant: 1, flip: true });
    nwPut(d, 'building.elm-hill-house', 'far', 540, 486, 160, { variant: 2 });
    nwPut(d, 'building.elm-hill-house', 'near', 1420, 650, 500, { variant: 2, flip: true });
    nwPut(d, 'building.elm-hill-house', 'mid', 1190, 546, 300, { variant: 0 });
    nwPut(d, 'building.elm-hill-house', 'far', 1040, 484, 150, { variant: 1 });
    nwPut(d, 'plant.planter', 'near', 220, 760, 80);
    nwPut(d, 'plant.planter', 'mid', 1330, 700, 70);
    nwFloor(d, ['ground.leaves', 'ground.puddle', 'street.bollard', 'street.bench', 'street.lamp'], 420, 120);
    nwScat(d, 'bird.pigeon', 'near', [200, 780, 1500, 900], 8, 0.9, 1.2, { minGap: 60 });
    nwFlock(d, 'bird.pigeon', 'far', 4, [400, 120, 1200, 260], 28, 0.6);
    nwFlock(d, 'bird.gull', 'far', 3, [600, 60, 1100, 200], 22, 0.5);
    nwAct(d, 'person.shopper', 'near', [[1760, 800], [-120, 812]], 13, ps(d, 'person.shopper', 812), { flip: true });
    nwAct(d, 'person.cyclist', 'mid', [[-120, 640], [1720, 652]], 20, ps(d, 'person.cyclist', 640), { flip: false });
    nwAct(d, 'person.student', 'mid', [[1720, 622], [-120, 618]], 11, ps(d, 'person.student', 620), { flip: true });
    return d;
  }

  function tombland() {
    const d = nwLand(nwData({ id: 'norwich-tombland', lat: 52.6310, lon: 1.2990, heading: 90, H: 520, at: 'day', setting: 'urban', clouds: 5 }), 520);
    nwGround(d, 'near', 'M-160 900L-160 720Q600 690 1760 700L1760 900Z', '@pave.0');
    nwGround(d, 'mid', 'M-160 650L1760 640L1760 700L-160 712Z', '@cobble.1');
    nwPut(d, 'landmark.norwich-cathedral', 'mid', 780, 610, 320);
    nwPut(d, 'landmark.erpingham-gate', 'near', 560, 800, 560);
    nwPut(d, 'building.elm-hill-house', 'near', -60, 780, 480, { variant: 2 });
    nwPut(d, 'building.elm-hill-house', 'mid', 1260, 700, 380, { variant: 1, flip: true });
    nwPut(d, 'tree.plane', 'mid', 1500, 600, 360);
    nwPut(d, 'street.bollard', 'near', 170, 860, 70);
    nwPut(d, 'plant.planter', 'near', 1400, 830, 80);
    nwPerson(d, 'person.couple', 'near', 1040, 830);
    nwFloor(d, ['ground.leaves', 'ground.puddle', 'street.bollard', 'street.bench', 'street.lamp'], 520, 120);
    nwScat(d, 'bird.pigeon', 'near', [0, 760, 1500, 900], 8, 0.9, 1.1, { minGap: 60 });
    nwFlock(d, 'bird.gull', 'far', 4, [300, 70, 1400, 230], 32, 0.6);
    nwAct(d, 'person.cyclist', 'near', [[-150, 880], [1720, 870]], 22, ps(d, 'person.cyclist', 880), { flip: false });
    nwAct(d, 'person.walker', 'mid', [[1700, 672], [-120, 668]], 13, ps(d, 'person.walker', 672), { flip: true });
    nwAct(d, 'person.shopper', 'near', [[-120, 850], [1720, 846]], 10, ps(d, 'person.shopper', 850), { flip: false });
    return d;
  }

  function forum() {
    const d = nwLand(nwData({ id: 'norwich-forum', lat: 52.6276, lon: 1.2918, heading: 260, H: 560, at: 'afternoon', setting: 'urban', clouds: 5 }), 560);
    nwGround(d, 'near', 'M-160 900L-160 700Q700 660 1760 690L1760 900Z', '@pave.0');
    nwPut(d, 'landmark.norwich-forum', 'mid', 520, 650, 360);
    nwPut(d, 'tree.plane', 'mid', 1450, 640, 340);
    nwPut(d, 'street.bench', 'near', 1240, 800, 80);
    nwPut(d, 'plant.planter', 'near', 120, 860, 90);
    nwPerson(d, 'person.cafe-goer', 'near', 1000, 760);
    nwPerson(d, 'person.phone-idler', 'near', 1130, 830);
    nwFloor(d, ['ground.leaves', 'ground.puddle', 'street.bollard', 'street.bench', 'street.lamp'], 560, 120);
    nwScat(d, 'bird.pigeon', 'near', [0, 720, 1600, 900], 12, 0.9, 1.2, { minGap: 40 });
    nwFlock(d, 'bird.pigeon', 'far', 8, [200, 110, 1200, 300], 30, 0.7);
    nwFlock(d, 'bird.gull', 'far', 5, [200, 60, 1500, 250], 34, 0.6);
    nwAct(d, 'person.student', 'near', [[-120, 810], [1720, 800]], 14, ps(d, 'person.student', 810), { flip: false });
    nwAct(d, 'person.shopper', 'mid', [[1720, 700], [400, 706]], 10, ps(d, 'person.shopper', 700), { flip: true });
    return d;
  }

  const ROWS = [
    ['norwich-cathedral-close', 'The Cathedral Close, Norwich', 'The Cathedral Close looking up at the spire, Norwich', 'landmark', 'slate', 'calm', cathedralClose],
    ['norwich-castle-mound', 'The foot of Norwich Castle mound', 'Norwich Castle keep from the foot of the mound', 'heritage', 'amber', 'calm', castleMound],
    ['norwich-market', 'Norwich Market', 'The striped stalls of Norwich Market from above', 'tradition', 'red', 'cheerful', market],
    ['norwich-elm-hill', 'Elm Hill, Norwich', 'Elm Hill: the cobbled lane closing on the spire', 'heritage', 'green', 'cosy', elmHill],
    ['norwich-tombland', 'Tombland and the Erpingham Gate', 'Tombland, close to the Erpingham Gate, Norwich', 'heritage', 'slate', 'calm', tombland],
    ['norwich-forum', 'The Forum, Norwich', 'The Forum square from its far end, Norwich', 'landmark', 'blue', 'cheerful', forum],
  ];
  const TAGS = {
    'norwich-cathedral-close': ['norwich', 'cathedral', 'close', 'spire', 'lawn', 'gravel path'],
    'norwich-castle-mound': ['norwich', 'castle', 'norman keep', 'mound', 'castle gardens', 'climbing path'],
    'norwich-market': ['norwich', 'market', 'stalls', 'canopies', 'market place', 'shopping'],
    'norwich-elm-hill': ['norwich', 'elm hill', 'cobbles', 'medieval', 'timber-framed', 'lane'],
    'norwich-tombland': ['norwich', 'tombland', 'erpingham gate', 'square', 'cathedral', 'arch'],
    'norwich-forum': ['norwich', 'forum', 'library', 'glass', 'square', 'city centre'],
  };
  for (const [id, label, site, ukKind, colour, mood, build] of ROWS) {
    sceneAdd(PACK, { id, label, site, ukKind, mood, colour, intensity: 'subtle', tags: TAGS[id].concat(['uk', 'norfolk']), town: 'Norwich', liveSky: { lat: 52.63, lon: 1.29 } }, build);
  }
})();
