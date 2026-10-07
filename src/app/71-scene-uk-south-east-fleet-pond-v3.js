/* ============================================================
   COMPOSED SCENE uk-south-east / Fleet Pond, view 3 (the woodland shore)
   docs/dev/SCENE_ENGINE.md sections 3 and 17 (the convert stage).

   The rich hand-drawn view (72-anim-pack-uk-south-east-fleet-pond-v3.js,
   kept there as legacySvg) rebuilt from the object library, so the canvas
   renderer bakes it. ONE auto-season scene serves the view's four seasonal
   items (the date picks the season; the live sky picks the light).

   Fleet Pond from Sandy Bay, the small sandy beach on the east shore,
   looking west across the broad water (heading 262). Left: the wooded
   shore (oak, birch, willow and alder over leaf litter, a grey squirrel and
   a robin on a fallen log). Right: the east reedbed with the boardwalk out
   to its viewing platform. Beyond: the island's tall Scots pine, the far
   wood and the South Western main line glimpsed at the
   north-west corner. On the water: mute swans, Canada geese, a grey heron
   at the reed edge, mallards, coots and great crested grebes.
   Sources: hart.gov.uk/fleet-pond, fleetpondsociety.co.uk.

   PURE: defines one function, sceneUkFleetPondV3() -> the scene data.
   ============================================================ */
function sceneUkFleetPondV3() {
  const HOR = 520, SHORE = 546;
  const pal = {
    base:   { wood: ['#4f6a44', '#3d5638'], bank: ['#5d6a3a', '#4a5530'], reedbed: ['#6a7a3c', '#55632f'], litter: ['#6a5a3a', '#4e4230'], sand: ['#d8c49a', '#bca47a'] },
    spring: { wood: ['#5f7e48', '#486640'], bank: ['#62783c', '#4c5e32'], reedbed: ['#6f8240', '#59692f'], litter: ['#5e6a3a', '#4a5230'] },
    autumn: { wood: ['#8a6a3a', '#6a5232'], bank: ['#7a6c3a', '#5f5428'], reedbed: ['#9a8448', '#7a6634'], litter: ['#a06a2a', '#7a4e22'] },
    winter: { wood: ['#5a5a50', '#47483f'], bank: ['#7c7e70', '#62645a'], reedbed: ['#a39a78', '#857c5c'], litter: ['#7a6e5e', '#5e5446'], sand: ['#d4ccb8', '#b8ae98'] },
  };
  const edge = (x0, x1, y, amp, n, seed) => {
    const r = sceneRnd(seed); let d = '';
    for (let i = 0; i <= n; i++) d += (i ? 'L' : '') + Math.round(x0 + (x1 - x0) * i / n) + ' ' + Math.round(y + (r() - 0.5) * 2 * amp);
    return d;
  };
  const reeds = { 'plant.reed': 5, 'plant.bulrush': 2 };
  return {
    v: 1, id: 'fleet-pond-3',
    view: { lat: 51.29, lon: -0.82, heading: 262, fov: 80, horizon: HOR, lift: 1 },
    at: 'afternoon', season: 'auto', tropic: 'summer', setting: 'natural', weather: 'live', particles: 'season',
    palette: pal,
    layers: [{ id: 'horizon', depth: 0.08, haze: 0.4 }, { id: 'far', depth: 0.2, haze: 0.22 }, { id: 'mid', depth: 0.45, haze: 0.1 }, { id: 'near', depth: 0.75, haze: 0.04 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 }],
    sky: { stars: 220, clouds: { n: 4, y: [40, 380], speed: 5 }, sunR: 24, moonR: 18 },
    ground: [
      // the far wood's low mass and the far shore's bank
      { layer: 'horizon', d: 'M-160 ' + (SHORE + 2) + 'L' + edge(-160, 1760, 528, 5, 26, 31) + 'L1760 ' + (SHORE + 2) + 'Z', fill: '@wood.0' },
      { layer: 'far', d: 'M-160 ' + (SHORE + 4) + 'L' + edge(-160, 1760, SHORE - 3, 2, 30, 32) + 'L1760 ' + (SHORE + 4) + 'Z', fill: '@bank.1' },
      // the island under the tall pine
      { layer: 'far', d: 'M560 ' + (SHORE + 2) + 'Q600 ' + (SHORE - 14) + ' 680 ' + (SHORE - 16) + 'Q760 ' + (SHORE - 14) + ' 800 ' + (SHORE + 2) + 'Z', fill: '@bank.0' },
      // the wooded shore on the left, its leaf litter falling to the water
      { layer: 'near', d: 'M-160 900V600Q120 590 330 630Q480 660 560 740Q590 800 560 900Z', fill: { lin: [[0, '@bank.0'], [1, '@litter.1']], y1: 600, y2: 900 } },
      // the east reedbed's root mat on the right
      { layer: 'near', d: 'M950 900Q960 730 1040 680Q1200 630 1500 616Q1640 610 1760 608V900Z', fill: { lin: [[0, '@reedbed.0'], [1, '@reedbed.1']], y1: 610, y2: 900 } },
      // Sandy Bay: the beach at the viewer's feet
      { layer: 'fore', d: 'M470 900Q520 836 700 824Q860 816 960 836Q1000 860 1010 900Z', fill: { lin: [[0, '@sand.0'], [1, '@sand.1']], y1: 820, y2: 900 } },
    ],
    water: [
      { layer: 'far', d: 'M-160 ' + SHORE + 'H1760V900H-160Z', y0: SHORE, y1: 900, base: ['#8ab6c4', '#4f8ca0', '#2c5f74'], reflect: true, shimmer: 34, lightPath: true },
    ],
    place: [
      // the island's tall Scots pine (the far shore's landmark tree) and its scrub
      { obj: 'tree.pond-pine', x: 676, y: SHORE - 12, s: 0.52, variant: 2, layer: 'far', seed: 1 },
      { obj: 'tree.pond-alder', x: 616, y: SHORE - 6, s: 0.3, variant: 0, layer: 'far', seed: 2, anim: false },
      { obj: 'tree.pond-oak', x: 744, y: SHORE - 6, s: 0.3, flip: true, variant: 1, layer: 'far', seed: 3, anim: false },
      // the wooded shore: an oak, two birches, a willow and an alder (the oak sways)
      { obj: 'tree.pond-oak', x: 40, y: 760, s: 1.5, variant: 0, layer: 'fore', seed: 6, anim: { sway: { k: 0.5 } } },
      { obj: 'tree.pond-birch', x: 236, y: 700, s: 1.25, variant: 1, layer: 'near', seed: 7, anim: false },
      { obj: 'tree.pond-willow', x: 160, y: 650, s: 1.0, flip: true, variant: 0, layer: 'near', seed: 8, anim: false },
      { obj: 'tree.pond-alder', x: 380, y: 680, s: 1.0, variant: 1, layer: 'near', seed: 9, anim: false },
      { obj: 'tree.pond-birch', x: 452, y: 720, s: 1.1, flip: true, variant: 0, layer: 'near', seed: 10, anim: false },
      // a fallen log with a robin on it, a grey squirrel in the litter
      { obj: 'ground.log', x: 300, y: 820, s: 0.8, variant: 0, layer: 'fore', seed: 11 },
      { obj: 'ground.log', x: 110, y: 868, s: 0.7, variant: 1, flip: true, layer: 'fore', seed: 28 },
      { obj: 'bird.robin', x: 330, y: 798, s: 0.8, variant: 0, layer: 'fore', seed: 12 },
      { obj: 'animal.squirrel', x: 262, y: 700, s: 0.9, layer: 'near', seed: 13 },
      // the signature: the boardwalk across the east reedbed out to its viewing platform
      { obj: 'landmark.fleet-pond-boardwalk', x: 1400, y: 880, s: 1, variant: 2, layer: 'near', seed: 14 },
      // a heron at the reed edge; birds at rest that paddle and turn
      { obj: 'bird.heron', x: 922, y: 724, s: 0.5, variant: 0, layer: 'mid', seed: 15 },
      { obj: 'bird.swan', x: 690, y: 652, s: 0.5, variant: 0, layer: 'mid', seed: 16 },
      { obj: 'bird.swan', x: 716, y: 662, s: 0.46, flip: true, variant: 1, layer: 'mid', seed: 17 },
      { obj: 'bird.goose', x: 866, y: 596, s: 0.28, variant: 0, layer: 'mid', seed: 18 },
      { obj: 'bird.goose', x: 926, y: 600, s: 0.27, flip: true, variant: 1, layer: 'mid', seed: 19 },
      { obj: 'bird.goose', x: 958, y: 592, s: 0.26, variant: 0, layer: 'mid', seed: 20 },
      { obj: 'bird.coot', x: 1046, y: 606, s: 0.3, flip: true, layer: 'mid', seed: 21 },
      { obj: 'bird.mallard', x: 790, y: 692, s: 0.46, variant: 0, layer: 'mid', seed: 22 },
      { obj: 'bird.mallard', x: 850, y: 704, s: 0.44, variant: 1, flip: true, layer: 'mid', seed: 23 },
      { obj: 'bird.grebe', x: 560, y: 612, s: 0.3, layer: 'mid', seed: 24 },
      { obj: 'water.fish-ring', x: 1040, y: 650, s: 0.5, layer: 'mid', seed: 25 },
      { obj: 'water.fish-ring', x: 640, y: 740, s: 0.6, variant: 1, layer: 'mid', seed: 26 },
      // the wet margin at the foot of the wooded shore
      { obj: 'water.edge', x: 480, y: 760, s: 0.6, variant: 0, layer: 'near', seed: 27 },
    ],
    scatter: [
      // the far wood: wide tree-line segments (static), and the far shore's trees at the water, mirrored
      { obj: 'tree.pond-wood', layer: 'horizon', seed: 31, area: { rect: [-150, HOR + 6, 1750, SHORE - 4] }, n: 19, minGap: 70,
        s: [0.26, 0.42], sByY: [[HOR, 0.85], [SHORE, 1.15]], flip: 0.5, variant: [1, 2], anim: false },
      { obj: 'tree.pond-alder', layer: 'far', seed: 32, area: { rect: [-150, SHORE - 6, 1750, SHORE + 2] }, n: 15, minGap: 44, s: [0.22, 0.36], flip: 0.5, variant: [0, 1], mask: { avoid: [{ rect: [540, 520, 820, 560] }] }, anim: false },
      { obj: 'tree.pond-oak', layer: 'far', seed: 132, area: { rect: [-150, SHORE - 6, 1750, SHORE + 2] }, n: 13, minGap: 50, s: [0.22, 0.34], flip: 0.5, variant: [1, 2], mask: { avoid: [{ rect: [540, 520, 820, 560] }] }, anim: false },
      { obj: 'tree.pond-birch', layer: 'far', seed: 232, area: { rect: [-150, SHORE - 6, 1750, SHORE + 2] }, n: 7, minGap: 80, s: [0.22, 0.38], flip: 0.5, variant: 'random', mask: { avoid: [{ rect: [540, 520, 820, 560] }] }, anim: false },
      // the far reed fringe at the waterline (mirrored too)
      { obj: { 'plant.reed': 3, 'plant.bulrush': 1 }, layer: 'far', seed: 33, area: { rect: [-150, SHORE - 2, 1750, SHORE + 4] }, n: 110, minGap: 9, s: [0.14, 0.24], flip: 0.5, variant: 0, tint: { col: '#a09060', k: [0, 0.1] }, anim: false },
      // the leaf litter, grass and bracken under the shore trees
      { obj: { 'plant.grass': 6, 'ground.leaves': 1 }, layer: 'near', seed: 34, area: { poly: [[-160, 610], [320, 640], [520, 740], [560, 860], [-160, 860]] }, n: 70, minGap: 22,
        s: [0.6, 1.0], sByY: [[610, 0.7], [860, 1.3]], flip: 0.5, variant: [0, 1], tint: { col: '#8a7a40', k: [0, 0.1] }, anim: false },
      // the east reedbed: dense Phragmites and reedmace round the boardwalk (static; the front reeds sway)
      { obj: reeds, layer: 'near', seed: 35, area: { poly: [[960, 720], [1040, 676], [1500, 620], [1760, 612], [1760, 900], [960, 900]] }, n: 400, minGap: 11,
        s: [0.6, 1.0], sByY: [[612, 0.5], [900, 1.25]], flip: 0.5, variant: 'random', mask: { avoid: [{ poly: [[1040, 676], [1200, 676], [1620, 920], [1420, 920], [1150, 750], [1040, 750]] }] }, anim: false },
      // water lilies off the reed edge
      { obj: 'water.lily', layer: 'near', seed: 36, area: { poly: [[820, 730], [960, 720], [960, 800], [820, 810]] }, n: 9, minGap: 26, s: [0.3, 0.5], flip: 0.5, variant: [0, 1], anim: false },
      // pebbles on the beach
      { obj: 'rock.stones', layer: 'fore', seed: 37, area: { poly: [[540, 860], [700, 836], [900, 834], [980, 880], [980, 900], [520, 900]] }, n: 14, minGap: 40, s: [0.4, 0.7], flip: 0.5, variant: [0, 1], anim: false },
      // the foreground: reeds and reedmace either side of the beach, swaying in wind strips
      { obj: { 'plant.reed': 4, 'plant.bulrush': 3, 'plant.grass': 1 }, layer: 'front', seed: 38, area: { poly: [[340, 840], [520, 860], [500, 990], [340, 990]] }, n: 40, minGap: 13,
        s: [1.0, 1.4], flip: 0.5, variant: 'random', anim: 'strip' },
      { obj: { 'plant.reed': 4, 'plant.bulrush': 3, 'plant.grass': 1 }, layer: 'front', seed: 39, area: { poly: [[990, 870], [1250, 880], [1330, 990], [1000, 990]] }, n: 60, minGap: 14,
        s: [1.1, 1.5], flip: 0.5, variant: 'random', anim: 'strip' },
    ],
    actors: [
      // a dog walker along the beach, a walker out along the boardwalk to the platform
      { obj: 'person.dog-walker', layer: 'fore', path: [[600, 868], [880, 864]], speed: 8, loop: 'pingpong', s: 0.95, seed: 41, offset: 0.3, variant: 0 },
      { obj: 'person.walker', layer: 'near', path: [[1520, 890], [1380, 790], [1250, 712], [1190, 682]], speed: 7, loop: 'pingpong', s: 0.6, seed: 42, offset: 0.6, variant: 2 },
      { obj: 'person.walker', layer: 'near', path: [[1080, 676], [1160, 676]], speed: 3, loop: 'pingpong', s: 0.5, seed: 43, offset: 0.2, variant: 1 },
      // a South Western train at the north-west corner, glimpsed beyond the wood (lit after dusk)
      { obj: 'rail.train', layer: 'horizon', path: [[1000, SHORE - 22], [2400, SHORE - 22]], speed: 60, loop: 'loop', s: 0.22, seed: 44, offset: 0.5, variant: 1 },
      // swimmers crossing the open water
      { obj: 'bird.swan', layer: 'mid', path: [[900, 620], [420, 640]], speed: 5, loop: 'pingpong', s: 0.34, seed: 45, offset: 0.4 },
      { obj: 'bird.grebe', layer: 'mid', path: [[620, 690], [880, 650]], speed: 4, loop: 'pingpong', s: 0.36, seed: 46, offset: 0.7 },
      { obj: 'bird.coot', layer: 'mid', path: [[700, 600], [900, 612]], speed: 6, loop: 'pingpong', s: 0.28, seed: 47, offset: 0.1 },
      { obj: 'bird.moorhen', layer: 'mid', path: [[940, 760], [820, 780]], speed: 4, loop: 'pingpong', s: 0.4, seed: 48, offset: 0.5 },
      // a kingfisher's dash along the reed edge, a dragonfly over the margin, a butterfly by the trees
      { obj: 'bird.kingfisher-flight', layer: 'near', path: [[1700, 700], [1000, 690], [560, 760]], speed: 160, loop: 'loop', s: 0.9, seed: 49, offset: 0.25 },
      { obj: 'animal.dragonfly', layer: 'near', path: [[880, 760], [980, 730], [940, 800]], speed: 40, loop: 'pingpong', s: 0.7, seed: 50 },
      { obj: 'animal.butterfly', layer: 'fore', path: [[200, 780], [360, 740], [300, 830]], speed: 28, loop: 'pingpong', s: 0.7, seed: 51, variant: 1 },
    ],
    flocks: [
      { obj: 'bird.goose-flight', n: 6, area: [200, 140, 1500, 340], speed: 34, s: 0.32, seed: 61, layer: 'horizon' },
      { obj: 'bird.small-flight', n: 5, area: [500, 220, 1400, 440], speed: 46, s: 0.45, seed: 62, layer: 'horizon' },
    ],
  };
}
