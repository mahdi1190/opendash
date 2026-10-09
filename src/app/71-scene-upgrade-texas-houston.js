/* Houston: the old opening's tall rocket and dawn energy become a detailed
   space-museum court, with a scanning tracking dish and campus life. */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  const scene = () => ({
    v: 1, id: 'houston-space-park', view: { lat: 29.5519, lon: -95.098, heading: 100, fov: 78, horizon: 570, lift: 1 },
    at: 'dawn', setting: 'urban', signage: false, season: 'auto', weather: 'live', particles: 'season', particleSeasons: { winter: 'motes' },
    palette: {
      base: { turf: ['#6d8759', '#455f42'], far: ['#9eafa0', '#849b89'], paving: ['#c4c9bb', '#8b9f99'], road: '#687d7c' },
      spring: { turf: ['#84a268', '#53794b'], far: ['#a0b49a', '#819f83'], paving: ['#c9cebe', '#94a69c'] },
      summer: { turf: ['#6e9153', '#3e673c'], far: ['#96aa86', '#789474'], paving: ['#c9cdba', '#8da394'] },
      autumn: { turf: ['#a29a61', '#716c46'], far: ['#b3ac8d', '#9e9b7d'], paving: ['#c8c5b3', '#999d90'] },
      winter: { turf: ['#929d8b', '#697b6c'], far: ['#a7b7b2', '#8b9f9d'], paving: ['#c5d1c9', '#91a7a3'] },
    },
    sky: { stars: 155, clouds: { n: 4, y: [80, 315], speed: 4.5 }, sunR: 25, moonR: 23 },
    layers: SCENE_LAYERS_DEFAULT.map(l => Object.assign({}, l, l.id === 'far' ? { haze: .3 } : l.id === 'mid' ? { haze: .055 } : {})),
    ground: [
      { layer: 'horizon', d: 'M-160 600V575q280-16 520-3t480-5 920 4V660H-160Z', fill: '@far.0' },
      { layer: 'far', d: 'M-160 602Q380 593 800 602T1760 595V900H-160Z', fill: { lin: [[0, '@far.1'], [.3, '@turf.0'], [1, '@turf.1']], x1: 0, y1: 600, x2: 0, y2: 900 } },
      { layer: 'far', d: 'M-160 620H1760v20H-160Z', fill: '@road' },
      { layer: 'mid', d: 'M514 646H1085L1530 900H70Z', fill: { lin: [[0, '@paving.0'], [1, '@paving.1']], x1: 800, y1: 640, x2: 800, y2: 900 } },
      { layer: 'mid', d: 'M501 646h14L75 900H46ZM1085 646h14L1561 900h-32Z', fill: '#d9d6bf' },
      { layer: 'fore', d: 'M-160 900v-53q156-28 303 7t196 46zM1245 900q93-43 186-38t329-23v61z', fill: '@turf.1' },
    ],
    place: [
      { obj: 'building.skyline-band', x: 285, y: 586, s: .4, layer: 'horizon', seed: 8157, variant: 3, anim: false, shadow: false },
      { obj: 'building.skyline-band', x: 1320, y: 580, s: .32, layer: 'horizon', seed: 8263, variant: 1, anim: false, shadow: false },
      { obj: 'landmark.houston-space-park', x: 800, y: 646, s: 1, layer: 'mid', seed: 8399 },
      { obj: 'street.houston-tracking-dish', x: 1118, y: 652, s: 1, layer: 'mid', seed: 8537 },
      { obj: 'ground.space-plaza-joints', x: 800, y: 900, s: 1, layer: 'near', seed: 8627, anim: false },
      { obj: 'street.bench', x: 421, y: 760, s: .67, layer: 'fore', seed: 8783, variant: 2, flip: true },
      { obj: 'street.bench', x: 1244, y: 776, s: .73, layer: 'fore', seed: 8849, variant: 0 },
      { obj: 'street.lamp', x: 464, y: 692, s: .47, layer: 'fore', seed: 8999, variant: 1 },
      { obj: 'street.lamp', x: 1213, y: 706, s: .52, layer: 'fore', seed: 9043, variant: 1, flip: true },
      { obj: 'street.lamp', x: 295, y: 827, s: .79, layer: 'fore', seed: 9161, variant: 1 },
      { obj: 'street.lamp', x: 1368, y: 843, s: .83, layer: 'fore', seed: 9257, variant: 1, flip: true },
      { obj: 'tree.texas-live-oak', x: -27, y: 859, s: 1.2, layer: 'fore', seed: 9277, variant: 0, anim: false },
      { obj: 'tree.texas-live-oak', x: 1640, y: 869, s: 1.35, layer: 'fore', seed: 9281, variant: 2, flip: true, anim: false },
      { obj: 'plant.shrub', x: -30, y: 910, s: 1.2, layer: 'front', seed: 9301, variant: 0 },
      { obj: 'plant.shrub', x: 1640, y: 907, s: 1.4, layer: 'front', seed: 9323, variant: 2, flip: true },
    ],
    scatter: [
      { obj: { 'tree.distant': 3, 'tree.texas-live-oak': 2 }, layer: 'far', seed: 9389, area: { rect: [-100, 611, 1700, 619] }, n: 20, minGap: 62, s: [.15, .23], flip: .5, variant: [0, 2], anim: false, shadow: false, tint: { col: '#9cb2a4', k: [0, .16] } },
      { obj: { 'ground.space-plaza-fleck': 3, 'ground.space-plaza-fine': 1 }, layer: 'near', seed: 9497, area: { rect: [0, 699, 1600, 900] }, n: 260, minGap: 10, s: [.45, 1.2], sByY: [[699, .55], [900, 1.2]], variant: [0, 3], flip: .5, anim: false, tint: { col: '#a4b6a7', k: [0, .1] } },
      { obj: { 'plant.grass': 3, 'plant.wildflowers': 2 }, layer: 'fore', seed: 9631, area: { poly: [[0, 740], [180, 730], [390, 900], [0, 900]] }, n: 45, minGap: 13, s: [.45, .86], flip: .5, variant: [0, 3], anim: 'strip', tint: { col: '#a9aa6b', k: [0, .12] } },
      { obj: { 'plant.grass': 3, 'plant.wildflowers': 2 }, layer: 'fore', seed: 9769, area: { poly: [[1440, 749], [1600, 740], [1600, 900], [1250, 900]] }, n: 43, minGap: 14, s: [.42, .9], flip: .5, variant: [0, 3], anim: 'strip', tint: { col: '#80995d', k: [.05, .17] } },
    ],
    actors: [
      { obj: 'vehicle.car', layer: 'far', path: [[-160, 636], [1760, 636]], speed: 43, s: .32, loop: 'loop', offset: .24, seed: 9829, variant: 2 },
      { obj: 'vehicle.car', layer: 'far', path: [[1760, 630], [-160, 630]], speed: 36, s: .29, loop: 'loop', offset: .57, seed: 9967, variant: 4 },
      { obj: 'person.cyclist', layer: 'fore', path: [[-120, 664], [1720, 664]], speed: 29, s: .38, loop: 'loop', offset: .69, seed: 10159, variant: 1 },
      { obj: 'person.walker', layer: 'fore', path: [[445, 731], [1160, 741]], speed: 6, s: .34, loop: 'pingpong', offset: .25, seed: 10267, variant: 3 },
      { obj: 'person.walker', layer: 'fore', path: [[1150, 713], [526, 723]], speed: 5, s: .3, loop: 'pingpong', offset: .48, seed: 10391, variant: 6 },
    ],
    flocks: [
      { obj: 'bird.small-flight', n: 7, layer: 'far', area: [50, 205, 1550, 385], s: .34, speed: 21, seed: 10531 },
      { obj: 'bird.small-flight', n: 5, layer: 'mid', area: [120, 330, 1480, 467], s: .43, speed: 27, seed: 10663 },
    ],
    water: [], signs: [], camera: { pan: 5, period: 102 },
  });
  animRegionSceneUpgrade('texas', 'place:houston', { state: 'live', landmarks: ['landmark.houston-space-park'], scene });
})();
