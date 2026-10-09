/* ============================================================
   COMPOSED SCENE uk-south-east / Yateley Common, view 2 of 4 (close):
   a grazing track between the gorse and the Scots pine wood on the Common's
   north side, the cattle right beside us (docs/dev/SCENE_ENGINE.md section 3;
   helpers and sources in 71-scene-uk-south-east-yateley-common-0.js).
   The left half is the pine wood's edge: tall red-barked Scots pines at
   several depths over bracken and bilberry, a pine bough hanging into the
   top-left corner. The sandy track comes in from our feet on the right and
   swings left into the shade of the pines, through the grazing fence's
   five-bar gate (the landmark). The right half is open common: big gorse
   bushes in flower, heather, a birch or two, the far tree belts. Close to
   us, a Belted Galloway grazes the track verge, a red cow beyond it; New
   Forest ponies by the gate. Life: a stonechat on the gorse, a dog walker
   at the gate, a buzzard-free sky of small birds and the live sun, moon
   and stars; insects in summer, a robin in winter.
   Lint, look and time it with:
     node tools/anim-pack.mjs scene lint uk-south-east/hampshire-yateley-common-2 --perf
     node tools/anim-pack.mjs scene sheet uk-south-east/hampshire-yateley-common-2 --times --seasons
   ============================================================ */
function sceneYateleyCommon2(season) {
  const Y = _scYc, winter = season === 'winter', summer = season === 'summer', spring = season === 'spring', autumn = season === 'autumn';
  // the track: in wide at our feet (bottom right), swinging left into the pines
  const TRACK = [[470, 548, 8], [560, 566, 16], [660, 594, 28], [780, 640, 50], [920, 710, 90], [1060, 800, 160], [1150, 905, 250]];
  // the wood's floor: the left of the picture, its edge running from the far left to our feet
  const WOOD = [[-160, 538], [300, 542], [520, 552], [600, 600], [680, 680], [700, 760], [640, 905], [-160, 905]];
  const woodArea = { poly: WOOD };
  const trackMid = Y.around(TRACK, 540, 660, 10), trackNear = Y.around(TRACK, 650, 800, 22), trackFore = Y.around(TRACK, 790, 910, 18);
  const sand = { lin: [[0, '@sand.0'], [0.5, '@sand.1'], [1, '@sand.2']], y1: 548, y2: 905 };
  const gateX = 700, gateY = 630;
  const d = {
    v: 1, id: 'yateley-common-close-' + season,
    view: { lat: 51.343, lon: -0.829, heading: 70, fov: 70, horizon: 520, lift: 1 },
    at: 'afternoon', season: 'auto', tropic: 'summer', setting: 'natural', weather: 'live', particles: 'season',
    palette: Y.pal({
      base: { floor: ['#3a3024', '#4a3c2c', '#2a241c'] },
      autumn: { floor: ['#4a3424', '#5e4230', '#32261c'] },
      winter: { floor: ['#3e362e', '#50463a', '#2e2822'] },
    }),
    layers: Y.layers,
    sky: { stars: 200, clouds: { n: 5, y: [40, 300], speed: 5 }, sunR: 26, moonR: 20 },
    ground: [
      { layer: 'horizon', d: Y.band(514, 3, 30, 540), fill: '@wood.0' },
      { layer: 'far', d: Y.band(522, 4, -30, 600), fill: { lin: [[0, '@heath.0'], [1, '@heath.1']], y1: 522, y2: 600 } },
      { layer: 'far', d: Y.mounds(500, 1760, 530, 570, 26, 2711, [22, 44]), fill: '@mound.0' },
      { layer: 'mid', d: Y.band(564, 5, 40, 668), fill: { lin: [[0, '@heath.1'], [1, '@heath.2']], y1: 564, y2: 700 } },
      { layer: 'mid', d: Y.mounds(600, 1760, 576, 650, 22, 2712, [36, 70]), fill: '@mound.1' },
      // the pine wood's floor: needles and shade under the trees
      { layer: 'mid', d: Y.poly(WOOD, true), fill: { lin: [[0, '@floor.2'], [0.4, '@floor.0'], [1, '@floor.1']], y1: 530, y2: 905 } },
      { layer: 'mid', d: Y.track(TRACK, 544, 660), fill: sand },
      { layer: 'mid', d: Y.ruts(TRACK, 580, 660).ruts, fill: '@rut.0' },
      { layer: 'near', d: 'M600 905L560 640Q900 640 1760 646V905Z', fill: '@heath.2' },
      { layer: 'near', d: Y.track(TRACK, 650, 802), fill: sand },
      { layer: 'near', d: Y.ruts(TRACK, 650, 802).ruts, fill: { lin: [[0, '@rut.0'], [1, '@rut.1']], y1: 650, y2: 905 } },
      { layer: 'near', d: Y.ruts(TRACK, 650, 802).crown, fill: '@crown.1' },
      { layer: 'fore', d: 'M640 905L700 800Q1000 790 1760 796V905Z', fill: '@heath.2' },
      { layer: 'fore', d: Y.track(TRACK, 792, 905), fill: sand },
      { layer: 'fore', d: Y.ruts(TRACK, 792, 905).ruts, fill: '@rut.1' },
      { layer: 'fore', d: Y.ruts(TRACK, 792, 905).crown, fill: '@crown.0' },
    ],
    place: [
      // the landmark: the grazing fence's five-bar gate across the track
      { obj: 'prop.yc-field-gate', x: gateX, y: gateY, s: 0.72, layer: 'mid', seed: 1 },
      // the pine wood's edge: tall Scots pines at several depths (never a row)
      { obj: 'tree.pool-pine', x: 600, y: 572, s: 0.46, layer: 'mid', variant: 1, seed: 2, anim: false },
      { obj: 'tree.pond-pine', x: 470, y: 556, s: 0.62, layer: 'mid', variant: 2, flip: true, seed: 3, anim: false },
      { obj: 'tree.pool-pine', x: 372, y: 590, s: 0.66, layer: 'mid', variant: 0, flip: true, seed: 4, anim: false },
      { obj: 'tree.pine', x: 214, y: 548, s: 0.5, layer: 'mid', variant: 1, seed: 5, anim: false },
      { obj: 'tree.pool-pine', x: 128, y: 614, s: 0.8, layer: 'mid', variant: 1, seed: 6, anim: false },
      { obj: 'tree.pool-birch', x: 540, y: 640, s: 0.62, layer: 'near', variant: 1, seed: 7, anim: { sway: { k: 0.6 } } },
      { obj: 'tree.pool-pine', x: 300, y: 720, s: 1.08, layer: 'near', variant: 2, seed: 8, anim: { sway: { k: 0.5 } } },
      { obj: 'tree.pool-pine', x: -20, y: 905, s: 1.5, layer: 'front', variant: 0, flip: true, seed: 9, anim: { sway: { k: 0.4 } } },
      { obj: 'tree.wp-pine-bough', x: -36, y: -22, s: 0.9, layer: 'front', anim: { sway: { k: 1 } } },
      // the wood's floor: bracken and bilberry under the pines, a fallen log
      { obj: 'ground.log', x: 420, y: 790, s: 0.9, layer: 'near', variant: 1, flip: true, seed: 10, anim: false },
      { obj: 'plant.bracken', x: 520, y: 900, s: 1.9, layer: 'front', variant: 1, seed: 11, anim: { sway: { k: 0.5 } } },
      // the open common on the right: big gorse bushes in clumps, a birch, the far heath
      { obj: 'plant.gorse', x: 1300, y: 700, s: 0.95, layer: 'near', variant: 0, seed: 12, anim: false },
      { obj: 'plant.gorse', x: 1460, y: 716, s: 1.15, layer: 'near', variant: 1, flip: true, seed: 13, anim: false },
      { obj: 'plant.gorse', x: 1640, y: 690, s: 0.9, layer: 'near', variant: 0, seed: 14, anim: false },
      { obj: 'plant.gorse', x: 880, y: 640, s: 0.55, layer: 'mid', variant: 1, seed: 15, anim: false },
      { obj: 'plant.gorse', x: 1010, y: 620, s: 0.5, layer: 'mid', variant: 0, flip: true, seed: 16, anim: false },
      { obj: 'plant.gorse', x: 1180, y: 606, s: 0.42, layer: 'mid', variant: 2, seed: 17, anim: false },
      { obj: 'tree.birch-heath', x: 1250, y: 610, s: 0.56, layer: 'mid', variant: 1, seed: 18, anim: { sway: { k: 0.6 } } },
      { obj: 'tree.birch-heath', x: 1540, y: 590, s: 0.4, layer: 'mid', variant: 0, flip: true, seed: 19, anim: false },
      { obj: 'tree.pine-veteran', x: 1420, y: 560, s: 0.3, layer: 'far', variant: 1, seed: 20, anim: false },
      { obj: 'bird.stonechat', x: 1466, y: 596, s: 1.1, layer: 'near', variant: 0, flip: true, seed: 21 },
      { obj: 'bird.dartford-warbler', x: 1306, y: 610, s: 1, layer: 'near', seed: 22 },
      // the cattle close to us: a Belted Galloway grazing the verge, a red cow beyond, ponies by the gate
      { obj: 'animal.cattle', x: 1270, y: 852, s: 1.25, layer: 'fore', variant: 2, flip: true, seed: 23 },
      { obj: 'animal.cattle', x: 1560, y: 790, s: 0.86, layer: 'near', variant: 0, flip: true, seed: 24 },
      { obj: 'animal.cattle', x: 960, y: 650, s: 0.5, layer: 'mid', variant: 1, seed: 25 },
      { obj: 'animal.pony', x: 820, y: 612, s: 0.36, layer: 'mid', variant: 1, flip: true, seed: 26 },
      { obj: 'animal.pony', x: 1080, y: 630, s: 0.4, layer: 'mid', variant: 0, seed: 27 },
      // the foot of the frame: a gorse spray in the bottom-right corner
      { obj: 'plant.yc-gorse-spray', x: 1640, y: 930, s: 1.3, layer: 'front', variant: 0, flip: true, seed: 28 },
    ],
    scatter: [
      // the far tree belts, and the wood behind the trunks (a canopy mass on the left)
      { obj: 'tree.woods-edge', layer: 'horizon', seed: 1, area: { rect: [-160, 510, 1760, 518] }, n: 14, minGap: 90, s: [0.32, 0.5], flip: 0.5, variant: [0, 1, 2], anim: false },
      { obj: 'tree.woods-edge', layer: 'mid', seed: 2, area: { rect: [-160, 546, 540, 556] }, n: 7, minGap: 80, s: [0.9, 1.25], flip: 0.5, variant: [0, 1], anim: false },
      { obj: 'tree.distant-pine', layer: 'mid', seed: 3, area: { rect: [-140, 552, 500, 562] }, n: 5, minGap: 110, s: [0.7, 0.95], flip: 0.5, variant: [0, 1, 2], anim: false },
      // the wood floor: bracken and bilberry in drifts (noise), clear of the track
      { obj: { 'plant.bracken': 3, 'plant.bilberry': 2, 'plant.fern': 1 }, layer: 'mid', seed: 4, area: { poly: [[-160, 566], [560, 566], [640, 670], [-160, 670]] }, n: 70, minGap: 20, s: [0.5, 0.8], sByY: [[566, 0.8], [670, 1.2]], mask: { avoid: [{ poly: trackMid }], noise: { scale: 200, cut: 0.2 } }, flip: 0.5, variant: [0, 1, 2], anim: false },
      { obj: { 'plant.bracken': 3, 'plant.bilberry': 2 }, layer: 'near', seed: 5, area: { poly: [[-160, 680], [660, 680], [700, 800], [-160, 800]] }, n: 40, minGap: 34, s: [0.8, 1.2], sByY: [[680, 0.85], [800, 1.15]], mask: { avoid: [{ poly: trackNear }], noise: { scale: 240, cut: 0.2 } }, flip: 0.5, variant: [0, 1, 2], anim: false },
      { obj: { 'plant.bilberry': 2, 'plant.grass-long': 1 }, layer: 'fore', seed: 6, area: { poly: [[-160, 810], [660, 810], [640, 905], [-160, 905]] }, n: 14, minGap: 70, s: [1.6, 2.2], flip: 0.5, variant: [0, 1, 2], anim: false },
      // the open common's heath (drifts and carpet), only on the right of the wood's edge
      ...Y.drifts({ seed: 20, ride: TRACK, x0: 480, far: [530, 566], mid: [570, 650], near: [656, 800], fore: [804, 920], n: { far: 50, mid: 70, near: 50, fore: 20 },
        avoid: { mid: [woodArea], near: [woodArea], fore: [woodArea] } }),
      ...Y.carpet({ season, seed: 20, x0: 480, far: [526, 562], mid: [566, 646], near: [652, 790], fore: [798, 905], n: { far: 40, mid: 50, near: 60, fore: 30, grass: 24 },
        avoid: { far: [{ poly: trackMid }], mid: [{ poly: trackMid }, woodArea], near: [{ poly: trackNear }, woodArea], fore: [{ poly: trackFore }, woodArea, { rect: [1120, 800, 1440, 870] }] } }),
    ],
    actors: [
      // a dog walker through the gate and down the track toward us, a cyclist far off
      { obj: 'person.dog-walker', layer: 'near', path: Y.path(TRACK, 660, 790), speed: 8, loop: 'pingpong', s: 0.8, sByY: [[660, 0.8], [790, 1.15]], seed: 71, offset: 0.3 },
      { obj: 'person.walker', layer: 'mid', path: Y.path(TRACK, 556, 640, 12), speed: 5, loop: 'pingpong', s: 0.5, variant: 2, sByY: [[556, 0.6], [640, 1]], seed: 72, offset: 0.7 },
      { obj: 'vehicle.light-aircraft', layer: 'horizon', path: [[1820, 200], [-220, 150]], speed: 24, loop: 'loop', s: 0.6, seed: 75, offset: 0.4 },
    ],
    flocks: [
      { obj: 'bird.small-flight', n: winter ? 9 : 5, area: [700, 140, 1500, 320], speed: 26, s: 0.55, seed: 81, layer: 'horizon' },
    ],
  };
  if (summer || spring) {
    d.actors.push({ obj: 'animal.bee', layer: 'near', path: [[1300, 640], [1380, 622], [1340, 660]], speed: 30, loop: 'pingpong', s: 1.1, seed: 83 });
    d.actors.push({ obj: 'animal.bee', layer: 'near', path: [[1440, 660], [1520, 642], [1480, 676]], speed: 26, loop: 'pingpong', s: 1, seed: 84 });
  }
  Y.butterflies[season].forEach((v, i) => d.actors.push({ obj: 'animal.butterfly', layer: 'near', path: [[900 + i * 180, 730], [1000 + i * 170, 700], [960 + i * 160, 770], [1080 + i * 150, 740]], speed: 22, loop: 'pingpong', s: 1.1, variant: v, seed: 90 + i, offset: i * 0.3 }));
  if (winter) d.place.push({ obj: 'bird.robin', x: gateX - 30, y: gateY - 52, s: 0.8, layer: 'mid', variant: 0, seed: 95 });
  if (autumn) d.flocks.push({ obj: 'bird.goose-flight', n: 5, area: [800, 110, 1500, 220], speed: 30, s: 0.5, seed: 97, layer: 'horizon' });
  return d;
}
