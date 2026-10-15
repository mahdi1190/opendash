/* ============================================================
   COMPOSED SCENE uk-south-east / Yateley Common, view 4 of 4 (evening):
   from inside the birch-and-pine woodland on the Common, looking west out
   of the trees to the open heath at dusk (docs/dev/SCENE_ENGINE.md section 3;
   helpers and sources in 71-scene-uk-south-east-yateley-common-0.js).
   The frame is the wood itself: big silver birch trunks on the left, the
   red trunk of a Scots pine on the right, a birch bough across the top, the
   woodland's canopy closing in at both sides. A narrow footpath runs from
   our feet past a fallen pine, through bracken and bilberry, and out of the
   trees into the heath (the leading line). Out in the opening: the lone
   veteran Scots pine with its dead snag, the nightjars' song post (the
   signature), against the sunset; heather and gorse in the last light,
   cattle settling. At dusk (May to August) nightjars hawk over the heath and
   pipistrelles flit at the wood's edge. The sky is live: the real sun, moon
   and stars for Yateley; Blackbushe light aircraft show their lights.
   Lint, look and time it with:
     node tools/anim-pack.mjs scene lint uk-south-east/hampshire-yateley-common-4 --perf
     node tools/anim-pack.mjs scene sheet uk-south-east/hampshire-yateley-common-4 --times --seasons
   ============================================================ */
function sceneYateleyCommon4(season) {
  const Y = _scYc, winter = season === 'winter', summer = season === 'summer', spring = season === 'spring', autumn = season === 'autumn';
  // the footpath: from our feet out of the trees to the opening (toward the lone pine)
  const TRACK = [[930, 556, 4], [900, 578, 8], [860, 610, 14], [880, 650, 22], [820, 700, 38], [700, 780, 70], [640, 905, 120]];
  // the wood's floor: everything but the opening (a bay of open heath in the middle)
  const OPEN = [[420, 540], [1300, 540], [1220, 600], [1060, 650], [940, 690], [800, 690], [640, 650], [520, 600]];
  const openArea = { poly: OPEN };
  const trackMid = Y.around(TRACK, 552, 660, 8), trackNear = Y.around(TRACK, 650, 800, 16), trackFore = Y.around(TRACK, 790, 910, 14);
  const sand = { lin: [[0, '@sand.0'], [0.5, '@sand.1'], [1, '@sand.2']], y1: 556, y2: 905 };
  const PINE = [1010, 600];
  const d = {
    v: 1, id: 'yateley-common-evening-' + season,
    view: { lat: 51.339, lon: -0.833, heading: 268, fov: 72, horizon: 540, lift: 0.9 },
    at: 'sunset', season: 'auto', tropic: 'summer', setting: 'natural', weather: 'live', particles: 'season',
    palette: Y.pal({
      base: { floor: ['#2e2a20', '#3e3426', '#221e18'] },
      autumn: { floor: ['#3e2c1e', '#523a26', '#2a2018'] },
      winter: { floor: ['#36302a', '#463e34', '#28241e'] },
    }),
    layers: Y.layers,
    sky: { stars: 240, clouds: { n: 4, y: [80, 360], speed: 4 }, sunR: 30, moonR: 20 },
    ground: [
      { layer: 'horizon', d: Y.band(534, 3, 0, 560), fill: '@wood.0' },
      { layer: 'far', d: Y.band(542, 4, 30, 720), fill: { lin: [[0, '@heath.0'], [1, '@heath.1']], y1: 542, y2: 640 } },
      { layer: 'far', d: Y.mounds(300, 1400, 552, 610, 22, 4611, [26, 50]), fill: '@mound.0' },
      { layer: 'far', d: Y.track(TRACK, 552, 640), fill: sand },
      // the wood's floor, with the opening out to the heath
      { layer: 'mid', d: `M-180 905V560L400 548Q520 600 640 650Q800 700 940 690Q1060 650 1220 600L1320 548L1780 556V905Z`, fill: { lin: [[0, '@floor.2'], [0.5, '@floor.0'], [1, '@floor.1']], y1: 548, y2: 905 } },
      { layer: 'mid', d: Y.track(TRACK, 640, 700), fill: sand },
      { layer: 'near', d: Y.track(TRACK, 696, 802), fill: sand },
      { layer: 'fore', d: Y.track(TRACK, 792, 905), fill: sand },
    ],
    place: [
      // the signature: the lone veteran Scots pine out on the heath, its dead snag the nightjar's song post
      { obj: 'tree.pine-veteran', x: PINE[0], y: PINE[1], s: 0.62, layer: 'far', variant: 0, seed: 1, anim: false },
      { obj: 'tree.wyv-snag', x: PINE[0] + 150, y: PINE[1] + 4, s: 0.7, layer: 'far', variant: 1, seed: 2, anim: false },
      { obj: 'tree.pine-veteran', x: 620, y: 566, s: 0.2, layer: 'far', variant: 1, flip: true, seed: 3, anim: false },
      { obj: 'plant.gorse', x: 760, y: 600, s: 0.4, layer: 'far', variant: 0, seed: 4, anim: false },
      { obj: 'plant.gorse', x: 1180, y: 590, s: 0.36, layer: 'far', variant: 1, flip: true, seed: 5, anim: false },
      { obj: 'animal.cattle', x: 560, y: 590, s: 0.3, layer: 'far', variant: 2, seed: 6 },
      { obj: 'animal.cattle', x: 640, y: 596, s: 0.28, layer: 'far', variant: 0, flip: true, seed: 7 },
      // the wood: birch and pine at several depths around the opening (the canopy closes in at both sides)
      { obj: 'tree.pool-birch', x: 380, y: 600, s: 0.8, layer: 'mid', variant: 2, seed: 8, anim: false },
      { obj: 'tree.pool-pine', x: 250, y: 580, s: 0.7, layer: 'mid', variant: 1, flip: true, seed: 9, anim: false },
      { obj: 'tree.pool-birch', x: 520, y: 640, s: 0.66, layer: 'mid', variant: 0, flip: true, seed: 10, anim: false },
      { obj: 'tree.pool-pine', x: 1300, y: 586, s: 0.74, layer: 'mid', variant: 0, seed: 11, anim: false },
      { obj: 'tree.pool-birch', x: 1190, y: 650, s: 0.7, layer: 'mid', variant: 1, seed: 12, anim: false },
      { obj: 'tree.birch', x: 1420, y: 620, s: 0.9, layer: 'mid', variant: 2, flip: true, seed: 13, anim: false },
      { obj: 'tree.pool-birch', x: 160, y: 700, s: 1.1, layer: 'near', variant: 1, flip: true, seed: 14, anim: { sway: { k: 0.5 } } },
      { obj: 'tree.pool-pine', x: 1360, y: 760, s: 1.25, layer: 'near', variant: 2, seed: 15, anim: { sway: { k: 0.4 } } },
      // the frame: big birch trunks on the left, the pine's red trunk on the right, the bough across the top
      { obj: 'tree.pool-birch', x: 60, y: 960, s: 2.1, layer: 'front', variant: 0, seed: 16, anim: { sway: { k: 0.4 } } },
      { obj: 'tree.pool-birch', x: 300, y: 930, s: 1.7, layer: 'front', variant: 1, flip: true, seed: 17, anim: { sway: { k: 0.4 } } },
      { obj: 'tree.pool-pine', x: 1560, y: 960, s: 1.9, layer: 'front', variant: 0, flip: true, seed: 18, anim: { sway: { k: 0.3 } } },
      { obj: 'tree.yc-birch-bough', x: -30, y: -16, s: 1.0, layer: 'front', seed: 19, anim: { sway: { k: 1 } } },
      // the fallen pine beside the path, bracken and bilberry on the floor
      { obj: 'ground.log', x: 980, y: 800, s: 1.4, layer: 'near', variant: 1, seed: 20, anim: false },
      { obj: 'plant.bracken', x: 1180, y: 905, s: 2.2, layer: 'front', variant: 1, flip: true, seed: 21, anim: { sway: { k: 0.5 } } },
      { obj: 'plant.bracken', x: 440, y: 920, s: 2.0, layer: 'front', variant: 0, seed: 22, anim: { sway: { k: 0.5 } } },
    ],
    scatter: [
      { obj: 'tree.woods-edge', layer: 'horizon', seed: 1, area: { rect: [300, 530, 1400, 538] }, n: 8, minGap: 100, s: [0.3, 0.46], flip: 0.5, variant: [0, 1, 2], anim: false },
      // the wood behind the frame trunks: canopy masses at both sides (none in the opening)
      { obj: 'tree.woods-edge', layer: 'mid', seed: 2, area: { rect: [-160, 560, 400, 574] }, n: 6, minGap: 90, s: [1.1, 1.5], flip: 0.5, variant: [0, 2], anim: false },
      { obj: 'tree.woods-edge', layer: 'mid', seed: 3, area: { rect: [1300, 560, 1760, 574] }, n: 5, minGap: 90, s: [1.1, 1.5], flip: 0.5, variant: [0, 1], anim: false },
      // the open heath in the opening
      ...Y.drifts({ seed: 40, ride: TRACK, x0: 380, x1: 1340, far: [552, 640], n: { far: 70 } }),
      { obj: { 'plant.heather': 5, 'plant.grass': 1 }, layer: 'far', seed: 41, area: openArea, n: 40, minGap: 16, s: [0.4, 0.6], flip: 0.5, variant: [0, 1], mask: { avoid: [{ poly: trackMid }] }, anim: false },
      // the woodland floor: bracken, bilberry and fern in drifts (noise), clear of the path and the opening
      { obj: { 'plant.bracken': 3, 'plant.bilberry': 2, 'plant.fern': 1 }, layer: 'mid', seed: 42, area: { rect: [-160, 600, 1760, 700] }, n: 60, minGap: 30, s: [0.6, 0.9], sByY: [[600, 0.8], [700, 1.2]], mask: { avoid: [{ poly: trackMid }, openArea], noise: { scale: 220, cut: 0.3 } }, flip: 0.5, variant: [0, 1, 2], anim: false },
      { obj: { 'plant.bracken': 3, 'plant.bilberry': 2, 'plant.fern': 1 }, layer: 'near', seed: 43, area: { rect: [-160, 700, 1760, 800] }, n: 40, minGap: 50, s: [0.9, 1.3], sByY: [[700, 0.85], [800, 1.15]], mask: { avoid: [{ poly: trackNear }], noise: { scale: 260, cut: 0.28 } }, flip: 0.5, variant: [0, 1, 2], anim: false },
      { obj: { 'plant.bilberry': 2, 'plant.fern': 1, 'ground.leaf-litter': 1 }, layer: 'fore', seed: 44, area: { rect: [-160, 810, 1760, 905] }, n: 30, minGap: 70, s: [1.4, 2.0], mask: { avoid: [{ poly: trackFore }] }, flip: 0.5, variant: [0, 1, 2], anim: false },
    ],
    actors: [
      // a light aircraft going over (the last walker of the day: sceneYgMovers, below)
      { obj: 'vehicle.light-aircraft', layer: 'horizon', path: [[1820, 330], [-220, 260]], speed: 24, loop: 'loop', s: 0.6, seed: 73, offset: 0.2 },
    ],
    flocks: [
      { obj: 'bird.small-flight', n: winter ? 8 : 5, area: [500, 200, 1200, 420], speed: 24, s: 0.5, seed: 81, layer: 'horizon' },
    ],
  };
  // the season's own life: nightjars hawking over the heath at dusk (May to August), bats at the wood's edge, a robin in winter
  if (summer || spring) {
    d.actors.push({ obj: 'bird.nightjar', layer: 'mid', path: [[620, 470], [820, 420], [1000, 480], [880, 520], [700, 500]], speed: 60, loop: 'loop', s: 1.1, seed: 77, offset: 0.1 });
    d.actors.push({ obj: 'bird.nightjar', layer: 'far', path: [[1100, 430], [960, 400], [1060, 470], [1200, 450]], speed: 50, loop: 'loop', s: 0.7, seed: 78, offset: 0.5 });
  }
  if (!winter) {
    d.actors.push({ obj: 'animal.wp-bat', layer: 'near', path: [[500, 380], [700, 330], [860, 420], [660, 460], [520, 420]], speed: 70, loop: 'loop', s: 0.8, variant: 0, seed: 79 });
    d.actors.push({ obj: 'animal.wp-bat', layer: 'near', path: [[1100, 300], [1240, 380], [1060, 420], [960, 340]], speed: 64, loop: 'loop', s: 0.7, variant: 1, seed: 80, offset: 0.4 });
  }
  if (winter) d.place.push({ obj: 'bird.robin', x: 1000, y: 770, s: 1.3, layer: 'near', variant: 0, seed: 95 });
  if (autumn) d.flocks.push({ obj: 'bird.goose-flight', n: 7, area: [500, 140, 1200, 260], speed: 30, s: 0.5, seed: 97, layer: 'horizon' });
  // the late walker by the motion behaviours (sceneYgMovers, 70-scene-lib-yateley-green-views.js): on the path, at its real
  // size for the view's fitted eye (3.1 m)
  if (typeof sceneYgMovers === 'function') d.actors = sceneYgMovers(d, 3.1, [
    { obj: 'person.walker', preset: 'elderly', px: Y.path(TRACK, 560, 640, 10), layer: 'far', variant: 2, seed: 72, offset: 0.65 },
  ]).concat(d.actors);
  return d;
}
