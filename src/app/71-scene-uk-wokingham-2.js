/* ============================================================
   COMPOSED SCENES: Wokingham area, the parks, the lakes and the woods (part 2). docs/dev/SCENE_ENGINE.md 3.
   Four different real places, each composed for its own view:
     wokingham-elms-field    Elms Field: a town park, the lawn under big trees, All Saints' tower over the trees
     dinton-pastures-lake    Dinton Pastures: the lake from its east shore, the wooded island across the water
     wellingtonia-avenue     the Wellingtonia Avenue, Finchampstead: looking down the avenue of giant redwoods
     california-pine-heath   California Country Park: a heath track low among the Scots pines
   Data only (PURE): each builder makes its scene from the frame helpers (71-scene-uk-wokingham-0frame.js)
   and the library (70-scene-lib-area-wokingham.js). The season comes from the date, the light from the live sky.
   Registered by 72-anim-pack-uk-area-wokingham.js.
   ============================================================ */
(function () {
  if (typeof sceneAdd !== 'function' || typeof sceneWokFrame !== 'function') return;
  const PACK = 'uk-area-wokingham';
  const TH = 'landmark.wokingham-town-hall', AS = 'landmark.all-saints-wokingham', ISL = 'landmark.dinton-island', WA = 'landmark.wellingtonia-avenue', PS = 'landmark.heath-pine-stand';

  /* ---------- Elms Field: the lawn of a town park under big trees, the church tower over them ---------- */
  function elmsField(m) {
    const H = 360, f = sceneWokFrame(m), { data: d, metres, person, sOf, ladder } = f;
    const G = d.ground, P = d.place, A = d.actors, r = sceneRnd(5101);
    sceneWokHorizon(d, r, H - 12, 12, H + 60, '@wood.0');
    d.scatter.push({ obj: { 'tree.green-oak': 2, 'tree.green-chestnut': 1, 'tree.plane': 1 }, layer: 'horizon', seed: 5102, area: { rect: [-150, H + 6, 1750, H + 30] }, n: 16, minGap: 70, s: [0.35, 0.6], variant: [0, 1], flip: 0.5, anim: false });
    // the lawn falls away to the viewer, a gravel path curves across it from the right to the far gate
    G.push({ layer: 'mid', d: sceneWokPoly([[-160, H + 40], [1760, H + 40], [1760, 900], [-160, 900]]), fill: { lin: [[0, '@lawn.2'], [1, '@lawn.0']], x1: 0, y1: H + 40, x2: 0, y2: 900 } });
    G.push({ layer: 'mid', d: `M660 ${H + 60}Q700 ${H + 96} 760 ${H + 150}Q860 ${H + 240} 1000 ${H + 330}Q1140 ${H + 430} 1320 905H1020Q930 ${H + 470} 860 ${H + 380}Q780 ${H + 290} 720 ${H + 214}Q676 ${H + 150} 660 ${H + 60}Z`, fill: { lin: [[0, '@path.1'], [1, '@path.0']], x1: 0, y1: H + 60, x2: 0, y2: 905 } });
    // the church tower over the trees beyond the lawn, and the big trees that frame the view
    P.push({ obj: AS, x: 880, y: H + 36, s: metres(AS, 26, H + 36), layer: 'far', seed: 5, anim: false });
    P.push({ obj: 'tree.horse-chestnut', x: 1620, y: 890, s: sOf('tree.horse-chestnut', 760), layer: 'front', seed: 5110, flip: true });
    P.push({ obj: 'tree.green-chestnut', x: 130, y: H + 110, s: sOf('tree.green-chestnut', 430), layer: 'mid', seed: 5111 });
    P.push({ obj: 'tree.green-oak', x: -40, y: 880, s: sOf('tree.green-oak', 680), layer: 'front', seed: 5112 });
    P.push({ obj: 'tree.plane', x: 1260, y: H + 70, s: sOf('tree.plane', 360), layer: 'far', seed: 5113, flip: true });
    P.push({ obj: 'street.bench', x: 430, y: 640, s: 0.95, layer: 'mid', seed: 5114 });
    // a few people: a child with a ball on the lawn, a dog walker and a jogger on the path, a scooter child
    P.push({ obj: 'person.child-ball', x: 1040, y: 760, s: person('person.child-ball', 760), layer: 'near', seed: 5120, flip: true });
    A.push({ obj: 'person.dog-walker', layer: 'mid', path: [[1700, H + 230], [-120, H + 250]], speed: 9, loop: 'loop', s: person('person.dog-walker', H + 240), seed: 5121, offset: 0.3 });
    A.push({ obj: 'person.jogger', layer: 'near', path: [[-200, 720], [1800, 700]], speed: 22, loop: 'loop', s: person('person.jogger', 710), seed: 5122, offset: 0.7 });
    A.push({ obj: 'person.child-scooter', layer: 'near', path: [[1760, 840], [-120, 826]], speed: 13, loop: 'pingpong', s: person('person.child-scooter', 835), seed: 5123, offset: 0.2, flip: true });
    if (sceneObj('animal.dog')) A.push({ obj: 'animal.dog', layer: 'mid', path: [[560, H + 170], [720, H + 176]], speed: 12, loop: 'pingpong', s: metres('animal.dog', 0.55, H + 170), seed: 5124, offset: 0.4 });
    // the birds over the trees and on the lawn
    A.push({ obj: 'bird.pigeon', layer: 'mid', path: [[300, H + 300], [350, H + 306]], speed: 3, loop: 'pingpong', s: 0.8, seed: 5125 });
    d.flocks.push({ obj: 'bird.small-flight', n: 6, area: [160, 70, 1450, 220], speed: 22, s: 0.44, seed: 5126, layer: 'far' });
    d.flocks.push({ obj: 'bird.goose-flight', n: 3, area: [400, 60, 1300, 160], speed: 26, s: 0.4, seed: 5127, layer: 'far' });
    // the cover: grass on the lawn, wildflowers in patches, shrubs at the tree line, leaves under the trees
    d.scatter.push({ obj: { 'plant.shrub': 1 }, layer: 'mid', seed: 5130, area: { rect: [-160, H + 40, 1760, H + 150] }, n: 160, minGap: 12, s: [0.45, 0.9], sByY: ladder(H + 40, H + 150), variant: [0, 1], anim: 'strip' });
    d.scatter.push({ obj: { 'plant.shrub': 1, 'ground.leaves': 1 }, layer: 'near', seed: 5131, area: { rect: [-160, H + 150, 1760, 900] }, n: 230, minGap: 16, s: [0.6, 1.1], sByY: ladder(H + 150, 900), variant: [0, 1], anim: 'strip' });
    d.scatter.push({ obj: { 'plant.shrub': 2, 'plant.hedge': 1 }, layer: 'mid', seed: 5132, area: { rect: [-160, H + 30, 1760, H + 60] }, n: 14, minGap: 60, s: [0.4, 0.7], variant: [0, 1], anim: false });
    d.scatter.push({ obj: { 'ground.leaves': 2, 'plant.bracken': 1 }, layer: 'fore', seed: 5133, area: { rect: [-160, 820, 1760, 900] }, n: 18, minGap: 60, s: [1, 1.3], variant: [0, 1], anim: false });
    return d;
  }

  /* ---------- Dinton Pastures: the lake from the east shore, the wooded island across the open water ---------- */
  function dintonLake(m) {
    const H = 440, f = sceneWokFrame(m), { data: d, metres, person, sOf, ladder } = f;
    const G = d.ground, W = d.water, P = d.place, A = d.actors, r = sceneRnd(5201);
    sceneWokHorizon(d, r, H + 2, 6, H + 46, '@wood.0');
    d.scatter.push({ obj: { 'tree.pond-wood': 3, 'tree.pond-willow': 1, 'tree.pond-birch': 1 }, layer: 'far', seed: 5202, area: { rect: [-150, H + 14, 1750, H + 30] }, n: 22, minGap: 46, s: [0.32, 0.5], variant: [0, 1], flip: 0.5, anim: false, reflect: true });
    // the open water from the shore to the far trees, with a glitter road under the low sun
    const top = sceneWokWave(r, H + 34, 3), bot = sceneWokWave(r, H + 270, 12);
    W.push({ layer: 'mid', d: sceneWokBand(top, bot), y0: H + 30, y1: H + 280, base: ['#a8c4cc', '#6a98a6', '#3a6a7a'], reflect: true, shimmer: 30, lightPath: true });
    // the wooded island across the water, a little left of centre, its reflection in the lake
    P.push({ obj: ISL, x: 700, y: H + 110, s: sOf(ISL, 300), layer: 'far', seed: 5, reflect: true, anim: false });
    // the near shore: a bank of reeds and grass, two willows at the water's edge, an angler on the bank
    G.push({ layer: 'near', d: sceneWokPoly([[-160, H + 276], [1760, H + 262], [1760, 900], [-160, 900]]), fill: { lin: [[0, '@meadow.0'], [1, '@ground.2']], x1: 0, y1: H + 262, x2: 0, y2: 900 } });
    P.push({ obj: 'tree.bank-willow', x: 1470, y: H + 300, s: sOf('tree.bank-willow', 520), layer: 'near', seed: 5203, flip: true, reflect: true });
    P.push({ obj: 'tree.bank-alder', x: -20, y: H + 330, s: sOf('tree.bank-alder', 420), layer: 'near', seed: 5204 });
    P.push({ obj: 'person.angler', x: 420, y: H + 330, s: person('person.angler', H + 330), layer: 'near', seed: 5205, flip: true });
    P.push({ obj: 'bird.heron', x: 1240, y: H + 286, s: 0.8, layer: 'mid', seed: 5206, reflect: true });
    // the dinghies on the open water, the swans and ducks along the shore
    for (let i = 0; i < 2; i++) { const y = H + 110 + i * 46; A.push({ obj: 'boat.dinghy', layer: 'mid', path: [[160 + i * 300, y], [640 + i * 280, y + 6]], speed: 8 + i * 3, loop: 'pingpong', s: metres('boat.dinghy', 4.6, y), seed: 5210 + i, variant: i, offset: i * 0.37 }); }
    [['bird.swan', 0.55, H + 220, 110], ['bird.swan', 0.5, H + 236, 180], ['bird.mallard', 0.44, H + 200, 160], ['bird.coot', 0.36, H + 252, 90]].forEach(([id, s, y, x], i) => A.push({ obj: id, layer: 'mid', path: [[x, y], [x + 150 + i * 20, y + 4]], speed: 4 + i * 0.5, loop: 'pingpong', s: s * 1.3, seed: 5215 + i, variant: i % 2, offset: (i * 0.31) % 1, flip: i % 2 === 1 }));
    d.flocks.push({ obj: 'bird.goose-flight', n: 5, area: [280, 70, 1400, 200], speed: 24, s: 0.42, seed: 5220, layer: 'far' });
    d.flocks.push({ obj: 'bird.small-flight', n: 4, area: [200, 90, 1300, 230], speed: 20, s: 0.4, seed: 5221, layer: 'far' });
    // the cover: reeds and bulrushes at the water, grass and watercress on the bank, leaves in the shallows
    d.scatter.push({ obj: { 'plant.reed': 3, 'plant.bulrush': 1, 'plant.water-crowfoot': 1 }, layer: 'near', seed: 5230, area: { rect: [-160, H + 262, 1760, H + 286] }, n: 120, minGap: 12, s: [0.55, 0.9], variant: [0, 1], anim: 'strip', reflect: true });
    d.scatter.push({ obj: { 'plant.grass': 3, 'plant.wildflowers': 1, 'plant.reed': 1 }, layer: 'near', seed: 5231, area: { rect: [-160, H + 290, 1760, 900] }, n: 230, minGap: 14, s: [0.6, 1.05], sByY: ladder(H + 290, 900), variant: [0, 1], anim: 'strip' });
    d.scatter.push({ obj: { 'plant.bulrush': 1, 'plant.grass': 1, 'ground.leaves': 1 }, layer: 'fore', seed: 5232, area: { rect: [-160, 830, 1760, 900] }, n: 24, minGap: 60, s: [0.9, 1.2], variant: [0, 1], anim: false });
    return d;
  }

  /* ---------- the Wellingtonia Avenue: the road running away between the redwoods, looking straight down it ---------- */
  function wellingtoniaAvenue(m) {
    const H = 420, f = sceneWokFrame(m), { data: d, metres, person, sOf, ladder } = f;
    const G = d.ground, P = d.place, A = d.actors, r = sceneRnd(5301);
    sceneWokHorizon(d, r, H - 6, 8, H + 60, '@far.1');
    // the open heath and birch beyond the avenue, the lawns either side of the road
    G.push({ layer: 'far', d: sceneWokPoly([[-160, H + 20], [1760, H + 20], [1760, H + 200], [-160, H + 200]]), fill: '@lawn.2' });
    // the avenue itself: its verges, its road and the redwood rows, big enough to read as the landmark
    P.push({ obj: WA, x: 800, y: H + 170, s: 1.15, layer: 'mid', seed: 5, anim: false });
    d.scatter.push({ obj: { 'tree.birch': 1, 'tree.pine': 1 }, layer: 'far', seed: 5302, area: { rect: [-150, H + 14, 1750, H + 34] }, n: 18, minGap: 60, s: [0.3, 0.5], variant: [0, 1], flip: 0.5, anim: false });
    // the people on the verges and the cars coming down the road, the birds over the crowns
    P.push({ obj: 'person.walker', x: 340, y: H + 230, s: person('person.walker', H + 230), layer: 'near', seed: 5310, flip: true });
    P.push({ obj: 'person.dog-walker', x: 1230, y: H + 250, s: person('person.dog-walker', H + 250), layer: 'near', seed: 5311 });
    A.push({ obj: 'vehicle.car', layer: 'mid', path: [[-240, H + 196], [1840, H + 200]], speed: 30, loop: 'loop', s: metres('vehicle.car', 1.5, H + 198), seed: 5312, offset: 0.2, variant: 1 });
    A.push({ obj: 'vehicle.car-city', layer: 'near', path: [[1840, H + 320], [-240, H + 332]], speed: 22, loop: 'loop', s: metres('vehicle.car-city', 1.5, H + 326), seed: 5313, offset: 0.6, variant: 2, flip: true });
    d.flocks.push({ obj: 'bird.small-flight', n: 6, area: [260, 60, 1340, 210], speed: 22, s: 0.42, seed: 5314, layer: 'far' });
    d.flocks.push({ obj: 'bird.gull', n: 3, area: [420, 30, 1180, 120], speed: 24, s: 0.44, seed: 5315, layer: 'far' });
    // the cover: grass on the verges and the lawns, leaves and cones in the gutters, ferns at the tree bases
    d.scatter.push({ obj: { 'plant.grass': 3, 'plant.wildflowers': 1 }, layer: 'mid', seed: 5320, area: { rect: [-160, H + 150, 1760, H + 260] }, n: 170, minGap: 12, s: [0.5, 0.9], sByY: ladder(H + 150, H + 260), variant: [0, 1], anim: 'strip' });
    d.scatter.push({ obj: { 'plant.grass': 3, 'ground.leaves': 2, 'plant.fern': 1 }, layer: 'near', seed: 5321, area: { rect: [-160, H + 260, 1760, 900] }, n: 260, minGap: 14, s: [0.6, 1.1], sByY: ladder(H + 260, 900), variant: [0, 1], anim: 'strip' });
    d.scatter.push({ obj: { 'ground.leaves': 1, 'plant.bracken': 1 }, layer: 'fore', seed: 5322, area: { rect: [-160, 830, 1760, 900] }, n: 18, minGap: 60, s: [1, 1.3], variant: [0, 1], anim: false });
    return d;
  }

  /* ---------- California Country Park: a heath track low among the Scots pines, the pine stand ahead ---------- */
  function heathPines(m) {
    const H = 240, f = sceneWokFrame(m), { data: d, metres, person, sOf, ladder } = f;
    const G = d.ground, P = d.place, A = d.actors, r = sceneRnd(5401);
    sceneWokHorizon(d, r, H - 8, 6, H + 60, '@needle.0');
    // the heath open to the far pines, the sandy track running up from the bottom edge to the stand
    G.push({ layer: 'far', d: sceneWokPoly([[-160, H + 40], [1760, H + 40], [1760, 900], [-160, 900]]), fill: { lin: [[0, '@heath.1'], [1, '@needle.0']], x1: 0, y1: H + 40, x2: 0, y2: 900 } });
    G.push({ layer: 'mid', d: `M600 905L760 ${H + 170}L840 ${H + 170}L1020 905Z`, fill: { lin: [[0, '@sand.1'], [1, '@sand.0']], x1: 0, y1: H + 170, x2: 0, y2: 905 } });
    // the pine stand ahead, the veteran pines and a birch framing the near edges
    P.push({ obj: PS, x: 770, y: H + 176, s: 1.2, layer: 'far', seed: 5, anim: false });
    P.push({ obj: 'tree.pine-veteran', x: -60, y: 900, s: sOf('tree.pine-veteran', 900), layer: 'front', seed: 5410 });
    P.push({ obj: 'tree.pine', x: 1340, y: 880, s: sOf('tree.pine', 760), layer: 'near', seed: 5411, flip: true });
    P.push({ obj: 'tree.birch', x: 1560, y: H + 190, s: sOf('tree.birch', 460), layer: 'mid', seed: 5412 });
    // the walkers on the track and a dog, a deer far off in the trees, a squirrel on the heath
    A.push({ obj: 'person.hiker', layer: 'near', path: [[-180, 700], [1700, 670]], speed: 7, loop: 'pingpong', s: person('person.hiker', 690), seed: 5420, offset: 0.2 });
    A.push({ obj: 'animal.dog', layer: 'near', path: [[700, 760], [960, 770]], speed: 10, loop: 'pingpong', s: metres('animal.dog', 0.55, 765), seed: 5421, offset: 0.5 });
    P.push({ obj: 'animal.deer', x: 1220, y: H + 96, s: metres('animal.deer', 1.1, H + 96), layer: 'far', seed: 5422, flip: true });
    A.push({ obj: 'animal.squirrel', layer: 'mid', path: [[200, H + 300], [270, H + 306]], speed: 10, loop: 'pingpong', s: 0.7, seed: 5423 });
    d.flocks.push({ obj: 'bird.small-flight', n: 6, area: [240, 60, 1300, 200], speed: 20, s: 0.42, seed: 5430, layer: 'far' });
    // the cover: heather and bilberry on the heath, bracken and gorse under the pines, grass along the track
    d.scatter.push({ obj: { 'plant.heather': 3, 'plant.bilberry': 1, 'plant.gorse': 1 }, layer: 'mid', seed: 5440, area: { rect: [-160, H + 60, 1760, H + 190] }, n: 150, minGap: 12, s: [0.35, 0.6], sByY: ladder(H + 60, H + 190), variant: [0, 1], anim: false, mask: { avoid: [{ rect: [700, H + 150, 1000, 905] }] } });
    d.scatter.push({ obj: { 'plant.bracken': 3, 'plant.heather': 2, 'plant.fern': 1 }, layer: 'near', seed: 5441, area: { rect: [-160, H + 190, 1760, 900] }, n: 230, minGap: 14, s: [0.6, 1.05], sByY: ladder(H + 190, 900), variant: [0, 1], anim: 'strip', mask: { avoid: [{ rect: [720, H + 190, 960, 905] }] } });
    d.scatter.push({ obj: { 'plant.grass': 2, 'plant.bracken': 1, 'ground.log': 1 }, layer: 'fore', seed: 5442, area: { rect: [-160, 830, 1760, 900] }, n: 20, minGap: 60, s: [1, 1.3], variant: [0, 1], anim: 'strip' });
    return d;
  }

  const ITEMS = [
    ['wokingham-elms-field', 51.4098, -0.8320, 330, 360, 'Elms Field, Wokingham', 'Elms Field park, All Saints\' tower over the trees', 'landscape', 'green', 'cheerful', 'wokingham|elms field|park|lawn|trees|berkshire', elmsField],
    ['dinton-pastures-lake', 51.4390, -0.8700, 200, 440, 'The lake at Dinton Pastures', 'The lake at Dinton Pastures from the east shore, the wooded island across the water', 'landscape', 'teal', 'calm', 'dinton pastures|lake|island|dinghies|swans|berkshire', dintonLake],
    ['wellingtonia-avenue', 51.3640, -0.8260, 0, 420, 'The Wellingtonia Avenue, Finchampstead', 'The Wellingtonia Avenue at Finchampstead, looking down the road between the redwoods', 'landscape', 'green', 'calm', 'finchampstead|wellingtonia|redwood avenue|road|berkshire', wellingtoniaAvenue],
    ['california-pine-heath', 51.3790, -0.8710, 60, 240, 'California Country Park, the pine heath', 'California Country Park: a heath track among the Scots pines', 'landscape', 'amber', 'dreamy', 'california country park|pine heath|scots pine|heath|berkshire', heathPines],
  ];
  ITEMS.forEach(([key, lat, lon, heading, horizon, label, site, ukKind, colour, mood, tags, build]) => {
    const id = 'berkshire-' + key;
    sceneAdd(PACK, { id, label, site, ukKind, colour, mood, intensity: 'subtle', lat, lon, tags: tags.split('|') },
      () => build({ id, lat, lon, heading, horizon, at: 'afternoon', setting: 'natural', clouds: 5 }));
  });
})();
