/* ============================================================
   UPGRADE (live) of asia-central/vladivostok-skyline (docs/dev/SCENE_ENGINE.md section 16)
   Scaffolded by `node tools/anim-pack.mjs scene upgrade asia-central/vladivostok-skyline`.
   LIVE: the app shows this composed scene in place of the hand-drawn art (kept
   as the item's legacySvg). The item keeps its identity: the id, key, place
   fields, label, site, tags and when come from the region entry
   (tests/scene-upgrades-live.test.mjs). After any change, re-check:
     node tools/anim-pack.mjs scene sheet asia-central/vladivostok-skyline --compare --upgrades --times
     node tools/anim-pack.mjs scene lint asia-central/vladivostok-skyline --upgrades --perf   (GOLD)
   Care: no signs or text, at most 8 tiny anonymous people, no crowds, no flags or emblems.
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // The Golden Horn bay from its northern shore, looking south-west at dusk: the Golden Horn bridge striding
  // across the bay, the wooded hills of the far shore with the city's blocks climbing them, ferries, tugs and
  // fishing boats on the water, gulls, birches framing the embankment.
  const params = { id: 'vladivostok', lat: 43.11, lon: 131.9, heading: 245, at: 'dusk', climate: 'temperate',
    kits: ['towers', 'urban', 'temperate', 'alpine', 'people', 'boats', 'birds', 'water'],
    landmarks: ['landmark.golden-horn-bridge@800@400@front@60'], water: 'bay', horizon: 540 };
  // the bay's traffic, below the deck and in front of the bridge's piers; cars on the bridge's cambered deck
  const boat = (obj, y, back, speed, seed, offset, v) => ({ obj, layer: 'mid', path: back ? [[1820, y], [-220, y]] : [[-220, y], [1820, y]], speed, loop: 'loop', s: 1, sByY: [[566, 0.38], [764, 1.05]], seed, offset, flip: back, variant: v });
  const car = (obj, i, back, v) => { const y = back ? 504 : 507; return { obj, layer: 'near', path: back ? [[1720, y + 12], [800, y], [-120, y + 12]] : [[-120, y + 12], [800, y], [1720, y + 12]], speed: 30 + i * 5, loop: 'loop', s: 0.3, seed: 60 + i, offset: (0.13 + i * 0.27) % 1, flip: back, variant: v }; };
  const ridge = 'M-160 562Q180 470 480 492T1060 470T1760 496V566H-160Z';
  const slope = [[-150, 562], [-150, 530], [180, 486], [480, 500], [760, 488], [1060, 480], [1400, 494], [1750, 504], [1750, 562]];
  const patch = {
    // the scene's own picks and mixes (8.6), so a new library object never moves them: birches and a few conifers on
    // the far shore and framing the embankment, meadow grass and wildflowers in the beds, the embankment's lampposts, gulls
    picks: { lamp: ['street.lamppost'], frame: ['tree.green-birch'] },
    mix: { tree: { 'tree.green-birch': 2, 'tree.cedar': 1 }, ground: { 'plant.grass': 3, 'plant.wildflowers': 1 }, shrub: { 'plant.shrub': 1 },
      bird: { 'bird.gull': 1, 'bird.herring-gull-flight': 1 } },
    // the archetype's horizon band, far row and boats are replaced by the hills, the hillside city and the bay's own
    // traffic (the shrubs too: light enough for the tile); the second frame tree (outside the 16:9 view) by a birch inside it
    drop: { scatter: [0, 1, 7], place: [2], actors: [0, 1, 2, 3, 4] },
    // the far shore: the hills beyond the bay, and the nearer ridge the city climbs
    ground: [
      { layer: 'horizon', d: 'M-160 548Q100 420 360 444T900 410T1400 440T1760 424V560H-160Z', fill: { lin: [[0, '@hills.0'], [1, '@hills.1']], x1: 0, y1: 410, x2: 0, y2: 560 } },
      { layer: 'far', d: ridge, fill: { lin: [[0, '@ground.1'], [1, '@ground.2']], x1: 0, y1: 470, x2: 0, y2: 566 } },
    ],
    place: [{ obj: 'tree.green-birch', x: 1650, y: 912, s: 1.25, layer: 'front', seed: 22, flip: true, variant: 1 }],
    scatter: [
      // the city's blocks and older stone houses climbing the ridge, with pines and birches among them
      { obj: 'building.tower', layer: 'far', seed: 4, area: { poly: slope }, n: 19, minGap: 34, s: [0.14, 0.26], maxH: 110, flip: 0.5, variant: [0, 1], tint: { col: '#7a7aa0', k: [0.14, 0.14] }, mask: { noise: { scale: 120, cut: 0.15 } }, shadow: false, anim: false, reflect: true },
      { obj: 'building.apartment-jp', layer: 'far', seed: 6, area: { poly: slope }, n: 19, minGap: 34, s: [0.16, 0.28], maxH: 90, flip: 0.5, variant: [0, 1], tint: { col: '#7a7aa0', k: [0.14, 0.14] }, mask: { noise: { scale: 120, cut: 0.15 } }, shadow: false, anim: false, reflect: true },
      { obj: 'building.tower-stone', layer: 'far', seed: 3, area: { poly: slope }, n: 16, minGap: 40, s: [0.12, 0.22], maxH: 80, flip: 0.5, variant: [0, 1], tint: { col: '#7a7aa0', k: [0.14, 0.14] }, mask: { noise: { scale: 120, cut: 0.15 } }, shadow: false, anim: false, reflect: true },
      { obj: { 'tree.far-pine': 1, 'tree.far-birch': 1 }, layer: 'far', seed: 5, area: { poly: slope }, n: 36, minGap: 22, s: [0.12, 0.3], flip: 0.5, variant: [0, 1], tint: { col: '#5e6a8a', k: [0.1, 0.18] }, shadow: false, anim: false, reflect: true },
    ],
    actors: [boat('boat.ferry', 652, true, 7, 41, 0.55, 0), boat('boat.tug', 690, false, 6, 42, 0.3, 1), boat('boat.fishing-boat', 724, true, 9, 43, 0.8, 2), boat('boat.ferry', 742, false, 8, 44, 0.1, 1),
      car('vehicle.car', 0, false, 0), car('vehicle.car', 1, true, 2), car('vehicle.car', 2, false, 3), car('vehicle.car', 3, true, 1)],
  };
  animRegionSceneUpgrade('asia', 'place:vladivostok', {
    state: 'live',
    archetype: 'skyline-water',
    landmarks: ['landmark.golden-horn-bridge'],
    scene: () => sceneFromArchetype('skyline-water', params, patch),
  });
})();
