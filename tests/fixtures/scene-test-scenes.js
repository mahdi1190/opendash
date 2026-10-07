/* ============================================================
   TEST SCENES for the renderers (builder B, test-only), in the section 3 data form, drawn from the
   placeholder objects in scene-test-objects.js:
     SCENE_TEST_TINY            a small scene with every feature: six layers, ground, water with
                                reflections, shimmer and the light path, a lit house, swaying trees,
                                a wind strip of grass, walkers, paddling ducks, a gull flock, a car,
                                lamps and a sign (signage: true)
     sceneTestDense(o)          the perf scene: about 3,000 static placements and 40 actors (+ a flock),
                                o: { placements (3000), actors (40), seed }
   Public, made-up content only (no real place names apart from the sign's made-up "Test Lane").
   ============================================================ */
const SCENE_TEST_GROUND = [
  { layer: 'horizon', d: 'M-160 520Q300 488 800 508T1760 500V900H-160Z', fill: '#8aa0a8' },
  { layer: 'far', d: 'M-160 548Q400 520 900 540T1760 536V900H-160Z', fill: { lin: [[0, '@ground.0'], [1, '@ground.1']], x1: 0, y1: 520, x2: 0, y2: 700 } },
  { layer: 'mid', d: 'M-160 600Q500 584 1000 596T1760 590V900H-160Z', fill: '@ground.1' },
  { layer: 'near', d: 'M-160 700Q400 680 900 694T1760 690V900H-160Z', fill: '@ground.2' },
  { layer: 'fore', d: 'M-160 800Q500 786 1000 796T1760 792V900H-160Z', fill: '@ground.3' },
];
const SCENE_TEST_PALETTE = { base: { ground: ['#6f8a4a', '#5f7a3a', '#55702f', '#4a6428'] }, autumn: { ground: ['#8a7a42', '#7a6a32', '#6a5a2a', '#5a4a22'] }, winter: { ground: ['#9aa094', '#8a9284', '#7a8474', '#6a7464'] } };
const SCENE_TEST_TINY = {
  v: 1, id: 'renderer-test-tiny', view: { lat: 51.5, lon: -0.12, heading: 200, fov: 78, horizon: 520 }, at: 'afternoon', season: 'auto', tropic: 'summer',
  setting: 'mixed', signage: true, palette: SCENE_TEST_PALETTE, sky: { stars: 160, clouds: { n: 4, y: [60, 300], speed: 6 }, sunR: 26, moonR: 20 },
  ground: SCENE_TEST_GROUND,
  water: [{ layer: 'mid', d: 'M200 640Q600 628 1000 636T1500 640V700H200Z', y0: 630, y1: 700, base: ['#7fb0c0', '#3f7e96', '#1d4c64'], reflect: true, shimmer: 24, lightPath: true }],
  place: [
    { obj: 'tree.oak-test', x: 160, y: 620, s: 1, layer: 'mid', seed: 1, variant: 0 },
    { obj: 'tree.oak-test', x: 1460, y: 610, s: 0.9, layer: 'mid', seed: 2, variant: 1, flip: true },
    { obj: 'tree.oak-test', x: 1280, y: 760, s: 1.3, layer: 'near', seed: 3, variant: 2 },
    { obj: 'building.house-test', x: 760, y: 626, s: 0.9, layer: 'mid', seed: 4 },
    { obj: 'street.lamp-test', x: 560, y: 760, s: 1, layer: 'near', seed: 5 },
    { obj: 'street.lamp-test', x: 1040, y: 770, s: 1, layer: 'near', seed: 6 },
    { obj: 'bird.duck-test', x: 640, y: 668, s: 1, layer: 'mid', seed: 7 },
    { obj: 'bird.duck-test', x: 980, y: 680, s: 1.1, layer: 'mid', seed: 8, flip: true },
    { obj: 'rock.stone-test', x: 420, y: 840, s: 1.4, layer: 'fore', seed: 9 },
  ],
  scatter: [
    { obj: { 'tree.oak-test': 1 }, layer: 'far', seed: 3, area: { rect: [-160, 540, 1760, 560] }, n: 40, minGap: 20, s: [0.25, 0.4], anim: false },
    { obj: { 'plant.grass-test': 3, 'plant.bush-test': 1 }, layer: 'near', seed: 7, area: { rect: [-160, 700, 1760, 790] }, n: 160, minGap: 10, s: [0.7, 1.1], sByY: [[700, 0.8], [790, 1.1]], anim: 'strip' },
    { obj: 'plant.grass-test', layer: 'fore', seed: 11, area: { rect: [-160, 800, 1760, 900] }, n: 90, minGap: 14, s: [1, 1.5], anim: 'strip', tint: { col: '#8a7a40', k: [0, 0.16] } },
  ],
  actors: [
    { obj: 'person.walker-test', layer: 'near', path: [[-60, 772], [700, 760], [1660, 780]], speed: 22, loop: 'pingpong', s: 1, seed: 5, offset: 0.3 },
    { obj: 'person.walker-test', layer: 'near', path: [[1660, 776], [-60, 768]], speed: 18, loop: 'loop', s: 1.05, seed: 6, offset: 0.6, variant: 1 },
    { obj: 'vehicle.car-test', layer: 'fore', path: [[-120, 870], [1720, 870]], speed: 90, loop: 'loop', s: 1.2, seed: 7, offset: 0.1 },
  ],
  flocks: [{ obj: 'bird.gull-test', n: 5, area: [200, 120, 1400, 280], speed: 34, s: 0.8, seed: 9, layer: 'far' }],
  signs: [{ layer: 'near', x: 300, y: 742, w: 200, h: 34, text: 'Test Lane', bars: ['#b36305', '#0098d4'], style: 'board' }],
  particles: 'season', weather: 'live',
};
/** The perf scene: ~3,000 static placements in six layers and 40 actors (walkers, cars, ducks) plus a 12-gull flock. */
function sceneTestDense(o) {
  o = o || {};
  const n = o.placements || 3000, k = n / 3000, na = o.actors == null ? 40 : o.actors, seed = o.seed || 1;
  const actors = [];
  for (let i = 0; i < na; i++) {
    const kind = i % 5, y = 740 + (i * 37) % 140;
    if (kind <= 2) actors.push({ obj: 'person.walker-test', layer: y > 800 ? 'fore' : 'near', path: [[-60, y], [800, y - 8], [1660, y + 4]], speed: 14 + (i * 7) % 16, loop: i % 2 ? 'loop' : 'pingpong', s: 0.8 + (i % 4) * 0.1, seed: 100 + i, offset: (i * 0.137) % 1, variant: i % 2 });
    else if (kind === 3) actors.push({ obj: 'vehicle.car-test', layer: 'fore', path: i % 2 ? [[-120, 872], [1720, 872]] : [[1720, 884], [-120, 884]], speed: 60 + (i * 13) % 50, loop: 'loop', s: 1.1, seed: 200 + i, offset: (i * 0.29) % 1, variant: i % 3 });
    else actors.push({ obj: 'bird.duck-test', layer: 'mid', path: [[260 + (i * 53) % 400, 650 + (i % 3) * 14], [1400 - (i * 31) % 300, 660 + (i % 4) * 10]], speed: 6 + i % 5, loop: 'pingpong', s: 0.9, seed: 300 + i, offset: (i * 0.41) % 1 });
  }
  return {
    v: 1, id: 'renderer-test-dense-' + n + '-' + na, view: { lat: 51.34, lon: -0.83, heading: 205, fov: 78, horizon: 520 }, at: 'afternoon', season: 'auto', tropic: 'summer',
    setting: 'mixed', signage: false, palette: SCENE_TEST_PALETTE, sky: { stars: 180, clouds: { n: 6, y: [60, 320], speed: 6 }, sunR: 26, moonR: 20 },
    ground: SCENE_TEST_GROUND,
    water: [{ layer: 'mid', d: 'M160 640Q600 628 1000 636T1560 640V712H160Z', y0: 630, y1: 712, base: ['#7fb0c0', '#3f7e96', '#1d4c64'], reflect: true, shimmer: 30, lightPath: true }],
    place: Array.from({ length: 12 }, (_, i) => ({ obj: 'building.house-test', x: -100 + i * 160, y: 560 + (i % 3) * 6, s: 0.45 + (i % 4) * 0.05, layer: 'far', seed: 40 + i, variant: i % 2 }))
      .concat(Array.from({ length: 10 }, (_, i) => ({ obj: 'street.lamp-test', x: 40 + i * 170, y: 772 + (i % 2) * 8, s: 1, layer: 'near', seed: 60 + i }))),
    scatter: [
      { obj: 'tree.oak-test', layer: 'horizon', seed: seed + 1, area: { rect: [-160, 512, 1760, 526] }, n: Math.round(220 * k), minGap: 6, s: [0.12, 0.2], anim: false },
      { obj: 'tree.oak-test', layer: 'far', seed: seed + 2, area: { rect: [-160, 540, 1760, 580] }, n: Math.round(300 * k), minGap: 8, s: [0.25, 0.45], anim: false },
      { obj: 'tree.oak-test', layer: 'mid', seed: seed + 3, area: { poly: [[-160, 600], [1760, 596], [1760, 630], [-160, 632]] }, n: Math.round(220 * k), minGap: 12, s: [0.5, 0.75], anim: false, mask: { avoid: [{ rect: [160, 626, 1560, 720] }] } },
      { obj: 'tree.oak-test', layer: 'mid', seed: seed + 4, area: { rect: [-160, 610, 1760, 640] }, n: 40, minGap: 30, s: [0.7, 0.9], anim: { sway: { k: [0.8, 1.2] } }, mask: { avoid: [{ rect: [160, 626, 1560, 720] }] } },
      { obj: { 'plant.bush-test': 2, 'rock.stone-test': 1 }, layer: 'near', seed: seed + 5, area: { rect: [-160, 700, 1760, 790] }, n: Math.round(600 * k), minGap: 6, s: [0.6, 1.1], sByY: [[700, 0.8], [790, 1.15]], anim: false, tint: { col: '#8a7a40', k: [0, 0.16] } },
      { obj: { 'plant.grass-test': 1 }, layer: 'near', seed: seed + 6, area: { rect: [-160, 700, 1760, 790] }, n: Math.round(900 * k), minGap: 4, s: [0.7, 1.1], sByY: [[700, 0.8], [790, 1.1]], anim: 'strip' },
      { obj: { 'plant.grass-test': 3, 'plant.bush-test': 1 }, layer: 'fore', seed: seed + 7, area: { rect: [-160, 800, 1760, 900] }, n: Math.round(600 * k), minGap: 6, s: [1, 1.6], anim: 'strip', tint: { col: '#8a7a40', k: [0, 0.16] } },
      { obj: { 'plant.grass-test': 1 }, layer: 'front', seed: seed + 8, area: { rect: [-160, 880, 1760, 905] }, n: Math.round(118 * k), minGap: 10, s: [1.8, 2.4], anim: false },
    ],
    actors,
    flocks: [{ obj: 'bird.gull-test', n: 12, area: [100, 100, 1500, 300], speed: 30, s: 0.7, seed: 9, layer: 'far' }],
    particles: 'season', weather: 'live',
  };
}
