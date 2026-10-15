/* ============================================================
   COMPOSED SCENE uk-south-east / Wyndham's Pool, view 3 (detail)
   docs/dev/SCENE_ENGINE.md sections 3, 15 and 17 (the convert stage).

   The rich hand-drawn view (72-anim-pack-uk-south-east-wyndhams-pool-v3.js,
   kept there as legacySvg) rebuilt from the object library: ONE auto-season
   scene for the view's four seasonal items (its autumn item keeps the
   view's original saved ref).

   The detail view, looking west-south-west (heading 245) along the pool's
   woodland margin: two silver birches frame the left, their roots in the
   bank; the near bank sweeps diagonally from the bottom left to the right,
   with the bank path climbing away past an alder and a Scots pine, and an
   angler's wooden swim at the water. Lily pads, a mute swan, mallard,
   coot and moorhen on the water; a reed island off the far right shore; the
   far wood of birch, pine and oak mirrored in the pool.
   Helpers: sceneUkWyndhamsPoolKit() (71-scene-uk-south-east-wyndhams-pool-wide.js).

   PURE: defines one function; it runs once (through the item's thunk).
   ============================================================ */
function sceneUkWyndhamsPoolDetail() {
  const { one, T, palette, layers, sky, farShore } = sceneUkWyndhamsPoolKit();
  const WL = 504;   // the far waterline
  const far = farShore(WL, 61, { hide: [[1560, 1800]] });
  // the movers' ground (sceneUkWyndhamsPoolMovers, 71-scene-uk-south-east-wyndhams-pool-wide.js): the view, the eye the scene is drawn
  // from (the swim, the angler and the heath birds drawn to it), the open water inside the reeds and the bank, the path's centre line up the bank
  const VIEW = { lat: 51.34, lon: -0.83, heading: 245, fov: 80, horizon: 470, lift: 1 }, EYE = 5;
  const OPEN = [[[-120, 540], [1400, 540], [1440, 566], [1600, 566], [1640, 640], [1420, 690], [1180, 770], [980, 824], [700, 866], [420, 848], [240, 816], [120, 780], [-120, 740]]];
  const PATH = [[1740, 712], [1600, 752], [1460, 796], [1300, 832], [1150, 862], [1040, 882]];
  const bank = 'M-160 766Q200 826 420 862Q700 892 980 834Q1180 784 1420 704Q1560 650 1760 640V900H-160Z';
  return {
    v: 1,
    id: 'wyndhams-pool-3',
    view: VIEW,
    at: 'afternoon',
    season: 'auto',
    setting: 'natural',
    signage: false,
    sky: sky(5),
    palette,
    layers,
    ground: [
      // the far shore: lobed woods, Scots pines standing out of them
      ...far.ground,
      // the reed island off the far right shore
      { layer: 'mid', d: 'M1440 552Q1470 536 1560 538Q1650 540 1660 552Q1600 560 1540 560Q1470 560 1440 552Z', fill: '@mud.0' },
      // the near bank and the path climbing it
      { layer: 'near', d: bank, fill: { lin: [[0, '@near.0'], [1, '@bank.1']], x1: 0, y1: 640, x2: 0, y2: 900 } },
      { layer: 'fore', d: 'M1760 690Q1640 706 1520 742Q1380 790 1250 818Q1100 858 980 880Q880 896 760 910H1000Q1120 896 1240 866Q1400 832 1540 784Q1660 744 1760 722Z', fill: { lin: [[0, '@path.0'], [1, '@path.1']], x1: 0, y1: 690, x2: 0, y2: 910 } },
      { layer: 'front', d: 'M-160 880Q200 870 500 892Q640 900 760 910H-160Z', fill: '@verge.1' },
    ],
    water: [
      { layer: 'mid', kind: 'pond', d: `M-160 ${WL + 2}H1760V640Q1560 650 1420 704Q1180 784 980 834Q700 892 420 862Q200 826 -160 766Z`, y0: WL, y1: 900 },
    ],
    place: [
      // the pine on the bank (the signature) and the angler's swim at the water
      { obj: 'tree.pool-pine', x: 1640, y: 694, s: 0.9, layer: 'near', variant: 0, seed: 220, flip: true },
      { obj: 'ground.swim', x: 905, y: 856, s: 1.88, layer: 'near', variant: 0, seed: 221 },
      { obj: 'person.angler', x: 900, y: 848, s: 1.74, layer: 'near', variant: 2, seed: 222 },
      { obj: 'ground.log', x: 560, y: 582, s: 0.36, layer: 'mid', variant: 0, seed: 223, flip: true },
      { obj: 'ground.log', x: 1420, y: 868, s: 0.8, layer: 'fore', variant: 1, seed: 224 },
      { obj: 'bird.robin', x: 1340, y: 836, s: 0.42, layer: 'fore', variant: 1, seed: 225 },
      // a dead branch in the shallows by the swim, the kingfisher on it
      { obj: 'tree.wyv-snag', x: 1110, y: 716, s: 0.66, layer: 'mid', variant: 0, seed: 227 },
      { obj: 'bird.wp-kingfisher-perch', x: 1132, y: 618, s: 0.85, layer: 'mid', seed: 228 },
      // heath birds: a Dartford warbler on the gorse, a stonechat on the heather
      { obj: 'bird.dartford-warbler', x: 1690, y: 690, s: 0.2, layer: 'near', seed: 229, flip: true },
      { obj: 'bird.stonechat', x: 600, y: 846, s: 0.38, layer: 'front', variant: 1, seed: 230 },
      // framing: a silver birch bough into the top right
      { obj: 'tree.wyv-birch-bough', x: 1650, y: -16, s: 0.8, layer: 'front', variant: 1, seed: 231, flip: true, pin: true },
      // dusk: mist on the water
      { obj: 'sky.wp-mist', x: 500, y: WL - 4, s: 1.0, layer: 'mid', variant: 1, pin: true, anim: false },
      { obj: 'sky.wp-mist', x: 1150, y: WL - 2, s: 1.0, layer: 'mid', variant: 0, flip: true, pin: true, anim: false },
      { obj: 'animal.squirrel', x: 1652, y: 560, s: 0.9, layer: 'near', variant: 0, seed: 226 },
    ],
    scatter: [
      ...far.scatter,
      { obj: { 'plant.reed': 3, 'plant.bulrush': 1 }, layer: 'mid', seed: 204, area: { rect: [-160, WL, 1760, WL + 8] }, n: 64, minGap: 14, s: [0.22, 0.3], flip: 0.5, variant: 0, mask: { noise: { scale: 240, cut: 0.4 } }, anim: false },
      // the reed island and the reeds off the far left shore
      { obj: { 'plant.reed': 2, 'plant.bulrush': 1 }, layer: 'mid', seed: 205, area: { poly: [[1450, 548], [1650, 546], [1640, 556], [1460, 556]] }, n: 16, minGap: 10, s: [0.4, 0.5], flip: 0.5, variant: [0, 1], anim: false },
      { obj: { 'plant.reed': 2, 'plant.bulrush': 1 }, layer: 'mid', seed: 206, area: { poly: [[120, 530], [330, 530], [330, 556], [120, 556]] }, n: 18, minGap: 10, s: [0.4, 0.5], flip: 0.5, variant: [0, 1], anim: false },
      // lilies in the bays, rising fish
      { obj: 'water.lily', layer: 'mid', seed: 207, area: { poly: [[380, 650], [1060, 640], [1000, 790], [420, 800]] }, n: 24, minGap: 30, s: [0.4, 0.66], sByY: [[640, 0.85], [800, 1.25]], flip: 0.5, variant: [0, 1], tint: T('#a0a050'), anim: false },
      { obj: 'water.lily', layer: 'mid', seed: 208, area: { poly: [[40, 560], [360, 560], [360, 640], [40, 640]] }, n: 8, minGap: 30, s: [0.3, 0.44], flip: 0.5, variant: [0, 1], anim: false },
      one('water.fish-ring', 860, 560, 0.42, 0, 'mid', 209), one('water.fish-ring', 520, 722, 0.6, 1, 'mid', 210, 1), one('water.fish-ring', 1300, 602, 0.38, 0, 'mid', 211, 1), one('water.fish-ring', 300, 690, 0.5, 1, 'mid', 212),
      one('water.edge', 260, 820, 0.6, 0, 'near', 213, 0, false), one('water.edge', 640, 872, 0.7, 1, 'near', 214, 1, false), one('water.edge', 1120, 800, 0.62, 2, 'near', 215, 0, false), one('water.edge', 1500, 676, 0.46, 0, 'near', 216, 1, false),
      // the near bank: an alder at the water, reeds along the shore, heather and bracken up the slope, stones and leaves
      one('tree.canal-oak', 1440, 700, 0.52, 0, 'near', 217, 0, false),
      one('tree.pool-birch', 1560, 668, 0.66, 2, 'near', 218, 1, false),
      { obj: { 'plant.reed': 3, 'plant.bulrush': 2 }, layer: 'near', seed: 230, area: { poly: [[1220, 650], [1760, 630], [1760, 660], [1420, 712], [1260, 740]] }, n: 34, minGap: 11, s: [0.66, 0.96], flip: 0.5, variant: [0, 1], tint: T('#8a7a40'), anim: 'strip' },
      { obj: { 'plant.reed': 3, 'plant.bulrush': 2 }, layer: 'near', seed: 231, area: { poly: [[-160, 720], [280, 770], [280, 820], [-160, 790]] }, n: 30, minGap: 11, s: [0.76, 1.1], flip: 0.5, variant: [0, 1], tint: T('#8a7a40'), anim: 'strip' },
      { obj: { 'plant.grass': 5, 'plant.heather': 2, 'plant.wildflowers': 1 }, layer: 'near', seed: 232, area: { poly: [[1100, 800], [1420, 716], [1560, 668], [1760, 650], [1760, 700], [1500, 760], [1240, 830], [1000, 880]] }, n: 120, minGap: 10, s: [0.5, 0.85], sByY: [[650, 0.8], [880, 1.2]], flip: 0.5, variant: 0, tint: T('#8a7a40'), anim: false },
      { obj: { 'plant.grass': 6, 'plant.wildflowers': 2, 'plant.heather': 1 }, layer: 'near', seed: 233, area: { poly: [[-160, 790], [300, 830], [620, 890], [880, 870], [900, 905], [-160, 905]] }, n: 150, minGap: 10, s: [0.6, 1], sByY: [[790, 0.85], [905, 1.25]], flip: 0.5, variant: 2, tint: T('#8a7a40'), mask: { avoid: [{ rect: [760, 800, 1070, 880] }] }, anim: false },
      one('plant.bracken', 1520, 806, 1.0, 0, 'fore', 234, 0, false), one('plant.bracken', 1615, 784, 0.86, 1, 'fore', 235, 1, false), one('plant.bracken', 1712, 838, 1.2, 2, 'fore', 236, 0, false), one('plant.bracken', 1570, 880, 1.3, 1, 'fore', 237, 1, false),
      one('plant.wyv-heath-bank', 1640, 718, 0.75, 0, 'near', 246, 1, false), one('plant.wyv-heath-bank', 1420, 900, 1.05, 2, 'fore', 247, 0, false),
      one('plant.wyv-heath-bank', 20, 900, 1.2, 1, 'front', 248, 0, false), one('plant.wyv-heath-bank', 520, 912, 1.0, 0, 'front', 249, 1, false),
      one('plant.wyv-heath-bank', 200, 830, 0.8, 2, 'near', 250, 1, false),
      one('plant.fern', 1300, 786, 0.7, 1, 'near', 238, 0, false), one('plant.fern', 1660, 760, 0.8, 2, 'near', 239, 1, false),
      { obj: { 'ground.leaves': 3, 'ground.puddle': 1 }, layer: 'fore', seed: 240, area: { poly: [[1760, 694], [1540, 770], [1250, 830], [960, 890], [1000, 900], [1240, 860], [1540, 790], [1760, 720]] }, n: 40, minGap: 20, s: [0.24, 0.6], sByY: [[690, 0.7], [900, 1.4]], flip: 0.5, variant: [0, 1], anim: false },
      { obj: { 'rock.stones': 1, 'rock.boulder': 1 }, layer: 'near', seed: 241, area: { poly: [[700, 852], [1030, 838], [1030, 854], [700, 872]] }, n: 14, minGap: 30, s: [0.3, 0.6], flip: 0.5, variant: [0, 1], mask: { noise: { scale: 80, cut: 0.3 } }, anim: false },
      // the birches framing the left, their roots in the bank
      one('tree.pool-birch', 140, 920, 1.18, 0, 'front', 242, 0),
      one('tree.pool-birch', 330, 904, 0.86, 1, 'front', 243, 1, false),
      // the foreground: grass, sedges and flowers along the path edge, swaying in gusts
      { obj: { 'plant.grass': 6, 'plant.wildflowers': 2 }, layer: 'front', seed: 244, area: { poly: [[-160, 884], [760, 900], [760, 930], [-160, 930]] }, n: 110, minGap: 11, s: [0.9, 1.3], flip: 0.5, variant: 2, tint: T('#8a7a40'), anim: 'strip' },
      { obj: 'plant.grass', layer: 'front', seed: 245, area: { poly: [[1100, 880], [1760, 860], [1760, 930], [1100, 930]] }, n: 40, minGap: 14, s: [1, 1.4], flip: 0.5, variant: [0, 1], anim: 'strip' },
    ],
    actors: [
      // the ground movers, by the behaviour presets at their real sizes: the heron stalking the shallows off the left bank,
      // the swan, mallard, coots, moorhens and a grebe on the open water, a walker and a walker with an off-lead dog on the path
      ...sceneUkWyndhamsPoolMovers(VIEW, EYE, OPEN, [
        { obj: 'bird.wp-heron-stalk', preset: 'heron-stalk', px: [[730, 836], [680, 838], [630, 834]], layer: 'mid', seed: 264, offset: 0.4 },
        { obj: 'bird.swan', preset: 'swan', px: [[1060, 740], [900, 760], [760, 770]], layer: 'mid', seed: 251, offset: 0.3 },
        { obj: 'bird.mallard', preset: 'duck', px: [[300, 768], [420, 778], [520, 774]], layer: 'mid', seed: 252, offset: 0.1 },
        { obj: 'bird.mallard', preset: 'duck', px: [[340, 790], [460, 798], [550, 794]], layer: 'mid', seed: 253, offset: 0.16, variant: 1 },
        { obj: 'bird.coot', preset: 'coot', px: [[460, 700], [330, 706]], layer: 'mid', seed: 254, offset: 0.5 },
        { obj: 'bird.coot', preset: 'coot', px: [[1200, 690], [1320, 676]], layer: 'mid', seed: 255, offset: 0.7 },
        { obj: 'bird.moorhen', preset: 'moorhen', px: [[1440, 664], [1360, 690]], layer: 'mid', seed: 256, offset: 0.4 },
        { obj: 'bird.moorhen', preset: 'moorhen', px: [[130, 760], [210, 770]], layer: 'mid', seed: 257, offset: 0.8 },
        { obj: 'bird.grebe', preset: 'grebe', px: [[700, 640], [960, 646]], layer: 'mid', seed: 258, offset: 0.6 },
        { obj: 'person.walker', preset: 'stroll', px: PATH.map(([x, y]) => [x, y - 8]).reverse(), layer: 'fore', seed: 269, offset: 0.7 },
        { kind: 'dog', walker: 'person.walker', px: PATH.map(([x, y]) => [x, y + 10]), layer: 'fore', seed: 259, offset: 0.25, variant: 1 },
      ]),
      // swallows over the water (spring to early autumn), pipistrelles after dusk, a light aircraft out of Blackbushe
      { obj: 'bird.wp-swallow', layer: 'near', path: [[-140, 620], [300, 660], [700, 600], [1100, 680], [1500, 620], [1760, 650]], speed: 300, loop: 'fade', s: 0.85, variant: 0, seed: 265, offset: 0.3 },
      { obj: 'bird.wp-swallow', layer: 'near', path: [[1760, 570], [1200, 590], [700, 550], [200, 585], [-160, 560]], speed: 260, loop: 'fade', s: 0.6, variant: 1, seed: 266, offset: 0.75 },
      { obj: 'animal.wp-bat', layer: 'mid', path: [[700, 400], [900, 360], [1080, 430], [860, 470], [700, 400]], speed: 160, loop: 'loop', s: 0.9, seed: 267, offset: 0.1 },
      { obj: 'vehicle.light-aircraft', layer: 'horizon', path: [[-200, 230], [1800, 160]], speed: 24, loop: 'loop', s: 0.45, seed: 268, offset: 0.15 },
    ],
    flocks: [
      { obj: 'bird.small-flight', n: 5, area: [100, 160, 1500, 280], speed: 34, s: 0.55, seed: 261, layer: 'far' },
      { obj: 'bird.goose-flight', n: 7, area: [300, 90, 1500, 200], speed: 26, s: 0.4, seed: 262, layer: 'far' },
      { obj: 'animal.wyv-dragonfly', n: 3, area: [400, 600, 1200, 760], speed: 30, s: 0.9, seed: 263, layer: 'fore' },
    ],
    fx: { water: 2 },   // (lock, 10 Oct) the engine's water pass draws the pond and every reflection
    particles: 'season',
    weather: 'live',
  };
}
