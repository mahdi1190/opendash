/* ============================================================
   COMPOSED SCENE: Yateley Green, view 4 (evening), docs/dev/SCENE_ENGINE.md section 3.
   Looking west across Shute's Pond into the real sunset (the live sky: the sun,
   the moon and the stars from the almanac): the wooded edge of the common, the
   red-brick cottages of Church End with their windows lighting up, St Peter's
   timber tower and spire through the trees (seen from the east: the tower on the
   left), the big oaks and a birch of the Green with two lamp posts along the path
   and the evening walkers on it; on the water mallards, a swan, a coot and a
   moorhen, lilies, reeds at both ends, a heron; on the near bank the bench, a
   robin and a squirrel, dog walkers on the near path, the wildflower margins, and
   a great oak and a horse chestnut framing the view.
     https://yateley-tc.gov.uk/our-services/open-spaces/
     https://www.hart.gov.uk/sites/default/files/2022-11/yateley_green_accessible.pdf
   Data only (PURE): the season by date ('auto'), the light from the live sky (the
   authored moment is dusk, for stills without a clock). One auto-season scene
   shared by the four seasonal items of the view, registered by
   72-anim-pack-uk-south-east-yateley-green-v4.js with the original ids, so pins
   and the rotation keep working.
   ============================================================ */
(function () {
  if (typeof sceneAdd !== 'function') return;
  const PACK = 'uk-south-east-yateley-green', ID = 'yateley-green-4';
  /** Irregular clumps (70-scene-lib-yateley-green-views.js); none when that library is not in the build. */
  const YG = o => (typeof sceneYgClumps === 'function' ? sceneYgClumps(o) : []);
  /** The woods beyond the green as one lobed tree-line silhouette (a ground path: far cheaper than a hundred tiny trees). */
  const WOODS = (y, seed, k) => {
    const r = sceneRnd(seed);
    let d = `M-160 ${y + 40}V${y}`;
    for (let x = -160; x < 1760;) { const w = 16 + r() * 30, h = (8 + r() * 20) * k, y1 = y - r() * 8 * k; d += `L${Math.round(x)} ${Math.round(y1)}A${Math.round(w / 2)} ${Math.round(h)} 0 0 1 ${Math.round(x + w)} ${Math.round(y1)}`; x += w * (0.7 + r() * 0.2); }
    return d + `V${y + 40}Z`;
  };
  const PALETTE = {
    base: { woods: ['#4f6a4c', '#62805a'], far: ['#7f9668', '#6a8452'], grass: ['#5a8a38', '#3c6630', '#86ad4e'], path: ['#b4a684', '#988a6c', '#cec2a2'], bank: ['#56482e'] },
    spring: { woods: ['#557552', '#6a8c5e'], far: ['#88a46a', '#70904e'], grass: ['#6a9a3e', '#487636', '#a0c45a'] },
    autumn: { woods: ['#76643c', '#8c7c48'], far: ['#96925e', '#7c784a'], grass: ['#868444', '#5c6634', '#b0a058'], path: ['#aa9874', '#8a7858', '#c4b28c'] },
    winter: { woods: ['#6c6a70', '#7e7c80'], far: ['#969c92', '#80887a'], grass: ['#8a8f74', '#687058', '#b0b298'], path: ['#a49884', '#867a68', '#c0b4a2'], bank: ['#484034'] },
  };
  const POND = 'M-160 598Q120 574 520 584T1180 582Q1560 586 1760 604V780Q1400 806 980 792T300 806Q20 800 -160 778Z';
  const base = () => ({
    v: 1, id: ID, view: { lat: 51.34, lon: -0.83, heading: 270, fov: 80, horizon: 486, lift: 1 },
    at: 'dusk', season: 'auto', tropic: 'summer', setting: 'natural', signage: false, palette: PALETTE,
    sky: { stars: 220, clouds: { n: 4, y: [40, 300], speed: 5 }, sunR: 28, moonR: 20 },
    layers: [
      { id: 'horizon', depth: 0.08, haze: 0.55 }, { id: 'far', depth: 0.2, haze: 0.28 }, { id: 'mid', depth: 0.45, haze: 0.1 },
      { id: 'near', depth: 0.75, haze: 0.03 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 },
    ],
    ground: [
      { layer: 'horizon', d: 'M-160 900V490Q400 482 800 488T1760 486V900Z', fill: '@far.0' },
      { layer: 'horizon', d: WOODS(492, 7, 1), fill: '@woods.0' },
      { layer: 'horizon', d: WOODS(498, 8, 0.7), fill: '@woods.1' },
      { layer: 'far', d: 'M-160 900V518Q400 510 800 516T1760 514V900Z', fill: { lin: [[0, '@far.1'], [0.25, '@grass.0'], [1, '@grass.1']], x1: 0, y1: 514, x2: 0, y2: 600 } },
      // the gravel path along the far side of the pond
      { layer: 'mid', d: 'M-160 554Q300 548 800 553T1760 555V568Q1300 563 800 567T-160 569Z', fill: { lin: [[0, '@path.2'], [1, '@path.0']], x1: 0, y1: 550, x2: 0, y2: 570 } },
      { layer: 'mid', d: 'M-160 590Q120 566 520 576T1180 574Q1560 578 1760 596V610H-160Z', fill: '@bank' },
      // the near bank, and the near path the strollers take
      { layer: 'fore', d: 'M-160 900V770Q200 812 560 800T1120 808T1760 768V900Z', fill: { lin: [[0, '@grass.2'], [1, '@grass.0']], x1: 0, y1: 770, x2: 0, y2: 900 } },
      { layer: 'fore', d: 'M-160 880Q400 868 900 874T1760 872V900H-160Z', fill: { lin: [[0, '@path.2'], [1, '@path.1']], x1: 0, y1: 868, x2: 0, y2: 900 } },
    ],
    water: [{ layer: 'near', d: POND, y0: 580, y1: 810, base: ['#a8b8c0', '#5a8494', '#244a5a'], reflect: true, shimmer: 24, lightPath: true }],
    place: [
      // Church End through the trees: St Peter's (the tower at its west end, toward us) and red-brick cottages
      { obj: 'landmark.st-peters-yateley', x: 1100, y: 512, s: 0.82, layer: 'far', variant: 1, seed: 1 },
      { obj: 'building.green-cottage', x: 250, y: 514, s: 0.32, layer: 'far', variant: 0, seed: 2 },
      { obj: 'building.green-cottage', x: 470, y: 512, s: 0.28, layer: 'far', variant: 2, seed: 3, flip: true },
      { obj: 'building.green-cottage', x: 840, y: 514, s: 0.3, layer: 'far', variant: 0, seed: 4, flip: true },
      { obj: 'building.green-cottage', x: 1420, y: 514, s: 0.3, layer: 'far', variant: 2, seed: 5 },
      // the big trees of the Green along the path, a birch, the lamp posts
      // the trees of the Green in groups at different depths, never a row along the path: an oak pair on the left (one
      // beyond the path), a lone oak set back, the birch and a hawthorn by the church, the big oak on the right
      { obj: 'tree.green-oak', x: 330, y: 574, s: 0.6, layer: 'mid', variant: 2, seed: 10, anim: false },
      { obj: 'tree.green-oak', x: 440, y: 538, s: 0.34, layer: 'far', variant: 1, seed: 16, flip: true, anim: false },
      { obj: 'tree.green-oak', x: 690, y: 544, s: 0.36, layer: 'far', variant: 2, seed: 11, flip: true, anim: false },
      { obj: 'tree.green-oak', x: 1452, y: 578, s: 0.58, layer: 'mid', variant: 2, seed: 12, anim: false },
      { obj: 'tree.green-birch', x: 968, y: 548, s: 0.36, layer: 'far', variant: 0, seed: 13, anim: false },
      { obj: 'tree.hawthorn', x: 790, y: 550, s: 0.4, layer: 'far', variant: 1, seed: 17, anim: false },
      { obj: 'street.lamp', x: 860, y: 564, s: 0.62, layer: 'mid', variant: 0, seed: 14, reflect: true },
      { obj: 'street.lamp', x: 1560, y: 566, s: 0.62, layer: 'mid', variant: 0, seed: 15, reflect: true },
      // the water: a heron at the reeds, fish rings
      { obj: 'bird.heron', x: 1470, y: 712, s: 0.6, layer: 'near', variant: 0, seed: 20, flip: true },
      { obj: 'water.fish-ring', x: 720, y: 640, s: 0.6, layer: 'near', seed: 21 },
      { obj: 'water.fish-ring', x: 1060, y: 700, s: 0.7, layer: 'near', variant: 1, seed: 22 },
      { obj: 'water.fish-ring', x: 380, y: 740, s: 0.6, layer: 'near', seed: 23 },
      // the near bank: the bench with a robin, a squirrel
      { obj: 'street.bench', x: 1180, y: 850, s: 1.45, layer: 'fore', variant: 0, seed: 30 },
      { obj: 'bird.robin', x: 1150, y: 818, s: 0.7, layer: 'fore', variant: 1, seed: 31 },
      { obj: 'animal.squirrel', x: 140, y: 850, s: 0.8, layer: 'fore', seed: 32 },
      // the framing trees: a great oak on the left, a horse chestnut on the right
      { obj: 'tree.green-oak', x: -90, y: 930, s: 1.12, layer: 'front', variant: 0, seed: 40, anim: false },
      { obj: 'tree.green-chestnut', x: 1720, y: 920, s: 0.95, layer: 'front', variant: 0, seed: 41, flip: true, anim: false },
    ].concat(
      // reed beds at both ends of the pond and along the near edge, in clumps with open water between (mirrored)
      YG({ obj: { 'plant.yg-reedbed': 4, 'plant.bulrush': 1 }, centres: [[-40, 612, 70, 10, 4], [1560, 626, 60, 12, 4], [1700, 610, 30, 6, 2]], s: [0.32, 0.5], sByY: [[590, 0.85], [650, 1.15]], layer: 'near', seed: 601, reflect: true }),
      YG({ obj: { 'plant.yg-reedbed': 3, 'plant.bulrush': 1 }, centres: [[430, 800, 60, 6, 3], [880, 806, 40, 5, 3], [1420, 790, 30, 6, 2]], s: [0.55, 0.75], layer: 'fore', seed: 602, reflect: true }),
      // the far bank: uncut tussocks under the trees, daisy drifts on the green
      YG({ obj: { 'plant.yg-meadow': 2, 'plant.grass-long': 1 }, centres: [[330, 576, 50, 2, 3], [1452, 580, 50, 2, 3], [560, 576, 40, 2, 2], [1660, 580, 40, 2, 2]], s: [0.26, 0.34], layer: 'mid', seed: 603 }),
      YG({ obj: { 'plant.daisies': 3, 'plant.grass': 2 }, centres: [[200, 534, 50, 4, 5], [860, 536, 60, 4, 6], [1180, 532, 50, 3, 5]], s: [0.24, 0.34], layer: 'far', seed: 604 }),
      // the near bank: the uncut margin in deep drifts, the path kept clear, the corners thick
      YG({ obj: 'plant.yg-meadow', centres: [[80, 830, 120, 14, 5], [640, 836, 80, 10, 3], [1240, 828, 60, 10, 2], [1560, 820, 110, 14, 5]], s: [0.8, 1.15], sByY: [[790, 0.85], [866, 1.2]], layer: 'fore', seed: 605,
        not: (x, y) => y > 862 || (x > 1100 && x < 1280 && y > 816) }),
      YG({ obj: 'plant.yg-meadow', centres: [[120, 930, 140, 3, 4], [1500, 930, 140, 3, 4]], s: [1.6, 2.0], layer: 'front', seed: 606, anim: { sway: { k: 0.6 } } }),
    ),
    scatter: [
      // the wooded edge of the common: the woods beyond, then the tree line with gaps for the cottages and the church
      { obj: { 'tree.distant': 3, 'tree.distant-pine': 2 }, layer: 'far', variant: [0, 1], seed: 42, area: { rect: [-160, 520, 1760, 530] }, n: 28, minGap: 28, s: [0.24, 0.5], anim: false, tint: { col: '#3a5a2a', k: [0.08, 0.08] },
        mask: { avoid: [{ rect: [200, 500, 300, 540] }, { rect: [430, 500, 510, 540] }, { rect: [800, 500, 880, 540] }, { rect: [1020, 500, 1180, 540] }, { rect: [1380, 500, 1460, 540] }] } },
      { obj: 'plant.grass', layer: 'far', variant: [0, 1], seed: 43, area: { rect: [-160, 534, 1760, 552] }, n: 60, minGap: 10, s: [0.18, 0.3], anim: false, reflect: true, tint: { col: '#c0b060', k: [0.08, 0.08] } },
      // reeds and bulrushes at both ends of the pond (wind strips), lilies on the water
      { obj: 'water.lily', layer: 'near', variant: [0, 1], seed: 46, area: { poly: [[60, 630], [520, 626], [520, 700], [60, 704]] }, n: 6, minGap: 26, s: [0.35, 0.7], anim: false },
      { obj: 'water.lily', layer: 'near', variant: [0, 1], seed: 47, area: { poly: [[1180, 650], [1440, 646], [1420, 740], [1180, 740]] }, n: 5, minGap: 26, s: [0.35, 0.7], anim: false },
      // the near bank: plumes and bulrushes at the water's edge, the wildflower margins, bluebells under the oak, the long grass
      { obj: { 'plant.wildflowers': 1, 'plant.grass': 3 }, layer: 'fore', variant: 0, seed: 49, area: { poly: [[-160, 790], [200, 812], [700, 806], [700, 866], [-160, 874]] }, n: 50, minGap: 10, s: [0.7, 1.1], sByY: [[790, 0.85], [870, 1.2]], anim: false, tint: { col: '#b8a050', k: [0.08, 0.08] } },
      { obj: { 'plant.wildflowers': 1, 'plant.grass': 3 }, layer: 'fore', variant: 1, seed: 50, area: { poly: [[1000, 806], [1400, 800], [1760, 770], [1760, 866], [1000, 866]] }, n: 46, minGap: 10, s: [0.7, 1.1], sByY: [[780, 0.85], [866, 1.2]], anim: false,
        mask: { avoid: [{ rect: [1090, 800, 1270, 852] }] } },
      // (no bluebell clump here: its spring sprites put the tile still over the 150 KB budget, reviewer 7 Oct)
    ],
    actors: [
      // geese going over to roost
      { obj: 'bird.goose-flight', layer: 'far', path: [[1720, 200], [-120, 250]], speed: 38, loop: 'loop', s: 0.55, seed: 73, offset: 0.2 },
    ],
    flocks: [{ obj: 'bird.small-flight', n: 5, area: [300, 180, 1300, 320], speed: 24, s: 0.5, seed: 81, layer: 'far' }],
    particles: 'season', weather: 'live', fx: { shadows: 2 },
  });
  /** The ground and water movers (sceneYgMovers: the behaviour presets at their real size; eye: the view's fitted eye). */
  const movers = (d) => {
    const M = typeof sceneYgMovers === 'function' ? sceneYgMovers(d, 4.26, [
      // the evening walk along the far path: a dog walker with an off-lead dog, two strollers
      { obj: 'person.dog-walker', preset: 'dog-walker', px: [[120, 562], [640, 560]], layer: 'mid', seed: 61, offset: 0.2 },
      { obj: 'person.walker', preset: 'stroll', px: [[1180, 560], [790, 562]], layer: 'mid', seed: 62, variant: 1, offset: 0.6 },
      { obj: 'person.walker', preset: 'elderly', px: [[1500, 562], [1230, 560]], layer: 'mid', seed: 63, variant: 0, offset: 0.3 },
      // waterbirds: a mallard pair, the swan gliding, a coot, a moorhen by the lilies, a drake near, a Canada goose
      { obj: 'bird.mallard', preset: 'duck', px: [[560, 652], [700, 648], [760, 660]], layer: 'near', seed: 64, variant: 0, offset: 0.2 },
      { obj: 'bird.mallard', preset: 'duck', px: [[600, 672], [730, 668], [790, 676]], layer: 'near', seed: 65, variant: 1, offset: 0.22 },
      { obj: 'bird.swan', preset: 'swan', px: [[1040, 628], [880, 634], [760, 630]], layer: 'near', seed: 66, variant: 0, offset: 0.5 },
      { obj: 'bird.coot', preset: 'coot', px: [[300, 704], [420, 700], [470, 716]], layer: 'near', seed: 67, offset: 0.4 },
      { obj: 'bird.moorhen', preset: 'moorhen', px: [[1300, 694], [1200, 690]], layer: 'near', seed: 68, offset: 0.7 },
      { obj: 'bird.mallard', preset: 'duck', px: [[880, 744], [700, 752]], layer: 'near', seed: 69, variant: 0, offset: 0.6 },
      { obj: 'bird.goose', preset: 'goose-swim', px: [[150, 642], [300, 640]], layer: 'near', seed: 70, variant: 0, offset: 0.1 },
      // strollers on the near path, kept apart: a dog walker on the left half, a walker on the right
      { obj: 'person.dog-walker', preset: 'dog-walker', px: [[260, 886], [760, 882]], layer: 'fore', seed: 71, variant: 0, offset: 0.4 },
      { obj: 'person.walker', preset: 'stroll', px: [[1480, 884], [960, 880]], layer: 'fore', seed: 72, variant: 1, offset: 0.7 },
    ]) : [];
    d.actors = M.concat(d.actors);
    return d;
  };
  sceneAdd(PACK, { id: ID, label: 'Yateley Green', site: 'Yateley Green — A summer evening beneath the birches', tags: ['uk', 'yateley', 'village green', 'pond', 'church', 'st peters', 'evening'], mood: 'dreamy', colour: 'amber' },
    (...a) => movers(base(...a)));
})();
