/* ============================================================
   COMPOSED SCENE uk-south-east / Yateley Common, view 3 of 4 (detail):
   a low, close look south-south-west across the Common from beside a
   fallen pine branch in the heather (docs/dev/SCENE_ENGINE.md section 3;
   helpers and sources in 71-scene-uk-south-east-yateley-common-0.js).
   Fore: big heather cushions, bracken and gorse at eye level, the fallen
   branch with a stonechat on the gorse beside it. Mid: an acid pond with
   reeds and cotton-grass margins holding the sky, silver birches on the
   left, Belted Galloway and red cattle grazing, a sandy track winding
   away, the veteran Scots pine (the signature) and younger pines on the
   right. Far: the pine and birch belts. Sky: Blackbushe light aircraft,
   small birds (geese in autumn), the live sun, moon and stars.
   Lint, look and time it with:
     node tools/anim-pack.mjs scene lint uk-south-east/hampshire-yateley-common-3 --perf
     node tools/anim-pack.mjs scene sheet uk-south-east/hampshire-yateley-common-3 --seasons
   ============================================================ */
function sceneYateleyCommon3(season) {
  const Y = _scYc, winter = season === 'winter', summer = season === 'summer', spring = season === 'spring';
  const TRACK = [[760, 488, 4], [740, 512, 10], [790, 540, 18], [760, 572, 30], [800, 610, 44], [770, 650, 60]];
  const POND = { x0: 930, x1: 1410, y0: 566, y1: 612 };
  const trackMid = Y.around(TRACK, 484, 660, 10);
  const pondAvoid = { rect: [POND.x0 - 44, POND.y0 - 40, POND.x1 + 44, POND.y1 + 42] };
  const sand = { lin: [[0, '@sand.0'], [0.5, '@sand.1'], [1, '@sand.2']], y1: 488, y2: 680 };
  const d = {
    v: 1, id: 'yateley-common-detail-' + season,
    view: { lat: 51.336, lon: -0.829, heading: 200, fov: 74, horizon: 480, lift: 0.8 },
    at: 'afternoon', season: 'auto', tropic: 'summer', setting: 'natural', weather: 'live', particles: 'season',
    palette: Y.palette, layers: Y.layers,
    sky: { stars: 200, clouds: { n: 6, y: [40, 300], speed: 5 }, sunR: 26, moonR: 20 },
    ground: [
      { layer: 'horizon', d: Y.band(474, 4, 0, 500), fill: '@wood.0' },
      { layer: 'far', d: Y.band(482, 5, 40, 570), fill: { lin: [[0, '@heath.0'], [1, '@heath.1']], y1: 482, y2: 590 } },
      { layer: 'far', d: Y.mounds(-160, 1760, 494, 540, 44, 811, [22, 44]), fill: '@mound.0' },
      { layer: 'far', d: Y.track(TRACK, 484, 548), fill: sand },
      { layer: 'mid', d: Y.band(544, 6, -40, 680), fill: { lin: [[0, '@heath.1'], [1, '@heath.2']], y1: 544, y2: 700 } },
      { layer: 'mid', d: Y.mounds(-160, 1760, 560, 650, 30, 812, [36, 70]), fill: '@mound.1' },
      { layer: 'mid', d: Y.pond(POND.x0 - 8, POND.x1 + 8, POND.y0 - 4, POND.y1 + 6, 8271), fill: '@bank.0' },
      { layer: 'mid', d: Y.track(TRACK, 544, 662), fill: sand },
      { layer: 'near', d: Y.band(660, 8, 60, 812), fill: '@heath.2' },
      { layer: 'fore', d: Y.band(770, 10, -60), fill: '@heath.2' },
    ],
    water: [{ layer: 'mid', d: Y.pond(POND.x0, POND.x1, POND.y0, POND.y1, 8270), y0: POND.y0, y1: POND.y1, base: ['#82aab4', '#40707c', '#24444c'], reflect: true, shimmer: 22, lightPath: true }],
    place: [
      // the signature: the veteran Scots pine beyond the pond, younger pines along the far heath
      { obj: 'tree.pine-veteran', x: 1290, y: 562, s: 0.5, layer: 'mid', variant: 1, seed: 1, anim: false, reflect: true },
      { obj: 'tree.pine-veteran', x: 880, y: 532, s: 0.2, layer: 'far', variant: 1, flip: true, seed: 2, anim: false },
      { obj: 'tree.pine-veteran', x: 1180, y: 528, s: 0.16, layer: 'far', variant: 1, seed: 3, anim: false, reflect: true },
      // birches on the left, a young one on the pond's far bank (mirrored)
      { obj: 'tree.birch-heath', x: 140, y: 690, s: 0.9, layer: 'near', variant: 1, seed: 4, anim: { sway: { k: 0.8 } } },
      { obj: 'tree.birch-heath', x: 300, y: 660, s: 0.62, layer: 'near', variant: 0, flip: true, seed: 5, anim: { sway: { k: 0.7 } } },
      { obj: 'tree.birch-heath', x: 520, y: 560, s: 0.3, layer: 'mid', variant: 0, seed: 6, anim: false },
      { obj: 'tree.birch-heath', x: 1050, y: 556, s: 0.26, layer: 'mid', variant: 0, flip: true, seed: 7, anim: false, reflect: true },
      ...Y.bank(POND, 'mid', 8300, 14, [0.3, 0.46]),
      // cattle grazing on the left (Belted Galloways and a red)
      { obj: 'animal.cattle', x: 190, y: 600, s: 0.42, layer: 'mid', variant: 1, seed: 11 },
      { obj: 'animal.cattle', x: 340, y: 590, s: 0.38, layer: 'mid', variant: 1, flip: true, seed: 12 },
      { obj: 'animal.cattle', x: 470, y: 598, s: 0.4, layer: 'mid', variant: 0, seed: 13 },
      // gorse with a stonechat and a Dartford warbler
      { obj: 'plant.gorse', x: 1030, y: 690, s: 0.6, layer: 'near', variant: 0, seed: 31, anim: false },
      { obj: 'plant.gorse', x: 300, y: 744, s: 0.6, layer: 'near', variant: 1, flip: true, seed: 32, anim: false },
      { obj: 'plant.gorse', x: 680, y: 672, s: 0.36, layer: 'near', variant: 1, seed: 33, anim: false },
      { obj: 'plant.gorse', x: 1440, y: 702, s: 0.46, layer: 'near', variant: 0, flip: true, seed: 34, anim: false },
      { obj: 'bird.stonechat', x: 1036, y: 628, s: 0.95, layer: 'near', variant: 0, seed: 37 },
      { obj: 'bird.dartford-warbler', x: 306, y: 690, s: 0.9, layer: 'near', flip: true, seed: 38 },
      { obj: 'animal.rabbit', x: 760, y: 742, s: 0.9, layer: 'near', variant: 0, seed: 41 },
      // the foreground: the fallen pine branch in the heather, gorse, a stonechat close up
      { obj: 'ground.log', x: 1130, y: 866, s: 1.5, layer: 'fore', variant: 0, seed: 51 },
      { obj: 'ground.log', x: 420, y: 884, s: 0.9, layer: 'fore', variant: 0, flip: true, seed: 52 },
      { obj: 'plant.gorse', x: 1560, y: 880, s: 1.3, layer: 'fore', variant: 0, flip: true, seed: 53, anim: false },
      { obj: 'plant.gorse', x: 40, y: 884, s: 1.1, layer: 'fore', variant: 1, seed: 54, anim: false },
      { obj: 'bird.stonechat', x: 1546, y: 754, s: 1.8, layer: 'fore', variant: 1, flip: true, seed: 55 },
      // framing: a big Scots pine on the right
      { obj: 'tree.pine-veteran', x: 1560, y: 905, s: 1.15, layer: 'front', variant: 0, flip: true, seed: 61 },
    ],
    scatter: [
      { obj: 'tree.woods-edge', layer: 'horizon', seed: 1, area: { rect: [-160, 472, 1760, 480] }, n: 12, minGap: 130, s: [0.36, 0.6], flip: 0.5, variant: [0, 1], anim: false },
      { obj: 'tree.woods-edge', layer: 'far', seed: 2, area: { rect: [-160, 486, 700, 492] }, n: 4, minGap: 140, s: [0.42, 0.66], flip: 0.5, variant: [1, 2], anim: false },
      { obj: 'tree.woods-edge', layer: 'far', seed: 3, area: { rect: [1000, 486, 1760, 492] }, n: 4, minGap: 140, s: [0.4, 0.6], flip: 0.5, variant: [1, 2], anim: false },
      { obj: 'tree.pine-veteran', layer: 'far', seed: 4, area: { rect: [-120, 504, 1720, 536] }, n: 6, minGap: 160, s: [0.06, 0.1], sByY: [[504, 0.85], [536, 1.15]], mask: { avoid: [{ rect: [820, 480, 1240, 540] }] }, flip: 0.5, variant: 1, anim: false },
      ...Y.carpet({ season, seed: 30, far: [486, 544], mid: [548, 656], near: [664, 780], fore: [782, 905], n: { far: 150, mid: 160, near: 170, fore: 110, grass: 50 },
        avoid: { far: [{ poly: trackMid }, pondAvoid], mid: [{ poly: trackMid }, pondAvoid], near: [], fore: [{ rect: [960, 830, 1300, 880] }] } }),
      { obj: { 'plant.reed': 2, 'plant.bulrush': 1 }, layer: 'mid', seed: 9, area: { rect: [900, 590, 1000, 620] }, n: 8, minGap: 9, s: [0.26, 0.5], flip: 0.5, variant: [0, 1], anim: false, reflect: true },
      { obj: 'plant.reed', layer: 'mid', seed: 10, area: { rect: [1340, 592, 1440, 622] }, n: 7, minGap: 9, s: [0.28, 0.46], flip: 0.5, variant: [0, 1], anim: false, reflect: true },
      { obj: 'plant.bracken', layer: 'near', seed: 12, area: { rect: [1180, 700, 1700, 790] }, n: 3, minGap: 80, s: [0.55, 1.05], flip: 0.5, variant: 0, anim: false },
      { obj: 'plant.bracken', layer: 'near', seed: 13, area: { rect: [-160, 720, 500, 790] }, n: 2, minGap: 80, s: [0.55, 1.05], flip: 0.5, variant: 0, anim: false },
    ],
    actors: [
      // a dog walker far down the track
      { obj: 'person.dog-walker', layer: 'mid', path: Y.path(TRACK, 548, 650, 12), speed: 5, loop: 'pingpong', s: 0.42, sByY: [[548, 0.7], [650, 1.1]], seed: 71, offset: 0.4 },
      { obj: 'person.walker', layer: 'far', path: Y.path(TRACK, 492, 544, 10), speed: 3, loop: 'pingpong', s: 0.3, variant: 1, sByY: [[492, 0.7], [544, 1]], seed: 72, offset: 0.7 },
      // Blackbushe light aircraft
      { obj: 'vehicle.light-aircraft', layer: 'horizon', path: [[-200, 150], [1800, 110]], speed: 26, loop: 'loop', s: 0.8, seed: 73, offset: 0.25 },
      { obj: 'vehicle.light-aircraft', layer: 'horizon', path: [[1820, 290], [-220, 250]], speed: 21, loop: 'loop', s: 0.55, variant: 1, seed: 74, offset: 0.7 },
    ],
    flocks: [
      { obj: 'bird.small-flight', n: winter ? 9 : 6, area: [200, 150, 1300, 300], speed: 26, s: 0.55, seed: 81, layer: 'horizon' },
      { obj: 'bird.small-flight', n: 4, area: [500, 360, 1100, 430], speed: 34, s: 0.45, seed: 82, layer: 'far' },
    ],
  };
  // the season's own life: ducks on the pond (not in winter), insects in spring and summer, robins in winter
  if (!winter) {
    d.actors.push({ obj: 'bird.mallard', layer: 'mid', path: [[1000, 590], [1160, 596]], speed: 3, loop: 'pingpong', s: 0.4, variant: 0, seed: 75, offset: 0.2 });
    d.actors.push({ obj: 'bird.mallard', layer: 'mid', path: [[1200, 600], [1330, 596]], speed: 2.5, loop: 'pingpong', s: 0.38, variant: 1, seed: 76, offset: 0.6 });
  }
  if (summer || spring) {
    d.actors.push({ obj: 'animal.dragonfly', layer: 'mid', path: [[960, 576], [1100, 584], [1040, 566], [1200, 578]], speed: 40, loop: 'pingpong', s: 0.6, variant: 0, seed: 79 });
    d.actors.push({ obj: 'animal.bee', layer: 'fore', path: [[200, 820], [290, 800], [250, 846]], speed: 30, loop: 'pingpong', s: 1.1, seed: 83 });
    d.actors.push({ obj: 'animal.bee', layer: 'fore', path: [[700, 830], [780, 812], [740, 856]], speed: 26, loop: 'pingpong', s: 1, seed: 84 });
  }
  Y.butterflies[season].forEach((v, i) => d.actors.push({ obj: 'animal.butterfly', layer: 'near', path: [[500 + i * 280, 720], [640 + i * 260, 690], [560 + i * 270, 760], [720 + i * 250, 730]], speed: 22, loop: 'pingpong', s: 1.1, variant: v, seed: 90 + i, offset: i * 0.3 }));
  if (winter) d.place.push({ obj: 'bird.robin', x: 1150, y: 826, s: 1.4, layer: 'fore', variant: 0, seed: 95 }, { obj: 'bird.robin', x: 640, y: 770, s: 1, layer: 'near', variant: 1, flip: true, seed: 96 });
  if (season === 'autumn') d.flocks.push({ obj: 'bird.goose-flight', n: 6, area: [700, 100, 1500, 220], speed: 30, s: 0.5, seed: 97, layer: 'horizon' });
  return d;
}
