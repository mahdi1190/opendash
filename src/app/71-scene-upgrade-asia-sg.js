/* ============================================================
   UPGRADE (live) of asia-southeast/sg-signature (docs/dev/SCENE_ENGINE.md section 16)
   Scaffolded by `node tools/anim-pack.mjs scene upgrade asia-southeast/sg-signature --landmark landmark.marina-bay-sands`.
   LIVE: the app shows this composed scene in place of the hand-drawn art (kept
   as the item's legacySvg). The item keeps its identity: the id, key, place
   fields, label, site, tags and when come from the region entry
   (tests/scene-upgrades-live.test.mjs).
   After any change, re-check:
     node tools/anim-pack.mjs scene sheet asia-southeast/sg-signature --compare --upgrades --times
     node tools/anim-pack.mjs scene lint asia-southeast/sg-signature --upgrades --perf   (GOLD)
   Care: no signs or text, at most 8 tiny anonymous people, no crowds, no flags or emblems.
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // Marina Bay on a bright morning from the pier on the west shore, looking east into the morning sun: the hotel's three
  // towers and their SkyPark close across the water on the left, the lotus museum before them, the Supertree grove beyond
  // their south end, and on the right the open bay out to the barrage and the sea. Unlike the dusk view from the Merlion
  // (singapore-skyline: the wheel, the hotel and the grove spread across a tower skyline), there is no skyline behind:
  // the gardens' trees on the far shore, sailing dinghies and the harbour's boats on the bay, frangipani and a royal palm
  // framing the pier's planting.
  const params = { id: 'sg', lat: 1.2838, lon: 103.8532, heading: 100, at: 'morning', climate: 'tropical',
    kits: ['tropical', 'towers', 'urban', 'people', 'boats', 'birds', 'water'],
    landmarks: ['landmark.supertrees@1010@120', 'landmark.marina-bay-sands@560@380'], water: 'bay', horizon: 500,
    palette: { base: { water: ['#a8d8e4', '#4a9ab8', '#1e5c80'] } } };
  const patch = {
    // the scene's own picks and mixes (8.6), so a new library object never moves them
    picks: { frame: ['plant.frangipani', 'plant.palm-royal'], lamp: ['street.lamppost'], boat: ['boat.dinghy', 'boat.water-taxi', 'boat.bumboat'] },
    mix: { tree: { 'tree.rain-tree': 1, 'plant.palm-royal': 2, 'plant.frangipani': 1 }, ground: { 'plant.grass-tropical': 3, 'plant.ixora': 1, 'plant.bougainvillea': 1 },
      shrub: { 'plant.banana': 1, 'plant.bougainvillea-hedge': 1 } },
    // no tower row behind (the gardens and the sea lie east of the bay): the archetype's horizon bands, far row and quay
    // trees are replaced below; its second frame tree (x 1690) stands outside the 16:9 view; the landmarks are placed again
    // without the archetype's ground shadow, which would fall on the bay
    drop: { scatter: [0, 1, 2], place: ['plant.palm-royal', 'landmark.supertrees', 'landmark.marina-bay-sands'] },
    place: [{ obj: 'landmark.supertrees', x: 1010, y: 522, s: 0.63, layer: 'mid', seed: 11, reflect: true, shadow: false },
      { obj: 'landmark.marina-bay-sands', x: 560, y: 522, s: 0.9, layer: 'mid', seed: 12, reflect: true, shadow: false },
      { obj: 'plant.palm-royal', x: 1575, y: 910, s: 1.3, layer: 'front', seed: 22, flip: true, variant: 1 }],
    scatter: [
      // the far shore: the trees of the bay gardens and the low line of the barrage, hazy in the morning light
      { obj: { 'plant.palm-coconut': 2, 'plant.palm-royal': 1 }, layer: 'far', seed: 4, area: { rect: [-150, 503, 1750, 507] }, n: 30, minGap: 38, s: [0.12, 0.22], flip: 0.5, variant: [0, 2],
        tint: { col: '#9ab4bc', k: [0.22, 0.22] }, mask: { avoid: [{ rect: [200, 460, 920, 520] }] }, shadow: false, anim: false, reflect: true },
      // the trees along the near end of the far quay, in sizes that vary, clear of the hotel and the grove
      { obj: { 'tree.rain-tree': 2, 'plant.palm-royal': 2, 'plant.frangipani': 1 }, layer: 'mid', seed: 15, area: { rect: [-140, 519, 1740, 525] }, n: 18, minGap: 52, s: [0.13, 0.26], flip: 0.5, variant: [0, 1],
        tint: { col: '#7a9aa8', k: [0.08, 0.08] }, mask: { avoid: [{ rect: [170, 470, 1160, 530] }] }, anim: false, reflect: true }],
    // a pair of brahminy kites over the bay, besides the archetype's flocks
    flocks: [{ obj: 'bird.kite-brahminy', n: 2, area: [900, 160, 1500, 360], speed: 14, s: 0.8, seed: 12, layer: 'mid' }],
  };
  animRegionSceneUpgrade('asia', 'country:SG', {
    state: 'live',
    archetype: 'skyline-water',
    landmarks: ['landmark.marina-bay-sands', 'landmark.supertrees'],
    scene: () => sceneFromArchetype('skyline-water', params, patch),
  });
})();
