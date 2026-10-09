/* ============================================================
   COMPOSED SCENE uk-south-east / Wyndham's Pool, view 2 (close)
   docs/dev/SCENE_ENGINE.md sections 3, 15 and 17 (the convert stage).

   The rich hand-drawn view (72-anim-pack-uk-south-east-wyndhams-pool-v2.js,
   kept there as legacySvg) rebuilt from the object library: ONE auto-season
   scene for the view's four seasonal items.

   The close view, looking south-west (heading 228) from the right-hand bank:
   a reed bed of bulrush and common reed standing in the shallows on the
   left, a low reedy spit with young birch and alder beyond it, the open
   water with lilies, swans, mallard, coot and moorhen, and the far shore's
   birch and pine wood mirrored in it. On the near bank to the right a sandy
   path runs down past silver birch and a Scots pine to an angler's wooden
   swim (the pool is a coarse fishery), with heather, bracken and ferns.
   Helpers: sceneUkWyndhamsPoolKit() (71-scene-uk-south-east-wyndhams-pool-wide.js).

   PURE: defines one function; it runs once (through the item's thunk).
   ============================================================ */
function sceneUkWyndhamsPoolClose() {
  const { one, T, palette, layers, sky, farShore } = sceneUkWyndhamsPoolKit();
  const WL = 472;   // the far waterline
  const far = farShore(WL, 41, { k: 0.9, hide: [[1540, 1800]] });
  return {
    v: 1,
    id: 'wyndhams-pool-2',
    view: { lat: 51.34, lon: -0.83, heading: 228, fov: 76, horizon: WL, lift: 1 },
    at: 'afternoon',
    season: 'auto',
    setting: 'natural',
    signage: false,
    sky: sky(6),
    palette,
    layers,
    ground: [
      // the far shore: lobed woods, Scots pines standing out of them
      ...far.ground,
      // the low reedy spit from the left bank, out in the water
      { layer: 'mid', d: `M-160 ${WL + 40}Q60 ${WL + 30} 230 ${WL + 46}Q300 ${WL + 56} 250 ${WL + 64}Q90 ${WL + 72} -160 ${WL + 70}Z`, fill: { lin: [[0, '@bank.0'], [1, '@mud.0']], x1: 0, y1: WL + 30, x2: 0, y2: WL + 72 } },
      // the near bank on the right: heathy ground falling to the water, and the sandy path down it
      { layer: 'near', d: 'M1760 900V600Q1560 604 1400 650Q1250 700 1140 780Q1060 846 980 900Z', fill: { lin: [[0, '@near.0'], [1, '@bank.1']], x1: 0, y1: 600, x2: 0, y2: 900 } },
      { layer: 'fore', d: 'M1780 632Q1640 640 1560 668Q1470 712 1420 780Q1380 850 1340 910H1560Q1540 840 1560 780Q1590 712 1660 676Q1720 652 1780 650Z', fill: { lin: [[0, '@path.0'], [1, '@path.1']], x1: 0, y1: 640, x2: 0, y2: 900 } },
      // the muddy foot of the reed bed in the left foreground
      { layer: 'front', d: 'M-160 838Q120 826 380 856Q520 878 600 900H-160Z', fill: '@mud.1' },
    ],
    water: [
      { layer: 'mid', d: `M-160 ${WL - 2}Q400 ${WL + 4} 800 ${WL}T1760 ${WL + 2}V900H-160Z`, y0: WL, y1: 900, base: ['#8ab4b0', '#3f7680', '#1a4450'], reflect: true, shimmer: 40, lightPath: true },
    ],
    place: [
      // the Scots pine at the bank's edge (the signature), birch beside it
      { obj: 'tree.pool-pine', x: 1700, y: 704, s: 1.12, layer: 'near', variant: 1, seed: 56, flip: true },
      // the angler at his swim on the bank, the robin on its post, the heron on the spit
      { obj: 'ground.swim', x: 1214, y: 776, s: 0.9, layer: 'near', variant: 1, seed: 57, flip: true },
      { obj: 'person.angler', x: 1206, y: 766, s: 0.8, layer: 'near', variant: 1, seed: 58, flip: true },
      // a dead branch out in the bay: the kingfisher's perch
      { obj: 'tree.wyv-snag', x: 820, y: 690, s: 0.7, layer: 'mid', variant: 1, seed: 61, flip: true },
      { obj: 'bird.wp-kingfisher-perch', x: 796, y: 585, s: 0.9, layer: 'mid', seed: 62, flip: true },
      // a Dartford warbler on the gorse, a stonechat on the bracken
      { obj: 'bird.dartford-warbler', x: 1476, y: 616, s: 0.8, layer: 'near', seed: 63, flip: true },
      { obj: 'bird.stonechat', x: 1640, y: 742, s: 1.0, layer: 'near', variant: 0, seed: 64, flip: true },
      // framing: a Scots pine bough over the top left (the reed bed below it)
      { obj: 'tree.wp-pine-bough', x: -36, y: -22, s: 0.9, layer: 'front', pin: true, anim: { sway: { k: 1 } } },
      // dusk: mist lying on the water
      { obj: 'sky.wp-mist', x: 560, y: WL - 4, s: 1.0, layer: 'mid', variant: 2, pin: true, anim: false },
      { obj: 'sky.wp-mist', x: 1100, y: WL - 2, s: 0.9, layer: 'mid', variant: 0, flip: true, pin: true, anim: false },
      { obj: 'ground.log', x: 1664, y: 806, s: 0.55, layer: 'near', variant: 1, seed: 60 },
    ],
    scatter: [
      ...far.scatter,
      { obj: { 'plant.reed': 3, 'plant.bulrush': 1 }, layer: 'mid', seed: 104, area: { rect: [-160, WL - 2, 1760, WL + 6] }, n: 50, minGap: 16, s: [0.22, 0.32], flip: 0.5, variant: 0, mask: { noise: { scale: 240, cut: 0.4 } }, anim: false },
      // the spit: young birch and alder, reeds round it
      one('tree.pool-oak', -40, WL + 54, 0.42, 1, 'mid', 105, 0, false),
      one('tree.pool-birch', 70, WL + 52, 0.5, 2, 'mid', 106, 1, false),
      one('tree.pool-birch', 170, WL + 56, 0.36, 1, 'mid', 107, 0, false),
      { obj: { 'plant.reed': 2, 'plant.bulrush': 1 }, layer: 'mid', seed: 108, area: { poly: [[-160, WL + 50], [240, WL + 48], [280, WL + 62], [-160, WL + 72]] }, n: 34, minGap: 10, s: [0.36, 0.5], flip: 0.5, variant: [0, 1], tint: T('#7a8a50'), anim: false },
      // lily pads in the bay (flowers in summer), rising fish
      { obj: 'water.lily', layer: 'mid', seed: 109, area: { poly: [[220, 560], [760, 556], [760, 660], [220, 664]] }, n: 21, minGap: 24, s: [0.36, 0.56], sByY: [[556, 0.8], [664, 1.2]], flip: 0.5, variant: [0, 1], tint: T('#a0a050'), anim: false },
      { obj: 'water.lily', layer: 'mid', seed: 110, area: { poly: [[860, 520], [1120, 518], [1120, 580], [860, 582]] }, n: 8, minGap: 26, s: [0.3, 0.44], flip: 0.5, variant: [0, 1], anim: false },
      { obj: 'water.lily', layer: 'mid', seed: 161, area: { poly: [[600, 780], [900, 770], [940, 860], [620, 880]] }, n: 12, minGap: 34, s: [0.6, 0.85], flip: 0.5, variant: [0, 1], tint: T('#a0a050'), mask: { noise: { scale: 90, cut: 0.35 } }, anim: false },
      one('water.fish-ring', 470, 524, 0.4, 0, 'mid', 111), one('water.fish-ring', 880, 700, 0.62, 1, 'mid', 112, 1), one('water.fish-ring', 1180, 544, 0.34, 0, 'mid', 113, 1), one('water.fish-ring', 640, 600, 0.5, 1, 'mid', 114),
      one('water.edge', 1010, 884, 0.6, 0, 'near', 144, 0, false), one('water.edge', 1110, 812, 0.5, 1, 'near', 145, 1, false), one('water.edge', 1330, 700, 0.42, 2, 'near', 146, 0, false), one('water.edge', 1470, 664, 0.36, 0, 'near', 147, 1, false),
      // the near bank: a second birch, heather, grass, bracken and ferns on the slope; stones on the shore
      one('tree.pool-birch', 1560, 664, 1.02, 0, 'near', 55, 0),
      one('tree.pool-birch', 1440, 694, 0.74, 1, 'near', 115, 1, false),
      one('plant.wyv-heath-bank', 1520, 650, 0.62, 0, 'near', 151, 0, false), one('plant.wyv-heath-bank', 1700, 668, 0.7, 2, 'near', 152, 1, false),
      one('plant.wyv-heath-bank', 1340, 852, 0.8, 1, 'near', 153, 1, false), one('plant.wyv-heath-bank', 1660, 900, 1.2, 0, 'fore', 154, 0, false),
      one('plant.gorse', 1470, 640, 0.5, 1, 'near', 155, 0, false),
      { obj: { 'plant.heather': 3, 'plant.grass': 4 }, layer: 'near', seed: 116, area: { poly: [[1440, 606], [1760, 600], [1760, 680], [1420, 672]] }, n: 80, minGap: 10, s: [0.4, 0.62], sByY: [[600, 0.85], [680, 1.1]], flip: 0.5, variant: [0, 1], tint: T('#8a7a40'), anim: false },
      { obj: { 'plant.grass': 5, 'plant.heather': 2, 'plant.wildflowers': 1 }, layer: 'near', seed: 117, area: { poly: [[1180, 700], [1420, 660], [1520, 740], [1520, 880], [1060, 880]] }, n: 120, minGap: 11, s: [0.55, 0.9], sByY: [[680, 0.8], [880, 1.3]], flip: 0.5, variant: 0, tint: T('#8a7a40'), mask: { avoid: [{ rect: [1110, 690, 1310, 800] }] }, anim: false },
      { obj: { 'plant.grass': 5, 'plant.heather': 1 }, layer: 'near', seed: 118, area: { poly: [[1600, 690], [1760, 680], [1760, 900], [1580, 900]] }, n: 70, minGap: 12, s: [0.7, 1.1], sByY: [[690, 0.8], [900, 1.3]], flip: 0.5, variant: [0, 1], tint: T('#8a7a40'), anim: false },
      one('plant.bracken', 1640, 760, 0.9, 0, 'near', 148, 0, false), one('plant.bracken', 1712, 842, 1.15, 1, 'near', 149, 1, false), one('plant.bracken', 1610, 880, 1.25, 2, 'near', 150, 0, false),
      one('plant.fern', 1520, 724, 0.7, 1, 'near', 119, 0, false), one('plant.fern', 1300, 846, 0.9, 2, 'near', 120, 1, false),
      { obj: { 'rock.stones': 1, 'rock.boulder': 1 }, layer: 'near', seed: 121, area: { poly: [[1010, 870], [1140, 780], [1260, 720], [1400, 680], [1420, 720], [1180, 860]] }, n: 26, minGap: 24, s: [0.2, 0.5], sByY: [[680, 0.8], [880, 1.3]], flip: 0.5, variant: [0, 1], tint: T('#8a7a60'), mask: { noise: { scale: 70, cut: 0.3 } }, anim: false },
      { obj: { 'rock.stones': 3, 'rock.boulder': 1, 'ground.puddle': 1 }, layer: 'fore', seed: 122, area: { poly: [[1560, 676], [1700, 652], [1590, 740], [1540, 900], [1380, 900], [1440, 760]] }, n: 30, minGap: 22, s: [0.24, 0.6], sByY: [[650, 0.7], [900, 1.4]], flip: 0.5, variant: [0, 1], anim: false },
      // the shore reeds below the bank and round the swim
      { obj: { 'plant.reed': 3, 'plant.bulrush': 2 }, layer: 'near', seed: 123, area: { poly: [[960, 900], [1040, 846], [1110, 800], [1150, 812], [1090, 880], [1030, 912]] }, n: 26, minGap: 10, s: [0.7, 1], flip: 0.5, variant: [0, 1], anim: 'strip' },
      // the reed bed in the left foreground: three bands, bigger and nearer down the picture, moving in the wind
      { obj: { 'plant.reed': 3, 'plant.bulrush': 2 }, layer: 'near', seed: 124, area: { poly: [[-160, 600], [240, 610], [240, 690], [-160, 690]] }, n: 34, minGap: 11, s: [0.6, 0.9], flip: 0.5, variant: [0, 1], tint: T('#8a7a40'), anim: false },
      { obj: { 'plant.reed': 3, 'plant.bulrush': 2 }, layer: 'fore', seed: 125, area: { poly: [[-160, 720], [380, 720], [380, 820], [-160, 820]] }, n: 34, minGap: 14, s: [0.9, 1.4], flip: 0.5, variant: [0, 1], tint: T('#8a7a40'), anim: 'strip' },
      { obj: { 'plant.reed': 3, 'plant.bulrush': 2 }, layer: 'front', seed: 126, area: { poly: [[-160, 880], [300, 880], [300, 960], [-160, 960]] }, n: 26, minGap: 18, s: [1.5, 2.1], flip: 0.5, variant: [0, 1], tint: T('#8a7a40'), anim: 'strip' },
      { obj: 'plant.reed', layer: 'front', seed: 127, area: { poly: [[300, 890], [560, 890], [560, 960], [300, 960]] }, n: 10, minGap: 22, s: [1.3, 1.7], flip: 0.5, variant: [0, 1], anim: 'strip' },
      { obj: 'plant.bulrush', layer: 'front', seed: 128, area: { poly: [[900, 856], [1080, 856], [1080, 930], [900, 930]] }, n: 9, minGap: 20, s: [1.3, 1.7], flip: 0.5, variant: [0, 1], anim: 'strip' },
      // the bank's front edge: tall grass and flowers swaying
      { obj: { 'plant.grass': 6, 'plant.wildflowers': 2 }, layer: 'front', seed: 129, area: { poly: [[1080, 880], [1760, 860], [1760, 912], [1060, 912]] }, n: 80, minGap: 12, s: [0.9, 1.4], flip: 0.5, variant: 2, tint: T('#8a7a40'), anim: 'strip' },
    ],
    actors: [
      // the heron, stalking the shallows off the reedy spit, stabbing
      { obj: 'bird.wp-heron-stalk', layer: 'mid', path: [[560, 742], [520, 746], [480, 752]], speed: 2, loop: 'pingpong', s: 0.95, seed: 159, offset: 0.3 },
      // swallows over the water (spring to early autumn), pipistrelles after dusk, a light aircraft out of Blackbushe
      { obj: 'bird.wp-swallow', layer: 'near', path: [[-140, 600], [260, 640], [600, 580], [940, 650], [1300, 600], [1760, 630]], speed: 300, loop: 'fade', s: 0.85, variant: 0, seed: 156, offset: 0.2 },
      { obj: 'bird.wp-swallow', layer: 'near', path: [[1760, 540], [1200, 560], [800, 520], [300, 550], [-160, 530]], speed: 250, loop: 'fade', s: 0.6, variant: 1, seed: 157, offset: 0.65 },
      { obj: 'animal.wp-bat', layer: 'mid', path: [[600, 380], [820, 340], [980, 410], [760, 440], [600, 380]], speed: 160, loop: 'loop', s: 0.9, seed: 158, offset: 0.4 },
      { obj: 'vehicle.light-aircraft', layer: 'horizon', path: [[1820, 200], [-220, 260]], speed: 22, loop: 'loop', s: 0.45, variant: 1, seed: 160, offset: 0.7 },
      // on the water: a swan on the far water, mallard pair, coots, a moorhen by the reeds, a grebe
      { obj: 'bird.swan', layer: 'mid', path: [[480, 512], [760, 508]], speed: 4, loop: 'pingpong', s: 0.55, seed: 131, offset: 0.3 },
      { obj: 'bird.mallard', layer: 'mid', path: [[900, 600], [700, 604]], speed: 5, loop: 'pingpong', s: 0.62, seed: 132, offset: 0.1 },
      { obj: 'bird.mallard', layer: 'mid', path: [[960, 612], [760, 616]], speed: 5, loop: 'pingpong', s: 0.6, seed: 133, offset: 0.14, variant: 1 },
      { obj: 'bird.coot', layer: 'mid', path: [[300, 548], [460, 544]], speed: 6, loop: 'pingpong', s: 0.5, seed: 134, offset: 0.5 },
      { obj: 'bird.coot', layer: 'mid', path: [[1260, 530], [1150, 534]], speed: 5, loop: 'pingpong', s: 0.42, seed: 135, offset: 0.7 },
      { obj: 'bird.moorhen', layer: 'mid', path: [[400, 700], [520, 696]], speed: 4, loop: 'pingpong', s: 0.66, seed: 136, offset: 0.4 },
      { obj: 'bird.grebe', layer: 'mid', path: [[1000, 676], [820, 680]], speed: 5, loop: 'pingpong', s: 0.5, seed: 137, offset: 0.6 },
      // a walker and dog coming down the bank path
      { obj: 'person.dog-walker', layer: 'near', path: [[1700, 650], [1560, 690], [1480, 740]], speed: 10, loop: 'pingpong', s: 0.5, seed: 138, offset: 0.2 },
    ],
    flocks: [
      { obj: 'bird.small-flight', n: 5, area: [300, 160, 1300, 300], speed: 34, s: 0.5, seed: 141, layer: 'far' },
      { obj: 'bird.goose-flight', n: 6, area: [200, 100, 1400, 220], speed: 26, s: 0.34, seed: 142, layer: 'far' },
      { obj: 'animal.wyv-dragonfly', n: 3, area: [260, 560, 1100, 760], speed: 30, s: 0.9, seed: 143, layer: 'fore' },
    ],
    particles: 'season',
    weather: 'live',
  };
}
