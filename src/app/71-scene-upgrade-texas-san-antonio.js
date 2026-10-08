/* San Antonio: a quiet limestone courtyard and the Alamo's scalloped facade. */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  const scene = () => ({
    v: 1, id: 'san-antonio-alamo-courtyard', view: { lat: 29.4257, lon: -98.486, heading: 88, fov: 78, horizon: 579, lift: 1 },
    at: 'morning', setting: 'urban', signage: false, season: 'auto', weather: 'live', particles: 'season', particleSeasons: { winter: 'motes' },
    palette: {
      base: { garden: ['#7a8857', '#435e3e'], far: ['#a0ac8c', '#8a9b79'], paving: ['#dfc9a8', '#b09b7f'] },
      spring: { garden: ['#8fa766', '#567c46'], far: ['#a9b996', '#90a77e'], paving: ['#e6cfaa', '#b9a17b'] },
      summer: { garden: ['#7b9654', '#416c3d'], far: ['#9aae89', '#7d9973'], paving: ['#e4c99f', '#b09874'] },
      autumn: { garden: ['#a69a5b', '#776d40'], far: ['#b8ae89', '#a69b70'], paving: ['#dcc195', '#ab9070'] },
      winter: { garden: ['#9b9f83', '#6e7d65'], far: ['#b4bba8', '#9da991'], paving: ['#d9d0bb', '#a99f8c'] },
    },
    sky: { stars: 145, clouds: { n: 4, y: [90, 300], speed: 3.5 }, sunR: 25, moonR: 24 },
    layers: SCENE_LAYERS_DEFAULT.map(l => Object.assign({}, l, l.id === 'mid' ? { haze: .035 } : l.id === 'far' ? { haze: .26 } : {})),
    ground: [
      { layer: 'horizon', d: 'M-160 615V576q320-20 560 0t480-8 880 4V650H-160Z', fill: '@far.0' },
      { layer: 'far', d: 'M-160 900V614q430-14 900-2t1020-7V900Z', fill: '@far.1' },
      { layer: 'mid', d: 'M-160 659H1760V900H-160Z', fill: { lin: [[0, '@paving.0'], [1, '@paving.1']], x1: 0, y1: 659, x2: 0, y2: 900 } },
      { layer: 'mid', d: 'M-160 660H247L460 900H-160ZM1360 660H1760V900H1180Z', fill: '@garden.0' },
      { layer: 'near', d: 'M247 660h9l222 240h-18zM1351 660h10l-168 240h-18z', fill: '#e8d8b4' },
      { layer: 'fore', d: 'M-160 900v-52q170-35 290 4t183 48zM1300 900q115-54 222-29t238-27v56z', fill: '@garden.1' },
    ],
    place: [
      { obj: 'landmark.alamo-courtyard', x: 800, y: 659, s: 1.08, layer: 'mid', seed: 11113 },
      { obj: 'ground.alamo-courtyard-joints', x: 800, y: 900, s: 1, layer: 'near', seed: 11239, anim: false },
      { obj: 'street.bench', x: 423, y: 748, s: .73, layer: 'fore', seed: 11351, variant: 2 },
      { obj: 'street.bench', x: 1202, y: 768, s: .8, layer: 'fore', seed: 11467, variant: 0, flip: true },
      { obj: 'street.lamp', x: 384, y: 696, s: .54, layer: 'fore', seed: 11587 },
      { obj: 'street.lamp', x: 1248, y: 709, s: .59, layer: 'fore', seed: 11699, flip: true },
      { obj: 'street.lamp', x: 329, y: 800, s: .88, layer: 'fore', seed: 11813 },
      { obj: 'street.lamp', x: 1325, y: 823, s: .93, layer: 'fore', seed: 11933, flip: true },
      { obj: 'tree.texas-live-oak', x: -32, y: 855, s: 1.35, layer: 'fore', seed: 11941, variant: 1, anim: false },
      { obj: 'tree.texas-live-oak', x: 1640, y: 877, s: 1.45, layer: 'fore', seed: 11953, variant: 0, flip: true, anim: false },
      { obj: 'plant.shrub', x: -25, y: 915, s: 1.2, layer: 'front', seed: 11969, variant: 2 },
      { obj: 'plant.shrub', x: 1632, y: 914, s: 1.32, layer: 'front', seed: 12007, variant: 1, flip: true },
    ],
    scatter: [
      { obj: { 'tree.distant': 3, 'tree.texas-live-oak': 2 }, layer: 'far', seed: 12043, area: { rect: [-100, 619, 1700, 632] }, n: 20, minGap: 68, s: [.18, .3], flip: .5, variant: [0, 2], anim: false, shadow: false, tint: { col: '#c4c29f', k: [0, .17] } },
      { obj: { 'ground.alamo-limestone-wear': 3, 'ground.alamo-limestone-grain': 1 }, layer: 'near', seed: 12161, area: { rect: [0, 700, 1600, 900] }, n: 260, minGap: 10, s: [.4, 1.15], sByY: [[700, .65], [900, 1.2]], flip: .5, variant: [0, 3], anim: false, tint: { col: '#c9af83', k: [0, .1] } },
      { obj: { 'plant.grass': 3, 'plant.wildflowers': 2 }, layer: 'fore', seed: 12277, area: { poly: [[0, 730], [260, 730], [430, 900], [0, 900]] }, n: 46, minGap: 14, s: [.45, .82], flip: .5, variant: [0, 3], anim: 'strip', tint: { col: '#b7b176', k: [0, .12] } },
      { obj: { 'plant.grass': 3, 'plant.wildflowers': 2 }, layer: 'fore', seed: 12391, area: { poly: [[1380, 727], [1600, 727], [1600, 900], [1200, 900]] }, n: 42, minGap: 14, s: [.42, .88], flip: .5, variant: [0, 3], anim: 'strip', tint: { col: '#8f9e64', k: [.04, .15] } },
    ],
    actors: [
      { obj: 'person.walker', layer: 'fore', path: [[465, 710], [1140, 710]], speed: 4.8, s: .29, loop: 'pingpong', offset: .38, seed: 12503, variant: 2 },
      { obj: 'person.walker', layer: 'fore', path: [[1120, 752], [490, 746]], speed: 5.5, s: .34, loop: 'pingpong', offset: .58, seed: 12619, variant: 5 },
      { obj: 'person.walker', layer: 'fore', path: [[550, 775], [1080, 785]], speed: 4.5, s: .37, loop: 'pingpong', offset: .2, seed: 12739, variant: 7 },
      { obj: 'bird.pigeon-feral', layer: 'fore', path: [[690, 822], [860, 817]], speed: 3.2, s: .52, loop: 'pingpong', offset: .26, seed: 12853, variant: 1 },
      { obj: 'bird.pigeon-feral', layer: 'fore', path: [[900, 808], [737, 802]], speed: 2.5, s: .45, loop: 'pingpong', offset: .7, seed: 12967, variant: 3 },
      { obj: 'bird.pigeon-feral', layer: 'fore', path: [[1030, 854], [930, 863]], speed: 2.7, s: .6, loop: 'pingpong', offset: .17, seed: 13081, variant: 4 },
      { obj: 'animal.squirrel', layer: 'fore', path: [[138, 862], [290, 876]], speed: 7, s: .45, loop: 'pingpong', offset: .45, seed: 13199 },
    ],
    flocks: [
      { obj: 'bird.small-flight', n: 6, layer: 'far', area: [90, 205, 1510, 350], s: .3, speed: 19, seed: 13313 },
      { obj: 'bird.small-flight', n: 4, layer: 'mid', area: [200, 330, 1400, 450], s: .43, speed: 25, seed: 13433 },
    ],
    water: [], signs: [], camera: { pan: 4, period: 110 },
  });
  animRegionSceneUpgrade('texas', 'place:san-antonio', { state: 'live', landmarks: ['landmark.alamo-courtyard'], scene });
})();
