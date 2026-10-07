/* ============================================================
   COMPOSED SCENE uk-south-east / Fleet Pond, view 4 (evening)
   docs/dev/SCENE_ENGINE.md sections 3 and 17 (the convert stage).

   The rich hand-drawn view (72-anim-pack-uk-south-east-fleet-pond-v4.js,
   kept there as legacySvg) rebuilt from the object library, so the canvas
   renderer bakes it. ONE auto-season scene serves the view's four seasonal
   items (the date picks the season; the live sky picks the light; its
   authored moment is sunset, for sheets and the reduced-motion still).

   From the boardwalk platform on the south-east shore, looking
   west-north-west across the open water into the evening sun (heading 285).
   Left: the reedbed and the alder and willow carr on its bank. Far: the
   South Western main line on its embankment along the north shore by
   Fleet station, trains crossing, birches on the bank, Fleet's houses
   beyond; the wood to the west. Right: the railed platform with its bench
   and board, walkers and a dog on it, an alder over it. On the water: mute
   swans, Canada geese, great crested grebes, coots and mallards.
   Sources: hart.gov.uk/fleet-pond, en.wikipedia.org/wiki/Fleet_Pond.

   PURE: defines one function, sceneUkFleetPondV4() -> the scene data.
   ============================================================ */
function sceneUkFleetPondV4() {
  const HOR = 512, SHORE = 524;
  const pal = {
    base:   { wood: ['#4f6a44', '#3d5638'], bank: ['#5d6a3a', '#4a5530'], reedbed: ['#6a7a3c', '#55632f'], mud: ['#5a4c38', '#43392b'] },
    spring: { wood: ['#5f7e48', '#486640'], bank: ['#62783c', '#4c5e32'], reedbed: ['#6f8240', '#59692f'] },
    autumn: { wood: ['#8a6a3a', '#6a5232'], bank: ['#7a6c3a', '#5f5428'], reedbed: ['#9a8448', '#7a6634'] },
    winter: { wood: ['#5a5a50', '#47483f'], bank: ['#7c7e70', '#62645a'], reedbed: ['#a39a78', '#857c5c'], mud: ['#6a6052', '#504a40'] },
  };
  const edge = (x0, x1, y, amp, n, seed) => {
    const r = sceneRnd(seed); let d = '';
    for (let i = 0; i <= n; i++) d += (i ? 'L' : '') + Math.round(x0 + (x1 - x0) * i / n) + ' ' + Math.round(y + (r() - 0.5) * 2 * amp);
    return d;
  };
  const reeds = { 'plant.reed': 5, 'plant.bulrush': 2 };
  return {
    v: 1, id: 'fleet-pond-4',
    view: { lat: 51.29, lon: -0.83, heading: 285, fov: 92, horizon: HOR, lift: 1 },
    at: 'sunset', season: 'auto', tropic: 'summer', setting: 'natural', weather: 'live', particles: 'season',
    palette: pal,
    layers: [{ id: 'horizon', depth: 0.08, haze: 0.4 }, { id: 'far', depth: 0.2, haze: 0.22 }, { id: 'mid', depth: 0.45, haze: 0.1 }, { id: 'near', depth: 0.75, haze: 0.04 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 }],
    sky: { stars: 240, clouds: { n: 4, y: [40, 340], speed: 5 }, sunR: 26, moonR: 18 },
    ground: [
      // the wood to the west (left) and the low land beyond the railway (right)
      { layer: 'horizon', d: 'M-160 ' + (SHORE + 2) + 'L' + edge(-160, 1760, 506, 5, 26, 41) + 'L1760 ' + (SHORE + 2) + 'Z', fill: '@wood.0' },
      // the rising ground of the town beyond the railway (the houses and their trees stand on it)
      { layer: 'horizon', d: 'M620 ' + (SHORE + 2) + 'L620 490Q700 478 800 476L' + edge(800, 1760, 474, 3, 16, 43) + 'L1760 ' + (SHORE + 2) + 'Z', fill: '@bank.0' },
      { layer: 'far', d: 'M-160 ' + (SHORE + 4) + 'L' + edge(-160, 1760, SHORE - 3, 2, 30, 42) + 'L1760 ' + (SHORE + 4) + 'Z', fill: '@bank.1' },
      // the carr bank and reedbed on the left
      { layer: 'near', d: 'M-160 900V560Q120 570 360 620Q540 680 600 780Q620 850 560 900Z', fill: { lin: [[0, '@bank.0'], [1, '@mud.0']], y1: 560, y2: 900 } },
      // the right-hand shore under the platform
      { layer: 'fore', d: 'M1160 900Q1240 830 1420 812Q1600 800 1760 806V900Z', fill: { lin: [[0, '@bank.0'], [1, '@mud.1']], y1: 800, y2: 900 } },
    ],
    water: [
      { layer: 'far', d: 'M-160 ' + SHORE + 'H1760V900H-160Z', y0: SHORE, y1: 900, base: ['#8ab6c4', '#4f8ca0', '#2c5f74'], reflect: true, shimmer: 30, lightPath: true },
    ],
    place: [
      // the railway embankment along the north shore (right), birches on its slope
      { obj: 'rail.embankment', x: 650, y: SHORE + 2, s: 0.56, variant: 0, layer: 'far', seed: 1 },
      { obj: 'rail.embankment', x: 884, y: SHORE + 2, s: 0.56, variant: 1, flip: true, layer: 'far', seed: 2 },
      { obj: 'rail.embankment', x: 1118, y: SHORE + 2, s: 0.56, variant: 0, layer: 'far', seed: 3 },
      { obj: 'rail.embankment', x: 1352, y: SHORE + 2, s: 0.56, variant: 1, flip: true, layer: 'far', seed: 4 },
      { obj: 'rail.embankment', x: 1586, y: SHORE + 2, s: 0.56, variant: 0, layer: 'far', seed: 5 },
      // Fleet's houses beyond the line (windows lit from real dusk)
      { obj: 'building.cottage', x: 1210, y: 470, s: 0.24, variant: 0, layer: 'horizon', seed: 7 },
      { obj: 'building.cottage', x: 1290, y: 472, s: 0.22, variant: 0, flip: true, layer: 'horizon', seed: 8 },
      { obj: 'building.cottage', x: 1420, y: 470, s: 0.24, variant: 0, layer: 'horizon', seed: 9 },
      { obj: 'building.cottage', x: 1530, y: 474, s: 0.2, variant: 0, flip: true, layer: 'horizon', seed: 10 },
      // the carr on the left bank: willows, alders and a birch (the near willow sways)
      { obj: 'tree.pond-willow', x: 380, y: 640, s: 1.0, variant: 0, layer: 'near', seed: 11, anim: { sway: { k: 0.5 } } },
      { obj: 'tree.pond-willow', x: 300, y: 610, s: 0.85, flip: true, variant: 1, layer: 'near', seed: 12, anim: false },
      { obj: 'tree.pond-alder', x: 100, y: 640, s: 1.0, variant: 0, layer: 'near', seed: 13, anim: false },
      { obj: 'tree.pond-alder', x: 220, y: 600, s: 0.8, flip: true, variant: 2, layer: 'near', seed: 14, anim: false },
      { obj: 'tree.pond-oak', x: -60, y: 600, s: 1.1, variant: 1, layer: 'near', seed: 15, anim: false },
      { obj: 'tree.pond-birch', x: 500, y: 650, s: 0.8, variant: 1, layer: 'near', seed: 16, anim: false },
      // the signature: the platform along the right-hand shore, side-on, with its bench and board
      { obj: 'landmark.fleet-pond-boardwalk', x: 1420, y: 832, s: 0.74, variant: 3, layer: 'fore', seed: 17 },
      // the alder over the platform at the right edge
      { obj: 'tree.pond-alder', x: 1600, y: 880, s: 1.45, variant: 1, flip: true, layer: 'front', seed: 18, anim: { sway: { k: 0.5 } } },
      // a birder at the platform rail, glassing the water
      { obj: 'person.walker', x: 1250, y: 790, s: 0.9, variant: 2, layer: 'fore', seed: 19, anim: false },
      // birds at rest that paddle and turn
      { obj: 'bird.swan', x: 650, y: 652, s: 0.56, variant: 0, layer: 'mid', seed: 20 },
      { obj: 'bird.swan', x: 712, y: 664, s: 0.52, flip: true, variant: 1, layer: 'mid', seed: 21 },
      { obj: 'bird.goose', x: 1070, y: 550, s: 0.26, variant: 0, layer: 'mid', seed: 22 },
      { obj: 'bird.goose', x: 1160, y: 556, s: 0.25, flip: true, variant: 1, layer: 'mid', seed: 23 },
      { obj: 'bird.goose', x: 1262, y: 548, s: 0.24, variant: 0, layer: 'mid', seed: 24 },
      { obj: 'bird.grebe', x: 780, y: 580, s: 0.3, layer: 'mid', seed: 25 },
      { obj: 'bird.grebe', x: 1076, y: 604, s: 0.32, flip: true, layer: 'mid', seed: 26 },
      { obj: 'bird.coot', x: 880, y: 634, s: 0.34, layer: 'mid', seed: 27 },
      { obj: 'bird.coot', x: 1380, y: 612, s: 0.32, flip: true, layer: 'mid', seed: 28 },
      { obj: 'bird.mallard', x: 950, y: 748, s: 0.56, variant: 0, layer: 'mid', seed: 29 },
      { obj: 'bird.mallard', x: 1090, y: 762, s: 0.54, variant: 1, flip: true, layer: 'mid', seed: 30 },
      { obj: 'water.fish-ring', x: 1220, y: 650, s: 0.6, layer: 'mid', seed: 31 },
      { obj: 'water.fish-ring', x: 860, y: 600, s: 0.45, variant: 1, layer: 'mid', seed: 32 },
      // the wet margin at the foot of the carr
      { obj: 'water.edge', x: 540, y: 720, s: 0.6, variant: 0, layer: 'near', seed: 33 },
    ],
    scatter: [
      // the wood to the west (left), and the birches and scrub along the railway (right)
      { obj: 'tree.pond-wood', layer: 'horizon', seed: 41, area: { rect: [-150, HOR - 4, 760, SHORE - 2] }, n: 12, minGap: 60,
        s: [0.3, 0.5], sByY: [[HOR, 0.85], [SHORE, 1.15]], flip: 0.5, variant: [0, 1], anim: false },
      { obj: 'tree.pond-birch', layer: 'far', seed: 42, area: { rect: [640, SHORE - 30, 1760, SHORE - 20] }, n: 7, minGap: 120, s: [0.18, 0.3], flip: 0.5, variant: 'random', anim: false },
      { obj: 'tree.pond-oak', layer: 'horizon', seed: 43, area: { rect: [1000, 470, 1760, 478] }, n: 9, minGap: 70, s: [0.16, 0.26], flip: 0.5, variant: [0, 1], anim: false },
      // the far reed fringe along the west shore (mirrored)
      { obj: { 'plant.reed': 3, 'plant.bulrush': 1 }, layer: 'far', seed: 44, area: { rect: [-150, SHORE - 2, 1760, SHORE + 4] }, n: 100, minGap: 9, s: [0.14, 0.24], flip: 0.5, variant: 0, tint: { col: '#a09060', k: [0, 0.1] }, anim: false },
      // the reedbed on the left bank, round the carr (static), and its grasses
      { obj: reeds, layer: 'near', seed: 45, area: { poly: [[-160, 640], [300, 660], [560, 760], [600, 900], [-160, 900]] }, n: 360, minGap: 10,
        s: [0.7, 1.05], sByY: [[640, 0.7], [900, 1.45]], flip: 0.5, variant: 'random', anim: false },
      // water lilies off the reed edge
      { obj: 'water.lily', layer: 'near', seed: 46, area: { poly: [[580, 700], [800, 690], [820, 800], [600, 810]] }, n: 9, minGap: 30, s: [0.32, 0.55], flip: 0.5, variant: [0, 1], tint: { col: '#3a6a3a', k: [0, 0.1] }, anim: false },
      // grass and reeds along the right-hand shore under the platform
      { obj: { 'plant.grass': 3, 'plant.reed': 1 }, layer: 'fore', seed: 47, area: { poly: [[1180, 880], [1260, 830], [1760, 812], [1760, 900], [1180, 900]] }, n: 40, minGap: 16,
        s: [0.7, 1.0], flip: 0.5, variant: 'random', tint: { col: '#a0a060', k: [0, 0.1] }, anim: false },
      // the foreground reeds at the bottom left, swaying in wind strips
      { obj: { 'plant.reed': 4, 'plant.bulrush': 3, 'plant.grass': 1 }, layer: 'front', seed: 48, area: { poly: [[-160, 820], [520, 850], [560, 990], [-160, 990]] }, n: 120, minGap: 14,
        s: [1.2, 1.7], flip: 0.5, variant: 'random', anim: 'strip' },
    ],
    actors: [
      // a South Western train along the embankment (lit after dusk)
      { obj: 'rail.train', layer: 'far', path: [[300, SHORE - 30], [2400, SHORE - 30]], speed: 70, loop: 'loop', s: 0.34, seed: 51, offset: 0.35, variant: 1 },
      // a walker with a dog along the platform and back
      { obj: 'person.dog-walker', layer: 'fore', path: [[1310, 786], [1520, 776]], speed: 8, loop: 'pingpong', s: 0.92, seed: 52, offset: 0.5, variant: 3 },
      // swimmers crossing the open water
      { obj: 'bird.swan', layer: 'mid', path: [[1300, 590], [600, 604]], speed: 5, loop: 'pingpong', s: 0.36, seed: 53, offset: 0.2 },
      { obj: 'bird.grebe', layer: 'mid', path: [[700, 700], [1000, 680]], speed: 4, loop: 'pingpong', s: 0.4, seed: 54, offset: 0.6 },
      { obj: 'bird.grebe', layer: 'mid', path: [[730, 712], [1030, 690]], speed: 4, loop: 'pingpong', s: 0.38, seed: 55, offset: 0.55 },
      { obj: 'bird.coot', layer: 'mid', path: [[1100, 700], [1300, 690]], speed: 6, loop: 'pingpong', s: 0.4, seed: 56, offset: 0.3 },
      { obj: 'bird.moorhen', layer: 'mid', path: [[640, 760], [780, 740]], speed: 4, loop: 'pingpong', s: 0.44, seed: 57, offset: 0.8 },
      // a kingfisher's dash along the reed edge, dragonflies over the water
      { obj: 'bird.kingfisher-flight', layer: 'near', path: [[-100, 700], [500, 720], [1100, 760], [1800, 740]], speed: 170, loop: 'loop', s: 0.9, seed: 58, offset: 0.4 },
      { obj: 'animal.dragonfly', layer: 'near', path: [[700, 720], [800, 700], [760, 760]], speed: 40, loop: 'pingpong', s: 0.8, seed: 59 },
      { obj: 'animal.dragonfly', layer: 'near', path: [[1040, 690], [1140, 670], [1100, 720]], speed: 44, loop: 'pingpong', s: 0.7, seed: 60, variant: 1 },
    ],
    flocks: [
      { obj: 'bird.goose-flight', n: 7, area: [100, 160, 1400, 360], speed: 34, s: 0.34, seed: 61, layer: 'horizon' },
      { obj: 'bird.small-flight', n: 5, area: [400, 220, 1300, 420], speed: 46, s: 0.45, seed: 62, layer: 'horizon' },
    ],
  };
}
