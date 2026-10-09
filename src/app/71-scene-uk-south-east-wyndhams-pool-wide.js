/* ============================================================
   COMPOSED SCENE uk-south-east / Wyndham's Pool, view 1 (wide)
   docs/dev/SCENE_ENGINE.md sections 3, 15 and 17 (the convert stage).

   The rich hand-drawn view (72-anim-pack-uk-south-east-wyndhams-pool-v1.js,
   kept there as legacySvg) rebuilt from the object library, so the canvas
   renderer bakes it: dense static detail in a few layer bitmaps and a
   measured number of movers. ONE auto-season scene serves the view's four
   seasonal items (the date picks the season, the live sky the light).

   The place: Wyndham's Pool, the largest pond on Yateley Common (Yateley
   Common Country Park, Hampshire), a man-made pool ringed by silver birch
   and Scots pine with oak behind; reed and rush margins, lily pads in the
   sheltered bays; a coarse fishery with wooden swims on the bank; mute
   swans, mallard, coot, moorhen, great crested grebe and a grey heron.
   Sources: hants.gov.uk (Yateley Common Country Park), hwas.co.uk.
   The wide view looks south-west across the open water from the bank path:
   a wooded spit with a tall veteran pine on the left, the birch bank on the
   right, the far shore's birch, pine and oak mirrored in the water.

   This file also holds sceneUkWyndhamsPoolKit(), the helpers the four view
   files share (the far-wood skyline, single placements, the tint rule, the
   palette and the layers).

   PURE: defines functions only; each runs once (through the item's thunk)
   when the scene is shown, linted or sheeted.
   ============================================================ */
function sceneUkWyndhamsPoolKit() {
  /** A woodland skyline: crowns of uneven size along y, filled down to foot (seeded, deterministic). */
  const crowns = (seed, y, amp, foot, x0 = -160, x1 = 1760, w0 = 26, w1 = 70) => {
    const r = sceneRnd(seed);
    let x = x0, d = `M${x0} ${foot}V${y}`;
    while (x < x1) { const w = w0 + r() * (w1 - w0), h = 6 + r() * amp, j = Math.round(r() * 8 - 4); d += `c${Math.round(w * 0.1)} ${-Math.round(h * 1.4)} ${Math.round(w * 0.9)} ${-Math.round(h * 1.4)} ${Math.round(w)} ${j}`; x += w; }
    return `${d}V${foot}H${x0}Z`;
  };
  /** One object as a one-placement scatter rule: placed exactly, but dropped from small tiles by the LOD like any scatter. */
  const one = (obj, x, y, s, variant, layer, seed, flip, anim) => ({ obj, layer, seed, area: { rect: [x - 0.5, y - 0.5, x + 0.5, y + 0.5] }, n: 1, s: [s, s], flip: flip ? 1 : 0, variant, anim: anim === false ? false : undefined });
  /** The tint rule that breaks up a stamp (two buckets: plain and 8 % toward col). */
  const T = (col) => ({ col, k: [0, 0.1] });
  const palette = {
    base: { hill: ['#6f8f6a', '#56785a'], shore: ['#4a6a3e', '#3a5232'], bank: ['#4f7a34', '#7a6648'], near: ['#6a8a42', '#8a7550'], path: ['#b39a70', '#d2ba8e'], verge: ['#5f8f3a', '#4a6e30'], mud: ['#6a5a44', '#4e4232'] },
    spring: { hill: ['#7a9c6c', '#5f8a5a'], shore: ['#567a3a', '#40602e'], bank: ['#5f8f3a', '#8a7553'], near: ['#6f9f40', '#8a7553'], path: ['#a99069', '#cbb48a'], verge: ['#6f9f40', '#4c7a37'] },
    summer: { hill: ['#628a62', '#4f7553'], shore: ['#46703a', '#36562c'], bank: ['#4f7f34', '#8c7651'], near: ['#5f8f3a', '#8c7651'], path: ['#ad936a', '#d2ba8e'], verge: ['#5f8f3a', '#3f6b31'] },
    autumn: { hill: ['#a0844a', '#8a6a3c'], shore: ['#7a6e36', '#5e5428'], bank: ['#8a8a45', '#7d6247'], near: ['#8a8a45', '#7d6247'], path: ['#9e7f5a', '#c4a57c'], verge: ['#8a8a45', '#5f6a35'] },
    winter: { hill: ['#8a8a96', '#74747e'], shore: ['#6e6e60', '#58584c'], bank: ['#8d9277', '#7a6a58'], near: ['#8d9277', '#7a6a58'], path: ['#9a8a76', '#c4b8a6'], verge: ['#8d9277', '#6b735a'], mud: ['#7a7064', '#5e564c'] },
  };
  // near, fore and front share haze 0, so a sprite drawn in all three is one sprite (the SVG still's size)
  const layers = [
    { id: 'horizon', depth: 0.08, haze: 0.6 },
    { id: 'far', depth: 0.2, haze: 0.4 },
    { id: 'mid', depth: 0.45, haze: 0.2 },
    { id: 'near', depth: 0.75, haze: 0 },
    { id: 'fore', depth: 1, haze: 0 },
    { id: 'front', depth: 1.25, haze: 0 },
  ];
  const sky = (n) => ({ stars: 200, clouds: { n: n || 6, y: [30, 320], speed: 5 }, sunR: 26, moonR: 20 });
  /** The far shore's woods: three bands of distant pine, birch and broadleaf (horizon, far, mid), the mid band at the waterline. */
  const farWoods = (y0, seed) => [
    { obj: { 'tree.far-pine': 3, 'tree.far-broad': 5 }, layer: 'horizon', seed: seed, area: { rect: [-140, y0 - 40, 1740, y0 - 24] }, n: 70, minGap: 18, s: [0.24, 0.36], flip: 0.5, variant: 0, anim: false },
    { obj: { 'tree.far-pine': 3, 'tree.far-birch': 2, 'tree.far-broad': 5 }, layer: 'far', seed: seed + 1, area: { rect: [-140, y0 - 18, 1740, y0 - 4] }, n: 115, minGap: 13, s: [0.36, 0.62], flip: 0.5, variant: 'random', tint: T('#6a7a50'), anim: false },
    // the tall Scots pines that stand above the far wood (the skyline of the pool)
    { obj: 'tree.far-pine', layer: 'far', seed: seed + 3, area: { rect: [-100, y0 - 14, 1700, y0 - 6] }, n: 7, minGap: 140, s: [0.62, 0.86], flip: 0.5, variant: 'random', mask: { noise: { scale: 300, cut: 0.25 } }, anim: false },
    { obj: { 'tree.far-birch': 3, 'tree.far-broad': 4 }, layer: 'mid', seed: seed + 2, area: { rect: [-120, y0 + 1, 1720, y0 + 9] }, n: 50, minGap: 18, s: [0.42, 0.66], flip: 0.5, variant: 1, anim: false },
  ];
  return { crowns, one, T, palette, layers, sky, farWoods };
}

function sceneUkWyndhamsPoolWide() {
  const { crowns, one, T, palette, layers, sky, farWoods } = sceneUkWyndhamsPoolKit();
  const AREA = (pts) => ({ poly: pts });
  return {
    v: 1,
    id: 'wyndhams-pool-1',
    view: { lat: 51.332, lon: -0.822, heading: 222, fov: 82, horizon: 470, lift: 1 },
    at: 'afternoon',
    season: 'auto',
    setting: 'natural',
    signage: false,
    sky: sky(7),
    palette,
    layers,
    ground: [
      // the distant wooded rise behind the pool, then the far shore's wood edge, then its grassy rim at the water
      { layer: 'horizon', d: crowns(21, 420, 30, 530), fill: { lin: [[0, '@hill.0'], [1, '@hill.1']], x1: 0, y1: 420, x2: 0, y2: 530 } },
      { layer: 'far', d: crowns(22, 452, 26, 530, -160, 1760, 34, 90), fill: { lin: [[0, '@shore.0'], [1, '@shore.1']], x1: 0, y1: 440, x2: 0, y2: 530 } },
      { layer: 'mid', d: crowns(23, 480, 16, 530, -160, 1760, 40, 110), fill: { lin: [[0, '@shore.0'], [1, '@shore.1']], x1: 0, y1: 470, x2: 0, y2: 520 } },
      // the wooded spit on the left and the birch bank on the right
      { layer: 'near', d: 'M-160 528Q40 534 150 572Q250 610 292 664Q330 724 250 800H-160Z', fill: { lin: [[0, '@bank.0'], [1, '@bank.1']], x1: 0, y1: 530, x2: 0, y2: 800 } },
      { layer: 'near', d: 'M1760 522Q1600 530 1500 556Q1410 590 1394 640Q1384 704 1460 790H1760Z', fill: { lin: [[0, '@bank.0'], [1, '@bank.1']], x1: 0, y1: 522, x2: 0, y2: 790 } },
      // the near bank, the bank path along it, the verge in front
      { layer: 'fore', d: 'M-160 806Q240 782 640 800T1300 796T1760 790V900H-160Z', fill: { lin: [[0, '@near.0'], [1, '@near.1']], x1: 0, y1: 790, x2: 0, y2: 900 } },
      { layer: 'fore', d: 'M-160 848Q300 832 760 844T1760 846V888Q1200 878 760 890T-160 892Z', fill: { lin: [[0, '@path.0'], [1, '@path.1']], x1: 0, y1: 832, x2: 0, y2: 892 } },
      { layer: 'front', d: 'M-160 884Q400 874 900 886T1760 880V900H-160Z', fill: '@verge.1' },
    ],
    water: [
      { layer: 'mid', d: 'M-160 512Q260 506 700 514T1760 510V900H-160Z', y0: 510, y1: 860, base: ['#7c9a8c', '#3a5e56', '#1c3a36'], reflect: true, shimmer: 36, lightPath: true },
    ],
    place: [
      // the pool's signature: the tall veteran Scots pine leaning out from the spit
      { obj: 'tree.pool-pine', x: 46, y: 648, s: 1.06, layer: 'near', variant: 0, seed: 37 },
      { obj: 'ground.log', x: 1556, y: 782, s: 0.42, layer: 'near', variant: 0, seed: 45 },
      // the heron at the spit's foot, the squirrel on the right bank, the robin on the log
      { obj: 'bird.heron', x: 300, y: 736, s: 0.6, layer: 'near', variant: 0, seed: 48, flip: true },
      { obj: 'animal.squirrel', x: 1600, y: 566, s: 0.8, layer: 'near', variant: 0, seed: 49, flip: true },
      { obj: 'bird.robin', x: 1572, y: 770, s: 0.8, layer: 'near', variant: 0, seed: 50 },
      // the angler's swim on the near bank
      { obj: 'ground.swim', x: 1086, y: 806, s: 0.95, layer: 'fore', variant: 0, seed: 51 },
      { obj: 'person.angler', x: 1074, y: 798, s: 0.8, layer: 'fore', variant: 0, seed: 52, flip: true },
    ],
    scatter: [
      ...farWoods(500, 1),
      { obj: { 'plant.reed': 3, 'plant.bulrush': 1 }, layer: 'mid', seed: 4, area: { rect: [-160, 508, 1760, 516] }, n: 70, minGap: 14, s: [0.2, 0.3], flip: 0.5, variant: 0, anim: false },
      // lily pads in the two sheltered bays (a few bob on the ripples), rising fish
      { obj: 'water.lily', layer: 'mid', seed: 5, area: { poly: [[120, 600], [560, 590], [580, 690], [140, 700]] }, n: 30, minGap: 22, s: [0.32, 0.5], sByY: [[590, 0.8], [700, 1.15]], flip: 0.5, variant: [0, 1], tint: T('#a0a050'), anim: false },
      { obj: 'water.lily', layer: 'mid', seed: 6, area: { poly: [[1020, 556], [1330, 552], [1340, 604], [1030, 608]] }, n: 14, minGap: 22, s: [0.28, 0.42], flip: 0.5, variant: [0, 1], anim: false },
      one('water.fish-ring', 430, 600, 0.36, 0, 'mid', 8), one('water.fish-ring', 640, 690, 0.5, 1, 'mid', 9), one('water.fish-ring', 905, 572, 0.32, 0, 'mid', 10, 1),
      one('water.fish-ring', 1060, 724, 0.55, 1, 'mid', 11, 1), one('water.fish-ring', 1250, 640, 0.42, 0, 'mid', 12),
      // the near trees: a second pine and birches on the banks, an alder at the water (single rules: a small tile drops them)
      one('tree.pool-pine', 1716, 700, 0.92, 1, 'near', 44, 1, false),
      one('tree.pool-birch', 176, 632, 0.9, 0, 'near', 38, 0),
      one('tree.pool-birch', 244, 678, 0.8, 2, 'near', 39, 1, false),
      one('tree.pool-birch', 1502, 612, 1.0, 1, 'near', 42, 1),
      one('tree.pool-birch', 1588, 644, 1.05, 0, 'near', 43, 0),
      one('tree.pool-oak', 1420, 652, 0.7, 1, 'near', 41, 0, false),
      one('plant.fern', 84, 762, 0.7, 1, 'near', 46, 0, false),
      one('plant.fern', 1640, 772, 0.8, 1, 'near', 47, 1, false),
      // the banks' water edge: grassy and stony margins
      one('water.edge', 120, 798, 0.7, 0, 'fore', 22, 0, false), one('water.edge', 470, 800, 0.55, 1, 'fore', 23, 1, false), one('water.edge', 760, 797, 0.8, 2, 'fore', 24, 0, false),
      one('water.edge', 1290, 799, 0.6, 0, 'fore', 25, 1, false), one('water.edge', 1530, 796, 0.75, 1, 'fore', 26, 0, false), one('water.edge', 1700, 798, 0.5, 2, 'fore', 27, 1, false),
      // the spit and the right bank: reeds at the water, grass, fern and bracken on the rise
      { obj: { 'plant.reed': 3, 'plant.bulrush': 2 }, layer: 'near', seed: 9, area: AREA([[150, 600], [300, 640], [330, 730], [160, 736]]), n: 36, minGap: 9, s: [0.5, 0.86], flip: 0.5, variant: [0, 1], tint: T('#8a7a40'), anim: 'strip' },
      { obj: { 'plant.reed': 3, 'plant.bulrush': 2 }, layer: 'near', seed: 10, area: AREA([[1380, 600], [1480, 600], [1480, 770], [1390, 760]]), n: 30, minGap: 9, s: [0.5, 0.86], flip: 0.5, variant: [0, 1], tint: T('#8a7a40'), anim: 'strip' },
      { obj: 'plant.grass', layer: 'near', seed: 11, area: AREA([[-160, 560], [120, 560], [250, 700], [220, 790], [-160, 790]]), n: 110, minGap: 10, s: [0.45, 0.9], sByY: [[560, 0.7], [790, 1.15]], flip: 0.5, variant: 0, tint: T('#8a7a40'), anim: false },
      { obj: 'plant.grass', layer: 'near', seed: 12, area: AREA([[1450, 560], [1760, 540], [1760, 790], [1470, 786], [1410, 680]]), n: 100, minGap: 10, s: [0.45, 0.9], sByY: [[560, 0.7], [790, 1.15]], flip: 0.5, variant: 0, tint: T('#8a7a40'), anim: false },
      // the near water's edge: reeds and stones along the bank, the path's stones, fallen leaves and puddles
      { obj: { 'plant.reed': 3, 'plant.bulrush': 2, 'plant.grass': 1 }, layer: 'fore', seed: 13, area: { rect: [-160, 790, 1760, 822] }, n: 120, minGap: 9, s: [0.5, 0.82], flip: 0.5, variant: [0, 1], tint: T('#8a7a40'), mask: { noise: { scale: 160, cut: 0.32 }, avoid: [{ rect: [960, 780, 1200, 830] }] }, anim: false },
      { obj: { 'rock.stones': 1, 'rock.boulder': 1 }, layer: 'fore', seed: 14, area: { rect: [300, 804, 1240, 830] }, n: 18, minGap: 26, s: [0.14, 0.42], mask: { noise: { scale: 90, cut: 0.3 } }, flip: 0.5, variant: [0, 1], anim: false },
      { obj: { 'rock.stones': 2, 'rock.boulder': 1, 'ground.puddle': 1 }, layer: 'fore', seed: 15, area: { poly: [[-160, 852], [1760, 850], [1760, 884], [-160, 888]] }, n: 40, minGap: 30, s: [0.2, 0.6], sByY: [[850, 0.8], [888, 1.2]], flip: 0.5, variant: [0, 1], tint: T('#8a7a60'), anim: false },
      { obj: { 'plant.grass': 5, 'plant.wildflowers': 2 }, layer: 'fore', seed: 16, area: { rect: [-160, 822, 1760, 842] }, n: 130, minGap: 11, s: [0.4, 0.75], flip: 0.5, variant: 0, tint: T('#8a7a40'), anim: false },
      // the verge in front of the path, moving in the wind; bracken at the corners
      { obj: { 'plant.grass': 6, 'plant.wildflowers': 2 }, layer: 'front', seed: 17, area: { rect: [-160, 893, 1760, 912] }, n: 170, minGap: 10, s: [0.6, 1.05], flip: 0.5, variant: 2, tint: T('#8a7a40'), anim: 'strip' },
      one('plant.bracken', -130, 900, 1.5, 0, 'front', 18, 0, false), one('plant.bracken', -75, 894, 1.15, 1, 'front', 19, 1, false), one('plant.bracken', 0, 910, 1.3, 2, 'front', 20, 0, false), one('plant.bracken', 110, 898, 1.05, 0, 'front', 21, 1, false),
      one('plant.bracken', 1480, 896, 1.2, 1, 'front', 28, 1, false), one('plant.bracken', 1548, 906, 1.45, 0, 'front', 29, 0, false), one('plant.bracken', 1650, 900, 1.1, 2, 'front', 30, 1, false), one('plant.bracken', 1742, 908, 1.35, 1, 'front', 31, 0, false),
    ],
    actors: [
      // on the water: the pair of mute swans, mallard, coot, moorhen and a grebe, slow and drifting
      { obj: 'bird.swan', layer: 'mid', path: [[620, 600], [900, 596]], speed: 4, loop: 'pingpong', s: 0.66, seed: 61, offset: 0.2 },
      { obj: 'bird.swan', layer: 'mid', path: [[700, 612], [960, 608]], speed: 3.6, loop: 'pingpong', s: 0.6, seed: 62, offset: 0.35 },
      { obj: 'bird.mallard', layer: 'mid', path: [[1100, 660], [880, 664]], speed: 5, loop: 'pingpong', s: 0.56, seed: 63, offset: 0.1 },
      { obj: 'bird.mallard', layer: 'mid', path: [[1150, 668], [930, 672]], speed: 4.8, loop: 'pingpong', s: 0.54, seed: 64, offset: 0.16, variant: 1 },
      { obj: 'bird.coot', layer: 'mid', path: [[440, 712], [600, 708]], speed: 6, loop: 'pingpong', s: 0.52, seed: 65, offset: 0.5 },
      { obj: 'bird.coot', layer: 'mid', path: [[1240, 590], [1130, 594]], speed: 5, loop: 'pingpong', s: 0.38, seed: 66, offset: 0.7 },
      { obj: 'bird.moorhen', layer: 'mid', path: [[1350, 690], [1270, 694]], speed: 4, loop: 'pingpong', s: 0.46, seed: 67, offset: 0.4 },
      { obj: 'bird.grebe', layer: 'mid', path: [[760, 560], [520, 566]], speed: 5, loop: 'pingpong', s: 0.38, seed: 68, offset: 0.6 },
      // the bank path: a dog walker and a jogger
      { obj: 'person.dog-walker', layer: 'fore', path: [[-60, 872], [760, 866], [1660, 868]], speed: 20, loop: 'pingpong', s: 1.0, seed: 71, offset: 0.12 },
      { obj: 'person.jogger', layer: 'fore', path: [[1700, 864], [800, 868], [-100, 866]], speed: 46, loop: 'loop', s: 0.98, seed: 72, offset: 0.55 },
    ],
    flocks: [
      { obj: 'bird.small-flight', n: 6, area: [200, 140, 1300, 320], speed: 34, s: 0.5, seed: 81, layer: 'far' },
      { obj: 'bird.goose-flight', n: 5, area: [500, 90, 1500, 220], speed: 26, s: 0.32, seed: 82, layer: 'far' },
    ],
    particles: 'season',
    weather: 'live',
  };
}
