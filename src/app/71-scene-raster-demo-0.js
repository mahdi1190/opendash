/* ============================================================
   COMPOSED SCENE: the raster-object demo (docs/dev/OBJECT_IMPORT.md, "The demo"). A village by a canal, built from the
   seven IMAGE-backed demo objects (assets/objects: five imported by `object import-batch` from PNGs rendered off vector
   objects, standing in for AI images, and two imported from whole sprite sheets by `object import-sheet`), mixed with
   vector ground cover, water and birds, so the raster path is seen next to the vector one:
     building.terrace-ai (a sheet: real night and lit columns)   person.walker-ai (a sheet: real seasons, four walk frames)
     building.cottage-ai (a flat background removed; derived seasons, auto-lit windows)   tree.cherry-ai (real seasons)
     building.windmill-ai (a spinning sails part)   vehicle.bus-ai (auto-lit windows)   boat.narrowboat-ai (a real night image)
   Data only (PURE). Registered by 72-anim-pack-raster-demo.js; never in the daily rotation (when is false).
   ============================================================ */
(function () {
  if (typeof sceneAdd !== 'function' || typeof sceneObj !== 'function' || !sceneObj('building.terrace-ai')) return;
  const PACK = 'raster-demo', SHORE = 700;
  const data = () => ({
    v: 1, id: 'raster-demo-village', view: { lat: 51.3, lon: -0.8, heading: 200, fov: 78, horizon: 500, lift: 1 },
    at: 'afternoon', season: 'auto', tropic: 'summer', setting: 'mixed', signage: false,
    palette: {
      base: { far: ['#8fa874', '#7a965f'], grass: ['#6a9a44', '#4f7d38', '#9cc062'], road: ['#8d8a84', '#6f6c68'], bank: ['#5a4c30'] },
      spring: { far: ['#97b178', '#80a062'], grass: ['#78a84a', '#57873c', '#acd06a'] },
      autumn: { far: ['#a29c64', '#8a8452'], grass: ['#8c8c48', '#68703a', '#b5a660'] },
      winter: { far: ['#a2a89c', '#8c9486'], grass: ['#8f9580', '#6e765e', '#b8bba4'], road: ['#9a9894', '#7c7a76'] },
    },
    sky: { stars: 180, clouds: { n: 5, y: [40, 320], speed: 6 }, sunR: 26, moonR: 20 },
    ground: [
      { layer: 'horizon', d: 'M-160 900V500Q400 490 800 496T1760 494V900Z', fill: '@far.1' },
      { layer: 'far', d: 'M-160 900V552Q500 540 900 548T1760 546V900Z', fill: '@far.0' },
      { layer: 'mid', d: 'M-160 900V600Q500 592 900 598T1760 596V900Z', fill: { lin: [[0, '@grass.2'], [1, '@grass.0']], y1: 600, y2: 690 } },
      { layer: 'mid', d: 'M-160 650H1760V672H-160Z', fill: { lin: [[0, '@road.0'], [1, '@road.1']], y1: 650, y2: 672 } },
      { layer: 'near', d: `M-160 900V${SHORE - 8}H1760V900Z`, fill: '@bank.0' },
      { layer: 'fore', d: 'M-160 900V820Q600 800 1000 812T1760 806V900Z', fill: { lin: [[0, '@grass.0'], [1, '@grass.1']], y1: 806, y2: 900 } },
    ],
    water: [{ layer: 'near', d: `M-160 830V${SHORE}H1760V830Z`, y0: SHORE, y1: 830, base: ['#86b4c2', '#4a8498', '#24566c'], reflect: true, shimmer: 26, lightPath: true }],
    place: [
      // the far row: the terrace (both variants of the sheet), end to end
      { obj: 'building.terrace-ai', x: 150, y: 556, s: 0.9, layer: 'far', variant: 0 },
      { obj: 'building.terrace-ai', x: 380, y: 556, s: 0.9, layer: 'far', variant: 1 },
      { obj: 'building.terrace-ai', x: 610, y: 556, s: 0.9, layer: 'far', variant: 0, flip: true },
      // the windmill on the rise, sails turning
      { obj: 'building.windmill-ai', x: 1290, y: 604, s: 0.72, layer: 'mid', anim: { spin: { k: 1 } } },
      // cottages along the lane
      { obj: 'building.cottage-ai', x: 880, y: 646, s: 0.62, layer: 'mid' },
      { obj: 'building.cottage-ai', x: 1020, y: 648, s: 0.6, layer: 'mid', flip: true },
      // cherry trees (real seasonal images) along the lane and the bank
      { obj: 'tree.cherry-ai', x: 760, y: 648, s: 0.62, layer: 'mid' },
      { obj: 'tree.cherry-ai', x: 1120, y: 650, s: 0.56, layer: 'mid', flip: true },
      { obj: 'tree.cherry-ai', x: 120, y: 700, s: 0.8, layer: 'near' },
      { obj: 'tree.cherry-ai', x: 1520, y: 702, s: 0.86, layer: 'near', flip: true },
      // lamps along the lane (vector), lit at dusk next to the raster windows
      { obj: 'street.lamp', x: 820, y: 652, s: 0.5, layer: 'mid' },
      { obj: 'street.lamp', x: 1180, y: 654, s: 0.5, layer: 'mid' },
    ],
    scatter: [
      { obj: { 'plant.grass': 3, 'plant.heather': 1 }, layer: 'mid', seed: 3, area: { rect: [-160, 604, 1760, 648] }, n: 140, minGap: 10, s: [0.4, 0.6], tint: { col: '#a8a050', k: [0, 0.14] }, anim: 'strip' },
      { obj: 'plant.bulrush', layer: 'near', seed: 5, area: { rect: [-160, 694, 1760, 706] }, n: 60, minGap: 14, s: [0.55, 0.8], mask: { avoid: [{ rect: [500, 680, 1100, 720] }] }, tint: { col: '#8a7a40', k: [0, 0.14] }, anim: 'strip' },
      { obj: { 'plant.grass': 7, 'plant.bracken': 1 }, layer: 'fore', seed: 7, area: { rect: [-160, 812, 1760, 900] }, n: 290, minGap: 12, s: [0.8, 1.15], tint: { col: '#a0a060', k: [0, 0.14] }, anim: 'strip' },
    ],
    actors: [
      { obj: 'vehicle.bus-ai', layer: 'mid', path: [[-200, 670], [1800, 670]], speed: 28, loop: 'loop', s: 0.62, seed: 11, offset: 0.35 },
      { obj: 'boat.narrowboat-ai', layer: 'near', path: [[1700, 772], [-300, 772]], speed: 7, loop: 'loop', s: 0.62, seed: 12, offset: 0.55 },
      { obj: 'person.walker-ai', layer: 'mid', path: [[300, 676], [700, 678]], speed: 9, loop: 'pingpong', s: 0.9, seed: 21, offset: 0.2 },
      { obj: 'person.walker-ai', layer: 'mid', path: [[1400, 678], [1000, 676]], speed: 8, loop: 'pingpong', s: 0.9, seed: 22, offset: 0.6 },
      { obj: 'person.walker-ai', layer: 'fore', path: [[200, 846], [900, 840]], speed: 11, loop: 'pingpong', s: 1.4, seed: 23, offset: 0.45 },
      { obj: 'bird.mallard', layer: 'near', path: [[300, 742], [520, 748]], speed: 4, loop: 'pingpong', s: 0.6, seed: 31, offset: 0.3 },
      { obj: 'bird.swan', layer: 'near', path: [[1300, 806], [1100, 800]], speed: 4, loop: 'pingpong', s: 0.66, seed: 32, offset: 0.7 },
      { obj: 'bird.mallard', layer: 'near', path: [[760, 790], [980, 786]], speed: 3.5, loop: 'pingpong', s: 0.56, seed: 33, offset: 0.1 },
    ],
    flocks: [
      { obj: 'bird.small-flight', n: 6, area: [200, 140, 1300, 300], speed: 28, s: 0.6, seed: 41, layer: 'far' },
      { obj: 'bird.small-flight', n: 4, area: [900, 220, 1500, 360], speed: 22, s: 0.5, seed: 42, layer: 'far' },
    ],
    particles: 'season', weather: 'live',
  });
  sceneAdd(PACK, { id: 'raster-demo-village', label: 'Raster object demo', site: 'A village by a canal, drawn from imported images', tags: ['demo', 'raster', 'village', 'canal', 'windmill', 'scene'], mood: 'calm', colour: 'green', lat: 51.3, lon: -0.8, when: () => false }, data);
})();
