/* ============================================================
   COMPOSED SCENE uk-south-east / Yateley Common, view 1 of 4 (wide):
   from the heather ridge on the Common's south side, looking south over the
   falling heath, the A30 and Blackbushe airfield (docs/dev/SCENE_ENGINE.md
   section 3; helpers and sources in 71-scene-uk-south-east-yateley-common-0.js).
   A raised view (the horizon high): the ridge we stand on fills the bottom
   right, its crest of heather and gorse under a big veteran Scots pine (the
   frame and the signature). A sandy firebreak runs down the slope from our
   feet, diagonally, toward the airfield. Below: the open heath of the hollow
   with lone pines, birch scrub and the grazing Belted Galloways; then the
   A30 (Hartford Bridge Flats) with its traffic, and beyond it the long pale
   runway, the hangars, the windsock and the parked light aircraft. A
   Cessna comes in to land along the runway, another flies the circuit.
   Far: the wooded ridge toward Hazeley Heath. The live sun, moon and stars.
   Lint, look and time it with:
     node tools/anim-pack.mjs scene lint uk-south-east/hampshire-yateley-common-1 --perf
     node tools/anim-pack.mjs scene sheet uk-south-east/hampshire-yateley-common-1 --times --seasons --contact
   ============================================================ */
function sceneYateleyCommon1(season) {
  const Y = _scYc, winter = season === 'winter', summer = season === 'summer', spring = season === 'spring', autumn = season === 'autumn';
  // the firebreak: from our feet (bottom left) down the slope toward the airfield (right of centre)
  const TRACK = [[1010, 500, 6], [950, 526, 14], [900, 562, 24], [800, 616, 44], [640, 690, 86], [520, 780, 150], [420, 905, 240]];
  // the ridge we stand on: a bank of heather rising to the bottom right
  const RIDGE = [[700, 905], [820, 830], [980, 752], [1160, 700], [1360, 668], [1560, 656], [1780, 650], [1780, 905]];
  const ridgeTop = (x) => { for (let i = 0; i < RIDGE.length - 2; i++) { const [x0, y0] = RIDGE[i], [x1, y1] = RIDGE[i + 1]; if (x >= x0 && x <= x1) return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return 650; };
  const trackMid = Y.around(TRACK, 496, 650, 10), trackNear = Y.around(TRACK, 640, 800, 22), trackFore = Y.around(TRACK, 790, 910, 18);
  const ridgeArea = { poly: RIDGE.slice(0, -1).map(([x, y]) => [x, y + 14]).concat([[1780, 905], [700, 905]]) };
  const sand = { lin: [[0, '@sand.0'], [0.5, '@sand.1'], [1, '@sand.2']], y1: 500, y2: 905 };
  // the airfield: the runway (pale, a little nearer at the left), the taxiway and the apron by the hangars
  const RWY = [[140, 450], [1010, 443], [1012, 452], [138, 462]];
  let marks = '', keys = '';
  for (let x = 200; x < 980; x += 34) { const y = 455.5 - (x - 140) * 7 / 870; marks += `M${x} ${(y - 0.6).toFixed(1)}h14v1.3h-14z`; }
  for (let i = 0; i < 6; i++) { const x = 150 + i * 4; keys += `M${x} 453h2.4v5h-2.4z`; }
  const d = {
    v: 1, id: 'yateley-common-wide-' + season,
    view: { lat: 51.334, lon: -0.836, heading: 185, fov: 78, horizon: 410, lift: 1.4 },
    at: 'afternoon', season: 'auto', tropic: 'summer', setting: 'natural', weather: 'live', particles: 'season',
    palette: Y.pal({
      base: { runway: ['#8e8e88', '#a8a8a0'], paint: '#eeeee6', road: ['#4a4a4a', '#5e5c58'], apron: '#9a9890' },
      spring: { field: ['#8a9a5a', '#748646', '#5e7038'] },
      summer: { field: ['#9aa060', '#848a4c', '#6a723e'] },
      autumn: { field: ['#a49a62', '#8a804e', '#6e683e'] },
      winter: { field: ['#8e8c74', '#76745e', '#5e5c4a'] },
    }),
    layers: Y.layers,
    sky: { stars: 200, clouds: { n: 6, y: [30, 280], speed: 5 }, sunR: 26, moonR: 20 },
    ground: [
      // the far ridge toward Hazeley Heath, wooded
      { layer: 'horizon', d: Y.band(404, 3, 60, 430), fill: '@wood.0' },
      // the airfield: rough grass, the runway, taxiway and apron
      { layer: 'far', d: Y.band(420, 2, -40, 520), fill: { lin: [[0, '@field.0'], [1, '@field.1']], y1: 420, y2: 500 } },
      { layer: 'far', d: Y.poly(RWY), fill: { lin: [[0, '@runway.1'], [1, '@runway.0']], y1: 445, y2: 459 } },
      { layer: 'far', d: marks + keys, fill: '@paint' },
      { layer: 'far', d: 'M1010 446L1080 441L1460 440L1470 447L1080 449L1012 451Z', fill: '@apron' },
      // the airfield's boundary fence line and the A30 in front of it
      { layer: 'far', d: Y.band(474, 2, 30, 486), fill: '@field.2' },
      { layer: 'far', d: 'M-160 486Q600 483 1760 488V494Q600 490 -160 493Z', fill: { lin: [[0, '@road.1'], [1, '@road.0']], y1: 485, y2: 494 } },
      // the hollow of the Common below us: heath falling away, then the slope up to the ridge
      { layer: 'far', d: Y.band(494, 3, 20, 560), fill: { lin: [[0, '@heath.0'], [1, '@heath.1']], y1: 494, y2: 560 } },
      { layer: 'far', d: Y.mounds(-160, 1760, 506, 552, 40, 1611, [22, 44]), fill: '@mound.0' },
      { layer: 'far', d: Y.track(TRACK, 496, 560), fill: sand },
      { layer: 'mid', d: Y.band(548, 6, 40, 668), fill: { lin: [[0, '@heath.1'], [1, '@heath.2']], y1: 548, y2: 700 } },
      { layer: 'mid', d: Y.mounds(-160, 1760, 562, 640, 30, 1612, [36, 70]), fill: '@mound.1' },
      { layer: 'mid', d: Y.track(TRACK, 552, 652), fill: sand },
      { layer: 'mid', d: Y.ruts(TRACK, 590, 652).ruts, fill: '@rut.0' },
      { layer: 'near', d: Y.band(644, 8, -60, 812), fill: '@heath.2' },
      { layer: 'near', d: Y.track(TRACK, 642, 802), fill: sand },
      { layer: 'near', d: Y.ruts(TRACK, 642, 802).ruts, fill: { lin: [[0, '@rut.0'], [1, '@rut.1']], y1: 642, y2: 905 } },
      { layer: 'near', d: Y.ruts(TRACK, 642, 802).crown, fill: '@crown.1' },
      { layer: 'fore', d: Y.band(796, 6, 80), fill: '@heath.2' },
      { layer: 'fore', d: Y.track(TRACK, 792, 905), fill: sand },
      { layer: 'fore', d: Y.ruts(TRACK, 792, 905).ruts, fill: '@rut.1' },
      { layer: 'fore', d: Y.ruts(TRACK, 792, 905).crown, fill: '@crown.0' },
      // the ridge bank (its own darker heath), over the slope
      { layer: 'fore', d: Y.poly(RIDGE, true), fill: { lin: [[0, '@mound.0'], [0.12, '@mound.1'], [0.5, '@heath.2'], [1, '@bank.1']], y1: 650, y2: 905 } },
    ],
    place: [
      // the landmark: Blackbushe's hangars on the apron, the windsock, light aircraft parked
      { obj: 'building.yc-hangar', x: 1160, y: 446, s: 0.36, layer: 'far', variant: 0, seed: 1, anim: false, shadow: false },
      { obj: 'building.yc-hangar', x: 1320, y: 444, s: 0.31, layer: 'far', variant: 1, seed: 2, anim: false, shadow: false },
      { obj: 'building.yc-hangar', x: 1450, y: 445, s: 0.27, layer: 'far', variant: 0, flip: true, seed: 3, anim: false, shadow: false },
      { obj: 'prop.yc-windsock', x: 1040, y: 462, s: 0.3, layer: 'far', seed: 4 },
      { obj: 'vehicle.light-aircraft', x: 1090, y: 450, s: 0.2, layer: 'far', variant: 0, seed: 5, anim: false },
      { obj: 'vehicle.light-aircraft', x: 1232, y: 449, s: 0.18, layer: 'far', variant: 1, flip: true, seed: 6, anim: false },
      { obj: 'vehicle.light-aircraft', x: 1370, y: 450, s: 0.19, layer: 'far', variant: 0, seed: 7, anim: false },
      // the signature: the veteran Scots pine on the ridge crest, the frame on the right
      { obj: 'tree.pine-veteran', x: 1430, y: ridgeTop(1430) + 26, s: 1.3, layer: 'fore', variant: 0, seed: 10 },
      // the ridge crest: banks of heather and gorse, a dead pine snag (the stonechat's perch)
      { obj: 'plant.wyv-heath-bank', x: 960, y: ridgeTop(960) + 34, s: 1.0, layer: 'fore', variant: 1, seed: 11, anim: false },
      { obj: 'plant.wyv-heath-bank', x: 1170, y: ridgeTop(1170) + 30, s: 1.25, layer: 'fore', variant: 0, flip: true, seed: 12, anim: false },
      { obj: 'plant.wyv-heath-bank', x: 1630, y: ridgeTop(1630) + 40, s: 1.3, layer: 'fore', variant: 2, seed: 13, anim: false },
      { obj: 'plant.gorse', x: 1260, y: ridgeTop(1260) + 60, s: 1.05, layer: 'fore', variant: 1, seed: 14, anim: false },
      { obj: 'plant.gorse', x: 820, y: 900, s: 0.95, layer: 'fore', variant: 0, flip: true, seed: 15, anim: false },
      { obj: 'tree.wyv-snag', x: 1060, y: ridgeTop(1060) + 28, s: 0.9, layer: 'fore', variant: 1, seed: 16, anim: false },
      { obj: 'bird.stonechat', x: 1074, y: ridgeTop(1060) - 122, s: 1.1, layer: 'fore', variant: 0, flip: true, seed: 17 },
      { obj: 'plant.bracken', x: 1540, y: 905, s: 2.1, layer: 'front', variant: 1, flip: true, seed: 18, anim: { sway: { k: 0.6 } } },
      // the left foot of the frame: a gorse spray close up (a Dartford warbler on its dead stem)
      { obj: 'plant.yc-gorse-spray', x: 40, y: 924, s: 1.35, layer: 'front', variant: 1, seed: 19 },
      { obj: 'bird.dartford-warbler', x: -14, y: 664, s: 1.5, layer: 'front', flip: true, seed: 20 },
      // the hollow: Belted Galloways and a red cow grazing, New Forest ponies further over
      { obj: 'animal.cattle', x: 330, y: 586, s: 0.3, layer: 'mid', variant: 2, seed: 21 },
      { obj: 'animal.cattle', x: 410, y: 598, s: 0.32, layer: 'mid', variant: 2, flip: true, seed: 22 },
      { obj: 'animal.cattle', x: 250, y: 604, s: 0.33, layer: 'mid', variant: 0, seed: 23 },
      { obj: 'animal.pony', x: 1240, y: 592, s: 0.24, layer: 'mid', variant: 0, flip: true, seed: 24 },
      { obj: 'animal.pony', x: 1300, y: 598, s: 0.25, layer: 'mid', variant: 2, seed: 25 },
      // birch scrub and a few young pines in the hollow (in clumps, not rows)
      { obj: 'tree.birch-heath', x: 120, y: 560, s: 0.3, layer: 'mid', variant: 2, seed: 26, anim: false },
      { obj: 'tree.birch-heath', x: 170, y: 566, s: 0.24, layer: 'mid', variant: 0, flip: true, seed: 27, anim: false },
      { obj: 'tree.pine-veteran', x: 560, y: 560, s: 0.3, layer: 'mid', variant: 1, seed: 28, anim: false },
      { obj: 'tree.birch-heath', x: 1460, y: 574, s: 0.34, layer: 'mid', variant: 1, seed: 29, anim: false },
      { obj: 'tree.pine-veteran', x: 1530, y: 584, s: 0.38, layer: 'mid', variant: 0, flip: true, seed: 30, anim: false },
      { obj: 'plant.gorse', x: 640, y: 590, s: 0.32, layer: 'mid', variant: 2, seed: 31, anim: false },
      { obj: 'plant.gorse', x: 1100, y: 606, s: 0.36, layer: 'mid', variant: 0, flip: true, seed: 32, anim: false },
      { obj: 'plant.gorse', x: 960, y: 586, s: 0.3, layer: 'mid', variant: 1, seed: 33, anim: false },
      // the slope: gorse with stonechats, bracken, a birch beside the firebreak
      { obj: 'plant.gorse', x: 200, y: 700, s: 0.6, layer: 'near', variant: 0, seed: 34, anim: false },
      { obj: 'plant.gorse', x: 760, y: 712, s: 0.55, layer: 'near', variant: 1, flip: true, seed: 35, anim: false },
      { obj: 'plant.gorse', x: 70, y: 770, s: 0.72, layer: 'near', variant: 1, seed: 36, anim: false },
      { obj: 'bird.stonechat', x: 764, y: 656, s: 0.9, layer: 'near', variant: 1, seed: 37 },
      { obj: 'tree.birch-heath', x: 860, y: 680, s: 0.62, layer: 'near', variant: 1, seed: 38, anim: { sway: { k: 0.7 } } },
      { obj: 'animal.rabbit', x: 560, y: 784, s: 0.8, layer: 'near', variant: 0, seed: 39 },
    ],
    scatter: [
      // the far wooded ridge and the airfield's tree belts, hazed (kept off the runway)
      { obj: 'tree.woods-edge', layer: 'horizon', seed: 1, area: { rect: [-160, 406, 1760, 414] }, n: 26, minGap: 60, s: [0.2, 0.34], flip: 0.5, variant: [0, 1, 2], anim: false },
      { obj: 'tree.woods-edge', layer: 'far', seed: 2, area: { rect: [-160, 476, 110, 484] }, n: 2, minGap: 120, s: [0.3, 0.4], flip: 0.5, variant: [1, 2], anim: false },
      { obj: 'tree.woods-edge', layer: 'far', seed: 3, area: { rect: [1500, 476, 1760, 484] }, n: 2, minGap: 120, s: [0.3, 0.4], flip: 0.5, variant: [0, 2], anim: false },
      // scrub along the A30 verges and the airfield boundary (gorse, birch, in patches)
      { obj: { 'plant.gorse': 3, 'tree.birch-heath': 2, 'tree.pine-veteran': 1 }, layer: 'far', seed: 7, area: { rect: [-140, 472, 1740, 485] }, n: 30, minGap: 30, s: [0.08, 0.16], mask: { noise: { scale: 260, cut: 0.45 } }, flip: 0.5, variant: [0, 1], anim: false },
      { obj: 'plant.grass', layer: 'far', seed: 8, area: { rect: [-140, 424, 1740, 472] }, n: 40, minGap: 30, s: [0.16, 0.26], mask: { avoid: [{ rect: [130, 438, 1480, 466] }], noise: { scale: 300, cut: 0.4 } }, flip: 0.5, variant: [0, 1], anim: false },
      // lone pines over the hollow, in loose groups (noise), never a row
      { obj: 'tree.pine-veteran', layer: 'far', seed: 5, area: { rect: [-120, 508, 1720, 600] }, n: 7, minGap: 150, s: [0.07, 0.16], sByY: [[508, 0.7], [600, 1.5]], mask: { noise: { scale: 360, cut: 0.5 }, avoid: [{ poly: trackMid }] }, flip: 0.5, variant: [0, 1], anim: false },
      { obj: 'tree.birch-heath', layer: 'far', seed: 6, area: { rect: [-120, 510, 1720, 546] }, n: 8, minGap: 70, s: [0.1, 0.16], sByY: [[510, 0.8], [546, 1.2]], mask: { noise: { scale: 300, cut: 0.5 }, avoid: [{ poly: trackMid }] }, flip: 0.5, variant: [0, 1, 2], anim: false },
      ...Y.drifts({ seed: 10, ride: TRACK, far: [504, 560], mid: [566, 650], near: [656, 800], fore: [804, 920], n: { far: 110, mid: 110, near: 70, fore: 24 },
        avoid: { fore: [ridgeArea], near: [{ poly: RIDGE.map(([x, y]) => [x, y + 40]) }] } }),
      ...Y.carpet({ season, seed: 10, far: [500, 556], mid: [562, 646], near: [652, 790], fore: [798, 905], n: { far: 60, mid: 70, near: 80, fore: 34, grass: 26 },
        avoid: { far: [{ poly: trackMid }], mid: [{ poly: trackMid }], near: [{ poly: trackNear }], fore: [{ poly: trackFore }, ridgeArea] } }),
      // the ridge's own cover: ling and bell heather cushions over the bank
      { obj: { 'plant.heather': 5, 'plant.grass': 1 }, layer: 'fore', seed: 14, area: ridgeArea, n: 46, minGap: 34, s: [1.1, 1.7], sByY: [[690, 0.85], [905, 1.2]], flip: 0.5, variant: [0, 1], anim: false },
      // bracken on the slope left of the firebreak (copper in autumn)
      { obj: 'plant.bracken', layer: 'near', seed: 12, area: { rect: [-160, 690, 340, 800] }, n: 4, minGap: 70, s: [0.6, 1.0], mask: { avoid: [{ poly: trackNear }] }, flip: 0.5, variant: [0, 1], anim: false },
    ],
    actors: [
      // a Cessna landing on Blackbushe's runway (from the right, descending), another flying the circuit
      { obj: 'vehicle.light-aircraft', layer: 'far', path: [[1780, 300], [1400, 360], [1100, 404], [820, 438], [580, 450], [240, 452]], speed: 30, loop: 'loop', s: 1, sByY: [[300, 0.42], [452, 0.21]], seed: 71, offset: 0.4 },
      { obj: 'vehicle.light-aircraft', layer: 'horizon', path: [[-200, 220], [1800, 170]], speed: 22, loop: 'loop', s: 0.42, variant: 1, seed: 72, offset: 0.7 },
      // the A30 traffic
      { obj: 'vehicle.car', layer: 'far', path: [[-180, 490], [1780, 491]], speed: 46, loop: 'loop', s: 0.16, variant: 0, seed: 73, offset: 0.1 },
      { obj: 'vehicle.car', layer: 'far', path: [[1780, 492], [-180, 491]], speed: 40, loop: 'loop', s: 0.16, variant: 2, seed: 74, offset: 0.55 },
      { obj: 'vehicle.car', layer: 'far', path: [[-180, 490], [1780, 491]], speed: 52, loop: 'loop', s: 0.16, variant: 3, seed: 75, offset: 0.8 },
      // on the firebreak: a dog walker climbing toward us, a walker going down
      { obj: 'person.dog-walker', layer: 'near', path: Y.path(TRACK, 660, 790).reverse(), speed: 7, loop: 'pingpong', s: 0.8, sByY: [[660, 0.85], [790, 1.15]], seed: 76, offset: 0.3 },
      { obj: 'person.walker', layer: 'mid', path: Y.path(TRACK, 540, 640), speed: 6, loop: 'pingpong', s: 0.5, variant: 1, sByY: [[540, 0.6], [640, 1]], seed: 77, offset: 0.6 },
    ],
    flocks: [
      { obj: 'bird.small-flight', n: winter ? 9 : 5, area: [200, 120, 1100, 300], speed: 26, s: 0.5, seed: 81, layer: 'horizon' },
      { obj: 'bird.small-flight', n: 3, area: [400, 470, 1000, 520], speed: 34, s: 0.4, seed: 82, layer: 'far' },
    ],
  };
  // the season's own life
  if (summer || spring) {
    d.actors.push({ obj: 'animal.bee', layer: 'fore', path: [[1040, 790], [1120, 770], [1080, 806]], speed: 30, loop: 'pingpong', s: 1.1, seed: 83 });
    d.actors.push({ obj: 'animal.bee', layer: 'fore', path: [[1300, 760], [1380, 742], [1340, 780]], speed: 26, loop: 'pingpong', s: 1, seed: 84 });
  }
  Y.butterflies[season].forEach((v, i) => d.actors.push({ obj: 'animal.butterfly', layer: 'near', path: [[160 + i * 220, 720], [280 + i * 200, 690], [220 + i * 210, 760], [340 + i * 190, 730]], speed: 22, loop: 'pingpong', s: 1, variant: v, seed: 90 + i, offset: i * 0.3 }));
  if (winter) d.place.push({ obj: 'bird.robin', x: 1250, y: ridgeTop(1250) + 4, s: 1.3, layer: 'fore', variant: 0, seed: 95 });
  if (autumn) d.flocks.push({ obj: 'bird.goose-flight', n: 6, area: [300, 100, 1000, 220], speed: 30, s: 0.5, seed: 97, layer: 'horizon' });
  return d;
}
