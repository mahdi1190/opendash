/* Gulf Coast: a fishing pier and sea-oat dunes at sunrise, with real reflections and low pelicans. */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  const scene = () => ({
    v: 1, id: 'texas-gulf-coast-sunrise',
    view: { lat: 29.271, lon: -94.825, heading: 100, fov: 78, horizon: 575, lift: 1 },
    at: 'dawn', setting: 'natural', signage: false, season: 'auto', weather: 'live', particles: 'season', particleSeasons: { autumn: 'motes', winter: 'motes' },
    palette: {
      base: { coast: ['#a2b4b5', '#9baca3'], sand: ['#e5d1a8', '#b3a07b'], wet: '#b4b6a3', dune: '#cbbb94' },
      spring: { coast: ['#9fb4b0', '#90aaa0'], sand: ['#ead4ab', '#bead82'], wet: '#bbc1aa', dune: '#cabe93' },
      summer: { coast: ['#8daea8', '#8da593'], sand: ['#e9d3a3', '#bca778'], wet: '#b1b79d', dune: '#c6b88a' },
      autumn: { coast: ['#a8a595', '#a5a084'], sand: ['#d7bb8c', '#ab9167'], wet: '#adad91', dune: '#baa579' },
      winter: { coast: ['#a4b7b8', '#9bb2a9'], sand: ['#ced5c5', '#a2b1a3'], wet: '#a6b9ae', dune: '#b9c4af' },
    },
    sky: { stars: 170, clouds: { n: 4, y: [100, 300], speed: 5 }, sunR: 28, moonR: 25 },
    layers: SCENE_LAYERS_DEFAULT.map(l => Object.assign({}, l, l.id === 'near' ? { haze: .02 } : {})),
    ground: [
      { layer: 'horizon', d: 'M-160 580Q63 560 250 568T670 574T1120 568T1760 575V610H-160Z', fill: '@coast.0' },
      { layer: 'far', d: 'M-160 586Q76 572 198 582L229 591H-160ZM1465 588q130-17 295-9v19H1450Z', fill: '@coast.1' },
      { layer: 'fore', d: 'M-160 900V835Q93 797 350 827Q600 856 811 836Q1153 798 1760 816V900Z', fill: { lin: [[0, '@sand.0'], [1, '@sand.1']], x1: 0, y1: 816, x2: 0, y2: 900 } },
      { layer: 'fore', d: 'M-160 838Q100 799 350 830Q591 857 815 839Q1210 798 1760 821L1760 831Q1210 809 815 849Q591 867 350 840Q100 810-160 849Z', fill: '@wet', op: .6 },
      { layer: 'front', d: 'M-160 900V852Q29 812 161 835Q275 858 323 900ZM1271 900Q1367 804 1503 822Q1631 800 1760 838V900Z', fill: '@dune' },
      { layer: 'front', d: 'M-160 900V888Q74 851 146 900ZM1438 900Q1537 864 1760 880V900Z', fill: '#4b6455', op: .4 },
    ],
    water: [{ layer: 'near', d: 'M-160 578Q700 577 1760 578V835Q1210 806 815 842Q591 862 350 835Q100 807-160 844Z', y0: 580, y1: 858, base: ['#9cbdbb', '#56939f', '#276271'], reflect: true, shimmer: 68, lightPath: true }],
    place: [
      { obj: 'landmark.texas-gulf-pier', x: 800, y: 580, s: 1, layer: 'near', seed: 31231 },
      { obj: 'water.texas-shore-surf', x: 800, y: 838, s: 1, layer: 'fore', seed: 31517 },
      { obj: 'plant.texas-sea-oats', x: 99, y: 899, s: 1.35, layer: 'front', seed: 31981, variant: 3 },
      { obj: 'plant.texas-sea-oats', x: 1511, y: 900, s: 1.5, layer: 'front', seed: 32843, variant: 1, flip: true },
      { obj: 'bird.herring-gull', x: 648, y: 671, s: .4, layer: 'near', seed: 33703, variant: 0 },
      { obj: 'bird.herring-gull', x: 1250, y: 849, s: .42, layer: 'fore', seed: 34337, variant: 2, flip: true },
    ],
    scatter: [
      { obj: { 'ground.texas-shell-sand': 3, 'ground.texas-sand-ripple': 2 }, layer: 'fore', seed: 35141, area: { rect: [0, 849, 1600, 899] }, n: 340, minGap: 7, s: [.3, .95], sByY: [[849, .7], [900, 1.05]], flip: .5, variant: 'random', anim: false, tint: { col: '#d2c4a8', k: [0, .15] }, mask: { avoid: [{ poly: [[465, 846], [1130, 846], [1180, 900], [380, 900]] }] } },
      { obj: { 'plant.texas-sea-oats': 3, 'plant.grass': 2 }, layer: 'fore', seed: 35983, area: { poly: [[-100, 827], [202, 849], [374, 900], [-100, 900]] }, n: 70, minGap: 13, s: [.35, .88], flip: .5, variant: 'random', anim: false, tint: { col: '#577459', k: [0, .18] } },
      { obj: { 'plant.texas-sea-oats': 3, 'plant.grass': 2 }, layer: 'fore', seed: 36739, area: { poly: [[1317, 855], [1710, 814], [1710, 900], [1217, 900]] }, n: 90, minGap: 13, s: [.4, 1.04], flip: .5, variant: 'random', anim: false, tint: { col: '#587c6a', k: [0, .15] } },
      { obj: 'plant.texas-sea-oats', layer: 'front', seed: 37663, area: { rect: [-40, 872, 300, 900] }, n: 12, minGap: 19, s: [.9, 1.3], flip: .5, variant: [0, 4], anim: 'strip' },
      { obj: 'plant.texas-sea-oats', layer: 'front', seed: 38327, area: { rect: [1330, 876, 1660, 900] }, n: 13, minGap: 19, s: [.8, 1.4], flip: .5, variant: [0, 4], anim: 'strip' },
    ],
    actors: [
      { obj: 'boat.fishing-boat', layer: 'near', path: [[-200, 613], [1800, 613]], speed: 8, s: .48, seed: 39209, offset: .69, loop: 'loop', variant: 1 },
      { obj: 'boat.fishing-boat', layer: 'near', path: [[1820, 588], [-210, 588]], speed: 5.5, s: .25, seed: 40031, offset: .61, loop: 'loop', variant: 0 },
      { obj: 'bird.texas-brown-pelican', layer: 'near', path: [[-160, 616], [1760, 596]], speed: 38, s: .44, seed: 40459, offset: .34, loop: 'loop', variant: 1 },
    ],
    flocks: [
      { obj: 'bird.texas-brown-pelican', layer: 'mid', n: 3, area: [60, 315, 1530, 470], s: .51, speed: 24, seed: 40961 },
      { obj: 'bird.herring-gull-flight', layer: 'far', n: 7, area: [70, 180, 1500, 350], s: .35, speed: 29, seed: 41611 },
      { obj: 'bird.herring-gull-flight', layer: 'near', n: 4, area: [100, 500, 1510, 630], s: .38, speed: 36, seed: 42323 },
    ],
    signs: [], camera: { pan: 5, period: 120 },
  });
  animRegionSceneUpgrade('texas', 'place:gulf-coast-sunrise', { state: 'live', landmarks: ['landmark.texas-gulf-pier'], scene });
})();
