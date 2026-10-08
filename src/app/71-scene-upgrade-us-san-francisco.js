/* ============================================================
   UPGRADE (live) of us-pacific/san-francisco-bridge-fog (docs/dev/SCENE_ENGINE.md section 16)
   Scaffolded by `node tools/anim-pack.mjs scene upgrade us-pacific/san-francisco-bridge-fog`.
   LIVE: the app shows this composed scene in place of the hand-drawn art (kept as the item's legacySvg).
   The item keeps its identity: the id, key, place fields, label, site, tags and when come from the
   region entry (tests/scene-upgrades-live.test.mjs). After any change, re-check:
     node tools/anim-pack.mjs scene sheet us-pacific/san-francisco-bridge-fog --compare --upgrades --times
     node tools/anim-pack.mjs scene lint us-pacific/san-francisco-bridge-fog --upgrades --perf   (GOLD)
   Care: no signs or text, at most 8 tiny anonymous people, no crowds, no flags or emblems.
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // The Golden Gate from the Golden Gate Promenade at Crissy Field, looking north-west on a foggy morning: the bridge
  // striding from the Presidio's wooded bluff (left) to the Marin Headlands (right), Mount Tamalpais beyond, the fog
  // lying on the water and round the towers' feet, a ferry, a sailboat and a fishing boat on the bay, joggers and dog
  // walkers on the promenade, cars on the deck.
  const params = { id: 'san-francisco', lat: 37.805, lon: -122.462, heading: 322, at: 'morning', climate: 'mediterranean',
    kits: 'urban|temperate|alpine|people|boats|birds', landmarks: 'landmark.golden-gate-bridge@390@430@front@26', horizon: 520 };
  // The scene's own palette (it replaces the archetype's: the slots its fills name). San Francisco never has snow: the
  // winter beds are wet and dormant, the paving wet; the headlands stay one hazy olive through the year.
  const palette = {
    base: { far: ['#8a9cb0', '#a8b8c8'], quay: ['#8a8e92', '#6a7076'], pave: ['#bdb6aa', '#a49e92', '#8a8478'], rail: ['#3a4048', '#5a626a'],
      bed: ['#4a5a36', '#3a4a2a'], water: ['#9ab0ba', '#5e7e8c', '#34566a'] },
    spring: { bed: ['#4e6236', '#3c4e2a'] },
    autumn: { bed: ['#8e7038', '#664e28'], pave: ['#bca882', '#a08c6a', '#867458'], far: ['#9a9aa4', '#b4b2b8'] },
    winter: { bed: ['#7a7258', '#5e5844'], pave: ['#aaa69e', '#908c84', '#76726a'] },
  };
  // the fog: a soft band (fully clear at its edges), in the colour of sunlit fog
  const fog = (layer, d, y0, y1, op, mid) => ({ layer, d, fill: { lin: [[0, '#eef1f2', 0], [mid || 0.5, '#eef1f2', op], [1, '#eef1f2', 0]], x1: 0, y1: y0, x2: 0, y2: y1 } });
  // the bay's boats, in front of the bridge's waterline (572); the traffic on the deck, both ways, smaller as it recedes
  const boat = (obj, y, back, speed, seed, offset, v, k) => ({ obj, layer: 'mid', path: back ? [[1820, y], [-220, y]] : [[-220, y], [1820, y]], speed, loop: 'loop', s: 1, sByY: [[566, 0.38 * (k || 1)], [764, 1.05 * (k || 1)]], seed, offset, flip: back, variant: v });
  // (in the mid layer, so the Marin shoulder in the near layer hides them where the road runs into the hillside)
  const lane = [[-200, 447], [397, 460], [957, 475], [1249, 489], [1430, 498]];
  const car = (obj, i, back, v) => ({ obj, layer: 'mid', path: back ?lane.slice().reverse().map(([x, y]) => [x, y - 1]) : lane, speed: 16 + i * 3, loop: 'loop', s: 0.1, sByY: [[447, 0.11], [497, 0.05]], seed: 60 + i, offset: (0.17 + i * 0.29) % 1, flip: back, variant: v });
  const patch = {
    palette,
    // the scene's own picks and mixes (8.6): a dark conifer framing the view, the promenade's lampposts and benches,
    // joggers and dog walkers, dune grass and wildflowers in the beds, gulls
    picks: { frame: ['tree.cedar'], lamp: ['street.lamppost'], bench: ['street.bench'], walker: ['person.jogger', 'person.dog-walker', 'person.walker'] },
    mix: { tree: { 'tree.cedar': 1, 'tree.far-pine': 1 }, ground: { 'plant.grass': 3, 'plant.wildflowers': 1 }, shrub: { 'plant.shrub': 1 },
      bird: { 'bird.gull': 1, 'bird.herring-gull-flight': 1 } },
    // no city across this water: the archetype's towers and quay trees go (the fog hides its far quay), its boats are
    // replaced by the bay's own, its shrubs by smaller coyote-brush mounds; the second frame tree (outside the 16:9 view) goes
    drop: { scatter: [0, 1, 2, 7], place: [2], actors: [0, 1, 2, 3, 4] },
    ground: [
      // Mount Tamalpais beyond the headlands, then the Marin Headlands from Point Bonita (left) to Hawk Hill (right)
      { layer: 'horizon', d: 'M700 520L860 470Q960 420 1040 404Q1080 398 1120 412Q1220 446 1380 470L1500 520Z', fill: { lin: [[0, '#8a98a8'], [1, '#a4b0bc']], x1: 0, y1: 400, x2: 0, y2: 520 } },
      { layer: 'far', d: 'M-160 506Q60 496 300 492Q560 486 820 470Q980 452 1120 420Q1240 380 1360 352Q1440 336 1520 340Q1640 348 1760 372V548H-160Z', fill: { lin: [[0, '#8c9272'], [0.6, '#76805e'], [1, '#68725a']], x1: 0, y1: 340, x2: 0, y2: 548 } },
      { layer: 'far', d: 'M1180 548Q1240 500 1300 470Q1380 420 1460 404Q1560 392 1660 410Q1720 420 1760 432V548Z', fill: { lin: [[0, '#6c7656'], [1, '#56604a']], x1: 0, y1: 400, x2: 0, y2: 548 } },
      // fog on the headlands: a wisp over the ridge
      fog('far', 'M1100 380Q1300 330 1500 330Q1640 330 1760 350V420Q1500 398 1300 420Q1200 430 1100 430Z', 330, 430, 0.55),
      // the Presidio's bluff under the bridge's south end (the deck lands on it at the left edge)
      { layer: 'mid', d: 'M-160 444Q-40 436 80 448Q190 462 260 500Q310 528 360 548H-160Z', fill: { lin: [[0, '#4e5e40'], [1, '#33402e']], x1: 0, y1: 440, x2: 0, y2: 548 } },
      // the fog bank lying on the water along the headlands' foot, over the far shore, and a low band round the towers' feet
      // (the bridge rises out of it)
      fog('mid', 'M-160 470H1760V566H-160Z', 470, 566, 0.92, 0.6),
      // the Marin shore's shoulder at the bridge's north end: the approach runs into the hillside
      { layer: 'near', d: 'M1362 566Q1368 524 1390 496Q1428 452 1490 430Q1600 398 1760 392V566Z', fill: { lin: [[0, '#6a7458'], [1, '#4c5640']], x1: 0, y1: 392, x2: 0, y2: 566 } },
      fog('near', 'M-160 528Q400 520 800 534T1760 530V606H-160Z', 520, 606, 0.7, 0.45),
    ],
    scatter: [
      // coastal scrub and a few trees on the Marin shoulder
      { obj: { 'tree.far-broad': 1, 'tree.far-pine': 1 }, layer: 'near', seed: 6, area: { poly: [[1400, 492], [1490, 436], [1760, 398], [1760, 470], [1420, 520]] }, n: 10, minGap: 26, s: [0.14, 0.22], flip: 0.5, variant: [0, 1], tint: { col: '#4a5440', k: [0.08, 0.16] }, anim: false },
      // coyote-brush mounds along the beds
      { obj: 'plant.shrub', layer: 'fore', seed: 9, area: { rect: [-150, 800, 1750, 840] }, n: 8, minGap: 120, s: [0.3, 0.46], mask: { noise: { scale: 260, cut: 0.35 } }, flip: 0.5, variant: 'random', anim: false },
      // cypress-dark conifers and broadleaves on the bluff
      { obj: { 'tree.far-pine': 1, 'tree.far-broad': 1 }, layer: 'mid', seed: 5, area: { poly: [[-160, 446], [80, 450], [250, 496], [330, 536], [-160, 536]] }, n: 26, minGap: 20, s: [0.16, 0.3], flip: 0.5, variant: [0, 1], tint: { col: '#3e4a3a', k: [0.08, 0.16] }, anim: false, reflect: true },
    ],
    actors: [boat('boat.ferry', 640, true, 7, 41, 0.55, 0), boat('boat.dinghy', 694, false, 5, 42, 0.3, 0, 0.5), boat('boat.fishing-boat', 612, true, 9, 43, 0.8, 1), boat('boat.tug', 726, false, 6, 44, 0.1, 1),
      car('vehicle.car', 0, false, 0), car('vehicle.car', 1, true, 2), car('vehicle.car', 2, false, 3), car('vehicle.car', 3, true, 1)],
  };
  animRegionSceneUpgrade('us', 'place:san-francisco', {
    state: 'live',
    archetype: 'skyline-water',
    landmarks: ['landmark.golden-gate-bridge'],
    scene: () => sceneFromArchetype('skyline-water', params, patch),
  });
})();
