/* ============================================================
   COMPOSED SCENE uk-south-east / Yateley Common, view 2 of 4 (close):
   a sandy heath ride under silver birches (docs/dev/SCENE_ENGINE.md
   section 3; helpers and sources in 71-scene-uk-south-east-yateley-common-0.js).
   The ride comes in wide at our feet and bends away right then left across
   the heath toward the far pine belts. Framing it: two big silver birches on
   the left, a birch and the red-barked Scots pine on the right (the signature
   is the veteran pine in the mid heath). Mid: Belted Galloway and red cattle
   grazing, a small acid pond in a hollow with reeds, a roe deer at the scrub
   edge. Life on the ride: dog walkers and a cyclist; on the gorse a
   stonechat and a Dartford warbler; butterflies and bees over the heather in
   spring and summer, a robin in winter. Sky: Blackbushe light aircraft, small
   birds, the live sun, moon and stars.
   Lint, look and time it with:
     node tools/anim-pack.mjs scene lint uk-south-east/hampshire-yateley-common-2 --perf
     node tools/anim-pack.mjs scene sheet uk-south-east/hampshire-yateley-common-2 --seasons
   ============================================================ */
function sceneYateleyCommon2(season) {
  const Y = _scYc, winter = season === 'winter', summer = season === 'summer', spring = season === 'spring';
  const TRACK = [[790, 492, 5], [800, 520, 12], [770, 548, 22], [820, 590, 40], [800, 640, 70], [700, 720, 140], [580, 820, 250], [560, 905, 330]];
  const POND = { x0: 950, x1: 1110, y0: 604, y1: 636 };
  const trackMid = Y.around(TRACK, 488, 652, 10), trackNear = Y.around(TRACK, 640, 800, 22), trackFore = Y.around(TRACK, 790, 910, 18);
  const pondAvoid = { rect: [POND.x0 - 44, POND.y0 - 40, POND.x1 + 44, POND.y1 + 42] };
  const sand = { lin: [[0, '@sand.0'], [0.5, '@sand.1'], [1, '@sand.2']], y1: 492, y2: 905 };
  const d = {
    v: 1, id: 'yateley-common-close-' + season,
    view: { lat: 51.338, lon: -0.832, heading: 200, fov: 70, horizon: 486, lift: 1 },
    at: 'afternoon', season: 'auto', tropic: 'summer', setting: 'natural', weather: 'live', particles: 'season',
    palette: Y.palette, layers: Y.layers,
    sky: { stars: 200, clouds: { n: 5, y: [40, 300], speed: 5 }, sunR: 26, moonR: 20 },
    ground: [
      { layer: 'horizon', d: Y.band(480, 4, 20, 506), fill: '@wood.0' },
      { layer: 'far', d: Y.band(488, 5, -30, 580), fill: { lin: [[0, '@heath.0'], [1, '@heath.1']], y1: 488, y2: 600 } },
      { layer: 'far', d: Y.mounds(-160, 1760, 500, 548, 44, 711, [22, 44]), fill: '@mound.0' },
      { layer: 'far', d: Y.track(TRACK, 488, 560), fill: sand },
      { layer: 'mid', d: Y.band(552, 6, 40, 668), fill: { lin: [[0, '@heath.1'], [1, '@heath.2']], y1: 552, y2: 700 } },
      { layer: 'mid', d: Y.mounds(-160, 1760, 566, 640, 30, 712, [36, 70]), fill: '@mound.1' },
      { layer: 'mid', d: Y.pond(POND.x0 - 6, POND.x1 + 6, POND.y0 - 3, POND.y1 + 5, 7271), fill: '@bank.0' },
      { layer: 'mid', d: Y.track(TRACK, 552, 652), fill: sand },
      { layer: 'near', d: Y.band(646, 8, -60, 812), fill: '@heath.2' },
      { layer: 'near', d: Y.track(TRACK, 644, 802), fill: sand },
      { layer: 'fore', d: Y.band(796, 6, 80), fill: '@heath.2' },
      { layer: 'fore', d: Y.track(TRACK, 792, 905), fill: sand },
    ],
    water: [{ layer: 'mid', d: Y.pond(POND.x0, POND.x1, POND.y0, POND.y1, 7270), y0: POND.y0, y1: POND.y1, base: ['#86aeb6', '#447480', '#26464e'], reflect: true, shimmer: 12, lightPath: true }],
    place: [
      // the signature: the veteran Scots pine standing alone in the mid heath, right of the ride
      { obj: 'tree.pine-veteran', x: 1010, y: 566, s: 0.4, layer: 'far', variant: 1, seed: 1, anim: false },
      { obj: 'tree.pine-veteran', x: 330, y: 540, s: 0.14, layer: 'far', variant: 1, flip: true, seed: 2, anim: false },
      // the pond in the hollow: reeds behind it, mirrored
      ...Y.bank(POND, 'mid', 7300, 12, [0.3, 0.46]),
      // cattle grazing beyond the pond (red, Belted Galloway, black)
      { obj: 'animal.cattle', x: 960, y: 584, s: 0.34, layer: 'mid', variant: 0, seed: 11 },
      { obj: 'animal.cattle', x: 1060, y: 580, s: 0.32, layer: 'mid', variant: 1, flip: true, seed: 12 },
      { obj: 'animal.cattle', x: 1170, y: 588, s: 0.36, layer: 'mid', variant: 2, seed: 13 },
      { obj: 'animal.deer', x: 1480, y: 640, s: 0.42, layer: 'mid', variant: 0, flip: true, seed: 14 },
      // gorse clumps along the ride, a stonechat and a Dartford warbler on the tops
      { obj: 'plant.gorse', x: 930, y: 664, s: 0.36, layer: 'near', variant: 0, seed: 31, anim: false },
      { obj: 'plant.gorse', x: 1120, y: 668, s: 0.42, layer: 'near', variant: 1, flip: true, seed: 32, anim: false },
      { obj: 'plant.gorse', x: 470, y: 676, s: 0.4, layer: 'near', variant: 1, seed: 33, anim: false },
      { obj: 'plant.gorse', x: 1420, y: 700, s: 0.6, layer: 'near', variant: 0, flip: true, seed: 34, anim: false },
      { obj: 'plant.gorse', x: 60, y: 690, s: 0.5, layer: 'near', variant: 0, seed: 35, anim: false },
      { obj: 'plant.gorse', x: 1000, y: 760, s: 0.56, layer: 'near', variant: 1, seed: 36, anim: false },
      { obj: 'bird.stonechat', x: 1126, y: 628, s: 0.8, layer: 'near', variant: 0, seed: 37 },
      { obj: 'bird.dartford-warbler', x: 1428, y: 648, s: 0.9, layer: 'near', flip: true, seed: 38 },
      { obj: 'animal.rabbit', x: 900, y: 780, s: 0.9, layer: 'near', variant: 0, flip: true, seed: 41 },
      { obj: 'animal.rabbit', x: 380, y: 760, s: 0.8, layer: 'near', variant: 1, seed: 42 },
      // the birch grove right of the ride and young birches in the heath
      { obj: 'tree.birch-heath', x: 1250, y: 700, s: 0.9, layer: 'near', variant: 1, seed: 21, anim: { sway: { k: 0.8 } } },
      { obj: 'tree.birch-heath', x: 1330, y: 690, s: 0.7, layer: 'near', variant: 0, flip: true, seed: 22, anim: { sway: { k: 0.7 } } },
      { obj: 'tree.birch-heath', x: 560, y: 572, s: 0.34, layer: 'mid', variant: 0, seed: 23, anim: false },
      { obj: 'tree.birch-heath', x: 1340, y: 566, s: 0.3, layer: 'mid', variant: 0, flip: true, seed: 24, anim: false },
      // the foreground: gorse in flower
      { obj: 'plant.gorse', x: 1080, y: 880, s: 1.3, layer: 'fore', variant: 0, flip: true, seed: 51, anim: false },
      { obj: 'plant.gorse', x: 120, y: 896, s: 1.2, layer: 'fore', variant: 1, seed: 52, anim: false },
      // framing: two big silver birches left, the red-barked Scots pine right
      { obj: 'tree.birch-heath', x: 170, y: 905, s: 1.5, layer: 'front', variant: 1, seed: 61, anim: { sway: { k: 0.8 } } },
      { obj: 'tree.birch-heath', x: 400, y: 880, s: 1.2, layer: 'front', variant: 0, flip: true, seed: 62, anim: { sway: { k: 0.7 } } },
      { obj: 'tree.pine-veteran', x: 1520, y: 905, s: 1.25, layer: 'fore', variant: 0, seed: 63 },
    ],
    scatter: [
      // the far tree line: the pine and birch belts toward Blackbushe, hazed, static
      { obj: 'tree.woods-edge', layer: 'horizon', seed: 1, area: { rect: [-160, 478, 1760, 486] }, n: 12, minGap: 130, s: [0.36, 0.6], flip: 0.5, variant: [0, 1], anim: false },
      { obj: 'tree.woods-edge', layer: 'far', seed: 2, area: { rect: [-160, 494, 640, 500] }, n: 4, minGap: 120, s: [0.42, 0.66], flip: 0.5, variant: [1, 2], anim: false },
      { obj: 'tree.woods-edge', layer: 'far', seed: 3, area: { rect: [1100, 494, 1760, 500] }, n: 3, minGap: 140, s: [0.4, 0.6], flip: 0.5, variant: [1, 2], anim: false },
      { obj: 'tree.pine-veteran', layer: 'far', seed: 4, area: { rect: [-120, 512, 1720, 540] }, n: 7, minGap: 150, s: [0.06, 0.1], sByY: [[512, 0.85], [540, 1.15]], mask: { avoid: [{ rect: [900, 490, 1120, 570] }] }, flip: 0.5, variant: 1, anim: false },
      ...Y.carpet({ season, seed: 20, far: [492, 552], mid: [556, 646], near: [652, 790], fore: [798, 905], n: { far: 200, mid: 180, near: 200, fore: 110, grass: 50 },
        avoid: { far: [{ poly: trackMid }], mid: [{ poly: trackMid }, pondAvoid], near: [{ poly: trackNear }], fore: [{ poly: trackFore }] } }),
      { obj: { 'plant.reed': 2, 'plant.bulrush': 1 }, layer: 'mid', seed: 9, area: { rect: [1090, 612, 1150, 640] }, n: 8, minGap: 8, s: [0.24, 0.42], flip: 0.5, variant: [0, 1], anim: false, reflect: true },
      { obj: 'plant.bracken', layer: 'near', seed: 12, area: { rect: [1300, 716, 1760, 800] }, n: 3, minGap: 80, s: [0.55, 1.05], flip: 0.5, variant: 0, anim: false },
      { obj: 'plant.bracken', layer: 'near', seed: 13, area: { rect: [-160, 716, 260, 800] }, n: 2, minGap: 80, s: [0.55, 1.05], flip: 0.5, variant: 0, anim: false },
    ],
    actors: [
      // the ride: a dog walker coming toward us, a cyclist further off, another dog walker far away
      { obj: 'person.dog-walker', layer: 'near', path: Y.path(TRACK, 650, 790), speed: 8, loop: 'pingpong', s: 0.8, sByY: [[650, 0.8], [790, 1.15]], seed: 71, offset: 0.3 },
      { obj: 'person.cyclist', layer: 'mid', path: Y.path(TRACK, 556, 648).reverse(), speed: 16, loop: 'pingpong', s: 0.5, sByY: [[556, 0.6], [648, 1]], seed: 72, offset: 0.1 },
      { obj: 'person.dog-walker', layer: 'far', path: Y.path(TRACK, 500, 552, 12), speed: 4, loop: 'pingpong', s: 0.36, variant: 2, sByY: [[500, 0.7], [552, 1]], seed: 74, offset: 0.5 },
      // Blackbushe light aircraft
      { obj: 'vehicle.light-aircraft', layer: 'horizon', path: [[1820, 170], [-220, 120]], speed: 24, loop: 'loop', s: 0.8, seed: 75, offset: 0.4 },
      { obj: 'vehicle.light-aircraft', layer: 'horizon', path: [[-220, 300], [1820, 260]], speed: 20, loop: 'loop', s: 0.55, variant: 1, seed: 76, offset: 0.85 },
    ],
    flocks: [
      { obj: 'bird.small-flight', n: winter ? 9 : 6, area: [200, 140, 1300, 300], speed: 26, s: 0.55, seed: 81, layer: 'horizon' },
      { obj: 'bird.small-flight', n: 3, area: [600, 360, 1100, 430], speed: 34, s: 0.45, seed: 82, layer: 'far' },
    ],
  };
  // the season's own life: insects over the heather in spring and summer, a robin and a bigger flock in winter
  if (summer || spring) {
    d.actors.push({ obj: 'animal.bee', layer: 'fore', path: [[1000, 830], [1080, 812], [1040, 850]], speed: 30, loop: 'pingpong', s: 1.1, seed: 83 });
    d.actors.push({ obj: 'animal.bee', layer: 'fore', path: [[200, 830], [280, 812], [240, 856]], speed: 26, loop: 'pingpong', s: 1, seed: 84 });
    d.actors.push({ obj: 'animal.dragonfly', layer: 'mid', path: [[960, 600], [1080, 610], [1020, 592]], speed: 36, loop: 'pingpong', s: 0.5, variant: 0, seed: 85 });
  }
  Y.butterflies[season].forEach((v, i) => d.actors.push({ obj: 'animal.butterfly', layer: 'near', path: [[420 + i * 300, 730], [560 + i * 280, 700], [480 + i * 290, 770], [640 + i * 270, 740]], speed: 22, loop: 'pingpong', s: 1.1, variant: v, seed: 90 + i, offset: i * 0.3 }));
  if (winter) d.place.push({ obj: 'bird.robin', x: 870, y: 826, s: 1.3, layer: 'fore', variant: 0, seed: 95 }, { obj: 'bird.robin', x: 1336, y: 812, s: 1, layer: 'near', variant: 1, flip: true, seed: 96 });
  if (season === 'autumn') d.flocks.push({ obj: 'bird.goose-flight', n: 5, area: [800, 110, 1500, 220], speed: 30, s: 0.5, seed: 97, layer: 'horizon' });
  return d;
}
