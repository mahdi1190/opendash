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
  const { crowns, one, T, palette, layers, sky, farWoods } = sceneUkWyndhamsPoolKit();
  const WL = 504;   // the far waterline
  const bank = 'M-160 766Q200 826 420 862Q700 892 980 834Q1180 784 1420 704Q1560 650 1760 640V900H-160Z';
  return {
    v: 1,
    id: 'wyndhams-pool-3',
    view: { lat: 51.34, lon: -0.83, heading: 245, fov: 80, horizon: 470, lift: 1 },
    at: 'afternoon',
    season: 'auto',
    setting: 'natural',
    signage: false,
    sky: sky(5),
    palette,
    layers,
    ground: [
      { layer: 'horizon', d: crowns(61, 420, 28, WL + 2), fill: { lin: [[0, '@hill.0'], [1, '@hill.1']], x1: 0, y1: 420, x2: 0, y2: WL } },
      { layer: 'far', d: crowns(62, 448, 24, WL + 2, -160, 1760, 34, 90), fill: { lin: [[0, '@shore.0'], [1, '@shore.1']], x1: 0, y1: 446, x2: 0, y2: WL } },
      { layer: 'mid', d: `M-160 ${WL - 6}Q400 ${WL - 10} 800 ${WL - 4}T1760 ${WL - 7}V${WL + 8}H-160Z`, fill: { lin: [[0, '@shore.0'], [1, '@mud.0']], x1: 0, y1: WL - 10, x2: 0, y2: WL + 8 } },
      // the reed island off the far right shore
      { layer: 'mid', d: 'M1440 552Q1470 536 1560 538Q1650 540 1660 552Q1600 560 1540 560Q1470 560 1440 552Z', fill: '@mud.0' },
      // the near bank and the path climbing it
      { layer: 'near', d: bank, fill: { lin: [[0, '@near.0'], [1, '@bank.1']], x1: 0, y1: 640, x2: 0, y2: 900 } },
      { layer: 'fore', d: 'M1760 690Q1640 706 1520 742Q1380 790 1250 818Q1100 858 980 880Q880 896 760 910H1000Q1120 896 1240 866Q1400 832 1540 784Q1660 744 1760 722Z', fill: { lin: [[0, '@path.0'], [1, '@path.1']], x1: 0, y1: 690, x2: 0, y2: 910 } },
      { layer: 'front', d: 'M-160 880Q200 870 500 892Q640 900 760 910H-160Z', fill: '@verge.1' },
    ],
    water: [
      { layer: 'mid', d: `M-160 ${WL + 2}H1760V640Q1560 650 1420 704Q1180 784 980 834Q700 892 420 862Q200 826 -160 766Z`, y0: WL, y1: 900, base: ['#6f9a8a', '#2f5e5a', '#173a3e'], reflect: true, shimmer: 40, lightPath: true },
    ],
    place: [
      // the pine on the bank (the signature) and the angler's swim at the water
      { obj: 'tree.pool-pine', x: 1640, y: 694, s: 0.9, layer: 'near', variant: 0, seed: 220, flip: true },
      { obj: 'ground.swim', x: 905, y: 856, s: 0.8, layer: 'near', variant: 0, seed: 221 },
      { obj: 'person.angler', x: 900, y: 848, s: 0.74, layer: 'near', variant: 2, seed: 222 },
      { obj: 'ground.log', x: 560, y: 582, s: 0.36, layer: 'mid', variant: 0, seed: 223, flip: true },
      { obj: 'ground.log', x: 1420, y: 868, s: 0.8, layer: 'fore', variant: 1, seed: 224 },
      { obj: 'bird.robin', x: 1340, y: 836, s: 1.0, layer: 'fore', variant: 1, seed: 225 },
      { obj: 'animal.squirrel', x: 1652, y: 560, s: 0.9, layer: 'near', variant: 0, seed: 226 },
    ],
    scatter: [
      ...farWoods(WL, 201),
      { obj: { 'plant.reed': 3, 'plant.bulrush': 1 }, layer: 'mid', seed: 204, area: { rect: [-160, WL - 2, 1760, WL + 8] }, n: 64, minGap: 14, s: [0.22, 0.3], flip: 0.5, variant: 0, mask: { noise: { scale: 200, cut: 0.3 } }, anim: false },
      // the reed island and the reeds off the far left shore
      { obj: { 'plant.reed': 2, 'plant.bulrush': 1 }, layer: 'mid', seed: 205, area: { poly: [[1450, 548], [1650, 546], [1640, 556], [1460, 556]] }, n: 16, minGap: 10, s: [0.4, 0.5], flip: 0.5, variant: [0, 1], anim: false },
      { obj: { 'plant.reed': 2, 'plant.bulrush': 1 }, layer: 'mid', seed: 206, area: { poly: [[120, 530], [330, 530], [330, 556], [120, 556]] }, n: 18, minGap: 10, s: [0.4, 0.5], flip: 0.5, variant: [0, 1], anim: false },
      // lilies in the bays, rising fish
      { obj: 'water.lily', layer: 'mid', seed: 207, area: { poly: [[380, 650], [1060, 640], [1000, 790], [420, 800]] }, n: 24, minGap: 30, s: [0.4, 0.66], sByY: [[640, 0.85], [800, 1.25]], flip: 0.5, variant: [0, 1], tint: T('#a0a050'), anim: false },
      { obj: 'water.lily', layer: 'mid', seed: 208, area: { poly: [[40, 560], [360, 560], [360, 640], [40, 640]] }, n: 8, minGap: 30, s: [0.3, 0.44], flip: 0.5, variant: [0, 1], anim: false },
      one('water.fish-ring', 860, 560, 0.42, 0, 'mid', 209), one('water.fish-ring', 520, 722, 0.6, 1, 'mid', 210, 1), one('water.fish-ring', 1300, 602, 0.38, 0, 'mid', 211, 1), one('water.fish-ring', 300, 690, 0.5, 1, 'mid', 212),
      one('water.edge', 260, 820, 0.6, 0, 'near', 213, 0, false), one('water.edge', 640, 872, 0.7, 1, 'near', 214, 1, false), one('water.edge', 1120, 800, 0.62, 2, 'near', 215, 0, false), one('water.edge', 1500, 676, 0.46, 0, 'near', 216, 1, false),
      // the near bank: an alder at the water, reeds along the shore, heather and bracken up the slope, stones and leaves
      one('tree.pool-oak', 1440, 700, 0.72, 1, 'near', 217, 0, false),
      one('tree.pool-birch', 1560, 668, 0.66, 2, 'near', 218, 1, false),
      { obj: { 'plant.reed': 3, 'plant.bulrush': 2 }, layer: 'near', seed: 230, area: { poly: [[1220, 650], [1760, 630], [1760, 660], [1420, 712], [1260, 740]] }, n: 34, minGap: 11, s: [0.66, 0.96], flip: 0.5, variant: [0, 1], tint: T('#8a7a40'), anim: 'strip' },
      { obj: { 'plant.reed': 3, 'plant.bulrush': 2 }, layer: 'near', seed: 231, area: { poly: [[-160, 720], [280, 770], [280, 820], [-160, 790]] }, n: 30, minGap: 11, s: [0.76, 1.1], flip: 0.5, variant: [0, 1], tint: T('#8a7a40'), anim: 'strip' },
      { obj: { 'plant.grass': 5, 'plant.heather': 2, 'plant.wildflowers': 1 }, layer: 'near', seed: 232, area: { poly: [[1100, 800], [1420, 716], [1560, 668], [1760, 650], [1760, 700], [1500, 760], [1240, 830], [1000, 880]] }, n: 120, minGap: 10, s: [0.5, 0.85], sByY: [[650, 0.8], [880, 1.2]], flip: 0.5, variant: 0, tint: T('#8a7a40'), anim: false },
      { obj: { 'plant.grass': 6, 'plant.wildflowers': 2, 'plant.heather': 1 }, layer: 'near', seed: 233, area: { poly: [[-160, 790], [300, 830], [620, 890], [880, 870], [900, 905], [-160, 905]] }, n: 150, minGap: 10, s: [0.6, 1], sByY: [[790, 0.85], [905, 1.25]], flip: 0.5, variant: 2, tint: T('#8a7a40'), mask: { avoid: [{ rect: [800, 800, 1000, 880] }] }, anim: false },
      one('plant.bracken', 1520, 806, 1.0, 0, 'fore', 234, 0, false), one('plant.bracken', 1615, 784, 0.86, 1, 'fore', 235, 1, false), one('plant.bracken', 1712, 838, 1.2, 2, 'fore', 236, 0, false), one('plant.bracken', 1570, 880, 1.3, 1, 'fore', 237, 1, false),
      one('plant.fern', 1300, 786, 0.7, 1, 'near', 238, 0, false), one('plant.fern', 1660, 760, 0.8, 2, 'near', 239, 1, false),
      { obj: { 'rock.stones': 2, 'rock.boulder': 1, 'ground.leaves': 3, 'ground.puddle': 1 }, layer: 'fore', seed: 240, area: { poly: [[1760, 694], [1540, 770], [1250, 830], [960, 890], [1000, 900], [1240, 860], [1540, 790], [1760, 720]] }, n: 40, minGap: 20, s: [0.24, 0.6], sByY: [[690, 0.7], [900, 1.4]], flip: 0.5, variant: [0, 1], anim: false },
      { obj: { 'rock.stones': 1, 'rock.boulder': 1 }, layer: 'near', seed: 241, area: { poly: [[700, 852], [1200, 830], [1200, 846], [700, 872]] }, n: 14, minGap: 30, s: [0.3, 0.6], flip: 0.5, variant: [0, 1], mask: { noise: { scale: 80, cut: 0.3 } }, anim: false },
      // the birches framing the left, their roots in the bank
      one('tree.pool-birch', 140, 920, 1.18, 0, 'front', 242, 0),
      one('tree.pool-birch', 330, 904, 0.86, 1, 'front', 243, 1, false),
      // the foreground: grass, sedges and flowers along the path edge, swaying in gusts
      { obj: { 'plant.grass': 6, 'plant.wildflowers': 2 }, layer: 'front', seed: 244, area: { poly: [[-160, 884], [760, 900], [760, 930], [-160, 930]] }, n: 110, minGap: 11, s: [0.9, 1.3], flip: 0.5, variant: 2, tint: T('#8a7a40'), anim: 'strip' },
      { obj: 'plant.grass', layer: 'front', seed: 245, area: { poly: [[1100, 880], [1760, 860], [1760, 930], [1100, 930]] }, n: 40, minGap: 14, s: [1, 1.4], flip: 0.5, variant: [0, 1], anim: 'strip' },
    ],
    actors: [
      { obj: 'bird.swan', layer: 'mid', path: [[1080, 640], [820, 644]], speed: 4, loop: 'pingpong', s: 0.92, seed: 251, offset: 0.3 },
      { obj: 'bird.mallard', layer: 'mid', path: [[560, 650], [760, 654]], speed: 5, loop: 'pingpong', s: 0.7, seed: 252, offset: 0.1 },
      { obj: 'bird.mallard', layer: 'mid', path: [[620, 668], [800, 672]], speed: 5, loop: 'pingpong', s: 0.68, seed: 253, offset: 0.16, variant: 1 },
      { obj: 'bird.coot', layer: 'mid', path: [[460, 590], [330, 594]], speed: 6, loop: 'pingpong', s: 0.5, seed: 254, offset: 0.5 },
      { obj: 'bird.coot', layer: 'mid', path: [[1200, 610], [1320, 606]], speed: 5, loop: 'pingpong', s: 0.45, seed: 255, offset: 0.7 },
      { obj: 'bird.moorhen', layer: 'mid', path: [[1400, 690], [1320, 694]], speed: 4, loop: 'pingpong', s: 0.55, seed: 256, offset: 0.4 },
      { obj: 'bird.moorhen', layer: 'mid', path: [[220, 750], [320, 746]], speed: 4, loop: 'pingpong', s: 0.6, seed: 257, offset: 0.8 },
      { obj: 'bird.grebe', layer: 'mid', path: [[700, 570], [960, 574]], speed: 5, loop: 'pingpong', s: 0.4, seed: 258, offset: 0.6 },
      { obj: 'person.dog-walker', layer: 'fore', path: [[1740, 708], [1500, 770], [1260, 832]], speed: 12, loop: 'pingpong', s: 0.72, seed: 259, offset: 0.25 },
    ],
    flocks: [
      { obj: 'bird.small-flight', n: 5, area: [100, 160, 1500, 280], speed: 34, s: 0.55, seed: 261, layer: 'far' },
      { obj: 'bird.goose-flight', n: 7, area: [300, 90, 1500, 200], speed: 26, s: 0.4, seed: 262, layer: 'far' },
      { obj: 'animal.dragonfly', n: 3, area: [400, 600, 1200, 760], speed: 30, s: 0.9, seed: 263, layer: 'fore' },
    ],
    particles: 'season',
    weather: 'live',
  };
}
