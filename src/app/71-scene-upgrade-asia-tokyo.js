/* ============================================================
   UPGRADE (live) of asia-east/tokyo-skyline (docs/dev/SCENE_ENGINE.md section 16)
   Scaffolded by `node tools/anim-pack.mjs scene upgrade asia-east/tokyo-skyline`.
   LIVE: the app shows this composed scene in place of the hand-drawn art (kept
   as the item's legacySvg). The item keeps its identity: the id, key, place
   fields, label, site, tags and when come from the region entry
   (tests/scene-upgrades-live.test.mjs). After any change, re-check:
     node tools/anim-pack.mjs scene sheet asia-east/tokyo-skyline --compare --upgrades --times
     node tools/anim-pack.mjs scene lint asia-east/tokyo-skyline --upgrades --perf   (GOLD)
   Care: no signs or text, at most 8 tiny anonymous people, no crowds, no flags or emblems.
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // Tokyo Bay from the Odaiba waterfront, looking north at dusk: Tokyo Tower over the Minato shore on the left,
  // the Skytree rising beyond the city on the right (drawn a little closer together than the real 56 degrees),
  // water buses and tugs on the bay, cherries framing the promenade (blossom in spring).
  const params = { id: 'tokyo', lat: 35.6298, lon: 139.7737, heading: 352, at: 'dusk', climate: 'temperate',
    kits: ['towers', 'urban', 'east-asian', 'temperate', 'people', 'boats', 'birds', 'water'],
    landmarks: ['landmark.tokyo-tower@470@470', 'landmark.skytree@1150@520'],
    water: 'bay', horizon: 540, palette: { base: { water: ['#8aa6b8', '#4a6c84', '#22405a'] } } };
  const patch = {
    // the scene's own picks and mixes (8.6), so a new library object never moves them: a flowering cherry and a
    // momiji maple framing the view, cherries and maples on the far shore, sasa and grasses with azalea
    // hedges in the beds (the city's planting), the bay's water buses and tugs
    picks: { frame: ['tree.cherry-blossom', 'tree.maple-momiji'], lamp: ['street.lamp'] },
    mix: { tree: { 'tree.cherry-blossom': 1, 'tree.maple-momiji': 1 }, ground: { 'plant.sasa': 2, 'plant.grass': 2, 'plant.susuki': 1 },
      shrub: { 'plant.azalea': 1 }, boat: { 'boat.water-taxi': 1, 'boat.ferry': 1, 'boat.tug': 1 } },
    drop: { scatter: [1] },
    scatter: [
      { obj: { 'building.tower-glass': 2, 'building.tower': 1, 'building.apartment-jp': 1 }, layer: 'far', seed: 4, area: { rect: [-150, 544, 1750, 549] }, n: 28, minGap: 40, s: [0.25, 0.5], maxH: 210, flip: 0.5, variant: 'random', tint: { col: '#8a9aac', k: [0.08, 0.08] }, mask: { noise: { scale: 140, cut: 0.32 }, avoid: [{ rect: [390, 500, 550, 570] }, { rect: [1105, 500, 1195, 570] }] }, shadow: false, anim: false, reflect: true },
    ],
  };
  animRegionSceneUpgrade('asia', 'place:tokyo', {
    state: 'live',
    archetype: 'skyline-water',
    landmarks: ['landmark.tokyo-tower', 'landmark.skytree'],
    scene: () => sceneFromArchetype('skyline-water', params, patch),
  });
})();
