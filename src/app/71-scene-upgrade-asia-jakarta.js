/* ============================================================
   UPGRADE (live) of asia-southeast/jakarta-skyline (docs/dev/SCENE_ENGINE.md section 16)
   Scaffolded by `node tools/anim-pack.mjs scene upgrade asia-southeast/jakarta-skyline --box 680,140,920,700 --slug monas`.
   LIVE: the app shows this composed scene in place of the hand-drawn art (kept
   as the item's legacySvg). The item keeps its identity: the id, key, place
   fields, label, site, tags and when come from the region entry
   (tests/scene-upgrades-live.test.mjs).
   After any change, re-check:
     node tools/anim-pack.mjs scene sheet asia-southeast/jakarta-skyline --compare --upgrades --times
     node tools/anim-pack.mjs scene lint asia-southeast/jakarta-skyline --upgrades --perf   (GOLD)
   Care: no signs or text, at most 8 tiny anonymous people, no crowds, no flags or emblems.
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // Medan Merdeka at dusk from the north side of the pool before the National Monument, looking south: the monument
  // over the water and the trees of the square, the towers of Thamrin and Sudirman beyond the park; royal palms and
  // rain trees round the square, bougainvillea and ixora in the beds. Tropical: the same green all year, no boats on the pool.
  const params = { id: 'jakarta', lat: -6.173, lon: 106.827, heading: 185, at: 'dusk', climate: 'tropical',
    kits: ['tropical', 'towers', 'urban', 'people', 'birds', 'water'],
    landmarks: ['landmark.monas@720@500'], water: 'lake', horizon: 600,
    palette: { base: { water: ['#9aa6b8', '#56667e', '#2a3448'] } } };
  const patch = {
    // the scene's own picks and mixes (8.6), so a new library object never moves them
    picks: { frame: ['plant.palm-coconut-tall', 'tree.rain-tree'], lamp: ['street.lamppost'] },
    mix: { tree: { 'plant.palm-coconut-tall': 1, 'tree.rain-tree': 1 }, ground: { 'plant.grass-tropical': 3, 'plant.ixora': 1, 'plant.bougainvillea': 1 },
      shrub: { 'plant.bougainvillea-hedge': 1, 'plant.banana': 1 }, boat: { 'boat.sampan': 1 } },
    // no boats on the pool (the archetype's one boat is actors[0]); its far row and the trees round the pool are replaced
    // below; its second frame tree (x 1690) stands outside the 16:9 view; the monument is placed again without the archetype's
    // ground shadow, which would fall on the pool
    drop: { actors: [0], scatter: [1, 2], place: ['tree.rain-tree', 'landmark.monas'] },
    place: [{ obj: 'landmark.monas', x: 720, y: 622, s: 0.95, layer: 'mid', seed: 11, reflect: true, shadow: false },
      { obj: 'tree.rain-tree', x: 1570, y: 912, s: 1.1, layer: 'front', seed: 22, flip: true, variant: 2 }],
    scatter: [
      // the towers beyond the square: the Thamrin and Sudirman cluster to the south-west (right), taller and denser, and a
      // lower, thinner line to the south-east (left); kept below the monument's flame and clear of it
      { obj: { 'building.tower-glass': 3, 'building.tower': 2 }, layer: 'far', seed: 4, area: { rect: [880, 604, 1750, 609] }, n: 14, minGap: 40, s: [0.38, 0.66], maxH: 290, flip: 0.5, variant: [0, 5],
        tint: { col: '#8a8aa4', k: [0.08, 0.08] }, mask: { noise: { scale: 140, cut: 0.25 } }, shadow: false, anim: false, reflect: true },
      { obj: { 'building.tower-glass': 3, 'building.tower': 2 }, layer: 'far', seed: 5, area: { rect: [-150, 604, 600, 609] }, n: 8, minGap: 52, s: [0.3, 0.5], maxH: 210, flip: 0.5, variant: [0, 5],
        tint: { col: '#8a8aa4', k: [0.08, 0.08] }, mask: { noise: { scale: 140, cut: 0.3 } }, shadow: false, anim: false, reflect: true },
      // the trees of the square round the pool, in sizes that vary, clear of the monument's terrace
      { obj: { 'tree.rain-tree': 1, 'plant.palm-royal': 2 }, layer: 'mid', seed: 15, area: { rect: [-140, 620, 1740, 626] }, n: 22, minGap: 48, s: [0.13, 0.28], flip: 0.5, variant: [0, 1],
        tint: { col: '#6a7a8a', k: [0.08, 0.08] }, mask: { avoid: [{ rect: [610, 560, 830, 630] }] }, anim: false, reflect: true }],
    // egrets low over the pool, besides the archetype's two flocks
    flocks: [{ obj: 'bird.egret-flight', n: 3, area: [200, 520, 1400, 600], speed: 16, s: 0.7, seed: 12, layer: 'mid' }],
  };
  animRegionSceneUpgrade('asia', 'place:jakarta', {
    state: 'live',
    archetype: 'skyline-water',
    landmarks: ['landmark.monas'],
    scene: () => sceneFromArchetype('skyline-water', params, patch),
  });
})();
