/* ============================================================
   COMPOSED SCENE uk-south-east / Wyndham's Pool, view 4 (evening)
   docs/dev/SCENE_ENGINE.md sections 3, 15 and 17 (the convert stage).

   The rich hand-drawn view (72-anim-pack-uk-south-east-wyndhams-pool-v4.js,
   kept there as legacySvg) rebuilt from the object library: ONE auto-season
   scene for the view's four seasonal items.

   The evening view, looking west (heading 275) across the pool into the
   sunset: a big Scots pine frames the left with birches beside it, a
   spreading oak and a birch frame the right, the far wood of pine and
   birch stands dark against the low sun and is mirrored in the still water,
   where a pair of mute swans, mallard, coot and a moorhen drift among the
   lily pads and a grey heron waits by the reeds. An angler sits late at his
   swim on the right bank; the bank path runs along the front past bracken,
   ferns, gorse and a fallen log. The live sky gives the real sunset, then
   the stars and the moon; bats come out at dusk.
   Helpers: sceneUkWyndhamsPoolKit() (71-scene-uk-south-east-wyndhams-pool-wide.js).

   PURE: defines one function; it runs once (through the item's thunk).
   ============================================================ */
function sceneUkWyndhamsPoolEvening() {
  const { one, T, palette, layers, sky, farShore } = sceneUkWyndhamsPoolKit();
  const WL = 516;   // the far waterline
  const far = farShore(WL - 4, 81, { hide: [[-200, 160]] });
  return {
    v: 1,
    id: 'wyndhams-pool-4',
    view: { lat: 51.34, lon: -0.83, heading: 275, fov: 80, horizon: 488, lift: 1 },
    at: 'sunset',
    season: 'auto',
    setting: 'natural',
    signage: false,
    sky: Object.assign(sky(5), { stars: 240 }),
    palette,
    layers,
    ground: [
      // the far shore: lobed woods, Scots pines standing out of them against the low sun
      ...far.ground,
      // the near bank across the bottom, and the path climbing away to the right
      { layer: 'near', d: 'M-160 804Q140 818 420 800Q760 778 1120 788Q1460 794 1760 764V900H-160Z', fill: { lin: [[0, '@near.0'], [1, '@bank.1']], x1: 0, y1: 770, x2: 0, y2: 900 } },
      { layer: 'fore', d: 'M1760 772Q1560 790 1400 812Q1240 840 1120 880Q1080 896 1060 910H1300Q1340 880 1440 850Q1600 812 1760 800Z', fill: { lin: [[0, '@path.0'], [1, '@path.1']], x1: 0, y1: 772, x2: 0, y2: 910 } },
      { layer: 'front', d: 'M-160 880Q300 868 700 886Q900 894 1060 910H-160Z', fill: '@verge.1' },
    ],
    water: [
      { layer: 'mid', d: `M-160 ${WL}Q420 ${WL - 6} 800 ${WL + 2}T1760 ${WL - 2}V772Q1460 800 1120 792Q760 782 420 806Q140 826 -160 812Z`, y0: WL, y1: 830, base: ['#86a8b4', '#46708a', '#1e3e54'], reflect: true, shimmer: 48, lightPath: true },
    ],
    place: [
      // the big Scots pine framing the left (the signature)
      { obj: 'tree.pool-pine', x: 40, y: 880, s: 1.32, layer: 'fore', variant: 0, seed: 301 },
      // the angler's swim on the right bank, the heron by the reeds, the robin, the squirrel by the oak
      { obj: 'ground.swim', x: 1290, y: 794, s: 0.6, layer: 'near', variant: 1, seed: 302 },
      { obj: 'person.angler', x: 1284, y: 788, s: 0.56, layer: 'near', variant: 0, seed: 303, flip: true },
      // a dead branch out on the water, the kingfisher on it
      { obj: 'tree.wyv-snag', x: 930, y: 700, s: 0.62, layer: 'mid', variant: 1, seed: 308 },
      { obj: 'bird.wp-kingfisher-perch', x: 908, y: 604, s: 0.8, layer: 'mid', seed: 309, flip: true },
      { obj: 'bird.dartford-warbler', x: 1012, y: 852, s: 0.85, layer: 'fore', seed: 310, flip: true },
      // dusk: mist lying on the water (drawn only after real dusk), the long banks still
      { obj: 'sky.wp-mist', x: 480, y: WL - 6, s: 1.0, layer: 'mid', variant: 0, pin: true, anim: false },
      { obj: 'sky.wp-mist', x: 1160, y: WL - 4, s: 1.1, layer: 'mid', variant: 1, flip: true, pin: true, anim: false },
      { obj: 'sky.wp-mist', x: 800, y: WL + 40, s: 1.2, layer: 'mid', variant: 2, pin: true, anim: false },
      { obj: 'bird.robin', x: 470, y: 846, s: 1.0, layer: 'fore', variant: 0, seed: 305 },
      { obj: 'ground.log', x: 700, y: 900, s: 0.62, layer: 'fore', variant: 0, seed: 306 },
      { obj: 'animal.squirrel', x: 1640, y: 818, s: 0.86, layer: 'fore', variant: 0, seed: 307 },
    ],
    scatter: [
      ...far.scatter,
      { obj: { 'plant.reed': 3, 'plant.bulrush': 1 }, layer: 'mid', seed: 304, area: { rect: [-160, WL - 4, 1760, WL + 4] }, n: 70, minGap: 14, s: [0.16, 0.24], flip: 0.5, variant: 0, mask: { noise: { scale: 240, cut: 0.4 } }, anim: false },
      // lily pads in the two bays, rising fish
      { obj: 'water.lily', layer: 'mid', seed: 305, area: { poly: [[80, 650], [560, 646], [560, 770], [80, 774]] }, n: 22, minGap: 28, s: [0.4, 0.6], sByY: [[646, 0.85], [774, 1.2]], flip: 0.5, variant: [0, 1], tint: T('#a0a050'), anim: false },
      { obj: 'water.lily', layer: 'mid', seed: 306, area: { poly: [[1180, 560], [1560, 556], [1560, 640], [1180, 644]] }, n: 9, minGap: 28, s: [0.32, 0.46], flip: 0.5, variant: [0, 1], anim: false },
      one('water.fish-ring', 760, 600, 0.44, 0, 'mid', 307), one('water.fish-ring', 1120, 650, 0.56, 1, 'mid', 308, 1), one('water.fish-ring', 420, 600, 0.34, 0, 'mid', 309, 1), one('water.fish-ring', 1460, 740, 0.6, 1, 'mid', 310),
      one('water.edge', 200, 812, 0.6, 0, 'near', 311, 0, false), one('water.edge', 560, 796, 0.7, 1, 'near', 312, 1, false), one('water.edge', 940, 784, 0.55, 2, 'near', 313, 0, false), one('water.edge', 1500, 780, 0.5, 0, 'near', 314, 1, false),
      // the framing trees: birches on both banks, an alder at the water, the oak at the right edge
      one('tree.pool-birch', 300, 844, 1.0, 0, 'fore', 315, 0),
      one('tree.pool-birch', 420, 814, 0.74, 2, 'near', 316, 1, false),
      one('tree.pool-birch', 1500, 804, 1.02, 1, 'fore', 317, 1),
      one('tree.pool-oak', 1700, 824, 1.12, 0, 'front', 318, 0),
      one('tree.birch-heath', 1046, 792, 0.5, 1, 'near', 319, 1, false),
      one('plant.wyv-heath-bank', 1010, 800, 0.6, 0, 'near', 337, 0, false), one('plant.wyv-heath-bank', 640, 812, 0.7, 2, 'near', 338, 1, false),
      one('plant.wyv-heath-bank', 860, 912, 1.15, 1, 'front', 339, 0, false), one('plant.wyv-heath-bank', 330, 900, 0.95, 0, 'front', 340, 1, false),
      // the margins: reed beds of bulrush and reed, rush and bracken, ferns and gorse
      { obj: { 'plant.reed': 2, 'plant.bulrush': 3 }, layer: 'near', seed: 320, area: { poly: [[-160, 760], [260, 764], [260, 830], [-160, 830]] }, n: 38, minGap: 10, s: [0.5, 0.8], flip: 0.5, variant: [0, 1], tint: T('#8a7a40'), anim: 'strip' },
      { obj: { 'plant.reed': 3, 'plant.bulrush': 2 }, layer: 'near', seed: 321, area: { poly: [[860, 774], [1100, 776], [1100, 830], [860, 830]] }, n: 22, minGap: 11, s: [0.45, 0.7], flip: 0.5, variant: [0, 1], anim: 'strip' },
      { obj: { 'plant.reed': 3, 'plant.bulrush': 1 }, layer: 'near', seed: 322, area: { poly: [[1420, 752], [1760, 744], [1760, 790], [1420, 792]] }, n: 22, minGap: 12, s: [0.4, 0.62], flip: 0.5, variant: [0, 1], tint: T('#8a7a40'), mask: { avoid: [{ rect: [1230, 740, 1350, 800] }] }, anim: false },
      { obj: { 'plant.grass': 5, 'plant.heather': 1, 'plant.wildflowers': 1 }, layer: 'near', seed: 323, area: { poly: [[-160, 812], [420, 800], [1120, 790], [1760, 770], [1760, 860], [-160, 870]] }, n: 185, minGap: 10, s: [0.5, 0.9], sByY: [[780, 0.85], [870, 1.2]], flip: 0.5, variant: 0, tint: T('#8a7a40'), mask: { avoid: [{ rect: [1230, 760, 1350, 810] }] }, anim: false },
      { obj: { 'rock.stones': 2, 'rock.boulder': 1, 'ground.leaves': 2, 'ground.puddle': 1 }, layer: 'fore', seed: 324, area: { poly: [[1760, 780], [1400, 820], [1150, 880], [1180, 900], [1420, 846], [1760, 800]] }, n: 26, minGap: 20, s: [0.24, 0.56], sByY: [[780, 0.7], [900, 1.3]], flip: 0.5, variant: [0, 1], anim: false },
      { obj: { 'rock.stones': 1, 'rock.boulder': 1 }, layer: 'near', seed: 325, area: { poly: [[380, 790], [1120, 782], [1120, 798], [380, 806]] }, n: 16, minGap: 30, s: [0.3, 0.55], flip: 0.5, variant: [0, 1], mask: { noise: { scale: 80, cut: 0.3 } }, anim: false },
      one('plant.bracken', 1430, 848, 1.0, 0, 'fore', 326, 0, false), one('plant.bracken', 1556, 862, 1.2, 1, 'fore', 327, 1, false), one('plant.bracken', 1680, 876, 1.3, 2, 'fore', 328, 0, false),
      one('plant.bracken', -120, 860, 1.1, 1, 'fore', 329, 1, false), one('plant.bracken', 160, 868, 0.95, 0, 'fore', 330, 0, false),
      one('plant.fern', 560, 880, 0.7, 1, 'fore', 331, 0, false), one('plant.fern', 200, 900, 0.9, 2, 'fore', 332, 1, false), one('plant.fern', 1560, 900, 0.8, 1, 'fore', 333, 0, false),
      one('plant.gorse', 1020, 900, 0.6, 0, 'fore', 334, 0, false),
      // the very front: blades of grass and flowers in the gusts
      { obj: { 'plant.grass': 6, 'plant.wildflowers': 2, 'plant.heather': 1 }, layer: 'front', seed: 335, area: { poly: [[-160, 872], [1060, 896], [1060, 930], [-160, 930]] }, n: 120, minGap: 11, s: [0.85, 1.25], flip: 0.5, variant: 2, tint: T('#8a7a40'), anim: 'strip' },
      { obj: 'plant.grass', layer: 'front', seed: 336, area: { poly: [[1300, 870], [1760, 840], [1760, 930], [1300, 930]] }, n: 44, minGap: 13, s: [0.9, 1.3], flip: 0.5, variant: [0, 1], anim: 'strip' },
    ],
    actors: [
      // the heron stalking the shallows, stabbing at fish in the last light
      { obj: 'bird.wp-heron-stalk', layer: 'mid', path: [[720, 770], [680, 773], [640, 776]], speed: 2, loop: 'pingpong', s: 0.85, seed: 354, offset: 0.25 },
      // swallows skimming (spring to early autumn), pipistrelles after dusk, mist drifting, a light aircraft back to Blackbushe
      { obj: 'bird.wp-swallow', layer: 'near', path: [[-140, 640], [260, 670], [640, 620], [1020, 690], [1400, 640], [1760, 670]], speed: 290, loop: 'fade', s: 0.85, variant: 0, seed: 355, offset: 0.15 },
      { obj: 'animal.wp-bat', layer: 'mid', path: [[400, 420], [620, 380], [800, 450], [600, 490], [400, 420]], speed: 160, loop: 'loop', s: 0.9, seed: 356, offset: 0.2 },
      { obj: 'animal.wp-bat', layer: 'mid', path: [[1000, 380], [1250, 430], [1100, 480], [920, 420], [1000, 380]], speed: 150, loop: 'loop', s: 0.8, variant: 1, seed: 357, offset: 0.6 },
      { obj: 'animal.wp-bat', layer: 'near', path: [[1300, 300], [1500, 360], [1360, 420], [1220, 350], [1300, 300]], speed: 170, loop: 'loop', s: 1.05, seed: 358, offset: 0.45 },
      { obj: 'sky.wp-mist', layer: 'mid', path: [[-60, WL - 2], [1660, WL - 2]], speed: 8, loop: 'pingpong', s: 1, variant: 3, seed: 359, offset: 0.3 },
      { obj: 'vehicle.light-aircraft', layer: 'horizon', path: [[1820, 240], [-220, 300]], speed: 22, loop: 'loop', s: 0.45, variant: 1, seed: 360, offset: 0.5 },
      { obj: 'bird.swan', layer: 'mid', path: [[940, 600], [700, 604]], speed: 3.6, loop: 'pingpong', s: 0.62, seed: 341, offset: 0.3 },
      { obj: 'bird.swan', layer: 'mid', path: [[1010, 612], [780, 616]], speed: 3.4, loop: 'pingpong', s: 0.66, seed: 342, offset: 0.36 },
      { obj: 'bird.mallard', layer: 'mid', path: [[480, 680], [660, 684]], speed: 5, loop: 'pingpong', s: 0.62, seed: 343, offset: 0.1 },
      { obj: 'bird.mallard', layer: 'mid', path: [[530, 694], [690, 698]], speed: 5, loop: 'pingpong', s: 0.6, seed: 344, offset: 0.14, variant: 1 },
      { obj: 'bird.coot', layer: 'mid', path: [[1260, 580], [1120, 584]], speed: 6, loop: 'pingpong', s: 0.44, seed: 345, offset: 0.5 },
      { obj: 'bird.coot', layer: 'mid', path: [[280, 560], [380, 556]], speed: 5, loop: 'pingpong', s: 0.36, seed: 346, offset: 0.7 },
      { obj: 'bird.moorhen', layer: 'mid', path: [[140, 762], [220, 758]], speed: 4, loop: 'pingpong', s: 0.6, seed: 347, offset: 0.4 },
      { obj: 'bird.mallard', layer: 'mid', path: [[1400, 610], [1280, 614]], speed: 4, loop: 'pingpong', s: 0.5, seed: 348, offset: 0.8 },
      { obj: 'person.dog-walker', layer: 'fore', path: [[1720, 790], [1500, 816], [1300, 850]], speed: 12, loop: 'pingpong', s: 0.62, seed: 349, offset: 0.2 },
    ],
    flocks: [
      { obj: 'bird.small-flight', n: 4, area: [200, 420, 1100, 480], speed: 30, s: 0.45, seed: 351, layer: 'far' },
      { obj: 'bird.goose-flight', n: 9, area: [200, 150, 1600, 260], speed: 24, s: 0.4, seed: 352, layer: 'far' },
      { obj: 'animal.dragonfly', n: 3, area: [200, 680, 1200, 760], speed: 30, s: 0.8, seed: 353, layer: 'fore' },
    ],
    particles: 'season',
    weather: 'live',
  };
}
