/* ============================================================
   COMPOSED SCENES, Norwich riverside and the Broads (part 2 of 2): six distinct real places.
   Each scene is its own build function (no shared composition; the helpers in
   71-scene-uk-norwich-0base.js only give the palette, the sky, the default land bands and
   placement shorthands). Each place is a different real spot and a different camera:

     7. norwich-pulls-ferry      the Wensum from the towpath, the flint watergate across the water
     8. norwich-cow-tower        the river bend below Cow Tower, the tower up on the bank, a rowing boat
     9. norwich-carrow-road      match day on the riverside walk, the stand across the Wensum, fans on the path
    10. broads-windpump          the Horsey marshes: a windpump beside a dyke, cattle, a wherry under sail
    11. wroxham-bridge           the River Bure from the bridge deck, moored cruisers and a sailing boat
    12. hickling-broad           the open broad at first light: reeds on the far shore, sails and coots

   Scene data only (PURE). The season comes from the date ('auto'), the light from the live sky.
   Registered by 72-anim-pack-uk-area-norwich.js (pack uk-area-norwich).
   ============================================================ */
(function () {
  if (typeof sceneAdd !== 'function' || typeof sceneObj !== 'function') return;
  const PACK = 'uk-area-norwich';
  const ps = (d, id, y) => scenePersonScale(sceneObj(id).size[1], y, d.view);

  function pullsFerry() {
    const d = nwLand(nwData({ id: 'norwich-pulls-ferry', lat: 52.6300, lon: 1.3086, heading: 270, H: 540, at: 'afternoon', setting: 'natural', clouds: 6 }), 540);
    nwWater(d, 'mid', 600, 690, 'M-160 600Q400 596 800 606T1760 620V690Q1200 680 800 690T-160 690Z');
    nwGround(d, 'near', 'M-160 690Q800 680 1760 700L1760 730Q800 712 -160 722Z', '@path.0');
    nwPut(d, 'landmark.pulls-ferry', 'far', 470, 598, 200);
    nwPut(d, 'landmark.norwich-cathedral', 'far', 1260, 560, 360);
    nwPut(d, 'tree.bank-willow', 'mid', 200, 600, 420);
    nwPut(d, 'tree.bank-alder', 'mid', 1480, 600, 330);
    nwPut(d, 'bird.heron', 'near', 330, 752, 130);
    nwScat(d, 'bird.swan', 'mid', [0, 618, 1600, 680], 5, 0.5, 0.7, { minGap: 90 });
    nwFloor(d, ['plant.grass', 'plant.reed'], 540, 200, { minGap: 16 });
    nwScat(d, 'bird.mallard', 'mid', [-160, 618, 1760, 676], 4, 0.6, 0.8, { minGap: 120 });
    nwScat(d, 'plant.grass', 'near', [-150, 730, 1750, 790], 40, 0.6, 0.9, { minGap: 16 });
    nwAct(d, 'person.dog-walker', 'near', [[-120, 780], [1720, 772]], 12, ps(d, 'person.dog-walker', 780), { flip: false });
    nwFlock(d, 'bird.gull', 'far', 4, [400, 80, 1300, 260], 30, 0.6);
    nwAct(d, 'boat.broads-cruiser', 'mid', [[-200, 660], [1800, 676]], 8, 0.5, { flip: false, loop: 'loop' });
    nwAct(d, 'person.walker', 'near', [[-120, 748], [1720, 738]], 16, ps(d, 'person.walker', 748), { flip: false });
    nwAct(d, 'person.cyclist', 'near', [[1720, 790], [-120, 800]], 22, ps(d, 'person.cyclist', 790), { flip: true });
    return d;
  }

  function cowTower() {
    const d = nwLand(nwData({ id: 'norwich-cow-tower', lat: 52.6352, lon: 1.3074, heading: 225, H: 600, at: 'morning', setting: 'natural', clouds: 5 }), 600);
    nwWater(d, 'mid', 640, 720, 'M-160 662Q500 640 900 668T1760 700V742Q900 706 500 712T-160 716Z');
    nwGround(d, 'mid', 'M-160 630Q500 610 900 640T1760 650V660Q900 652 500 646T-160 652Z', '@lawn.0');
    nwPut(d, 'landmark.cow-tower', 'mid', 1090, 660, 330);
    nwPut(d, 'tree.bank-willow', 'mid', 240, 660, 460);
    nwPut(d, 'tree.bank-birch', 'far', 1500, 610, 280);
    nwPut(d, 'bird.kingfisher', 'near', 760, 748, 60);
    nwFloor(d, ['plant.grass', 'plant.reed'], 600, 200, { minGap: 17 });
    nwScat(d, 'plant.reed', 'mid', [-160, 690, 1760, 716], 60, 0.5, 0.8, { minGap: 22 });
    nwScat(d, 'bird.mallard', 'mid', [-160, 690, 1760, 716], 4, 0.6, 0.8, { minGap: 120 });
    nwScat(d, 'bird.heron', 'mid', [-160, 690, 1760, 716], 2, 0.5, 0.6, { minGap: 300 });
    nwFlock(d, 'bird.small-flight', 'far', 6, [200, 90, 1400, 280], 28, 0.6);
    nwAct(d, 'boat.dinghy', 'mid', [[-200, 690], [1800, 672]], 9, 0.36, { flip: true });
    nwAct(d, 'person.rower', 'mid', [[-200, 676], [1800, 658]], 9, ps(d, 'person.rower', 676), { flip: true });
    nwAct(d, 'person.walker', 'near', [[-120, 812], [1720, 800]], 15, ps(d, 'person.walker', 812), { flip: false });
    nwAct(d, 'person.dog-walker', 'near', [[1720, 840], [-120, 848]], 13, ps(d, 'person.dog-walker', 848), { flip: true });
    return d;
  }

  function carrowRoad() {
    const d = nwLand(nwData({ id: 'norwich-carrow-road', lat: 52.6230, lon: 1.3105, heading: 220, H: 560, at: 'afternoon', setting: 'urban', clouds: 5 }), 560);
    nwWater(d, 'mid', 610, 668, 'M-160 620Q800 606 1760 630V668Q800 650 -160 664Z');
    nwGround(d, 'near', 'M-160 690Q800 676 1760 700L1760 730Q800 716 -160 728Z', '@path.0');
    nwPut(d, 'building.riverside-stand', 'far', 1080, 598, 250);
    nwPut(d, 'structure.mediacity-footbridge', 'mid', 380, 640, 150);
    nwPut(d, 'tree.plane', 'mid', 1560, 610, 300);
    nwPut(d, 'street.lamp', 'near', 700, 752, 150);
    nwFloor(d, ['plant.grass', 'plant.shrub', 'ground.leaves', 'ground.puddle', 'street.bollard', 'street.lamp'], 560, 130);
    nwScat(d, 'bird.mallard', 'mid', [-160, 622, 1760, 660], 6, 0.5, 0.7, { minGap: 80 });
    nwScat(d, 'bird.swan', 'mid', [-160, 622, 1760, 660], 3, 0.5, 0.7, { minGap: 150 });
    nwFlock(d, 'bird.gull', 'far', 6, [200, 60, 1400, 260], 34, 0.6);
    nwAct(d, 'person.football-fan', 'near', [[1720, 806], [-120, 812]], 14, ps(d, 'person.football-fan', 806), { flip: false });
    nwAct(d, 'person.football-fan', 'near', [[-120, 842], [1720, 836]], 12, ps(d, 'person.football-fan', 842), { flip: true });
    nwAct(d, 'person.football-fan', 'mid', [[300, 630], [1100, 628]], 10, ps(d, 'person.football-fan', 630), { flip: false });
    nwAct(d, 'boat.dinghy', 'mid', [[-200, 648], [1800, 640]], 7, 0.3, { flip: false });
    nwPerson(d, 'person.student', 'near', 1240, 780);
    return d;
  }

  function broadsWindpump() {
    const d = nwLand(nwData({ id: 'broads-windpump', lat: 52.7400, lon: 1.6420, heading: 200, H: 560, at: 'golden', setting: 'natural', clouds: 8, cloudY: [40, 360] }), 560);
    nwGround(d, 'far', 'M-160 570Q500 556 900 566T1760 558V660H-160Z', '@marsh.0');
    nwWater(d, 'mid', 650, 668, 'M-160 652Q700 640 1760 646V668Q700 662 -160 672Z');
    nwPut(d, 'landmark.norfolk-windpump', 'mid', 1000, 640, 480, { variant: 1, reflect: true });
    nwPut(d, 'tree.pond-alder', 'far', 240, 600, 260);
    nwScat(d, 'animal.cattle', 'mid', [-160, 676, 1760, 712], 4, 0.45, 0.6, { minGap: 200, reflect: true });
    nwScat(d, 'bird.mallard', 'mid', [-160, 652, 1760, 666], 4, 0.6, 0.8, { minGap: 120, reflect: true });
    nwFloor(d, ['plant.grass', 'plant.heather', 'plant.bracken', 'plant.reed'], 560, 200);
    nwScat(d, 'plant.reed', 'near', [-160, 700, 1760, 760], 60, 0.7, 1.1, { minGap: 26 });
    nwPut(d, 'bird.heron', 'near', 180, 760, 150);
    nwFlock(d, 'bird.small-flight', 'far', 6, [200, 120, 1400, 300], 30, 0.6);
    nwAct(d, 'boat.broads-sail', 'mid', [[-240, 662], [1800, 656]], 6, 0.42, { flip: false, variant: 0 });
    return d;
  }

  function wroxhamBridge() {
    const d = nwLand(nwData({ id: 'wroxham-bridge', lat: 52.7090, lon: 1.4040, heading: 180, H: 480, at: 'day', setting: 'natural', clouds: 6 }), 480);
    nwWater(d, 'mid', 520, 900, 'M380 900L640 520L960 520L1220 900Z', { reflect: true, shimmer: 26 });
    nwGround(d, 'near', 'M-160 900L-160 770L1760 770L1760 900Z', '@road.0');
    nwGround(d, 'near', 'M-160 760L1760 760L1760 776L-160 776Z', '@pave.0');
    nwPut(d, 'structure.stone-wall', 'near', 110, 770, 90, { flip: false });
    nwPut(d, 'building.windmill', 'far', 1300, 520, 300, { variant: 2 });
    nwPut(d, 'structure.stone-wall', 'near', 1490, 770, 90, { flip: true });
    nwPut(d, 'tree.bank-willow', 'far', -120, 560, 420);
    nwPut(d, 'tree.bank-alder', 'mid', 1560, 560, 360);
    nwPut(d, 'boat.broads-cruiser', 'mid', 150, 640, 70, { flip: false, variant: 1 });
    nwPut(d, 'boat.broads-cruiser', 'mid', 1420, 630, 66, { flip: true, variant: 2 });
    nwScat(d, ['plant.reed', 'plant.grass', 'plant.bulrush'], 'mid', { poly: [[-160, 500], [640, 500], [380, 900], [-160, 900]] }, 120, 0.6, 1.0, { minGap: 19, reflect: true });
    nwScat(d, ['plant.reed', 'plant.grass', 'plant.bulrush'], 'mid', { poly: [[960, 500], [1760, 500], [1760, 900], [1220, 900]] }, 120, 0.6, 1.0, { minGap: 19, reflect: true });
    nwFloor(d, ['plant.reed', 'plant.grass', 'plant.bulrush'], 480, 200, { reflect: true, minGap: 22 });
    nwScat(d, 'bird.mallard', 'mid', { poly: [[600, 560], [1000, 560], [1220, 900], [380, 900]] }, 6, 0.6, 0.9, { minGap: 60 });
    nwFlock(d, 'bird.small-flight', 'far', 4, [240, 90, 1360, 260], 30, 0.6);
    nwAct(d, 'boat.broads-cruiser', 'mid', [[820, 530], [1000, 900]], 10, 0.5, { sByY: [[530, 0.22], [900, 0.9]], loop: 'loop' });
    nwAct(d, 'boat.broads-sail', 'mid', [[1800, 690], [-200, 700]], 6, 0.5, { flip: false, variant: 1 });
    nwAct(d, 'person.walker', 'near', [[-120, 822], [1720, 812]], 15, ps(d, 'person.walker', 822), { flip: false });
    nwAct(d, 'person.walker', 'near', [[1720, 848], [-120, 856]], 13, ps(d, 'person.walker', 848), { flip: true });
    nwPerson(d, 'person.walker', 'near', 700, 836);
    return d;
  }

  function hicklingBroad() {
    const d = nwLand(nwData({ id: 'hickling-broad', lat: 52.7430, lon: 1.5770, heading: 250, H: 560, at: 'dawn', setting: 'natural', clouds: 6 }), 560);
    nwGround(d, 'far', 'M-160 578Q400 548 800 562T1760 556V600H-160Z', '@reed.0');
    nwWater(d, 'mid', 572, 830, 'M-160 580Q800 566 1760 574V830Q800 800 -160 820Z', { shimmer: 36 });
    nwScat(d, 'plant.reed', 'far', [-160, 552, 1760, 582], 200, 0.5, 0.8, { minGap: 8 });
    nwScat(d, ['tree.far-pine', 'tree.distant-pine'], 'far', [-160, 540, 1760, 556], 4, 0.5, 0.75, { minGap: 330 });
    nwPut(d, 'landmark.norfolk-windpump', 'far', 380, 552, 300, { variant: 0 });
    nwPut(d, 'bird.heron', 'far', 1200, 572, 110);
    nwScat(d, 'bird.coot', 'mid', [-160, 620, 1760, 800], 6, 0.6, 0.9, { minGap: 90 });
    nwScat(d, 'bird.mallard', 'mid', [-160, 620, 1760, 800], 4, 0.6, 0.9, { minGap: 110 });
    nwScat(d, 'bird.grebe', 'mid', [-160, 620, 1760, 800], 3, 0.6, 0.9, { minGap: 150 });
    nwFloor(d, ['plant.reed', 'plant.bulrush', 'plant.water-crowfoot'], 560, 240);
    nwFlock(d, 'bird.goose-flight', 'far', 5, [200, 110, 1300, 260], 36, 0.6);
    nwAct(d, 'boat.broads-sail', 'mid', [[-240, 680], [1800, 706]], 6, 0.5, { flip: false, variant: 2 });
    nwAct(d, 'boat.broads-sail', 'mid', [[1800, 760], [-240, 752]], 5, 0.42, { flip: true, variant: 1 });
    nwAct(d, 'boat.dinghy', 'mid', [[200, 620], [1200, 612]], 4, 0.3, { flip: false });
    return d;
  }

  const ROWS = [
    ['norwich-pulls-ferry', 'Pull\'s Ferry on the Wensum', 'Pull\'s Ferry and the Wensum from the towpath, Norwich', 'heritage', 'teal', 'calm', pullsFerry],
    ['norwich-cow-tower', 'Cow Tower on the Wensum', 'Cow Tower on the bend of the Wensum, Norwich', 'heritage', 'red', 'calm', cowTower],
    ['norwich-carrow-road', 'Match day by the Wensum', 'Match day on the riverside walk by the football ground, Norwich', 'sport', 'green', 'cheerful', carrowRoad],
    ['broads-windpump', 'A windpump on the Broads', 'A drainage windpump beside a dyke on the Norfolk Broads', 'landscape', 'amber', 'calm', broadsWindpump],
    ['wroxham-bridge', 'The Bure at Wroxham', 'The River Bure from the bridge at Wroxham, the Norfolk Broads', 'landscape', 'teal', 'cheerful', wroxhamBridge],
    ['hickling-broad', 'Dawn on Hickling Broad', 'Hickling Broad at first light, the Norfolk Broads', 'landscape', 'orange', 'dreamy', hicklingBroad],
  ];
  const TAGS = {
    'norwich-pulls-ferry': ['norwich', 'pulls ferry', 'river wensum', 'watergate', 'towpath', 'swans'],
    'norwich-cow-tower': ['norwich', 'cow tower', 'river wensum', 'bend', 'rowing', 'reeds'],
    'norwich-carrow-road': ['norwich', 'football', 'match day', 'river wensum', 'riverside walk', 'floodlights'],
    'broads-windpump': ['norfolk broads', 'windpump', 'dyke', 'marsh', 'cattle', 'wherry'],
    'wroxham-bridge': ['norfolk broads', 'wroxham', 'river bure', 'bridge', 'cruisers', 'boats'],
    'hickling-broad': ['norfolk broads', 'hickling', 'open water', 'reed beds', 'sailing', 'coots'],
  };
  for (const [id, label, site, ukKind, colour, mood, build] of ROWS) {
    sceneAdd(PACK, { id, label, site, ukKind, mood, colour, intensity: 'subtle', tags: TAGS[id].concat(['uk', 'norfolk']), town: id.indexOf('broads') === 0 || id.indexOf('hickling') === 0 || id.indexOf('wroxham') === 0 ? 'Norfolk Broads' : 'Norwich', liveSky: { lat: 52.66, lon: 1.35 } }, build);
  }
})();
