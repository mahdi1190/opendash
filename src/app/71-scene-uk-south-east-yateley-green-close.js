/* ============================================================
   COMPOSED SCENE: Yateley Green, view 2 (close), docs/dev/SCENE_ENGINE.md section 3.
   The lily pond margin, looking south-west across the water: the open mown
   green beyond with its oaks and a birch, dog walkers and walkers on the grass, the cottages of Church End and St Peter's timber tower
   through the tree line, the woods behind. Reeds and bulrushes fringe the near
   banks; a heron stands in the shallows; mallards, a coot and a moorhen paddle
   between the lilies; a big oak leans in from the right.
     https://yateley-tc.gov.uk/our-services/open-spaces/
     https://www.hart.gov.uk/sites/default/files/2022-11/yateley_green_accessible.pdf
   Data only (PURE): the season by date ('auto'), the light from the live sky.
   One auto-season scene shared by the four seasonal items of the view,
   registered by 72-anim-pack-uk-south-east-yateley-green-v2.js with the
   original ids, so pins and the rotation keep working.
   ============================================================ */
(function () {
  if (typeof sceneAdd !== 'function') return;
  const PACK = 'uk-south-east-yateley-green', ID = 'yateley-green-2', SHORE = 622;
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
  const WATER = `M-160 900V${SHORE + 8}Q120 ${SHORE - 4} 420 ${SHORE + 6}T980 ${SHORE + 2}T1400 ${SHORE + 8}T1760 ${SHORE}V900Z`;
  const base = () => ({
    v: 1, id: ID, view: { lat: 51.34, lon: -0.83, heading: 220, fov: 78, horizon: 480, lift: 1 },
    at: 'afternoon', season: 'auto', tropic: 'summer', setting: 'natural', signage: false, palette: PALETTE,
    sky: { stars: 200, clouds: { n: 5, y: [30, 330], speed: 6 }, sunR: 26, moonR: 20 },
    layers: [
      { id: 'horizon', depth: 0.08, haze: 0.55 }, { id: 'far', depth: 0.2, haze: 0.3 }, { id: 'mid', depth: 0.45, haze: 0.12 },
      { id: 'near', depth: 0.75, haze: 0.03 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 },
    ],
    ground: [
      { layer: 'horizon', d: 'M-160 900V490Q400 482 800 488T1760 486V900Z', fill: '@far.0' },
      { layer: 'horizon', d: WOODS(492, 7, 1), fill: '@woods.0' },
      { layer: 'horizon', d: WOODS(498, 8, 0.7), fill: '@woods.1' },
      { layer: 'far', d: 'M-160 900V522Q300 512 800 518T1760 516V900Z', fill: { lin: [[0, '@far.1'], [0.2, '@grass.0'], [1, '@grass.1']], x1: 0, y1: 515, x2: 0, y2: 680 } },
      { layer: 'far', d: 'M240 520L262 520L60 660L-120 660zM470 520L492 520L470 660L300 660zM700 520L722 520L880 660L710 660zM930 520L952 520L1290 660L1120 660zM1160 520L1182 520L1700 660L1530 660z', fill: { lin: [[0, '@mown', 0.06], [1, '@mown', 0.28]], x1: 0, y1: 520, x2: 0, y2: 660 } },
      // the gravel path across the green, toward the viewer on the left
      { layer: 'mid', d: 'M1560 525Q1250 548 900 576Q520 593 -160 600V626Q520 616 900 596Q1250 560 1560 531Z', fill: { lin: [[0, '@path.2'], [1, '@path.0']], x1: 0, y1: 525, x2: 0, y2: 626 } },
      { layer: 'near', d: `M-160 ${SHORE + 4}Q120 ${SHORE - 8} 420 ${SHORE + 2}T980 ${SHORE - 2}T1400 ${SHORE + 4}T1760 ${SHORE - 4}V${SHORE + 14}H-160Z`, fill: '@bank' },
      // the near banks: grass to the left and right of the water
      { layer: 'fore', d: 'M-160 900V748Q40 728 200 770Q330 810 400 900Z', fill: { lin: [[0, '@grass.0'], [1, '@grass.1']], x1: 0, y1: 730, x2: 0, y2: 900 } },
      { layer: 'fore', d: 'M1760 900V700Q1580 694 1450 752Q1330 820 1290 900Z', fill: { lin: [[0, '@grass.0'], [1, '@grass.1']], x1: 0, y1: 700, x2: 0, y2: 900 } },
    ],
    water: [{ layer: 'near', d: WATER, y0: SHORE, y1: 900, base: ['#7fa8a8', '#3f7a86', '#1d4a58'], reflect: true, shimmer: 20, lightPath: true }],
    place: [
      // Church End through the tree line: three cottages and St Peter's
      { obj: 'building.green-cottage', x: 420, y: 514, s: 0.3, layer: 'far', variant: 0, seed: 1 },
      { obj: 'building.green-cottage', x: 524, y: 515, s: 0.27, layer: 'far', variant: 1, seed: 2, flip: true },
      { obj: 'building.green-cottage', x: 640, y: 514, s: 0.28, layer: 'far', variant: 2, seed: 3 },
      { obj: 'landmark.st-peters-yateley', x: 1210, y: 516, s: 0.76, layer: 'far', variant: 0, seed: 4 },
      // the open green: oaks, the horse chestnut, a birch; benches; a robin, a squirrel and a rabbit
      { obj: 'tree.green-oak', x: 860, y: 556, s: 0.34, layer: 'mid', variant: 2, seed: 10, flip: true, anim: false },
      { obj: 'tree.green-oak', x: 1450, y: 566, s: 0.42, layer: 'mid', variant: 2, seed: 11, flip: true, anim: false },
      { obj: 'tree.green-oak', x: 210, y: 594, s: 0.5, layer: 'mid', variant: 2, seed: 12, anim: false },
      { obj: 'tree.green-birch', x: 1010, y: 550, s: 0.26, layer: 'mid', variant: 0, seed: 13, anim: false },
      { obj: 'street.bench', x: 1060, y: 556, s: 0.5, layer: 'mid', variant: 1, seed: 14 },
      { obj: 'bird.robin', x: 1030, y: 552, s: 0.4, layer: 'mid', variant: 0, seed: 15 },
      { obj: 'animal.squirrel', x: 1500, y: 574, s: 0.42, layer: 'mid', seed: 16 },
      { obj: 'animal.rabbit', x: 1640, y: 566, s: 0.4, layer: 'mid', variant: 1, seed: 17, flip: true },
      // the water: a heron in the shallows, fish rings
      { obj: 'bird.heron', x: 1330, y: 648, s: 0.5, layer: 'near', variant: 0, seed: 18, flip: true },
      { obj: 'water.fish-ring', x: 640, y: 700, s: 0.6, layer: 'near', seed: 19 },
      { obj: 'water.fish-ring', x: 1180, y: 760, s: 0.5, layer: 'near', variant: 1, seed: 20 },
      { obj: 'water.fish-ring', x: 380, y: 820, s: 0.7, layer: 'near', seed: 21 },
      // the near banks: the leaning oak on the right, an alder on the left, a robin on a post, stones
      { obj: 'tree.green-oak', x: 1660, y: 900, s: 1.0, layer: 'fore', variant: 0, seed: 22, flip: true, anim: false },
      { obj: 'tree.green-alder', x: 40, y: 790, s: 0.48, layer: 'fore', variant: 1, seed: 23, anim: false },
      { obj: 'bird.robin', x: 250, y: 800, s: 0.75, layer: 'fore', variant: 1, seed: 24 },
    ],
    scatter: [
      // the woods behind Church End, and the tree line with its gaps
      { obj: { 'tree.distant': 3, 'tree.distant-pine': 2 }, layer: 'far', variant: [0, 1], seed: 42, area: { rect: [-160, 516, 1760, 524] }, n: 28, minGap: 22, s: [0.24, 0.5], anim: false, tint: { col: '#3a5a2a', k: [0.08, 0.08] },
        mask: { avoid: [{ rect: [380, 500, 690, 530] }, { rect: [1130, 500, 1260, 530] }] } },
      // the mown green: tufts and daisies (static), thicker toward the shore
      { obj: 'plant.grass', layer: 'far', variant: [0, 1], seed: 43, area: { rect: [-160, 530, 1760, 564] }, n: 50, minGap: 7, s: [0.16, 0.3], sByY: [[530, 0.8], [570, 1.2]], anim: false, reflect: false, tint: { col: '#c0b060', k: [0.08, 0.08] } },
      { obj: 'plant.grass', layer: 'mid', variant: [0, 1], seed: 44, area: { rect: [-160, 570, 1760, 582] }, n: 60, minGap: 11, s: [0.26, 0.4], anim: false, reflect: false },
      // the far shore: reeds, bulrushes and plumes (mirrored)
      { obj: { 'plant.reed': 3, 'plant.bulrush': 2 }, layer: 'near', variant: [0, 1], seed: 45, area: { rect: [880, 612, 1520, 626] }, n: 22, minGap: 12, s: [0.3, 0.42], anim: 'strip', tint: { col: '#a09050', k: [0.08, 0.08] } },
      { obj: { 'plant.reed': 2, 'plant.bulrush': 1 }, layer: 'near', variant: [0, 1], seed: 46, area: { rect: [-160, 614, 380, 628] }, n: 16, minGap: 12, s: [0.3, 0.42], anim: 'strip', tint: { col: '#a09050', k: [0.08, 0.08] } },
      { obj: 'plant.reed', layer: 'near', variant: [0, 1], seed: 47, area: { rect: [380, 616, 880, 628] }, n: 14, minGap: 28, s: [0.3, 0.45], anim: false, tint: { col: '#a09050', k: [0.08, 0.08] } },
      { obj: 'water.edge', layer: 'fore', variant: [0, 1], seed: 55, area: { poly: [[-160, 744], [200, 770], [380, 880], [330, 900], [-160, 900]] }, n: 10, minGap: 40, s: [0.6, 0.9], anim: false },
      // lilies across the pond (static pads)
      { obj: 'water.lily', layer: 'near', variant: [0, 1], seed: 48, area: { poly: [[300, 662], [1150, 660], [1240, 860], [420, 870]] }, n: 18, minGap: 24, s: [0.4, 0.8], sByY: [[660, 0.75], [870, 1.3]], anim: false, mask: { noise: { scale: 200, cut: 0.38 } } },
      // the near banks: reeds and bulrushes, the wildflower meadow, then the long grass in front
      { obj: { 'plant.reed': 3, 'plant.bulrush': 2 }, layer: 'fore', variant: [0, 1], seed: 49, area: { poly: [[160, 780], [400, 800], [420, 900], [190, 900]] }, n: 18, minGap: 14, s: [0.85, 1.2], anim: 'strip' },
      { obj: { 'plant.reed': 3, 'plant.bulrush': 2 }, layer: 'fore', variant: [0, 1], seed: 50, area: { poly: [[1290, 760], [1470, 740], [1480, 880], [1300, 880]] }, n: 16, minGap: 14, s: [0.8, 1.1], anim: 'strip' },
      { obj: { 'plant.wildflowers': 1, 'plant.grass': 3 }, layer: 'fore', variant: 0, seed: 51, area: { poly: [[-160, 760], [40, 740], [200, 772], [330, 812], [400, 905], [-160, 905]] }, n: 200, minGap: 9, s: [0.7, 1.15], sByY: [[750, 0.8], [905, 1.3]], anim: false, mask: { avoid: [{ rect: [-160, 868, 1760, 910] }] }, tint: { col: '#b8a050', k: [0.08, 0.08] } },
      { obj: { 'plant.wildflowers': 1, 'plant.grass': 3 }, layer: 'fore', variant: 1, seed: 52, area: { poly: [[1760, 702], [1580, 696], [1450, 754], [1330, 822], [1290, 905], [1760, 905]] }, n: 200, minGap: 9, s: [0.7, 1.15], sByY: [[700, 0.8], [905, 1.3]], anim: false, mask: { avoid: [{ rect: [-160, 868, 1760, 910] }] } },
      { obj: 'plant.grass', layer: 'front', variant: [0, 1], seed: 53, area: { rect: [-160, 874, 420, 906] }, n: 26, minGap: 14, s: [1.3, 1.8], anim: 'strip' },
      { obj: 'plant.grass', layer: 'front', variant: [0, 1], seed: 54, area: { rect: [1240, 870, 1760, 906] }, n: 26, minGap: 14, s: [1.3, 1.8], anim: 'strip' },
    ],
    actors: [
      // waterbirds
      { obj: 'bird.mallard', layer: 'near', path: [[640, 742], [900, 748]], speed: 6, loop: 'pingpong', s: 0.62, seed: 61, variant: 0, offset: 0.2 },
      { obj: 'bird.mallard', layer: 'near', path: [[720, 754], [980, 760]], speed: 6, loop: 'pingpong', s: 0.58, seed: 62, variant: 1, offset: 0.25 },
      { obj: 'bird.moorhen', layer: 'near', path: [[1080, 680], [960, 676]], speed: 4, loop: 'pingpong', s: 0.44, seed: 63, offset: 0.4 },
      { obj: 'bird.coot', layer: 'near', path: [[400, 690], [560, 686]], speed: 4.5, loop: 'pingpong', s: 0.46, seed: 64, offset: 0.6 },
      { obj: 'bird.mallard', layer: 'near', path: [[1150, 820], [980, 830]], speed: 5, loop: 'pingpong', s: 0.72, seed: 65, variant: 0, offset: 0.7 },
      { obj: 'bird.coot', layer: 'near', path: [[880, 700], [1000, 704]], speed: 3.5, loop: 'pingpong', s: 0.44, seed: 66, offset: 0.1 },
      // people on the green
      { obj: 'person.dog-walker', layer: 'mid', path: [[560, 598], [860, 586]], speed: 6, loop: 'pingpong', s: 0.66, seed: 71, offset: 0.3 },
      { obj: 'person.walker', layer: 'mid', path: [[1140, 566], [880, 578]], speed: 5, loop: 'pingpong', s: 0.56, seed: 72, variant: 2, offset: 0.5 },
      { obj: 'person.walker', layer: 'mid', path: [[760, 586], [520, 594]], speed: 4, loop: 'pingpong', s: 0.62, seed: 73, variant: 2, offset: 0.4 },
      { obj: 'person.walker', layer: 'mid', path: [[80, 606], [300, 602]], speed: 5, loop: 'pingpong', s: 0.7, seed: 75, variant: 2, offset: 0.6 },
    ],
    flocks: [{ obj: 'bird.small-flight', n: 6, area: [200, 150, 1300, 300], speed: 28, s: 0.6, seed: 81, layer: 'far' }],
    particles: 'season', weather: 'live',
  });
  /** All-year life (waterbirds, a squirrel): the season comes from the date (season 'auto'), so nothing that belongs to
      one season only (butterflies, bees, dragonflies) is drawn; the four seasonal items of the view share this one scene. */
  const YEAR_ROUND = [
      { obj: 'bird.goose', layer: 'near', path: [[200, 700], [420, 706]], speed: 4, loop: 'pingpong', s: 0.5, seed: 99, variant: 0, offset: 0.5 },
      { obj: 'bird.swan', layer: 'near', path: [[1200, 720], [900, 714]], speed: 5, loop: 'pingpong', s: 0.6, seed: 100, variant: 0, offset: 0.4 },
      { obj: 'bird.coot', layer: 'near', path: [[980, 760], [820, 766]], speed: 4, loop: 'pingpong', s: 0.5, seed: 101, offset: 0.2 },
  ];
  sceneAdd(PACK, { id: ID, label: 'Yateley Green', site: 'Yateley Green — Summer insects across the pond margin', tags: ['uk', 'yateley', 'village green', 'pond', 'church', 'st peters'], mood: 'calm', colour: 'green' },
    () => { const d = base(); d.actors = d.actors.concat(YEAR_ROUND); return d; });
})();
