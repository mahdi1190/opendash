/* ============================================================
   COMPOSED SCENE uk-south-east / Yateley Common, view 3 of 4 (detail):
   down at the edge of a boggy heathland pool in the mire on the Common, at
   eye level with the sundews (docs/dev/SCENE_ENGINE.md section 3; helpers
   and sources in 71-scene-uk-south-east-yateley-common-0.js).
   A tongue of bog moss runs out from our feet into the dark peaty water,
   red and green sphagnum hummocks studded with round-leaved sundews (their
   dew glistening, white flowers in summer) and tufts of cotton-grass, to a
   dead Scots pine standing silver at its tip (the landmark, a dragonfly
   perch), mirrored in the pool. Cotton-grass stands in the shallows on the
   right; a fallen pine branch lies on the moss; a birch bough hangs in from
   the top right and a young birch frames the left. Beyond the water: the
   far bank of heather under silver birches and Scots pines. Life: hawker
   and darter dragonflies over the water in summer, small birds, the live
   sun, moon and stars.
   Lint, look and time it with:
     node tools/anim-pack.mjs scene lint uk-south-east/hampshire-yateley-common-3 --perf
     node tools/anim-pack.mjs scene sheet uk-south-east/hampshire-yateley-common-3 --times --seasons
   ============================================================ */
function sceneYateleyCommon3(season) {
  const Y = _scYc, winter = season === 'winter', summer = season === 'summer', spring = season === 'spring', autumn = season === 'autumn';
  // the pool fills the picture below the far bank; the bog-moss spit comes in from the bottom left to the dead pine
  const WATER = [[-180, 566], [300, 560], [800, 556], [1300, 558], [1780, 564], [1780, 920], [-180, 920]];
  const SPIT = [[-180, 752], [60, 742], [250, 738], [420, 722], [560, 714], [680, 694], [790, 684], [884, 676], [912, 690], [858, 706], [804, 738], [744, 778], [706, 830], [694, 905], [-180, 905]];
  const spitInner = { poly: [[-180, 772], [260, 758], [560, 734], [760, 712], [830, 708], [756, 760], [686, 830], [664, 905], [-180, 905]] };
  // hummock islets stepping out from the spit's tip to the dead pine
  const ISLETS = [[928, 1004, 664, 680, 3651], [1022, 1140, 628, 648, 3652]];
  const SNAG = [1080, 640];
  const d = {
    v: 1, id: 'yateley-common-detail-' + season,
    view: { lat: 51.337, lon: -0.825, heading: 300, fov: 66, horizon: 500, lift: 0.7 },
    at: 'afternoon', season: 'auto', tropic: 'summer', setting: 'natural', weather: 'live', particles: 'season', fx: { water: 2 },
    palette: Y.pal({
      spring: { moss: ['#6e8a34', '#56702a', '#3a4c20'] },
      summer: { moss: ['#6a8a30', '#52702a', '#38501e'] },
      autumn: { moss: ['#7a7a30', '#6a5a2a', '#48401e'] },
      winter: { moss: ['#5e6a3a', '#4a5432', '#343c24'] },
    }),
    layers: Y.layers,
    sky: { stars: 200, clouds: { n: 6, y: [40, 300], speed: 5 }, sunR: 26, moonR: 20 },
    ground: [
      { layer: 'horizon', d: Y.band(494, 3, 0, 520), fill: '@wood.0' },
      { layer: 'far', d: Y.band(508, 4, 30, 600), fill: { lin: [[0, '@heath.0'], [1, '@heath.1']], y1: 508, y2: 580 } },
      { layer: 'far', d: Y.mounds(-160, 1760, 520, 560, 34, 3611, [22, 44]), fill: '@mound.0' },
      // the far shore: a strip of moss at the water's edge
      { layer: 'mid', d: Y.band(552, 3, 60, 572), fill: '@moss.1' },
      // the spit of bog moss from our feet out to the dead pine
      { layer: 'near', d: Y.poly(SPIT.map(([x, y]) => [x, y + 7]), true) + ISLETS.map(([a, b, c, e, k]) => Y.pond(a, b, c + 5, e + 6, k)).join(''), fill: '@bank.1' },
      { layer: 'near', d: Y.poly(SPIT, true) + ISLETS.map(([a, b, c, e, k]) => Y.pond(a, b, c, e, k)).join(''), fill: { lin: [[0, '@moss.0'], [0.4, '@moss.1'], [1, '@moss.2']], y1: 620, y2: 905 } },
    ],
    water: [{ layer: 'mid', kind: 'pond', d: Y.poly(WATER), y0: 558, y1: 905 }],
    place: [
      // the landmark: the dead Scots pine at the spit's tip, silver, mirrored
      { obj: 'tree.wyv-snag', x: SNAG[0], y: SNAG[1], s: 2.1, layer: 'near', variant: 0, seed: 1, anim: false },
      // the far bank: silver birches and Scots pines over the heather (in groups, at several depths)
      { obj: 'tree.pool-birch', x: 220, y: 548, s: 0.42, layer: 'mid', variant: 0, seed: 2, anim: false },
      { obj: 'tree.pool-birch', x: 300, y: 552, s: 0.5, layer: 'mid', variant: 2, flip: true, seed: 3, anim: false },
      { obj: 'tree.pool-pine', x: 520, y: 546, s: 0.4, layer: 'mid', variant: 1, seed: 4, anim: false },
      { obj: 'tree.pool-birch', x: 760, y: 550, s: 0.36, layer: 'mid', variant: 1, seed: 5, anim: false },
      { obj: 'tree.pool-pine', x: 1320, y: 548, s: 0.46, layer: 'mid', variant: 0, flip: true, seed: 6, anim: false },
      { obj: 'tree.pool-birch', x: 1420, y: 552, s: 0.44, layer: 'mid', variant: 1, seed: 7, anim: false },
      { obj: 'tree.pine-veteran', x: 960, y: 536, s: 0.22, layer: 'far', variant: 1, seed: 8, anim: false },
      // the frame: a young birch on the spit at the left, a birch bough hanging in from the top right
      { obj: 'tree.pool-birch', x: 70, y: 800, s: 1.35, layer: 'fore', variant: 1, seed: 9, anim: { sway: { k: 0.6 } } },
      { obj: 'tree.wyv-birch-bough', x: 1660, y: -20, s: 1.1, layer: 'front', variant: 0, flip: true, seed: 10, anim: { sway: { k: 1 } } },
      // a fallen pine branch on the moss
      { obj: 'ground.log', x: 520, y: 800, s: 1.1, layer: 'near', variant: 0, seed: 11, anim: false },
      // sundews on the moss in the foreground (in little colonies)
      { obj: 'plant.yc-sundew', x: 180, y: 862, s: 3.48, layer: 'fore', variant: 1, seed: 12 },
      { obj: 'plant.yc-sundew', x: 262, y: 884, s: 2.9, layer: 'fore', variant: 0, flip: true, seed: 13 },
      { obj: 'plant.yc-sundew', x: 336, y: 856, s: 2.46, layer: 'fore', variant: 1, seed: 14 },
      { obj: 'plant.yc-sundew', x: 520, y: 892, s: 3.19, layer: 'fore', variant: 0, seed: 15 },
      { obj: 'plant.yc-sundew', x: 600, y: 870, s: 2.32, layer: 'fore', variant: 1, flip: true, seed: 16 },
      { obj: 'plant.yc-sundew', x: 760, y: 760, s: 1.59, layer: 'near', variant: 0, seed: 17 },
      { obj: 'plant.yc-sundew', x: 820, y: 742, s: 1.3, layer: 'near', variant: 1, flip: true, seed: 18 },
      // cotton-grass: big tufts in the foreground, stands in the shallows on the right
      { obj: 'plant.yc-cotton-grass', x: 40, y: 905, s: 2.4, layer: 'front', variant: 1, seed: 19 },
      { obj: 'plant.yc-cotton-grass', x: 420, y: 905, s: 2.0, layer: 'front', variant: 0, flip: true, seed: 20 },
      { obj: 'plant.yc-cotton-grass', x: 1380, y: 905, s: 2.2, layer: 'front', variant: 1, flip: true, seed: 21 },
      { obj: 'plant.yc-cotton-grass', x: 1530, y: 880, s: 1.9, layer: 'fore', variant: 0, seed: 22 },
      { obj: 'plant.yc-cotton-grass', x: 1650, y: 900, s: 2.3, layer: 'front', variant: 2, seed: 23 },
      { obj: 'plant.yc-cotton-grass', x: 1250, y: 820, s: 1.3, layer: 'fore', variant: 2, flip: true, seed: 24 },
      { obj: 'plant.grass-long', x: 1460, y: 890, s: 2.2, layer: 'front', variant: 1, seed: 25, anim: { sway: { k: 0.6 } } },
    ],
    scatter: [
      { obj: 'tree.woods-edge', layer: 'horizon', seed: 1, area: { rect: [-160, 490, 1760, 498] }, n: 16, minGap: 90, s: [0.34, 0.52], flip: 0.5, variant: [0, 1, 2], anim: false },
      { obj: 'tree.woods-edge', layer: 'far', seed: 2, area: { rect: [-160, 512, 1760, 520] }, n: 7, minGap: 160, s: [0.5, 0.7], flip: 0.5, variant: [0, 1, 2], anim: false },
      // the far bank's heather
      ...Y.drifts({ seed: 30, far: [520, 556], n: { far: 90 } }),
      { obj: { 'plant.heather': 4, 'plant.yc-cotton-grass': 2 }, layer: 'mid', seed: 31, area: { rect: [-160, 552, 1760, 568] }, n: 46, minGap: 22, s: [0.3, 0.46], flip: 0.5, variant: [0, 2], anim: false },
      // the spit: sphagnum hummocks all over, cotton-grass and heather tufts on them
      { obj: 'ground.yc-sphagnum', layer: 'near', seed: 32, area: spitInner, n: 110, minGap: 14, s: [0.3, 0.6], sByY: [[620, 0.45], [790, 1.3]], flip: 0.5, variant: [0, 1, 2], anim: false },
      ...ISLETS.map(([a, b, c, e], i) => ({ obj: { 'ground.yc-sphagnum': 2, 'plant.yc-cotton-grass': 1 }, layer: 'near', seed: 37 + i, area: { rect: [a + 16, c + 4, b - 16, e - 2] }, n: 5, minGap: 14, s: [0.16, 0.26], flip: 0.5, variant: [0, 1], anim: false })),
      { obj: { 'plant.heather': 2, 'plant.grass': 1 }, layer: 'near', seed: 36, area: spitInner, n: 30, minGap: 30, s: [0.5, 0.9], sByY: [[620, 0.6], [790, 1.3]], mask: { noise: { scale: 220, cut: 0.4 } }, flip: 0.5, variant: [0, 1], anim: false },
      { obj: 'ground.yc-sphagnum', layer: 'fore', seed: 33, area: { poly: [[-180, 800], [700, 800], [660, 905], [-180, 905]] }, n: 22, minGap: 50, s: [0.9, 1.4], flip: 0.5, variant: [0, 0, 2], anim: false },
      { obj: { 'plant.yc-cotton-grass': 3, 'plant.heather': 2 }, layer: 'near', seed: 34, area: spitInner, n: 34, minGap: 30, s: [0.45, 0.8], sByY: [[620, 0.6], [780, 1.3]], mask: { noise: { scale: 180, cut: 0.35 } }, flip: 0.5, variant: [0, 1, 2], anim: false },
      // cotton-grass in the shallows right of the spit
      { obj: 'plant.yc-cotton-grass', layer: 'near', seed: 35, area: { poly: [[1140, 660], [1500, 640], [1700, 700], [1300, 760]] }, n: 12, minGap: 30, s: [0.6, 0.9], flip: 0.5, variant: [0, 2], anim: false },
    ],
    actors: [
      { obj: 'vehicle.light-aircraft', layer: 'horizon', path: [[1820, 210], [-220, 170]], speed: 24, loop: 'loop', s: 0.55, seed: 75, offset: 0.4 },
    ],
    flocks: [
      { obj: 'bird.small-flight', n: winter ? 8 : 4, area: [300, 140, 1300, 300], speed: 26, s: 0.5, seed: 81, layer: 'horizon' },
    ],
  };
  // the season's own life: dragonflies and damselflies over the pool (May to October), a heron in winter
  if (!winter) {
    d.actors.push({ obj: 'animal.pond-dragonfly', layer: 'near', path: [[700, 620], [900, 600], [1040, 560], [860, 640], [620, 650]], speed: 44, loop: 'pingpong', s: 1.3, variant: 0, seed: 76 });
    d.actors.push({ obj: 'animal.dragonfly', layer: 'mid', path: [[200, 600], [420, 590], [560, 620], [300, 630]], speed: 38, loop: 'pingpong', s: 0.7, variant: 1, seed: 77 });
  }
  if (summer || spring) {
    d.actors.push({ obj: 'animal.pond-dragonfly', layer: 'fore', path: [[1180, 740], [1300, 700], [1420, 760], [1260, 790]], speed: 34, loop: 'pingpong', s: 1.8, variant: 1, seed: 78 });
    d.actors.push({ obj: 'animal.dragonfly', layer: 'near', path: [[1100, 520], [1084, 500], [1120, 530]], speed: 10, loop: 'pingpong', s: 1, variant: 0, seed: 79 });
    d.actors.push({ obj: 'animal.bee', layer: 'fore', path: [[200, 780], [300, 760], [260, 800]], speed: 24, loop: 'pingpong', s: 1, seed: 84 });
  }
  if (winter) d.place.push({ obj: 'bird.heron', x: 1300, y: 620, s: 0.6, layer: 'mid', seed: 95 });
  if (autumn) d.flocks.push({ obj: 'bird.goose-flight', n: 6, area: [400, 110, 1200, 220], speed: 30, s: 0.5, seed: 97, layer: 'horizon' });
  return d;
}
