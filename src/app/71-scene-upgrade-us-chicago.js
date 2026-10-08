/* ============================================================
   UPGRADE (live) of us-midwest/chicago-l-train (docs/dev/SCENE_ENGINE.md section 16)
   Written by hand after `node tools/anim-pack.mjs scene upgrade us-midwest/chicago-l-train --dry-run`.
   LIVE: the app shows this composed scene in place of the hand-drawn art (kept
   as the item's legacySvg). The item keeps its identity: the id, key, place
   fields, label, site, tags and when come from the region entry
   (tests/scene-upgrades-live.test.mjs). After any change, re-check:
     node tools/anim-pack.mjs scene sheet us-midwest/chicago-l-train --compare --upgrades --times
     node tools/anim-pack.mjs scene lint us-midwest/chicago-l-train --upgrades --perf   (GOLD)
   Care: no signs or text, at most 8 tiny anonymous people, no crowds, no flags or emblems. The train's
   sides stay blank (no operator's colours, logos or line maps).
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // The Chicago River from the Riverwalk near Wolf Point, looking south at golden hour: the L crossing the river on its
  // double-deck bridge with trains both ways, the Willis Tower rising over the dark-glass towers of the far bank,
  // tour boats on the river, prairie grasses and wildflowers in the Riverwalk's beds.
  const params = { id: 'chicago', lat: 41.887, lon: -87.637, heading: 170, at: 'golden', climate: 'temperate',
    kits: ['towers', 'urban', 'temperate', 'people', 'boats', 'birds', 'water'],
    landmarks: ['landmark.willis-tower@960@480'], water: 'river', horizon: 530,
    palette: { base: { water: ['#86aaa6', '#41706e', '#1f4446'] } } };
  // the L over the river (the near layer, so the boats pass behind it) and its trains on the upper deck, both ways
  const LY = 724, LS = 2.4, RAIL = Math.round((LY - 48.8 * LS) * 10) / 10;
  const train = (back, speed, seed, offset) => ({ obj: 'rail.l-train', layer: 'near', path: back ? [[2040, RAIL - 1], [-440, RAIL - 1]] : [[-440, RAIL], [2040, RAIL]], speed, loop: 'loop', s: LS / 2, seed, offset, flip: back });
  const patch = {
    // the scene's own picks and mixes (8.6), so a new library object never moves them: plane trees and birches on the far
    // bank, planes framing the view, prairie grasses and wildflowers in the beds, the Riverwalk's lampposts, tour boats
    picks: { lamp: ['street.lamppost'], frame: ['tree.plane'] },
    mix: { tree: { 'tree.plane': 3, 'tree.green-birch': 1 }, ground: { 'plant.grass': 3, 'plant.wildflowers': 1 }, shrub: { 'plant.shrub': 1 },
      boat: { 'boat.water-taxi': 1, 'boat.ferry': 1, 'boat.tug': 1 }, bird: { 'bird.gull': 1, 'bird.herring-gull-flight': 1 } },
    // the far row is the scene's own (the Loop's dark-glass towers, no art-deco spires that would read as another city); the second
    // frame tree (outside the 16:9 view) is replaced by one inside it; the shrubs are re-scattered in loose groups
    // the far bank's tree row too, re-scattered with a wider spread of sizes
    drop: { place: [2], scatter: [1, 2, 7] },
    scatter: [
      { obj: { 'building.tower-glass': 3, 'building.tower': 1 }, layer: 'far', seed: 4, area: { rect: [-150, 534, 1750, 539] }, n: 30, minGap: 40, s: [0.35, 0.9], maxH: 300, flip: 0.5, variant: 'random', tint: { col: '#3a4658', k: [0.16, 0.16] }, mask: { noise: { scale: 140, cut: 0.32 }, avoid: [{ rect: [910, 500, 1010, 560] }] }, shadow: false, anim: false, reflect: true },
      { obj: { 'tree.plane': 1, 'tree.green-birch': 1 }, layer: 'mid', seed: 15, area: { rect: [-140, 550, 1740, 556] }, n: 26, minGap: 46, s: [0.13, 0.28], flip: 0.5, variant: [0, 1], tint: { col: '#6a8a9a', k: [0.08, 0.08] }, anim: false, reflect: true },
      { obj: 'plant.shrub', layer: 'fore', seed: 19, area: { rect: [-150, 806, 1750, 836] }, n: 8, minGap: 110, s: [0.5, 0.9], flip: 0.5, variant: 'random', mask: { noise: { scale: 220, cut: 0.3 } }, anim: false },
    ],
    place: [
      { obj: 'landmark.chicago-l', x: 800, y: LY, s: LS, layer: 'near', seed: 31, shadow: false },
      { obj: 'tree.plane', x: 1600, y: 912, s: 1.5, layer: 'front', seed: 22, flip: true, variant: 2 },
    ],
    actors: [train(true, 64, 62, 0.62), train(false, 76, 61, 0.12)],
  };
  animRegionSceneUpgrade('us', 'place:chicago', {
    state: 'live',
    archetype: 'skyline-water',
    landmarks: ['landmark.willis-tower', 'landmark.chicago-l'],
    scene: () => sceneFromArchetype('skyline-water', params, patch),
  });
})();
