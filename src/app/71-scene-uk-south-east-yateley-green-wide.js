/* ============================================================
   COMPOSED SCENE: Yateley Green, view 1 (wide), docs/dev/SCENE_ENGINE.md section 3.
   Looking east across the green and Shute's Pond toward Church End: the woods
   beyond, St Peter's timber tower and spire and the brick and rendered cottages
   through the trees, the lane along the far edge, the gravel path round the pond,
   mallards, coots, a moorhen and Canada geese on the water, a cyclist, dog
   walkers and walkers on the mown grass, the wildflower margin in front, big
   oaks to the left and the right, a willow and alders on the far bank.
     https://yateley-tc.gov.uk/our-services/open-spaces/
     https://www.hart.gov.uk/sites/default/files/2022-11/yateley_green_accessible.pdf
   Data only (PURE): the season comes from the date ('auto'), the light from the
   live sky. One auto-season scene shared by the four seasonal items of the view,
   registered by 72-anim-pack-uk-south-east-yateley-green-v1.js
   with their original ids, so pins and the rotation keep working.
   ============================================================ */
(function () {
  if (typeof sceneAdd !== 'function') return;
  const PACK = 'uk-south-east-yateley-green', ID = 'yateley-green-1';
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
    base: { woods: ['#4f6a4c', '#62805a'], far: ['#86a06a', '#6f8c55'], grass: ['#5f8f3a', '#3f6b31', '#8db352'], mown: ['#8db352'], path: ['#b8aa8a', '#9c8e70', '#d2c6a8'], bank: ['#6a5c3a'] },
    spring: { woods: ['#557552', '#6a8c5e'], far: ['#8fab6c', '#76964f'], grass: ['#6f9f40', '#4c7a37', '#a6c95e'], mown: ['#a6c95e'] },
    autumn: { woods: ['#76643c', '#8c7c48'], far: ['#9a9a62', '#7f7e4c'], grass: ['#8a8a45', '#5f6a35', '#b5a65c'], mown: ['#b5a65c'], path: ['#ae9c78', '#8e7c5c', '#c8b690'] },
    winter: { woods: ['#6c6a70', '#7e7c80'], far: ['#9aa096', '#848c7e'], grass: ['#8d9277', '#6b735a', '#b3b59c'], mown: ['#b3b59c'], path: ['#a89c88', '#8a7e6c', '#c4b8a6'], bank: ['#5a5040'] },
  };
  const POND = 'M372 616Q520 590 800 594Q1090 590 1248 618Q1310 664 1196 714Q900 754 620 746Q398 734 356 682Q336 640 372 616z';
  const base = () => ({
    v: 1, id: ID, view: { lat: 51.34, lon: -0.83, heading: 100, fov: 78, horizon: 470, lift: 1 },
    at: 'afternoon', season: 'auto', tropic: 'summer', setting: 'natural', signage: false, palette: PALETTE,
    sky: { stars: 200, clouds: { n: 5, y: [40, 330], speed: 6 }, sunR: 26, moonR: 20 },
    layers: [
      { id: 'horizon', depth: 0.08, haze: 0.55 }, { id: 'far', depth: 0.2, haze: 0.28 }, { id: 'mid', depth: 0.45, haze: 0.1 },
      { id: 'near', depth: 0.75, haze: 0.03 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 },
    ],
    ground: [
      { layer: 'horizon', d: 'M-160 900V480Q300 470 800 478T1760 476V900Z', fill: '@far.0' },
      { layer: 'horizon', d: WOODS(482, 7, 1), fill: '@woods.0' },
      { layer: 'horizon', d: WOODS(488, 8, 0.7), fill: '@woods.1' },
      { layer: 'far', d: 'M-160 900V512Q400 506 800 514T1760 510V900Z', fill: { lin: [[0, '@far.1'], [0.18, '@grass.0'], [1, '@grass.1']], x1: 0, y1: 510, x2: 0, y2: 900 } },
      // broad mowing stripes in perspective (a lighter sward every other band)
      { layer: 'far', d: 'M549 514L576 514L-140 900L-520 900zM602 514L629 514L240 900L50 900zM656 514L682 514L620 900L430 900zM709 514L736 514L1000 900L810 900zM762 514L789 514L1380 900L1190 900zM816 514L842 514L1760 900L1570 900z', fill: { lin: [[0, '@mown', 0.03], [1, '@mown', 0.16]], x1: 0, y1: 514, x2: 0, y2: 900 } },
      // the lane along the far edge of the green
      { layer: 'far', d: 'M-160 524Q400 520 900 525T1760 521V533Q1200 536 900 536T-160 536Z', fill: '@path.1' },
      // the gravel path round the pond, widening toward the viewer
      { layer: 'mid', d: 'M874 530Q1000 540 1108 566Q1300 600 1334 642Q1350 700 1276 762Q1180 840 1074 905H1290Q1360 830 1388 760Q1410 690 1390 640Q1340 584 1134 562Q1010 536 888 530Z', fill: { lin: [[0, '@path.2'], [1, '@path.0']], x1: 0, y1: 530, x2: 0, y2: 900 } },
      { layer: 'mid', d: 'M362 612Q520 584 800 588Q1094 584 1258 614Q1326 666 1200 722Q900 762 618 754Q390 742 346 684Q324 640 362 612z', fill: '@bank' },
    ],
    water: [{ layer: 'mid', d: POND, y0: 592, y1: 752, base: ['#8fb4a8', '#4f8088', '#244a54'], reflect: true, shimmer: 20, lightPath: true }],
    place: [
      // Church End: St Peter's and the cottages between the trees
      { obj: 'landmark.st-peters-yateley', x: 1150, y: 510, s: 0.78, layer: 'far', variant: 0, seed: 1 },
      { obj: 'building.green-cottage', x: 548, y: 514, s: 0.27, layer: 'far', variant: 1, seed: 2 },
      { obj: 'building.green-cottage', x: 636, y: 516, s: 0.3, layer: 'far', variant: 0, seed: 3, flip: true },
      { obj: 'building.green-cottage', x: 722, y: 514, s: 0.25, layer: 'far', variant: 2, seed: 4 },
      { obj: 'building.green-cottage', x: 796, y: 516, s: 0.23, layer: 'far', variant: 0, seed: 5 },
      { obj: 'tree.distant-pine', x: 1268, y: 532, s: 0.42, layer: 'far', variant: 1, seed: 8 },
      // trees of the green beyond the pond, in groups at different depths (never one row): the oak pair on the left, a
      // hawthorn and a birch by the cottages, the chestnut right of the church
      { obj: 'tree.green-oak', x: 262, y: 552, s: 0.34, layer: 'far', variant: 2, seed: 26, anim: false },
      { obj: 'tree.green-oak', x: 318, y: 566, s: 0.27, layer: 'far', variant: 1, seed: 27, flip: true, anim: false },
      { obj: 'tree.hawthorn', x: 860, y: 548, s: 0.42, layer: 'far', variant: 1, seed: 28, anim: false },
      { obj: 'tree.green-birch', x: 476, y: 540, s: 0.2, layer: 'far', variant: 1, seed: 29, anim: false },
      { obj: 'tree.green-chestnut', x: 1362, y: 560, s: 0.3, layer: 'far', variant: 1, seed: 30, flip: true, anim: false },
      // the far bank of Shute's Pond (mirrored in the water): the willow, a shrub, alders at staggered depths
      { obj: 'tree.green-willow', x: 392, y: 606, s: 0.5, layer: 'mid', variant: 0, seed: 11, anim: { sway: { k: 0.8 } } },
      { obj: 'plant.shrub', x: 640, y: 593, s: 0.3, layer: 'mid', variant: 0, seed: 12, reflect: true, anim: false },
      { obj: 'tree.green-alder', x: 944, y: 594, s: 0.36, layer: 'mid', variant: 0, seed: 13, anim: false },
      { obj: 'tree.green-alder', x: 1226, y: 608, s: 0.44, layer: 'mid', variant: 1, seed: 14, anim: false },
      { obj: 'tree.green-alder', x: 120, y: 640, s: 0.46, layer: 'mid', variant: 0, seed: 15, anim: false, flip: true },
      { obj: 'water.fish-ring', x: 1040, y: 676, s: 0.5, layer: 'mid', seed: 16 },
      { obj: 'water.fish-ring', x: 520, y: 704, s: 0.4, layer: 'mid', variant: 1, seed: 17 },
      // the near margin: bench, robin, lamp, the big horse chestnut and a squirrel under it
      { obj: 'street.bench', x: 1296, y: 714, s: 0.9, layer: 'near', variant: 0, seed: 18 },
      { obj: 'bird.robin', x: 1262, y: 684, s: 0.6, layer: 'near', variant: 1, seed: 19 },
      { obj: 'street.lamp', x: 1236, y: 708, s: 0.68, layer: 'near', variant: 0, seed: 20 },
      { obj: 'tree.green-oak', x: 1530, y: 714, s: 0.9, layer: 'near', variant: 0, seed: 21, flip: true, anim: false },
      { obj: 'animal.squirrel', x: 1446, y: 722, s: 0.62, layer: 'near', seed: 22, flip: true },
      // the big oak on the left, over the wildflower margin
      { obj: 'tree.green-oak', x: 104, y: 838, s: 1.0, layer: 'fore', variant: 0, seed: 25, anim: false },
      // the frame: an oak bough reaching in over the top right (the gold standard's overhang)
      { obj: 'plant.yg-oak-bough', x: 1640, y: -26, s: 1.0, layer: 'front', variant: 0, seed: 31, flip: true, anim: { sway: { k: 0.8 } } },
    ].concat(
      // reed beds hugging the pond in clumps with gaps (the far bank mirrored; open water where the church reflects)
      YG({ obj: 'plant.yg-reedbed', centres: [[478, 598, 26, 2, 3], [712, 594, 22, 1.5, 2], [1010, 595, 30, 2, 3], [1176, 600, 16, 2, 2]], s: [0.2, 0.3], layer: 'mid', seed: 301, reflect: true }),
      YG({ obj: { 'plant.yg-reedbed': 3, 'plant.bulrush': 1 }, centres: [[372, 698, 24, 10, 3], [468, 736, 34, 6, 3], [1212, 706, 26, 8, 3], [1300, 668, 14, 8, 2]], s: [0.42, 0.62], sByY: [[660, 0.8], [750, 1.1]], layer: 'near', seed: 302, reflect: true }),
      // the uncut margins: tussock masses on the green beyond the pond and along its near side
      YG({ obj: 'plant.yg-meadow', centres: [[150, 586, 60, 6, 4], [1440, 590, 70, 6, 4], [560, 760, 60, 6, 3], [880, 770, 40, 4, 2]], s: [0.28, 0.42], sByY: [[580, 0.8], [770, 1.3]], layer: 'mid', seed: 303,
        not: (x, y) => (y < 740 && x > 330 && x < 1330) }),
      // the foreground: deep uncut grass and flowers in drifts, the path kept clear, the front corners thick
      YG({ obj: { 'plant.yg-meadow': 5, 'plant.grass-long': 1 }, centres: [[-40, 800, 90, 18, 5], [300, 834, 110, 16, 5], [1430, 748, 50, 6, 3], [740, 790, 60, 6, 3], [660, 862, 90, 12, 4], [930, 840, 50, 12, 2], [1470, 800, 80, 16, 4], [1660, 852, 60, 12, 3]],
        s: [0.9, 1.3], sByY: [[760, 0.75], [900, 1.3]], layer: 'fore', seed: 304, not: (x, y) => x > 1040 && x < 1330 && y > 740 }),
      YG({ obj: 'plant.yg-meadow', centres: [[90, 918, 110, 4, 3], [520, 926, 80, 3, 2], [1580, 918, 90, 4, 3]], s: [1.4, 1.8], layer: 'front', seed: 305, anim: { sway: { k: 0.6 } } }),
    ),
    scatter: [
      // the woods beyond Church End (horizon), and the tree line behind the cottages (far)
      { obj: { 'tree.distant': 3, 'tree.distant-pine': 2 }, layer: 'far', variant: [0, 1], seed: 42, area: { rect: [-160, 510, 1760, 520] }, n: 28, minGap: 20, s: [0.24, 0.5], anim: false, tint: { col: '#3a5a2a', k: [0.08, 0.08] },
        mask: { avoid: [{ rect: [450, 500, 850, 520] }, { rect: [1080, 500, 1230, 520] }] } },
      // tufts and daisies on the mown green (static: free per frame)
      { obj: 'plant.grass', layer: 'far', variant: [0, 1], seed: 43, area: { rect: [-160, 540, 1760, 600] }, n: 70, minGap: 7, s: [0.18, 0.32], sByY: [[540, 0.8], [600, 1.2]], anim: false, reflect: false,
        mask: { avoid: [{ rect: [300, 548, 1400, 640] }] }, tint: { col: '#c0b060', k: [0.08, 0.08] } },
      { obj: 'plant.grass', layer: 'mid', variant: [0, 1], seed: 44, area: { rect: [-160, 600, 1760, 780] }, n: 90, minGap: 10, s: [0.32, 0.6], sByY: [[600, 0.8], [780, 1.25]], anim: false, reflect: false,
        mask: { avoid: [{ poly: [[300, 560], [1300, 560], [1370, 650], [1220, 740], [900, 772], [600, 770], [330, 742], [300, 660]] }, { poly: [[1080, 560], [1400, 620], [1410, 760], [1290, 905], [1070, 905], [1290, 740], [1320, 640]] }] }, tint: { col: '#c0b060', k: [0.08, 0.08] } },
      // reeds and bulrushes on the far bank (mirrored), then the near margin
      { obj: 'water.lily', layer: 'mid', variant: [0, 1], seed: 49, area: { rect: [460, 694, 720, 736] }, n: 12, minGap: 16, s: [0.32, 0.5], anim: false },
      // the wildflower margin and the longer grass in front (wind strips)
      { obj: { 'plant.wildflowers': 1, 'plant.grass': 3 }, layer: 'fore', variant: 0, seed: 50, area: { rect: [-160, 762, 820, 880] }, n: 16, minGap: 9, s: [0.6, 1.0], sByY: [[762, 0.85], [880, 1.25]], anim: false, tint: { col: '#b8a050', k: [0.08, 0.08] } },
      { obj: { 'plant.wildflowers': 1, 'plant.grass': 3 }, layer: 'fore', variant: 1, seed: 53, area: { rect: [820, 762, 1760, 880] }, n: 14, minGap: 9, s: [0.6, 1.0], sByY: [[762, 0.85], [880, 1.25]], anim: false,
        mask: { avoid: [{ poly: [[1060, 760], [1400, 760], [1300, 905], [1060, 905]] }] } },
    ],
    actors: [
      // waterbirds paddling across the pond
      // people: a cyclist and a dog walker on the lane, walkers on the green and by the pond
      { obj: 'person.cyclist', layer: 'far', path: [[-80, 534], [1700, 530]], speed: 26, loop: 'loop', s: 0.36, seed: 71, offset: 0.15 },
    ],
    flocks: [{ obj: 'bird.small-flight', n: 6, area: [380, 160, 1180, 280], speed: 26, s: 0.5, seed: 81, layer: 'far' }],
    particles: 'season', weather: 'live', fx: { shadows: 2 },
  });
  /** All-year life (waterbirds, a squirrel): the season comes from the date (season 'auto'), so nothing that belongs to
      one season only (butterflies, bees, dragonflies) is drawn; the four seasonal items of the view share this one scene. */
  const YEAR_ROUND = [
      { obj: 'animal.squirrel', layer: 'fore', path: [[300, 806], [380, 812]], speed: 5, loop: 'pingpong', s: 0.34, seed: 99, offset: 0.4 },
  ];
  /** The ground and water movers (sceneYgMovers: the behaviour presets at their real size; 5.38: the view's fitted eye, metres). */
  const movers = (d) => {
    const M = typeof sceneYgMovers === 'function' ? sceneYgMovers(d, 5.38, [
      { obj: 'bird.mallard', px: [[640, 668], [820, 662]], layer: 'mid', seed: 61, variant: 0, offset: 0.2 },
      { obj: 'bird.mallard', px: [[700, 678], [860, 684]], layer: 'mid', seed: 62, variant: 1, offset: 0.6 },
      { obj: 'bird.mallard', px: [[1060, 704], [880, 712]], layer: 'mid', seed: 63, variant: 0, offset: 0.4 },
      { obj: 'bird.mallard', px: [[850, 714], [950, 718]], layer: 'mid', seed: 64, variant: 1, offset: 0.1 },
      { obj: 'bird.coot', px: [[540, 652], [660, 646]], layer: 'mid', seed: 65, offset: 0.5 },
      { obj: 'bird.moorhen', px: [[1160, 642], [1060, 638]], layer: 'mid', seed: 66, offset: 0.3 },
      { obj: 'bird.goose', preset: 'goose-swim', px: [[960, 628], [800, 624]], layer: 'mid', seed: 67, variant: 0, offset: 0.7 },
      { obj: 'bird.goose', preset: 'goose-swim', px: [[1010, 634], [850, 630]], layer: 'mid', seed: 68, variant: 0, offset: 0.66 },
      { obj: 'person.dog-walker', px: [[760, 536], [480, 536]], layer: 'far', seed: 72, offset: 0.5 },
      { obj: 'person.walker', px: [[820, 572], [1060, 576]], layer: 'mid', seed: 73, variant: 1, offset: 0.3 },
      { obj: 'person.walker', px: [[300, 600], [120, 612]], layer: 'mid', seed: 75, variant: 1, offset: 0.2 },
      { obj: 'person.dog-walker', px: [[1290, 830], [1180, 890]], layer: 'fore', seed: 76, variant: 2, offset: 0.6 },
    ]) : [];
    d.actors = M.concat(d.actors);
    // the heron in the reeds stands still and fishes (its own idle hooks: long freezes, then the neck strikes), at its real size
    d.place.push({ obj: 'bird.heron', x: 1232, y: 656, s: 0.2, layer: 'mid', seed: 100, flip: true });
    return d;
  };
  sceneAdd(PACK, { id: ID, label: 'Yateley Green', site: 'Yateley Green — The pond within the summer green', tags: ['uk', 'yateley', 'village green', 'pond', 'church', 'st peters'], mood: 'calm', colour: 'green' },
    (...a) => { const d = movers(base(...a)); d.actors = d.actors.concat(YEAR_ROUND); return d; });
})();
