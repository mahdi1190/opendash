/* ============================================================
   COMPOSED SCENE uk-south-east / Yateley Common, view 1 of 4 (wide):
   the open heath looking south-west over the Common toward Blackbushe
   (docs/dev/SCENE_ENGINE.md section 3; helpers and sources in
   71-scene-uk-south-east-yateley-common-0.js).
   Far: the Blackbushe woods and pine belts, hazed, with a few lit houses at
   the edge of the Common. Mid: a heathland pond in the hollow (the live sky
   in it, a birch on its far bank reflected), Belted Galloway and red cattle
   grazing, the lone veteran Scots pine (the signature), the sandy ride
   winding toward the trees with dog walkers. Near and fore: a carpet of
   heather, gorse with stonechats, bracken, rabbits; a Scots pine and a
   silver birch framing the view. Sky: a light aircraft out of Blackbushe,
   small birds, the live sun, moon and stars.
   Lint, look and time it with:
     node tools/anim-pack.mjs scene lint uk-south-east/hampshire-yateley-common-1 --perf
     node tools/anim-pack.mjs scene sheet uk-south-east/hampshire-yateley-common-1 --times --seasons --contact
   ============================================================ */
function sceneYateleyCommon1(season) {
  const Y = _scYc, winter = season === 'winter', summer = season === 'summer', spring = season === 'spring';
  const TRACK = [[905, 506, 6], [880, 530, 14], [930, 562, 26], [880, 610, 46], [790, 670, 80], [720, 760, 140], [700, 905, 270]];
  const POND = { x0: 230, x1: 640, y0: 572, y1: 640 };
  const trackMid = Y.around(TRACK, 500, 650, 10), trackNear = Y.around(TRACK, 640, 800, 22), trackFore = Y.around(TRACK, 790, 910, 18);
  const pondAvoid = { rect: [POND.x0 - 44, POND.y0 - 40, POND.x1 + 44, POND.y1 + 42] };   // the bank: only reflecting things stand there
  const d = {
    v: 1, id: 'yateley-common-wide-' + season,
    view: { lat: 51.34, lon: -0.83, heading: 215, fov: 80, horizon: 500, lift: 1 },
    at: 'afternoon', season: 'auto', tropic: 'summer', setting: 'natural', weather: 'live', particles: 'season',
    palette: Y.palette, layers: Y.layers,
    sky: { stars: 200, clouds: { n: 6, y: [40, 320], speed: 5 }, sunR: 26, moonR: 20 },
    ground: [
      { layer: 'horizon', d: Y.band(492, 4, 0, 516), fill: '@wood.0' },
      { layer: 'far', d: Y.band(500, 5, 30, 580), fill: { lin: [[0, '@heath.0'], [1, '@heath.1']], y1: 500, y2: 600 } },
      { layer: 'far', d: Y.mounds(-160, 1760, 512, 560, 44, 611, [22, 44]), fill: '@mound.0' },
      { layer: 'mid', d: Y.band(562, 6, -40, 668), fill: { lin: [[0, '@heath.1'], [1, '@heath.2']], y1: 560, y2: 700 } },
      { layer: 'mid', d: Y.mounds(-160, 1760, 576, 640, 30, 612, [36, 70]), fill: '@mound.1' },
      { layer: 'mid', d: Y.pond(POND.x0 - 8, POND.x1 + 8, POND.y0 - 4, POND.y1 + 6, 6271), fill: '@bank.0' },
      { layer: 'mid', d: Y.track(TRACK, 500, 652), fill: { lin: [[0, '@sand.0'], [0.5, '@sand.1'], [1, '@sand.2']], y1: 506, y2: 905 } },
      { layer: 'near', d: Y.band(648, 8, 60, 812), fill: '@heath.2' },
      { layer: 'near', d: Y.track(TRACK, 646, 802), fill: { lin: [[0, '@sand.0'], [0.5, '@sand.1'], [1, '@sand.2']], y1: 506, y2: 905 } },
      { layer: 'fore', d: Y.band(796, 6, -80), fill: '@heath.2' },
      { layer: 'fore', d: Y.track(TRACK, 792, 905), fill: { lin: [[0, '@sand.0'], [0.5, '@sand.1'], [1, '@sand.2']], y1: 506, y2: 905 } },
    ],
    water: [{ layer: 'mid', d: Y.pond(POND.x0, POND.x1, POND.y0, POND.y1, 6270), y0: POND.y0, y1: POND.y1, base: ['#7fa8b0', '#3f6e78', '#24444c'], reflect: true, shimmer: 22, lightPath: true }],
    place: [
      // the signature: the lone veteran Scots pine on the open heath, two young pines beside it
      { obj: 'tree.pine-veteran', x: 716, y: 556, s: 0.42, layer: 'far', variant: 1, seed: 1, anim: false },
      { obj: 'tree.pine-veteran', x: 772, y: 548, s: 0.16, layer: 'far', variant: 1, seed: 2, anim: false },
      { obj: 'tree.pine-veteran', x: 1360, y: 548, s: 0.13, layer: 'far', variant: 1, flip: true, seed: 3, anim: false },
      // the pond's far bank: silver birches mirrored in the water
      { obj: 'tree.birch-heath', x: 470, y: 578, s: 0.3, layer: 'mid', variant: 1, seed: 7, anim: false },
      { obj: 'tree.birch-heath', x: 524, y: 576, s: 0.24, layer: 'mid', variant: 1, flip: true, seed: 8, anim: false },
      ...Y.bank(POND, 'mid', 6300, 14),
      // cattle grazing the heath (red, Belted Galloway, black, red)
      { obj: 'animal.cattle', x: 1010, y: 604, s: 0.5, layer: 'mid', variant: 0, seed: 11 },
      { obj: 'animal.cattle', x: 1120, y: 596, s: 0.44, layer: 'mid', variant: 2, flip: true, seed: 12 },
      { obj: 'animal.cattle', x: 1330, y: 612, s: 0.56, layer: 'mid', variant: 1, seed: 13 },
      { obj: 'animal.cattle', x: 940, y: 594, s: 0.4, layer: 'mid', variant: 2, seed: 14 },
      // mid trees: a birch group right, a leaning Scots pine left
      { obj: 'tree.birch-heath', x: 1250, y: 690, s: 0.62, layer: 'near', variant: 1, seed: 21, anim: { sway: { k: 0.8 } } },
      { obj: 'tree.birch-heath', x: 1180, y: 680, s: 0.5, layer: 'near', variant: 1, flip: true, seed: 22, anim: { sway: { k: 0.7 } } },
      { obj: 'tree.pine-veteran', x: 140, y: 700, s: 0.62, layer: 'near', variant: 0, flip: true, seed: 24 },
      // gorse with stonechats on the tops; a few gorse bushes yellow in the mid heath
      { obj: 'plant.gorse', x: 1180, y: 660, s: 0.3, layer: 'near', variant: 0, seed: 27, anim: false },
      { obj: 'plant.gorse', x: 860, y: 664, s: 0.32, layer: 'near', variant: 1, flip: true, seed: 28, anim: false },
      { obj: 'plant.gorse', x: 90, y: 668, s: 0.3, layer: 'near', variant: 0, seed: 29, anim: false },
      { obj: 'plant.gorse', x: 1500, y: 662, s: 0.3, layer: 'near', variant: 1, flip: true, seed: 30, anim: false },
      { obj: 'plant.gorse', x: 520, y: 700, s: 0.6, layer: 'near', variant: 0, seed: 31, anim: false },
      { obj: 'plant.gorse', x: 980, y: 690, s: 0.55, layer: 'near', variant: 1, flip: true, seed: 32, anim: false },
      { obj: 'plant.gorse', x: 1390, y: 702, s: 0.72, layer: 'near', variant: 1, seed: 33, anim: false },
      { obj: 'plant.gorse', x: 60, y: 722, s: 0.66, layer: 'near', variant: 1, seed: 34, anim: false },
      { obj: 'plant.gorse', x: 1040, y: 742, s: 0.5, layer: 'near', variant: 0, flip: true, seed: 35, anim: false },
      { obj: 'plant.gorse', x: 600, y: 760, s: 0.52, layer: 'near', variant: 1, seed: 36, anim: false },
      { obj: 'bird.stonechat', x: 1396, y: 640, s: 0.9, layer: 'near', variant: 0, seed: 37 },
      { obj: 'bird.stonechat', x: 526, y: 654, s: 0.8, layer: 'near', variant: 1, flip: true, seed: 38 },
      { obj: 'bird.dartford-warbler', x: 986, y: 646, s: 0.8, layer: 'near', flip: true, seed: 39 },
      // rabbits at the edge of the ride
      { obj: 'animal.rabbit', x: 560, y: 790, s: 0.9, layer: 'near', variant: 0, seed: 41 },
      { obj: 'animal.rabbit', x: 1060, y: 798, s: 0.8, layer: 'near', variant: 1, flip: true, seed: 42 },
      // the foreground: gorse, a stonechat close up
      { obj: 'plant.gorse', x: 420, y: 880, s: 1.35, layer: 'fore', variant: 0, seed: 51, anim: false },
      { obj: 'plant.gorse', x: 1210, y: 900, s: 1.25, layer: 'fore', variant: 1, flip: true, seed: 52, anim: false },
      { obj: 'bird.stonechat', x: 404, y: 766, s: 1.9, layer: 'fore', variant: 0, seed: 53 },
      // framing: a big Scots pine right, a silver birch left
      { obj: 'tree.pine-veteran', x: 1520, y: 905, s: 1.2, layer: 'front', variant: 0, seed: 61 },
      { obj: 'tree.birch-heath', x: 210, y: 900, s: 1.15, layer: 'front', variant: 1, flip: true, seed: 62, anim: { sway: { k: 0.8 } } },
    ],
    scatter: [
      // the far tree line: Blackbushe woods (pine, birch, oak), hazed, static; the nearer pine and birch belts in stands
      { obj: 'tree.woods-edge', layer: 'horizon', seed: 1, area: { rect: [-160, 490, 1760, 498] }, n: 12, minGap: 130, s: [0.38, 0.62], flip: 0.5, variant: [0, 1], anim: false },
      { obj: 'tree.woods-edge', layer: 'far', seed: 2, area: { rect: [-160, 506, 620, 512] }, n: 4, minGap: 120, s: [0.45, 0.7], flip: 0.5, variant: [1, 2], anim: false },
      { obj: 'tree.woods-edge', layer: 'far', seed: 4, area: { rect: [1080, 508, 1760, 514] }, n: 4, minGap: 120, s: [0.4, 0.6], flip: 0.5, variant: [1, 2], anim: false },
      // lone Scots pines dotted over the open heath
      { obj: 'tree.pine-veteran', layer: 'far', seed: 5, area: { rect: [-120, 524, 1720, 552] }, n: 8, minGap: 140, s: [0.06, 0.1], sByY: [[524, 0.85], [552, 1.15]], mask: { avoid: [pondAvoid, { rect: [660, 500, 820, 560] }] }, flip: 0.5, variant: 1, anim: false },
      // the heath carpet far to near, then the wind in the grass at the foot
      ...Y.carpet({ season, seed: 10, far: [504, 560], mid: [566, 646], near: [652, 790], fore: [798, 905], n: { far: 160, mid: 170, near: 210, fore: 120, grass: 50 },
        avoid: { far: [{ poly: trackMid }, pondAvoid], mid: [{ poly: trackMid }, pondAvoid], near: [{ poly: trackNear }], fore: [{ poly: trackFore }] } }),
      // reeds and bulrushes in the pond's margins
      { obj: { 'plant.reed': 2, 'plant.bulrush': 1 }, layer: 'mid', seed: 9, area: { poly: [[220, 612], [340, 610], [330, 650], [216, 650]] }, n: 10, minGap: 9, s: [0.26, 0.5], flip: 0.5, variant: [0, 1], anim: false, reflect: true },
      { obj: 'plant.reed', layer: 'mid', seed: 10, area: { rect: [560, 616, 662, 650] }, n: 6, minGap: 9, s: [0.3, 0.45], flip: 0.5, variant: [0, 1], anim: false, reflect: true },
      // bracken drifts at the sides
      { obj: 'plant.bracken', layer: 'near', seed: 12, area: { rect: [1240, 720, 1760, 800] }, n: 3, minGap: 80, s: [0.55, 1.05], flip: 0.5, variant: 0, anim: false },
      { obj: 'plant.bracken', layer: 'near', seed: 13, area: { rect: [-160, 730, 300, 800] }, n: 2, minGap: 80, s: [0.55, 1.05], flip: 0.5, variant: 0, anim: false },
    ],
    actors: [
      // people on the ride: a dog walker coming toward us, a jogger, a family far off (tiny silhouettes)
      { obj: 'person.dog-walker', layer: 'mid', path: Y.path(TRACK, 540, 650), speed: 7, loop: 'pingpong', s: 0.5, sByY: [[540, 0.6], [650, 1.1]], seed: 71, offset: 0.2 },
      { obj: 'person.jogger', layer: 'mid', path: Y.path(TRACK, 520, 640).reverse(), speed: 12, loop: 'pingpong', s: 0.5, sByY: [[520, 0.55], [640, 1]], seed: 72, offset: 0.6 },
      { obj: 'person.walker', layer: 'near', path: Y.path(TRACK, 660, 780), speed: 9, loop: 'pingpong', s: 0.8, sByY: [[660, 0.85], [780, 1.15]], seed: 73, offset: 0.4 },
      // a light aircraft out of Blackbushe crossing the sky slowly
      { obj: 'vehicle.light-aircraft', layer: 'horizon', path: [[-200, 200], [1800, 140]], speed: 26, loop: 'loop', s: 0.9, seed: 74, offset: 0.3 },
      { obj: 'vehicle.light-aircraft', layer: 'horizon', path: [[1820, 250], [-220, 300]], speed: 22, loop: 'loop', s: 0.6, variant: 1, seed: 85, offset: 0.75 },
    ],
    flocks: [
      { obj: 'bird.small-flight', n: winter ? 9 : 6, area: [260, 160, 1240, 300], speed: 26, s: 0.55, seed: 81, layer: 'horizon' },
      { obj: 'bird.small-flight', n: 3, area: [640, 380, 1100, 440], speed: 34, s: 0.45, seed: 82, layer: 'far' },
    ],
  };
  // the season's own life: ducks on the pond (not in winter), insects in spring and summer, robins in winter
  if (!winter) {
    d.actors.push({ obj: 'bird.mallard', layer: 'mid', path: [[300, 618], [420, 622]], speed: 3, loop: 'pingpong', s: 0.4, variant: summer || spring ? 0 : 1, seed: 75, offset: 0.1 });
    d.actors.push({ obj: 'bird.mallard', layer: 'mid', path: [[460, 628], [560, 626]], speed: 2.5, loop: 'pingpong', s: 0.38, variant: 1, seed: 76, offset: 0.7 });
  }
  if (summer || spring) {
    d.actors.push({ obj: 'animal.dragonfly', layer: 'mid', path: [[400, 590], [520, 600], [460, 584], [560, 594]], speed: 40, loop: 'pingpong', s: 0.6, variant: 0, seed: 79 });
    d.actors.push({ obj: 'animal.dragonfly', layer: 'mid', path: [[300, 600], [230, 610], [330, 596]], speed: 36, loop: 'pingpong', s: 0.5, variant: 1, seed: 80 });
    d.actors.push({ obj: 'animal.bee', layer: 'fore', path: [[440, 830], [520, 812], [480, 850]], speed: 30, loop: 'pingpong', s: 1.1, seed: 83 });
    d.actors.push({ obj: 'animal.bee', layer: 'fore', path: [[1120, 840], [1200, 822], [1160, 856]], speed: 26, loop: 'pingpong', s: 1, seed: 84 });
  }
  Y.butterflies[season].forEach((v, i) => d.actors.push({ obj: 'animal.butterfly', layer: 'near', path: [[560 + i * 260, 720], [700 + i * 240, 690], [640 + i * 250, 760], [800 + i * 230, 730]], speed: 22, loop: 'pingpong', s: 1, variant: v, seed: 90 + i, offset: i * 0.3 }));
  if (winter) d.place.push({ obj: 'bird.robin', x: 1222, y: 812, s: 1.3, layer: 'near', variant: 0, seed: 95 }, { obj: 'bird.robin', x: 760, y: 816, s: 1, layer: 'near', variant: 1, flip: true, seed: 96 });
  if (season === 'autumn') d.flocks.push({ obj: 'bird.goose-flight', n: 5, area: [900, 120, 1500, 230], speed: 30, s: 0.5, seed: 97, layer: 'horizon' });
  return d;
}
