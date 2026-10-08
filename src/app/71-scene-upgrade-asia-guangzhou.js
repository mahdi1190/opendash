/* ============================================================
   UPGRADE (live) of asia-east/guangzhou-skyline (docs/dev/SCENE_ENGINE.md section 16)
   Scaffolded by `node tools/anim-pack.mjs scene upgrade asia-east/guangzhou-skyline`.
   LIVE: the app shows this composed scene in place of the hand-drawn art (kept
   as the item's legacySvg). The item keeps its identity: the id, key, place
   fields, label, site, tags and when come from the region entry
   (tests/scene-upgrades-live.test.mjs).
   After any change, re-check:
     node tools/anim-pack.mjs scene sheet asia-east/guangzhou-skyline --compare --upgrades --times
     node tools/anim-pack.mjs scene lint asia-east/guangzhou-skyline --upgrades --perf   (GOLD)
   Care: no signs or text, at most 8 tiny anonymous people, no crowds, no flags or emblems.
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // The Pearl River from the east tip of Ersha Island, looking east at dusk: the Canton Tower on the south bank on the
  // right, the glass towers of Zhujiang New Town on the north bank on the left (drawn a little closer together than the
  // real 33 degrees); river cruisers, water taxis and tugs on the river, royal palms, banyan-like rain trees and
  // bougainvillea (the city's flower beds) on the promenade. Guangzhou lies just south of the Tropic: green all year.
  const params = { id: 'guangzhou', lat: 23.117, lon: 113.3, heading: 100, at: 'dusk', climate: 'tropical',
    kits: ['tropical', 'towers', 'urban', 'people', 'boats', 'birds', 'water'],
    landmarks: ['landmark.canton-tower@1010@530'],
    water: 'river', horizon: 540, palette: { base: { water: ['#9aaea4', '#56706c', '#2a3e44'] } } };
  const far = (obj, seed, area, n, s, variant, maxH, k, noise) => ({ obj, layer: 'far', seed, area: { rect: area }, n, minGap: 40, s, maxH, flip: 0.5, variant, tint: { col: '#8a9aac', k: [k, k] },
    mask: Object.assign({ avoid: [{ rect: [950, 500, 1070, 570] }] }, noise ? { noise: { scale: 140, cut: 0.3 } } : {}), shadow: false, anim: false, reflect: true });
  const patch = {
    // the scene's own picks and mixes (8.6), so a new library object never moves them: a royal palm and a rain tree framing
    // the view, rain trees and palms along the far bank, tropical grass, ixora and bougainvillea in the beds, the river's
    // cruisers, water taxis and tugs
    picks: { frame: ['plant.palm-royal', 'tree.rain-tree'], lamp: ['street.lamppost'] },
    mix: { tree: { 'tree.rain-tree': 2, 'plant.palm-royal': 1 }, ground: { 'plant.grass-tropical': 3, 'plant.ixora': 1, 'plant.bougainvillea': 1 },
      shrub: { 'plant.bougainvillea-hedge': 1 }, boat: { 'boat.ferry': 1, 'boat.water-taxi': 1, 'boat.tug': 1 } },
    // the archetype's far row and quay trees are replaced below; its second frame tree (x 1690) stands outside the 16:9 view
    drop: { scatter: [1, 2], place: ['tree.rain-tree'] },
    place: [{ obj: 'tree.rain-tree', x: 1590, y: 912, s: 1.15, layer: 'front', seed: 22, flip: true, variant: 1 }],
    scatter: [
      // Zhujiang New Town on the north bank: a cluster of tall glass towers on the left
      far('building.tower-glass', 4, [150, 544, 700, 549], 8, [0.6, 0.95], [0, 5], 300, 0.06, false),
      // the rest of the far bank, lower and gappier
      far({ 'building.tower-glass': 2, 'building.tower': 1 }, 6, [-150, 544, 1750, 549], 16, [0.3, 0.55], [0, 3], 210, 0.14, true),
      // the far bank's rain trees and palms in sizes that vary more than the archetype's quay row
      { obj: { 'tree.rain-tree': 2, 'plant.palm-royal': 1 }, layer: 'mid', seed: 15, area: { rect: [-140, 560, 1740, 566] }, n: 24, minGap: 46, s: [0.13, 0.28], flip: 0.5, variant: [0, 1],
        tint: { col: '#6a8a9a', k: [0.08, 0.08] }, mask: { avoid: [{ rect: [985, 500, 1035, 570] }] }, anim: false, reflect: true }],
    // a pair of egrets low over the river
    flocks: [{ obj: 'bird.egret-flight', n: 2, area: [200, 470, 1400, 530], speed: 16, s: 0.7, seed: 12, layer: 'mid' }],
  };
  animRegionSceneUpgrade('asia', 'place:guangzhou', {
    state: 'live',
    archetype: 'skyline-water',
    landmarks: ['landmark.canton-tower'],
    scene: () => sceneFromArchetype('skyline-water', params, patch),
  });
})();
