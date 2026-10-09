/* ============================================================
   COMPOSED SCENE uk-south-east / Fleet Pond, view 2 (close)
   docs/dev/SCENE_ENGINE.md sections 3 and 17 (the convert stage).

   The rich hand-drawn view (72-anim-pack-uk-south-east-fleet-pond-v2.js,
   kept there as legacySvg) rebuilt from the object library for the canvas
   renderer. ONE auto-season scene serves the view's four seasonal items.

   From the raised boardwalk through the reedbed on the north-west shore,
   looking east-south-east across the open water (heading 110): common reed
   and reedmace margins and reed islands, a weeping willow and alder carr on
   the right, oak, birch and pine woodland on the far shore with Fleet's roofs
   behind, a viewing platform out on the water, mute swans, Canada geese,
   great crested grebes, coots, mallards and a grey heron fishing the reed
   edge; dragonflies over the reeds and a kingfisher's dash in summer.
   Sources: hart.gov.uk/fleet-pond, fleetpond.org.uk/about-fleet-pond.

   PURE: defines sceneUkFleetPondV2() -> the scene data, called once, lazily.
   ============================================================ */
function sceneUkFleetPondV2() {
  const HOR = 470, SHORE = 494;
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
  const reeds = { 'plant.reed': 5, 'plant.bulrush': 2 }, tint = { col: '#b0a070', k: [0, 0.1] };
  return {
    v: 1, id: 'fleet-pond-2',
    view: { lat: 51.287, lon: -0.826, heading: 110, fov: 76, horizon: HOR, lift: 1 },
    at: 'afternoon', season: 'auto', tropic: 'summer', setting: 'natural', weather: 'live', particles: 'season',
    palette: pal,
    layers: [{ id: 'horizon', depth: 0.08, haze: 0.4 }, { id: 'far', depth: 0.2, haze: 0.22 }, { id: 'mid', depth: 0.45, haze: 0.1 }, { id: 'near', depth: 0.75, haze: 0.04 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 }],
    sky: { stars: 240, clouds: { n: 4, y: [30, 330], speed: 5 }, sunR: 24, moonR: 18 },
    ground: [
      { layer: 'horizon', d: 'M-160 ' + (SHORE + 2) + 'L' + edge(-160, 1760, 470, 8, 26, 21) + 'L1760 ' + (SHORE + 2) + 'Z', fill: '@wood.0' },
      { layer: 'far', d: 'M-160 ' + (SHORE + 4) + 'L' + edge(-160, 1760, SHORE - 3, 2, 30, 22) + 'L1760 ' + (SHORE + 4) + 'Z', fill: '@bank.1' },
      // the right bank under the willow and the alders
      { layer: 'near', d: 'M1300 900L1290 620Q1380 572 1520 560Q1640 552 1760 548V900Z', fill: { lin: [[0, '@bank.0'], [1, '@reedbed.1']], y1: 550, y2: 760 } },
      // the reedbed's root mat either side of the boardwalk
      { layer: 'fore', d: 'M-160 900V560Q60 600 240 690L380 900Z', fill: { lin: [[0, '@reedbed.0'], [1, '@mud.0']], y1: 560, y2: 900 } },
      { layer: 'fore', d: 'M780 900Q880 760 1100 736Q1420 690 1760 670V900Z', fill: { lin: [[0, '@reedbed.0'], [1, '@mud.0']], y1: 640, y2: 900 } },
    ],
    water: [
      { layer: 'far', d: 'M-160 ' + SHORE + 'H1760V900H-160Z', y0: SHORE, y1: 900, base: ['#8ab6c4', '#4f8ca0', '#2c5f74'], reflect: true, shimmer: 34, lightPath: true },
    ],
    place: [
      // a viewing platform out on the water, a birder at its rail
      { obj: 'structure.viewing-platform', x: 1130, y: 640, s: 0.56, layer: 'near', seed: 6, anim: false },
      // the right bank: a weeping willow over the water, alders and an oak behind
      { obj: 'tree.pond-willow', x: 1420, y: 594, s: 0.8, variant: 1, layer: 'near', seed: 7, anim: { sway: { k: 0.5 } } },
      { obj: 'tree.pond-alder', x: 1560, y: 572, s: 0.62, flip: true, variant: 0, layer: 'near', seed: 8, anim: false },
      { obj: 'tree.pond-oak', x: 1700, y: 566, s: 0.95, variant: 1, layer: 'near', seed: 9, anim: false },
      // the signature: the raised boardwalk through the reeds, running up-left from the viewer
      { obj: 'landmark.fleet-pond-boardwalk', x: 540, y: 900, s: 1, variant: 1, layer: 'fore', seed: 10 },
      // the heron fishing the reed edge, birds at rest on the water
      { obj: 'bird.heron', x: 1250, y: 664, s: 0.5, flip: true, variant: 0, layer: 'near', seed: 11 },
      // the bank's edge under the willow, and the reed islands' wet margins
      { obj: 'water.edge', x: 1360, y: 616, s: 0.6, variant: 0, layer: 'near', seed: 25 },
      { obj: 'water.edge', x: 1600, y: 600, s: 0.55, variant: 0, flip: true, layer: 'near', seed: 26 },
      { obj: 'bird.swan', x: 912, y: 584, s: 0.42, variant: 0, layer: 'mid', seed: 12 },
      { obj: 'bird.swan', x: 1010, y: 596, s: 0.38, flip: true, variant: 0, layer: 'mid', seed: 13 },
      { obj: 'bird.goose', x: 344, y: 630, s: 0.32, variant: 0, layer: 'mid', seed: 14 },
      { obj: 'bird.goose', x: 368, y: 642, s: 0.3, flip: true, variant: 1, layer: 'mid', seed: 15 },
      { obj: 'bird.goose', x: 492, y: 652, s: 0.33, variant: 0, layer: 'mid', seed: 16 },
      { obj: 'bird.grebe', x: 552, y: 596, s: 0.36, layer: 'mid', seed: 17 },
      { obj: 'bird.grebe', x: 846, y: 634, s: 0.38, flip: true, layer: 'mid', seed: 18 },
      { obj: 'bird.coot', x: 716, y: 690, s: 0.36, layer: 'mid', seed: 19 },
      { obj: 'bird.mallard', x: 752, y: 752, s: 0.5, variant: 0, flip: true, layer: 'mid', seed: 20 },
      { obj: 'bird.mallard', x: 742, y: 778, s: 0.48, variant: 1, flip: true, layer: 'mid', seed: 21 },
      { obj: 'water.fish-ring', x: 560, y: 690, s: 0.6, layer: 'mid', seed: 22 },
      { obj: 'water.fish-ring', x: 996, y: 640, s: 0.42, variant: 1, layer: 'mid', seed: 23 },
      // a kingfisher on a reed stem at the margin (turns its head)
      { obj: 'bird.kingfisher', x: 208, y: 690, s: 0.7, variant: 0, layer: 'fore', seed: 24 },
    ],
    scatter: [
      // the far wood
      { obj: 'tree.pond-wood', layer: 'horizon', seed: 31, area: { rect: [-150, HOR, 1750, SHORE - 4] }, n: 19, minGap: 70,
        s: [0.3, 0.5], sByY: [[HOR, 0.85], [SHORE, 1.15]], flip: 0.5, variant: [2, 3], anim: false },
      // the far shore: alder carr, oak and birch at the water, mirrored
      { obj: 'tree.pond-alder', layer: 'far', seed: 32, area: { rect: [-150, SHORE - 6, 1750, SHORE + 2] }, n: 16, minGap: 44, s: [0.26, 0.42], flip: 0.5, variant: [1, 2], anim: false },
      { obj: 'tree.pond-oak', layer: 'far', seed: 132, area: { rect: [-150, SHORE - 6, 1750, SHORE + 2] }, n: 14, minGap: 50, s: [0.26, 0.38], flip: 0.5, variant: [0, 1], anim: false },
      { obj: 'tree.pond-pine', layer: 'far', seed: 232, area: { rect: [-150, SHORE - 6, 1750, SHORE + 2] }, n: 5, minGap: 200, s: [0.36, 0.5], flip: 0.5, variant: [0, 1], anim: false },
      { obj: 'tree.pond-birch', layer: 'far', seed: 332, area: { rect: [-150, SHORE - 6, 1750, SHORE + 2] }, n: 7, minGap: 80, s: [0.24, 0.42], flip: 0.5, variant: 'random', anim: false },
      { obj: { 'plant.reed': 3, 'plant.bulrush': 1 }, layer: 'far', seed: 33, area: { rect: [-150, SHORE - 2, 1750, SHORE + 6] }, n: 130, minGap: 9,
        s: [0.16, 0.28], flip: 0.5, variant: 0, anim: false },
      // reed islands out in the open water
      { obj: reeds, layer: 'near', seed: 34, area: { poly: [[220, 500], [700, 498], [700, 520], [220, 530]] }, n: 36, minGap: 11, s: [0.3, 0.45], flip: 0.5, variant: 'random', tint, mask: { noise: { scale: 90, cut: 0.45 } }, anim: false },
      { obj: reeds, layer: 'near', seed: 35, area: { poly: [[1100, 520], [1500, 520], [1500, 560], [1100, 560]] }, n: 36, minGap: 11, s: [0.34, 0.5], flip: 0.5, variant: 'random', mask: { noise: { scale: 90, cut: 0.45 } }, anim: false },
      // lily pads in the bay
      { obj: 'water.lily', layer: 'near', seed: 36, area: { poly: [[480, 700], [800, 690], [860, 880], [520, 890]] }, n: 10, minGap: 44, s: [0.32, 0.55], sByY: [[690, 0.8], [890, 1.3]], flip: 0.5, variant: 'random', tint: { col: '#3a6a3a', k: [0, 0.1] }, anim: false },
      // the bank's grasses and ferns under the right-hand trees
      { obj: 'plant.grass', layer: 'near', seed: 37, area: { poly: [[1300, 600], [1500, 566], [1760, 556], [1760, 610], [1300, 650]] }, n: 70, minGap: 10, s: [0.5, 0.8], flip: 0.5, variant: 'random', tint: { col: '#8a8a50', k: [0, 0.1] }, anim: false },
      // the near reedbed left of the boardwalk (dense, in wind strips)
      { obj: reeds, layer: 'fore', seed: 38, area: { poly: [[-160, 556], [240, 680], [330, 900], [-160, 900]] }, n: 330, minGap: 10, s: [0.8, 1.1], sByY: [[560, 0.8], [900, 1.55]], flip: 0.5, variant: 'random', anim: false },
      // the near reedbed right of the boardwalk, out to the right bank
      { obj: reeds, layer: 'fore', seed: 39, area: { poly: [[800, 900], [900, 760], [1100, 730], [1300, 700], [1760, 660], [1760, 900]] }, n: 460, minGap: 11, s: [0.8, 1.1], sByY: [[660, 0.55], [900, 1.6]], flip: 0.5, variant: 'random', anim: false },
      // the foreground: the tallest reeds and reedmace framing the bottom corners, rooted below the frame
      { obj: { 'plant.reed': 4, 'plant.bulrush': 3, 'plant.grass': 1 }, layer: 'front', seed: 40, area: { poly: [[-160, 820], [260, 860], [260, 990], [-160, 990]] }, n: 80, minGap: 13, s: [1.4, 1.9], flip: 0.5, variant: 'random', anim: 'strip' },
      { obj: { 'plant.reed': 4, 'plant.bulrush': 3, 'plant.grass': 1 }, layer: 'front', seed: 41, area: { poly: [[820, 900], [1000, 820], [1760, 800], [1760, 990], [820, 990]] }, n: 170, minGap: 13, s: [1.3, 1.9], flip: 0.5, variant: 'random', anim: 'strip' },
    ],
    actors: [
      // a South Western train on the main line along the north shore (left), glimpsed through the far wood; lit after dusk
      { obj: 'rail.train', layer: 'horizon', path: [[-700, SHORE - 22], [900, SHORE - 22]], speed: 60, loop: 'loop', s: 0.24, seed: 41, offset: 0.2, variant: 1 },
      // a walker with a dog coming along the boardwalk, a birder on the far platform
      { obj: 'person.dog-walker', layer: 'fore', path: [[296, 742], [420, 812], [520, 880]], speed: 8, loop: 'pingpong', s: 1.02, seed: 42, offset: 0.1, variant: 1 },
      { obj: 'person.walker', layer: 'near', path: [[1100, 632], [1150, 632]], speed: 3, loop: 'pingpong', s: 0.44, seed: 43, offset: 0.5, variant: 3 },
      // swimmers crossing
      { obj: 'bird.swan', layer: 'mid', path: [[1300, 548], [420, 560]], speed: 6, loop: 'pingpong', s: 0.3, seed: 44, offset: 0.3 },
      { obj: 'bird.grebe', layer: 'mid', path: [[600, 560], [900, 548]], speed: 5, loop: 'pingpong', s: 0.3, seed: 45, offset: 0.7 },
      { obj: 'bird.coot', layer: 'mid', path: [[980, 720], [1180, 700]], speed: 6, loop: 'pingpong', s: 0.4, seed: 46, offset: 0.2 },
      { obj: 'bird.moorhen', layer: 'mid', path: [[1240, 690], [1060, 712]], speed: 5, loop: 'pingpong', s: 0.38, seed: 47, offset: 0.6 },
      // the kingfisher's blue flash along the reed edge; dragonflies and a bee over the reeds
      { obj: 'bird.kingfisher-flight', layer: 'near', path: [[1700, 700], [1100, 690], [500, 720], [-100, 700]], speed: 170, loop: 'loop', s: 1, seed: 48, offset: 0.35 },
      { obj: 'animal.dragonfly', layer: 'near', path: [[420, 540], [500, 560], [460, 600]], speed: 40, loop: 'pingpong', s: 0.8, seed: 49, variant: 1 },
      { obj: 'animal.dragonfly', layer: 'fore', path: [[180, 720], [260, 690], [220, 760]], speed: 46, loop: 'pingpong', s: 0.9, seed: 50 },
      { obj: 'animal.dragonfly', layer: 'near', path: [[1380, 650], [1460, 630], [1420, 690]], speed: 44, loop: 'pingpong', s: 0.7, seed: 51 },
      { obj: 'animal.bee', layer: 'front', path: [[1500, 770], [1560, 740], [1620, 790]], speed: 30, loop: 'pingpong', s: 1.1, seed: 52 },
    ],
    flocks: [
      { obj: 'bird.goose-flight', n: 5, area: [200, 120, 1400, 300], speed: 32, s: 0.34, seed: 61, layer: 'horizon' },
      { obj: 'bird.small-flight', n: 6, area: [300, 220, 1300, 430], speed: 44, s: 0.45, seed: 62, layer: 'horizon' },
    ],
  };
}
