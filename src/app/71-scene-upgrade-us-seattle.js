/* ============================================================
   UPGRADE (live) of us-pacific/seattle-needle-ferry (docs/dev/SCENE_ENGINE.md section 16)
   Scaffolded by `node tools/anim-pack.mjs scene upgrade us-pacific/seattle-needle-ferry --archetype skyline-water`
   (the tool suggests the harbour archetype, which is not built: skyline-water fits a skyline over a bay).
   LIVE: the app shows this composed scene in place of the hand-drawn art (kept as the item's legacySvg).
   The item keeps its identity: the id, key, place fields, label, site, tags and when come from the region entry
   (tests/scene-upgrades-live.test.mjs). After any change, re-check:
     node tools/anim-pack.mjs scene sheet us-pacific/seattle-needle-ferry --compare --upgrades --times
     node tools/anim-pack.mjs scene lint us-pacific/seattle-needle-ferry --upgrades --perf   (GOLD)
   Care: no signs or text, at most 8 tiny anonymous people, no crowds, no flags or emblems.
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // Elliott Bay from the waterfront trail at Smith Cove, looking east-south-east in golden light: the Space Needle on the
  // slope of Queen Anne Hill (left), the downtown towers across the bay, Mount Rainier white in the distance (right), a
  // ferry crossing the bay with a tug, a sailboat and a fishing boat; red cedars and alders on the shore.
  // (the row stays under 400 bytes: lists as '|' strings; qa = Queen Anne's slopes, rn = Rainier, white all year)
  const params = { id: 'seattle', lat: 47.629, lon: -122.388, heading: 128, at: 'golden', climate: 'temperate',
    kits: 'towers|urban|temperate|alpine|people|boats|birds', landmarks: 'landmark.space-needle@330@430', horizon: 540,
    palette: { base: { qa: ['#5e7656', '#4a6046'], rn: ['#f2f4f6', '#9aaabe', '#6a7c90'] }, autumn: { qa: ['#7a7448', '#5e5a3c'] }, winter: { qa: ['#8a948e', '#6e7a74'] } } };
  // the bay's boats; the ferry big in the middle of the bay
  const boat = (obj, y, back, speed, seed, offset, v, k) => ({ obj, layer: 'mid', path: back ? [[1820, y], [-220, y]] : [[-220, y], [1820, y]], speed, loop: 'loop', s: 1, sByY: [[566, 0.38 * (k || 1)], [764, 1.05 * (k || 1)]], seed, offset, flip: back, variant: v });
  const city = { 'building.tower-glass': 3, 'building.tower': 2, 'building.skyscraper': 1 };
  const patch = {
    // the scene's own picks and mixes (8.6): red cedars and alders framing the view and along the shore, the trail's lamps
    // and benches, meadow grass and wildflowers in the beds, gulls
    picks: { frame: ['tree.cedar', 'tree.green-alder'], lamp: ['street.lamppost'], bench: ['street.bench'], walker: ['person.walker', 'person.dog-walker', 'person.jogger'] },
    mix: { tree: { 'tree.green-alder': 2, 'tree.cedar': 1 }, ground: { 'plant.grass': 3, 'plant.wildflowers': 1 }, shrub: { 'plant.shrub': 1 },
      bird: { 'bird.gull': 1, 'bird.herring-gull-flight': 1 } },
    // the archetype's even towers give way to the real layout (Queen Anne, Belltown, downtown), its quay row and shrubs to
    // lighter ones, its boats to the bay's own; the Needle is placed again without a ground shadow (it stands back from the
    // shore, not on the water); the second frame tree (outside the 16:9 view) goes
    drop: { scatter: [0, 1, 2, 7], place: ['landmark.space-needle', 2], actors: [0, 1, 2, 3, 4] },
    ground: [
      // Mount Rainier, far off and white behind the city (far layer: drawn before the towers): the broad massif with Liberty
      // Cap on its left shoulder, the summit dome and the notch of Little Tahoma on the right; the east flank in shade, the
      // rock cleavers between the glaciers, the darker forested foot
      { layer: 'far', d: 'M940 548Q1050 500 1130 452Q1196 408 1238 372Q1262 352 1284 342Q1304 332 1324 327Q1350 321 1374 326Q1402 334 1422 350Q1440 364 1452 378L1466 372Q1520 408 1584 456Q1654 508 1730 548Z', fill: { lin: [[0, '@rn.0'], [0.5, '@rn.1'], [1, '@rn.2']], x1: 0, y1: 322, x2: 0, y2: 548 } },
      { layer: 'far', d: 'M1374 326Q1402 334 1422 350Q1440 364 1452 378L1466 372Q1520 408 1584 456Q1654 508 1730 548H1470Q1440 470 1418 420Q1396 366 1374 326Z', fill: '#9aa8bc' },
      { layer: 'far', d: 'M1300 336L1286 380L1262 430L1276 432L1296 384ZM1352 326L1346 372L1330 440L1342 442L1356 376ZM1404 340L1414 392L1430 450L1418 452L1400 396ZM1226 384L1196 430L1206 432Z', fill: '#a6b2c2' },
      { layer: 'far', d: 'M940 548Q1100 498 1300 488Q1520 482 1730 548Z', fill: '#5e6e84' },
      // Queen Anne Hill rising behind the Needle, West Seattle's low ridge at the right
      { layer: 'far', d: 'M-160 452Q-40 420 80 418Q200 420 300 448Q420 488 560 520Q640 536 700 548H-160Z', fill: { lin: [[0, '@qa.0'], [1, '@qa.1']], x1: 0, y1: 418, x2: 0, y2: 548 } },
      { layer: 'far', d: 'M1160 548Q1300 522 1460 520Q1620 520 1760 530V552H1160Z', fill: '#6a7a80' },
    ],
    scatter: [
      // downtown across the bay: glass and stone towers, kept under the Needle's top house
      // (each variant and each tint bucket is a definition in the tile: the lower rows keep to two variants and one tint)
      { obj: city, layer: 'far', seed: 4, area: { rect: [640, 545, 1150, 549] }, n: 22, minGap: 22, s: [0.4, 0.8], maxH: 250, flip: 0.5, variant: 'random', tint: { col: '#8a9aac', k: [0.08, 0.08] }, shadow: false, anim: false, reflect: true },
      // Belltown and the lower blocks between the Needle and downtown, and the waterfront at the right
      { obj: { 'building.tower': 2, 'building.tower-stone': 1 }, layer: 'far', seed: 3, area: { rect: [420, 546, 1300, 550] }, n: 20, minGap: 30, s: [0.2, 0.36], maxH: 120, flip: 0.5, variant: [0, 2], tint: { col: '#8a9aac', k: [0.16, 0.16] }, mask: { avoid: [{ rect: [270, 400, 390, 560] }] }, shadow: false, anim: false, reflect: true },
      // houses and trees on Queen Anne Hill
      { obj: { 'building.tower-stone': 1, 'building.tower': 1 }, layer: 'far', seed: 6, area: { poly: [[-160, 456], [80, 424], [300, 452], [520, 516], [-160, 520]] }, n: 14, minGap: 34, s: [0.1, 0.18], maxH: 50, flip: 0.5, variant: [0, 1], tint: { col: '#7a8a9a', k: [0.16, 0.16] }, mask: { noise: { scale: 120, cut: 0.25 } }, shadow: false, anim: false, reflect: true },
      { obj: { 'tree.far-pine': 1, 'tree.far-broad': 2 }, layer: 'far', seed: 5, area: { poly: [[-160, 458], [80, 428], [300, 456], [560, 528], [-160, 528]] }, n: 34, minGap: 20, s: [0.12, 0.24], flip: 0.5, variant: [0, 1], tint: { col: '#5e6a7a', k: [0.08, 0.16] }, shadow: false, anim: false, reflect: true },
      // alders and red cedars along the far shore, smaller and looser than the archetype's row (they cast the scene's shadows)
      { obj: { 'tree.green-alder': 2, 'tree.cedar': 1 }, layer: 'mid', seed: 15, area: { rect: [-140, 560, 1740, 566] }, n: 22, minGap: 50, s: [0.09, 0.18], flip: 0.5, variant: [0, 1], tint: { col: '#6a8a9a', k: [0.08, 0.08] }, mask: { noise: { scale: 140, cut: 0.3 }, avoid: [{ rect: [270, 500, 390, 570] }] }, anim: false, reflect: true },
      // salal-like mounds along the beds
      { obj: 'plant.shrub', layer: 'fore', seed: 9, area: { rect: [-150, 800, 1750, 840] }, n: 8, minGap: 120, s: [0.28, 0.5], mask: { noise: { scale: 260, cut: 0.35 } }, flip: 0.5, variant: 'random', anim: false },
    ],
    place: [{ obj: 'landmark.space-needle', x: 330, y: 562, s: 1.14, layer: 'mid', seed: 11, reflect: true, shadow: false },
      { obj: 'tree.green-alder', x: 1580, y: 912, s: 1.3, layer: 'front', seed: 22, flip: true, variant: 1 }],
    actors: [boat('boat.ferry', 688, true, 7, 41, 0.35, 1), boat('boat.tug', 610, false, 6, 42, 0.7, 1), boat('boat.dinghy', 646, false, 5, 43, 0.15, 0, 0.6), boat('boat.fishing-boat', 728, true, 9, 44, 0.8, 1)],
  };
  animRegionSceneUpgrade('us', 'place:seattle', {
    state: 'live',
    archetype: 'skyline-water',
    landmarks: ['landmark.space-needle'],
    scene: () => sceneFromArchetype('skyline-water', params, patch),
  });
})();
