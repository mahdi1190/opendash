/* ============================================================
   COMPOSED SCENE uk-south-east / Fleet Pond, view 1 (wide)
   docs/dev/SCENE_ENGINE.md sections 3 and 17 (the convert stage).

   The rich hand-drawn view (72-anim-pack-uk-south-east-fleet-pond-v1.js,
   kept there as legacySvg) rebuilt from the object library, so the canvas
   renderer bakes it: dense static detail in a few layer bitmaps, and a
   measured number of movers. ONE auto-season scene serves the view's four
   seasonal items (the date picks the season; the live sky picks the light).

   Fleet Pond (Hart District Council Local Nature Reserve, an SSSI): from the
   boardwalk's viewing platform on the east side, looking west-north-west
   across the open water (heading 300), so the summer and equinox sunsets
   set over the far wood. Phragmites reed and reedmace margins, oak, birch,
   Scots pine and alder carr round the shore, willows on the right bank, the
   South Western main line on its embankment along the north shore (trains
   glimpsed through the trees), mute swans, Canada geese, great crested
   grebes, coots and mallards, dragonflies over the reeds in summer.
   Sources: hart.gov.uk/fleet-pond, fleetpondsociety.co.uk.

   PURE: defines one function, sceneUkFleetPondV1() -> the scene data. It is
   only called (once, through the item's thunk) when the scene is shown,
   linted or sheeted.
   ============================================================ */
function sceneUkFleetPondV1() {
  const HOR = 470, SHORE = 506;
  const pal = {
    base:   { wood: ['#4f6a44', '#3d5638'], bank: ['#5d6a3a', '#4a5530'], reedbed: ['#6a7a3c', '#55632f'], mud: ['#5a4c38', '#43392b'] },
    spring: { wood: ['#5f7e48', '#486640'], bank: ['#62783c', '#4c5e32'], reedbed: ['#6f8240', '#59692f'] },
    autumn: { wood: ['#8a6a3a', '#6a5232'], bank: ['#7a6c3a', '#5f5428'], reedbed: ['#9a8448', '#7a6634'] },
    winter: { wood: ['#5a5a50', '#47483f'], bank: ['#7c7e70', '#62645a'], reedbed: ['#a39a78', '#857c5c'], mud: ['#6a6052', '#504a40'] },
  };
  const wave = (x0, x1, y, amp, n, seed) => {   // a gentle edge from x0 to x1 (seeded, deterministic)
    const r = sceneRnd(seed); let d = '';
    for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), yy = Math.round(y + (r() - 0.5) * 2 * amp); d += (i ? 'L' : '') + x + ' ' + yy; }
    return d;
  };
  return {
    v: 1, id: 'fleet-pond-1',
    view: { lat: 51.29, lon: -0.82, heading: 300, fov: 80, horizon: HOR, lift: 1 },
    at: 'afternoon', season: 'auto', tropic: 'summer', setting: 'natural', weather: 'live', particles: 'season',
    palette: pal,
    layers: [{ id: 'horizon', depth: 0.08, haze: 0.4 }, { id: 'far', depth: 0.2, haze: 0.22 }, { id: 'mid', depth: 0.45, haze: 0.1 }, { id: 'near', depth: 0.75, haze: 0.04 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 }],
    sky: { stars: 200, clouds: { n: 4, y: [40, 330], speed: 5 }, sunR: 24, moonR: 18 },
    ground: [
      // the far wood on the north and west shores (a low, hazed mass the tree scatter stands on)
      { layer: 'horizon', d: 'M-160 ' + (SHORE + 2) + 'L' + wave(-160, 1760, 484, 6, 24, 11) + 'L1760 ' + (SHORE + 2) + 'Z', fill: '@wood.0' },
      // the far shore: a thin bank under the shore trees and reeds
      { layer: 'far', d: 'M-160 ' + (SHORE + 4) + 'L' + wave(-160, 1760, SHORE - 3, 2, 30, 12) + 'L1760 ' + (SHORE + 4) + 'Z', fill: '@bank.1' },
      // the right bank (willow and alder carr) and the left reedbed's root mat
      { layer: 'near', d: 'M1060 900L1050 640Q1120 590 1260 566Q1420 548 1760 538V900Z', fill: { lin: [[0, '@bank.0'], [1, '@reedbed.1']], y1: 540, y2: 760 } },
      { layer: 'near', d: 'M-160 900V596Q40 604 210 640Q250 700 230 900Z', fill: { lin: [[0, '@reedbed.0'], [1, '@mud.0']], y1: 600, y2: 900 } },
      // the foreground margins either side of the boardwalk
      { layer: 'front', d: 'M-160 900V812Q20 800 150 830L130 900Z', fill: '@reedbed.1' },
      { layer: 'front', d: 'M900 900Q1000 856 1200 846Q1500 838 1760 844V900Z', fill: '@reedbed.1' },
    ],
    water: [
      { layer: 'far', d: 'M-160 ' + SHORE + 'H1760V900H-160Z', y0: SHORE, y1: 900, base: ['#8ab6c4', '#4f8ca0', '#2c5f74'], reflect: true, shimmer: 34, lightPath: true },
    ],
    place: [
      // the island's tall Scots pine and its scrub (the far shore's landmark tree)
      { obj: 'tree.pond-pine', x: 782, y: SHORE - 1, s: 0.46, variant: 1, layer: 'far', seed: 1 },
      { obj: 'tree.pond-alder', x: 736, y: SHORE, s: 0.3, variant: 0, layer: 'far', seed: 2, anim: false },
      { obj: 'tree.pond-oak', x: 832, y: SHORE + 1, s: 0.28, flip: true, variant: 1, layer: 'far', seed: 3, anim: false },
      // the railway embankment along the north shore (left), behind the shore trees
      { obj: 'rail.embankment', x: 10, y: SHORE - 6, s: 0.34, variant: 1, layer: 'horizon', seed: 4 },
      { obj: 'rail.embankment', x: 165, y: SHORE - 6, s: 0.34, variant: 1, layer: 'horizon', seed: 5 },
      { obj: 'rail.embankment', x: 320, y: SHORE - 6, s: 0.34, variant: 1, layer: 'horizon', seed: 6 },
      // the right bank: weeping willows and alders over the water, an oak behind
      { obj: 'tree.pond-willow', x: 1268, y: 566, s: 0.78, variant: 0, layer: 'near', seed: 7, anim: false },
      { obj: 'tree.pond-willow', x: 1338, y: 572, s: 0.62, flip: true, variant: 0, layer: 'near', seed: 8, anim: false },
      { obj: 'tree.pond-alder', x: 1452, y: 562, s: 0.75, variant: 2, layer: 'near', seed: 9, anim: false },
      { obj: 'tree.pond-oak', x: 1640, y: 560, s: 1.08, flip: true, variant: 2, layer: 'near', seed: 10, anim: false },
      { obj: 'tree.pond-birch', x: 1208, y: 576, s: 0.66, variant: 0, layer: 'near', seed: 11, anim: false },
      // the framing oak on the dry bank, left (the one tree that sways in the wind)
      { obj: 'tree.pond-oak', x: -40, y: 700, s: 1.55, variant: 1, layer: 'fore', seed: 12, anim: { sway: { k: 0.55 } } },
      { obj: 'tree.pond-alder', x: 130, y: 620, s: 0.75, flip: true, variant: 2, layer: 'near', seed: 13, anim: false },
      // the boardwalk and its viewing platform over the water (the place's signature)
      { obj: 'landmark.fleet-pond-boardwalk', x: 400, y: 900, s: 1, variant: 0, layer: 'fore', seed: 14 },
      // a birdwatcher on the platform, glassing the water (turns now and then)
      { obj: 'person.walker', x: 312, y: 672, s: 0.86, variant: 1, layer: 'fore', seed: 15, anim: false },
      // the water's own life: birds at rest that paddle and turn, a rising fish
      { obj: 'bird.swan', x: 752, y: 548, s: 0.22, variant: 0, layer: 'mid', seed: 16 },
      { obj: 'bird.swan', x: 846, y: 553, s: 0.2, flip: true, variant: 0, layer: 'mid', seed: 17 },
      { obj: 'bird.goose', x: 318, y: 528, s: 0.17, variant: 0, layer: 'mid', seed: 18 },
      { obj: 'bird.goose', x: 352, y: 532, s: 0.15, flip: true, variant: 1, layer: 'mid', seed: 19 },
      { obj: 'bird.coot', x: 654, y: 596, s: 0.24, layer: 'mid', seed: 20 },
      { obj: 'bird.coot', x: 962, y: 632, s: 0.26, flip: true, layer: 'mid', seed: 21 },
      { obj: 'bird.grebe', x: 566, y: 568, s: 0.24, layer: 'mid', seed: 22 },
      { obj: 'bird.grebe', x: 1172, y: 524, s: 0.17, flip: true, layer: 'mid', seed: 23 },
      { obj: 'bird.mallard', x: 626, y: 738, s: 0.42, variant: 0, layer: 'mid', seed: 24 },
      { obj: 'bird.mallard', x: 686, y: 746, s: 0.4, variant: 1, flip: true, layer: 'mid', seed: 25 },
      { obj: 'water.edge', x: 1130, y: 612, s: 0.5, variant: 0, layer: 'near', seed: 28 },
      { obj: 'water.edge', x: 1330, y: 586, s: 0.45, variant: 0, flip: true, layer: 'near', seed: 29 },
      { obj: 'water.edge', x: 150, y: 640, s: 0.5, variant: 0, flip: true, layer: 'near', seed: 30 },
      { obj: 'water.edge', x: 1560, y: 572, s: 0.42, variant: 0, layer: 'near', seed: 35 },
      { obj: 'water.fish-ring', x: 862, y: 680, s: 0.5, layer: 'mid', seed: 26 },
      { obj: 'water.fish-ring', x: 472, y: 612, s: 0.36, variant: 1, layer: 'mid', seed: 27 },
    ],
    scatter: [
      // the far wood: hundreds of small hazed crowns (static: free per frame), Scots pines standing out
      { obj: 'tree.pond-wood', layer: 'horizon', seed: 31, area: { rect: [-150, HOR + 6, 1750, SHORE - 4] }, n: 19, minGap: 70,
        s: [0.3, 0.42], sByY: [[HOR, 0.85], [SHORE, 1.15]], flip: 0.5, variant: [0, 1], anim: false },
      // the shore trees: nearer, larger, mirrored in the water (alder carr and birch on the margin)
      { obj: 'tree.pond-alder', layer: 'far', seed: 32, area: { rect: [-150, SHORE - 6, 1750, SHORE + 2] }, n: 15, minGap: 44, s: [0.24, 0.4], flip: 0.5, variant: [0, 1], mask: { avoid: [{ rect: [700, 480, 860, 520] }, { rect: [150, 480, 430, 520] }] }, anim: false },
      { obj: 'tree.pond-oak', layer: 'far', seed: 132, area: { rect: [-150, SHORE - 6, 1750, SHORE + 2] }, n: 14, minGap: 50, s: [0.24, 0.36], flip: 0.5, variant: [1, 2], mask: { avoid: [{ rect: [700, 480, 860, 520] }, { rect: [150, 480, 430, 520] }] }, anim: false },
      { obj: 'tree.pond-birch', layer: 'far', seed: 232, area: { rect: [-150, SHORE - 6, 1750, SHORE + 2] }, n: 9, minGap: 50,
        s: [0.24, 0.38], flip: 0.5, variant: 'random', mask: { avoid: [{ rect: [700, 480, 860, 520] }, { rect: [150, 480, 430, 520] }] }, anim: false },
      // the far reed fringe at the waterline (mirrored too)
      { obj: { 'plant.reed': 3, 'plant.bulrush': 1 }, layer: 'far', seed: 33, area: { rect: [-150, SHORE - 2, 1750, SHORE + 4] }, n: 120, minGap: 9,
        s: [0.14, 0.24], flip: 0.5, variant: 0, anim: false },
      // water lilies in the bay below the platform (static pads)
      { obj: 'water.lily', layer: 'near', seed: 34, area: { poly: [[560, 590], [900, 580], [960, 770], [620, 780]] }, n: 18, minGap: 30,
        s: [0.28, 0.5], sByY: [[580, 0.8], [780, 1.25]], flip: 0.5, variant: [0, 1], tint: { col: '#3a6a3a', k: [0, 0.1] }, mask: { noise: { scale: 70, cut: 0.35 } }, anim: false },
      // the right reedbed: dense Phragmites and reedmace, swaying in wind strips
      { obj: { 'plant.reed': 5, 'plant.bulrush': 2 }, layer: 'near', seed: 35, area: { poly: [[980, 640], [1120, 584], [1760, 560], [1760, 880], [960, 880]] }, n: 380, minGap: 11,
        s: [0.7, 1.05], sByY: [[560, 0.62], [860, 1.45]], flip: 0.5, variant: 'random', anim: false },
      // the left reedbed round the boardwalk's landing
      { obj: { 'plant.reed': 5, 'plant.bulrush': 2 }, layer: 'near', seed: 36, area: { poly: [[-160, 606], [210, 644], [250, 800], [-160, 820]] }, n: 150, minGap: 12,
        s: [0.7, 1.05], sByY: [[600, 0.7], [820, 1.3]], flip: 0.5, variant: 'random', anim: false },
      // the bank's grasses and flowers under the right-hand trees
      { obj: 'plant.grass', layer: 'near', seed: 37, area: { poly: [[1060, 620], [1300, 568], [1760, 548], [1760, 600], [1060, 660]] }, n: 90, minGap: 10,
        s: [0.5, 0.8], flip: 0.5, variant: 'random', anim: false },
      // the foreground: tall reeds and bulrushes framing the bottom corners
      { obj: { 'plant.reed': 4, 'plant.bulrush': 2, 'plant.grass': 2 }, layer: 'front', seed: 38, area: { poly: [[-160, 800], [170, 820], [130, 990], [-160, 990]] }, n: 90, minGap: 12,
        s: [1.3, 1.8], flip: 0.5, variant: 'random', anim: false },
      { obj: { 'plant.reed': 4, 'plant.bulrush': 2, 'plant.grass': 2 }, layer: 'front', seed: 39, area: { poly: [[900, 880], [1100, 840], [1760, 830], [1760, 990], [900, 990]] }, n: 130, minGap: 13,
        s: [1.3, 1.8], flip: 0.5, variant: 'random', anim: 'strip' },
      // grass tussocks along the water's edge at the foot of the boardwalk
      { obj: { 'plant.grass': 3, 'plant.reed': 1, 'plant.bulrush': 1 }, layer: 'front', seed: 40, area: { rect: [600, 880, 900, 980] }, n: 34, minGap: 12,
        s: [0.9, 1.3], flip: 0.5, variant: 'random', tint: { col: '#a0a060', k: [0, 0.1] }, anim: 'strip' },
    ],
    actors: [
      // a South Western train on the embankment, glimpsed through the shore trees (both ways)
      { obj: 'rail.train', layer: 'horizon', path: [[-700, SHORE - 30], [2300, SHORE - 30]], speed: 70, loop: 'loop', s: 0.3, seed: 41, offset: 0.4, variant: 1 },
      // a walker with a dog along the platform and back
      { obj: 'person.dog-walker', layer: 'fore', path: [[478, 674], [292, 674]], speed: 9, loop: 'pingpong', s: 0.82, seed: 42, offset: 0.4, variant: 2 },
      // swimmers crossing the open water
      { obj: 'bird.swan', layer: 'mid', path: [[1180, 584], [380, 598]], speed: 5, loop: 'pingpong', s: 0.25, seed: 43, offset: 0.15 },
      { obj: 'bird.grebe', layer: 'mid', path: [[860, 660], [1080, 610]], speed: 4, loop: 'pingpong', s: 0.27, seed: 44, offset: 0.6 },
      { obj: 'bird.grebe', layer: 'mid', path: [[900, 668], [1110, 618]], speed: 4, loop: 'pingpong', s: 0.25, seed: 45, offset: 0.55 },
      { obj: 'bird.coot', layer: 'mid', path: [[420, 640], [560, 690]], speed: 6, loop: 'pingpong', s: 0.27, seed: 46, offset: 0.3 },
      { obj: 'bird.mallard', layer: 'mid', path: [[900, 560], [620, 548]], speed: 5, loop: 'pingpong', s: 0.22, seed: 47, offset: 0.8 },
      // a kingfisher's dash low along the reed edge, dragonflies over the bay
      { obj: 'bird.kingfisher-flight', layer: 'near', path: [[1700, 650], [960, 668], [700, 640]], speed: 160, loop: 'loop', s: 0.9, seed: 48, offset: 0.1 },
      { obj: 'animal.dragonfly', layer: 'near', path: [[640, 770], [760, 740], [700, 800], [820, 760]], speed: 40, loop: 'pingpong', s: 0.6, seed: 49 },
      { obj: 'animal.dragonfly', layer: 'near', path: [[940, 640], [1040, 610], [1000, 680]], speed: 46, loop: 'pingpong', s: 0.5, seed: 50, variant: 1 },
      { obj: 'animal.butterfly', layer: 'front', path: [[160, 740], [320, 780], [240, 840]], speed: 30, loop: 'pingpong', s: 0.7, seed: 51, variant: 2 },
    ],
    flocks: [
      { obj: 'bird.goose-flight', n: 6, area: [100, 150, 1500, 330], speed: 34, s: 0.3, seed: 61, layer: 'horizon' },
      { obj: 'bird.small-flight', n: 5, area: [600, 200, 1500, 420], speed: 46, s: 0.45, seed: 62, layer: 'horizon' },
    ],
  };
}
