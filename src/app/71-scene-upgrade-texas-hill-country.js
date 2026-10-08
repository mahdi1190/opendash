/* Hill Country: limestone ridges, a spreading live oak and a spring bluebonnet meadow.
   The legacy opening remains attached; the composed upgrade preserves its saved identity. */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  const scene = () => ({
    v: 1, id: 'texas-hill-country-bluebonnets',
    view: { lat: 30.267, lon: -98.405, heading: 95, fov: 78, horizon: 552, lift: 1 },
    at: 'morning', setting: 'natural', signage: false, season: 'auto', weather: 'live', particles: 'season', particleSeasons: { winter: 'motes' },
    palette: {
      base: { ridge: ['#8aabb5', '#739994'], ground: ['#89a269', '#54764a', '#395b3e'], limestone: '#ccc8a8' },
      spring: { ridge: ['#8faeba', '#7a9b91'], ground: ['#9aaf6b', '#64864d', '#3d6341'], limestone: '#d6d2b4' },
      summer: { ridge: ['#8ba5ad', '#829482'], ground: ['#b0b16d', '#83904f', '#596b3e'], limestone: '#d7c79f' },
      autumn: { ridge: ['#b1a491', '#9d946e'], ground: ['#c0aa63', '#9b8749', '#706239'], limestone: '#dbc79d' },
      winter: { ridge: ['#9eafb4', '#8a9d94'], ground: ['#a9b29a', '#7e927b', '#5e7564'], limestone: '#c8d0bc' },
    },
    sky: { stars: 150, clouds: { n: 4, y: [100, 290], speed: 5 }, sunR: 26, moonR: 25 },
    layers: SCENE_LAYERS_DEFAULT.map(l => Object.assign({}, l, l.id === 'mid' ? { haze: .13 } : {})),
    ground: [
      { layer: 'horizon', d: 'M-160 588V557Q70 478 313 524Q515 447 726 526Q962 477 1140 532Q1400 452 1760 533V680H-160Z', fill: '@ridge.0' },
      { layer: 'far', d: 'M-160 640V592Q150 530 384 578Q610 535 813 589Q1005 527 1300 565Q1570 518 1760 575V720H-160Z', fill: '@ridge.1' },
      { layer: 'mid', d: 'M-160 900V637Q97 559 354 610Q695 664 920 609Q1298 545 1760 635V900Z', fill: { lin: [[0, '@ground.0'], [1, '@ground.1']], x1: 0, y1: 600, x2: 0, y2: 900 } },
      { layer: 'near', d: 'M-160 900V742Q120 653 424 705Q800 757 1089 685Q1400 653 1760 716V900Z', fill: { lin: [[0, '@ground.1'], [1, '@ground.2']], x1: 0, y1: 700, x2: 0, y2: 900 } },
      { layer: 'fore', d: 'M-160 900V845Q-30 799 82 812L187 900ZM1434 900Q1519 813 1760 827V900Z', fill: '#233b30' },
      { layer: 'mid', d: 'M-160 661Q20 620 170 626l-12 7q-160 0-318 38zM1080 657q130-49 271-32l-4 8q-143-5-249 33z', fill: '@limestone', op: .5 },
      { layer: 'fore', d: 'M176 782l101-9 91-18 81-8 91 2 84 12v5l-86-11-90-1-82 8-87 19-102 9zM176 757l99-10 93-18 82-8 89 2 85 12v5l-86-11-88-2-82 9-91 17-100 9zM189 792l-3-51 7-1 3 51zM277 784l-3-50 7-1 3 51zM368 765l-3-50 7-1 3 50zM450 759l-2-51h7l2 51zM538 763v-51h7v52zM620 774v-51l7 1v51z', fill: '#5e5941' },
    ],
    place: [
      { obj: 'tree.texas-live-oak', x: 837, y: 672, s: .91, layer: 'mid', seed: 11731, variant: 1 },
      { obj: 'tree.texas-live-oak', x: 66, y: 847, s: 1.12, layer: 'fore', seed: 12769, variant: 0, tint: { col: '#183d31', k: .2 } },
      { obj: 'tree.texas-live-oak', x: 1544, y: 900, s: 1.32, layer: 'front', seed: 13451, variant: 2, flip: true, tint: { col: '#16382d', k: .34 } },
      { obj: 'animal.rabbit', x: 1113, y: 746, s: .35, layer: 'near', seed: 14029, variant: 0 },
      { obj: 'animal.rabbit', x: 326, y: 799, s: .44, layer: 'fore', seed: 14669, variant: 1, flip: true },
    ],
    scatter: [
      { obj: { 'tree.texas-live-oak': 1, 'tree.distant-pine': 1, 'tree.distant': 2 }, layer: 'far', seed: 15271, area: { poly: [[-90, 583], [355, 611], [790, 617], [1230, 590], [1690, 604], [1690, 644], [1180, 623], [770, 650], [280, 640], [-90, 616]] }, n: 19, minGap: 48, s: [.13, .26], flip: .5, variant: [0, 2], anim: false, shadow: false, tint: { col: '#9fb6a2', k: [.16, .21] } },
      { obj: 'plant.texas-bluebonnet', layer: 'mid', seed: 16033, area: { rect: [-120, 655, 1720, 716] }, n: 160, minGap: 9, s: [.22, .47], sByY: [[655, .65], [716, 1]], flip: .5, variant: [0, 4], anim: false, tint: { col: '#849d99', k: [.06, .11] } },
      { obj: { 'plant.texas-bluebonnet': 3, 'plant.grass': 2 }, layer: 'near', seed: 16927, area: { rect: [-35, 720, 1640, 899] }, n: 480, minGap: 8, s: [.43, 1.05], sByY: [[720, .6], [899, 1.1]], flip: .5, variant: 'random', anim: false, tint: { col: '#476c50', k: [0, .055] } },
      { obj: 'plant.texas-bluebonnet', layer: 'fore', seed: 17807, area: { rect: [-30, 822, 1640, 900] }, n: 48, minGap: 16, s: [.8, 1.25], flip: .5, variant: [0, 4], anim: 'strip' },
      { obj: { 'rock.stones': 3, 'rock.boulder': 1 }, layer: 'near', seed: 18169, area: { rect: [0, 759, 1600, 899] }, n: 19, minGap: 66, s: [.18, .4], flip: .5, variant: [0, 3], anim: false, tint: { col: '#ded7b6', k: [.3, .55] } },
    ],
    actors: [
      { obj: 'animal.butterfly', layer: 'near', path: [[-100, 735], [680, 695], [1710, 740]], speed: 31, s: .65, loop: 'loop', seed: 19417, offset: .45, variant: 0 },
      { obj: 'animal.butterfly', layer: 'fore', path: [[1710, 807], [830, 756], [-110, 809]], speed: 25, s: .8, loop: 'loop', seed: 20149, offset: .56, variant: 3 },
      { obj: 'animal.butterfly', layer: 'mid', path: [[-100, 671], [790, 636], [1710, 676]], speed: 28, s: .46, loop: 'loop', seed: 21599, offset: .64, variant: 1 },
      { obj: 'animal.bee', layer: 'fore', path: [[-100, 835], [740, 791], [1710, 842]], speed: 33, s: .6, loop: 'loop', seed: 22273, offset: .28 },
      { obj: 'animal.bee', layer: 'near', path: [[1710, 760], [850, 724], [-100, 770]], speed: 27, s: .5, loop: 'loop', seed: 23029, offset: .7 },
    ],
    flocks: [
      { obj: 'bird.small-flight', layer: 'far', n: 8, area: [60, 190, 1530, 350], s: .38, speed: 23, seed: 23911 },
      { obj: 'bird.small-flight', layer: 'mid', n: 4, area: [130, 300, 1460, 450], s: .5, speed: 31, seed: 24677 },
    ],
    water: [], signs: [], camera: { pan: 7, period: 110 },
  });
  animRegionSceneUpgrade('texas', 'place:hill-country-bluebonnets', { state: 'live', landmarks: ['tree.texas-live-oak'], scene });
})();
