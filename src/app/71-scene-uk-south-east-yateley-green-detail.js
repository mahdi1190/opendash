/* ============================================================
   COMPOSED SCENE: Yateley Green, view 3 (detail), docs/dev/SCENE_ENGINE.md section 3.
   In the shade of a big oak on the bank of Shute's Pond, looking south-west:
   the pond fills the foreground between grassy banks with bulrushes; beyond it
   the open green with oaks, a horse chestnut and benches, strollers and dog
   walkers on the mown paths; Church End behind (brick and rendered cottages
   under clay tiles) and St Peter's timber bell tower and spire through the trees.
   Mallards, coots and a moorhen on the water; squirrels under the chestnut,
   robins in the margins.
     https://yateley-tc.gov.uk/our-services/open-spaces/
     https://www.hart.gov.uk/sites/default/files/2022-11/yateley_green_accessible.pdf
   Data only (PURE): the season by date ('auto'), the light from the live sky.
   One auto-season scene shared by the four seasonal items of the view,
   registered by 72-anim-pack-uk-south-east-yateley-green-v3.js with the
   original ids (this view's autumn item keeps the plain id), so pins and the
   rotation keep working.
   ============================================================ */
(function () {
  if (typeof sceneAdd !== 'function') return;
  const PACK = 'uk-south-east-yateley-green', ID = 'yateley-green-3';
  /** The woods beyond the green as one lobed tree-line silhouette (a ground path: far cheaper than a hundred tiny trees). */
  const WOODS = (y, seed, k) => {
    const r = sceneRnd(seed);
    let d = `M-160 ${y + 40}V${y}`;
    for (let x = -160; x < 1760;) { const w = 16 + r() * 30, h = (8 + r() * 20) * k, y1 = y - r() * 8 * k; d += `L${Math.round(x)} ${Math.round(y1)}A${Math.round(w / 2)} ${Math.round(h)} 0 0 1 ${Math.round(x + w)} ${Math.round(y1)}`; x += w * (0.7 + r() * 0.2); }
    return d + `V${y + 40}Z`;
  };
  const PALETTE = {
    base: { woods: ['#4f6a4c', '#62805a'], far: ['#86a06a', '#6f8c55'], grass: ['#5f8f3a', '#3f6b31', '#8db352'], mown: ['#8db352'], path: ['#b8aa8a', '#9c8e70', '#d2c6a8'], bank: ['#5a4c30'] },
    spring: { woods: ['#557552', '#6a8c5e'], far: ['#8fab6c', '#76964f'], grass: ['#6f9f40', '#4c7a37', '#a6c95e'], mown: ['#a6c95e'] },
    autumn: { woods: ['#76643c', '#8c7c48'], far: ['#9a9a62', '#7f7e4c'], grass: ['#8a8a45', '#5f6a35', '#b5a65c'], mown: ['#b5a65c'], path: ['#ae9c78', '#8e7c5c', '#c8b690'] },
    winter: { woods: ['#6c6a70', '#7e7c80'], far: ['#9aa096', '#848c7e'], grass: ['#8d9277', '#6b735a', '#b3b59c'], mown: ['#b3b59c'], path: ['#a89c88', '#8a7e6c', '#c4b8a6'], bank: ['#4a4236'] },
  };
  const WATER = 'M-160 900V640Q120 600 500 606T1100 600Q1500 596 1760 612V900Z';
  const base = () => ({
    v: 1, id: ID, view: { lat: 51.343, lon: -0.835, heading: 228, fov: 80, horizon: 470, lift: 1 },
    at: 'afternoon', season: 'auto', tropic: 'summer', setting: 'natural', signage: false, palette: PALETTE,
    sky: { stars: 200, clouds: { n: 5, y: [30, 330], speed: 6 }, sunR: 26, moonR: 20 },
    layers: [
      { id: 'horizon', depth: 0.08, haze: 0.58 }, { id: 'far', depth: 0.2, haze: 0.3 }, { id: 'mid', depth: 0.45, haze: 0.12 },
      { id: 'near', depth: 0.75, haze: 0.03 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 },
    ],
    ground: [
      { layer: 'horizon', d: 'M-160 900V484Q500 476 900 482T1760 478V900Z', fill: '@far.0' },
      { layer: 'horizon', d: WOODS(486, 7, 1), fill: '@woods.0' },
      { layer: 'horizon', d: WOODS(492, 8, 0.7), fill: '@woods.1' },
      { layer: 'far', d: 'M-160 900V506Q500 498 900 504T1760 500V900Z', fill: { lin: [[0, '@far.1'], [0.25, '@grass.2'], [1, '@grass.0']], x1: 0, y1: 500, x2: 0, y2: 640 } },
      { layer: 'far', d: 'M200 506L222 506L-20 640L-200 640zM520 506L542 506L440 640L270 640zM840 506L862 506L900 640L730 640zM1160 506L1182 506L1360 640L1190 640zM1480 506L1502 506L1820 640L1650 640z', fill: { lin: [[0, '@mown', 0.05], [1, '@mown', 0.26]], x1: 0, y1: 506, x2: 0, y2: 640 } },
      // the mown path across the green
      { layer: 'mid', d: 'M-160 553Q300 537 700 545T1760 531V539Q1300 547 700 553T-160 561Z', fill: '@path.2' },
      { layer: 'near', d: 'M-160 636Q120 596 500 602T1100 596Q1500 592 1760 608V622Q1500 606 1100 610T500 616Q120 610 -160 650Z', fill: '@bank' },
      // the near banks
      { layer: 'fore', d: 'M-160 900V770Q200 740 520 790Q760 830 900 900Z', fill: { lin: [[0, '@grass.0'], [1, '@grass.1']], x1: 0, y1: 760, x2: 0, y2: 900 } },
      { layer: 'fore', d: 'M1760 900V740Q1500 720 1260 780Q1120 830 1060 900Z', fill: { lin: [[0, '@grass.0'], [1, '@grass.1']], x1: 0, y1: 730, x2: 0, y2: 900 } },
    ],
    water: [{ layer: 'near', d: WATER, y0: 600, y1: 900, base: ['#9cc8c4', '#4e8e98', '#1e4f5e'], reflect: true, shimmer: 24, lightPath: true }],
    place: [
      // Church End: St Peter's and four cottages, glimpsed between the trees
      { obj: 'landmark.st-peters-yateley', x: 1100, y: 508, s: 0.8, layer: 'far', variant: 0, seed: 1 },
      { obj: 'building.green-cottage', x: 640, y: 508, s: 0.27, layer: 'far', variant: 1, seed: 2 },
      { obj: 'building.green-cottage', x: 770, y: 510, s: 0.25, layer: 'far', variant: 2, seed: 3, flip: true },
      { obj: 'building.green-cottage', x: 1250, y: 508, s: 0.28, layer: 'far', variant: 0, seed: 4 },
      { obj: 'building.green-cottage', x: 1390, y: 510, s: 0.26, layer: 'far', variant: 1, seed: 5, flip: true },
      // the green: two oaks, the horse chestnut, benches, a robin and a rabbit
      { obj: 'tree.green-oak', x: 300, y: 560, s: 0.48, layer: 'mid', variant: 2, seed: 10, anim: false },
      { obj: 'tree.green-oak', x: 1500, y: 556, s: 0.44, layer: 'mid', variant: 2, seed: 11, anim: false, flip: true },
      { obj: 'tree.green-oak', x: 880, y: 548, s: 0.3, layer: 'mid', variant: 2, seed: 12, anim: false },
      { obj: 'street.bench', x: 560, y: 566, s: 0.5, layer: 'mid', variant: 0, seed: 13, reflect: true },
      { obj: 'street.bench', x: 1180, y: 560, s: 0.46, layer: 'mid', variant: 2, seed: 14, flip: true, reflect: true },
      { obj: 'bird.robin', x: 1160, y: 556, s: 0.36, layer: 'mid', variant: 1, seed: 15 },
      { obj: 'animal.rabbit', x: 1020, y: 566, s: 0.36, layer: 'mid', variant: 0, seed: 16, reflect: true },
      // the water
      { obj: 'water.fish-ring', x: 860, y: 760, s: 0.8, layer: 'near', seed: 17 },
      { obj: 'water.fish-ring', x: 300, y: 700, s: 0.6, layer: 'near', variant: 1, seed: 18 },
      { obj: 'water.fish-ring', x: 1180, y: 720, s: 0.6, layer: 'near', seed: 19 },
      // the banks: the great oak overhead on the left, the horse chestnut on the right, squirrels and robins
      { obj: 'tree.green-oak', x: 30, y: 905, s: 1.3, layer: 'fore', variant: 0, seed: 20, anim: false },
      { obj: 'tree.green-chestnut', x: 1580, y: 892, s: 0.92, layer: 'fore', variant: 0, seed: 21, flip: true, anim: false },
      { obj: 'animal.squirrel', x: 1420, y: 880, s: 0.9, layer: 'fore', seed: 22, flip: true },
      { obj: 'bird.robin', x: 250, y: 872, s: 0.9, layer: 'fore', variant: 1, seed: 23 },
      { obj: 'bird.robin', x: 1180, y: 866, s: 0.8, layer: 'fore', variant: 0, seed: 24, flip: true },
    ],
    scatter: [
      // the woods beyond, two depths
      { obj: { 'tree.distant': 3, 'tree.distant-pine': 2 }, layer: 'far', variant: [0, 1], seed: 42, area: { rect: [-160, 494, 1760, 502] }, n: 24, minGap: 22, s: [0.14, 0.58], anim: false, tint: { col: '#3a5a2a', k: [0.08, 0.08] },
        mask: { avoid: [{ rect: [600, 486, 820, 506] }, { rect: [1040, 486, 1150, 506] }, { rect: [1210, 486, 1430, 506] }] } },
      // the green: tufts and daisies (static), the shore grasses
      { obj: 'plant.grass', layer: 'far', variant: [0, 1], seed: 43, area: { rect: [-160, 514, 1760, 558] }, n: 120, minGap: 7, s: [0.14, 0.28], sByY: [[514, 0.8], [558, 1.3]], anim: false, tint: { col: '#c0b060', k: [0.08, 0.08] } },
      // the far shore: bulrushes and plumes (mirrored), water edges
      { obj: { 'plant.bulrush': 2, 'plant.reed': 3 }, layer: 'near', variant: [0, 1], seed: 45, area: { poly: [[-160, 616], [420, 600], [420, 614], [-160, 646]] }, n: 26, minGap: 12, s: [0.34, 0.5], anim: 'strip', tint: { col: '#a09050', k: [0.08, 0.08] } },
      { obj: { 'plant.reed': 3, 'plant.bulrush': 2 }, layer: 'near', variant: [0, 1], seed: 46, area: { rect: [1180, 598, 1760, 612] }, n: 26, minGap: 12, s: [0.34, 0.5], anim: 'strip', tint: { col: '#a09050', k: [0.08, 0.08] } },
      { obj: 'plant.reed', layer: 'near', variant: [0, 1], seed: 47, area: { rect: [430, 602, 1170, 612] }, n: 12, minGap: 40, s: [0.26, 0.4], anim: false, tint: { col: '#a09050', k: [0.08, 0.08] } },
      { obj: 'water.lily', layer: 'near', variant: [0, 1], seed: 48, area: { poly: [[880, 650], [1500, 650], [1420, 760], [900, 750]] }, n: 18, minGap: 22, s: [0.45, 0.7], sByY: [[650, 0.8], [760, 1.2]], anim: false, mask: { noise: { scale: 180, cut: 0.35 } } },
      // the banks: bulrushes, the meadow, bluebells under the chestnut, long grass in front
      { obj: { 'plant.bulrush': 3, 'plant.reed': 1 }, layer: 'fore', variant: [0, 1], seed: 49, area: { poly: [[380, 786], [760, 826], [800, 866], [400, 846]] }, n: 26, minGap: 13, s: [0.6, 0.9], anim: 'strip' },
      { obj: { 'water.edge': 1 }, layer: 'fore', variant: [0, 1], seed: 50, area: { poly: [[-160, 768], [500, 786], [880, 890], [-160, 900]] }, n: 8, minGap: 60, s: [0.6, 1.1], anim: false },
      { obj: { 'plant.wildflowers': 1, 'plant.grass': 3 }, layer: 'fore', variant: 0, seed: 51, area: { poly: [[-160, 772], [200, 744], [520, 792], [760, 832], [880, 868], [-160, 868]] }, n: 165, minGap: 9, s: [0.7, 1.15], sByY: [[750, 0.8], [868, 1.3]], anim: false, tint: { col: '#b8a050', k: [0.08, 0.08] } },
      { obj: { 'plant.wildflowers': 1, 'plant.grass': 3, 'plant.bluebells': 0.12 }, layer: 'fore', variant: 1, seed: 52, area: { poly: [[1760, 742], [1500, 722], [1260, 782], [1120, 832], [1080, 868], [1760, 868]] }, n: 165, minGap: 9, s: [0.7, 1.15], sByY: [[730, 0.8], [868, 1.3]], anim: false },
      { obj: 'plant.grass', layer: 'front', variant: [0, 1], seed: 53, area: { rect: [-160, 872, 560, 906] }, n: 28, minGap: 14, s: [1.3, 1.8], anim: 'strip' },
      { obj: 'plant.grass', layer: 'front', variant: [0, 1], seed: 54, area: { rect: [1140, 870, 1760, 906] }, n: 26, minGap: 14, s: [1.3, 1.8], anim: 'strip' },
    ],
    actors: [
      // waterbirds
      { obj: 'bird.mallard', layer: 'near', path: [[620, 690], [800, 696]], speed: 5, loop: 'pingpong', s: 0.62, seed: 61, variant: 0, offset: 0.2 },
      { obj: 'bird.mallard', layer: 'near', path: [[690, 702], [860, 708]], speed: 5, loop: 'pingpong', s: 0.58, seed: 62, variant: 1, offset: 0.24 },
      { obj: 'bird.coot', layer: 'near', path: [[1040, 655], [920, 652]], speed: 4, loop: 'pingpong', s: 0.44, seed: 63, offset: 0.4 },
      { obj: 'bird.coot', layer: 'near', path: [[1100, 664], [990, 662]], speed: 3.6, loop: 'pingpong', s: 0.42, seed: 64, offset: 0.6 },
      { obj: 'bird.moorhen', layer: 'near', path: [[420, 650], [520, 648]], speed: 4, loop: 'pingpong', s: 0.4, seed: 65, offset: 0.3 },
      { obj: 'bird.mallard', layer: 'near', path: [[1280, 730], [1100, 740]], speed: 5, loop: 'pingpong', s: 0.7, seed: 66, variant: 0, offset: 0.7 },
      // people on the green
      { obj: 'person.dog-walker', layer: 'mid', path: [[420, 556], [700, 550]], speed: 5, loop: 'pingpong', s: 0.56, seed: 71, offset: 0.3 },
      { obj: 'person.walker', layer: 'mid', path: [[1260, 548], [1040, 552]], speed: 4.5, loop: 'pingpong', s: 0.5, seed: 72, variant: 1, offset: 0.5 },
      { obj: 'person.walker', layer: 'mid', path: [[700, 552], [880, 550]], speed: 3.5, loop: 'pingpong', s: 0.56, seed: 73, variant: 1, offset: 0.6 },
      { obj: 'person.walker', layer: 'mid', path: [[160, 560], [300, 558]], speed: 4, loop: 'pingpong', s: 0.6, seed: 74, variant: 1, offset: 0.2 },
    ],
    flocks: [{ obj: 'bird.small-flight', n: 6, area: [260, 160, 1300, 300], speed: 26, s: 0.55, seed: 81, layer: 'far' }],
    particles: 'season', weather: 'live',
  });
  /** All-year life (waterbirds, a squirrel): the season comes from the date (season 'auto'), so nothing that belongs to
      one season only (butterflies, bees, dragonflies) is drawn; the four seasonal items of the view share this one scene. */
  const YEAR_ROUND = [
      { obj: 'animal.squirrel', layer: 'fore', path: [[1300, 884], [1460, 880]], speed: 9, loop: 'pingpong', s: 0.8, seed: 99, offset: 0.4 },
      { obj: 'bird.goose-flight', layer: 'far', path: [[-120, 220], [1720, 160]], speed: 40, loop: 'loop', s: 0.6, seed: 100, offset: 0.3 },
  ];
  sceneAdd(PACK, { id: ID, label: 'Yateley Green', site: 'Yateley Green — Autumn shade beside the open green', tags: ['uk', 'yateley', 'village green', 'pond', 'church', 'st peters'], mood: 'calm', colour: 'green' },
    () => { const d = base(); d.actors = d.actors.concat(YEAR_ROUND); return d; });
})();
