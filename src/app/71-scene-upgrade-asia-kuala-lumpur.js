/* ============================================================
   UPGRADE (live) of asia-southeast/kuala-lumpur-skyline (docs/dev/SCENE_ENGINE.md section 16)
   Scaffolded by `node tools/anim-pack.mjs scene upgrade asia-southeast/kuala-lumpur-skyline`.
   LIVE: the app shows this composed scene in place of the hand-drawn art (kept
   as the item's legacySvg). The item keeps its identity: the id, key, place
   fields, label, site, tags and when come from the region entry
   (tests/scene-upgrades-live.test.mjs).
   After any change, re-check:
     node tools/anim-pack.mjs scene sheet asia-southeast/kuala-lumpur-skyline --compare --upgrades --times
     node tools/anim-pack.mjs scene lint asia-southeast/kuala-lumpur-skyline --upgrades --perf   (GOLD)
   Care: no signs or text, at most 8 tiny anonymous people, no crowds, no flags or emblems.
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // KLCC Park at blue hour, looking north-west across the lake: the twin towers and their sky bridge beyond the water,
  // the telecommunications tower rising from the forest of its hill on the left (drawn closer than the real 60 degrees);
  // rain trees and royal palms round the lake, ixora and bougainvillea in the beds. Tropical: the same green all year,
  // no boats on the park lake (egrets and kites instead).
  const params = { id: 'kuala-lumpur', lat: 3.155, lon: 101.714, heading: 300, at: 'dusk', climate: 'tropical',
    kits: ['tropical', 'towers', 'urban', 'people', 'birds', 'water'],
    landmarks: ['landmark.kl-tower@330@360', 'landmark.petronas-towers@930@510'],
    water: 'lake', horizon: 560, palette: { base: { water: ['#86a8b4', '#4a6e80', '#24404e'] } } };
  const patch = {
    // the scene's own picks and mixes (8.6), so a new library object never moves them: a royal palm and a rain tree
    // framing the view, rain trees and palms round the lake, tropical grass and ixora in the beds, bougainvillea and
    // banana plants among them
    picks: { frame: ['plant.palm-royal', 'tree.rain-tree'], lamp: ['street.lamppost'] },
    mix: { tree: { 'tree.rain-tree': 1, 'plant.palm-royal': 2 }, ground: { 'plant.grass-tropical': 3, 'plant.ixora': 2 },
      shrub: { 'plant.bougainvillea-hedge': 1, 'plant.banana': 1 }, boat: { 'boat.sampan': 1 } },
    // no boats on a park lake (the archetype's one boat is actors[0]); the archetype's far row and quay trees are replaced
    // below; its second frame tree (x 1690) stands outside the 16:9 view
    drop: { actors: [0], scatter: [1, 2], place: ['tree.rain-tree'] },
    place: [{ obj: 'tree.rain-tree', x: 1590, y: 912, s: 1.15, layer: 'front', seed: 22, flip: true, variant: 2 },
      // a rain tree of the hill's forest in front of the telecommunications tower's entrance hall
      { obj: 'tree.rain-tree', x: 334, y: 590, s: 0.32, layer: 'mid', seed: 23, variant: 1, reflect: true }],
    scatter: [
      // the city round KLCC: glass and office towers, kept below the twin towers and clear of both landmarks
      { obj: { 'building.tower-glass': 3, 'building.tower': 1 }, layer: 'far', seed: 4, area: { rect: [-150, 564, 1750, 569] }, n: 22, minGap: 40, s: [0.32, 0.6], maxH: 230, flip: 0.5, variant: [0, 5],
        tint: { col: '#8a9aac', k: [0.08, 0.08] }, mask: { noise: { scale: 140, cut: 0.3 }, avoid: [{ rect: [300, 520, 360, 590] }, { rect: [835, 520, 1025, 590] }] }, shadow: false, anim: false, reflect: true },
      // the forest of Bukit Nanas (rain trees and palms) round the foot of the telecommunications tower (in front of it)
      { obj: { 'tree.rain-tree': 1, 'plant.palm-coconut': 1 }, layer: 'mid', seed: 16, area: { rect: [230, 583, 430, 590] }, n: 7, minGap: 26, s: [0.22, 0.36], flip: 0.5, variant: [0, 2], tint: { col: '#5a7a6a', k: [0.1, 0.1] }, anim: false, reflect: true },
      // the trees round the lake in sizes that vary more than the archetype's quay row
      { obj: { 'tree.rain-tree': 1, 'plant.palm-royal': 2 }, layer: 'mid', seed: 15, area: { rect: [-140, 580, 1740, 586] }, n: 24, minGap: 46, s: [0.13, 0.28], flip: 0.5, variant: [0, 1],
        tint: { col: '#6a8a9a', k: [0.08, 0.08] }, mask: { avoid: [{ rect: [870, 520, 990, 590] }] }, anim: false, reflect: true }],
    // egrets low over the lake, besides the archetype's two flocks
    flocks: [{ obj: 'bird.egret-flight', n: 3, area: [200, 500, 1400, 560], speed: 16, s: 0.7, seed: 12, layer: 'mid' }],
  };
  animRegionSceneUpgrade('asia', 'place:kuala-lumpur', {
    state: 'live',
    archetype: 'skyline-water',
    landmarks: ['landmark.petronas-towers', 'landmark.kl-tower'],
    scene: () => sceneFromArchetype('skyline-water', params, patch),
  });
})();
