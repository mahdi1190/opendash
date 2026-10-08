/* ============================================================
   UPGRADE (draft) of asia-southeast/singapore-skyline (docs/dev/SCENE_ENGINE.md section 16)
   Scaffolded by `node tools/anim-pack.mjs scene upgrade asia-southeast/singapore-skyline`.
   The app keeps showing the hand-drawn art while state is 'draft'; the
   tool shows this scene with --upgrades. Keep the item's identity: the id,
   key, place fields, label, site, tags and when come from the region entry.

   Next:
     node tools/anim-pack.mjs scene sheet asia-southeast/singapore-skyline --compare --upgrades --times
     node tools/anim-pack.mjs scene lint asia-southeast/singapore-skyline --upgrades --perf
   and set state: 'live' only when the lint prints GOLD and the compare
   sheet has been looked at in light and night. Care: no signs or text, at
   most 8 tiny anonymous people, no crowds, no flags or emblems.
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // Marina Bay from the Merlion side of the bay, looking east-south-east: the Flyer on the left, the three
  // towers and their SkyPark in the middle with the lotus museum before them, the Supertrees beyond on the right.
  const params = { id: 'singapore', lat: 1.2868, lon: 103.8545, heading: 110, at: 'dusk', climate: 'tropical',
    kits: ['tropical', 'towers', 'urban', 'people', 'boats', 'birds', 'water'],
    landmarks: ['landmark.singapore-flyer@330@300', 'landmark.marina-bay-sands@800@330', 'landmark.supertrees@1200@160'],
    water: 'bay', horizon: 540, density: 1,
    palette: { base: { water: ['#7ab4c0', '#357688', '#183e52'] } } };
  const glass = { 'building.tower-glass': 1 };   // Marina Bay's skyline is curtain-wall glass: no masonry setback towers
  const patch = {
    // the scene's own picks (8.6), so a new library object never moves them: a tall coconut palm and a rain tree framing the
    // view, lampposts on the promenade; rain trees and palms on the quay, banana plants in the beds (heavier mixes overran the tile)
    picks: { frame: ['plant.palm-coconut-tall', 'tree.rain-tree'], lamp: ['street.lamppost'] },
    mix: { tree: { 'tree.rain-tree': 1, 'plant.palm-coconut-tall': 0.3, 'plant.palm-royal': 1 }, shrub: { 'plant.banana': 1 } },
    drop: { scatter: [1] },
    scatter: [
      { obj: glass, layer: 'far', seed: 4, area: { rect: [-150, 544, 1750, 549] }, n: 28, minGap: 40, s: [0.5, 0.9], flip: 0.5, variant: 'random', tint: { col: '#8a9aac', k: [0.08, 0.08] }, mask: { noise: { scale: 140, cut: 0.32 }, avoid: [{ rect: [380, 500, 1220, 570] }] }, shadow: false, anim: false },
    ],
    // a second bumboat and a water taxi on the near lanes, a pair of egrets low over the water
    actors: [
      { obj: 'boat.bumboat', layer: 'mid', path: [[1820, 742], [-220, 742]], speed: 9, loop: 'loop', s: 1, sByY: [[566, 0.38], [764, 1.05]], seed: 41, offset: 0.62, flip: true, variant: 1 },
      { obj: 'boat.bumboat', layer: 'mid', path: [[-220, 612], [1820, 612]], speed: 6, loop: 'loop', s: 1, sByY: [[566, 0.38], [764, 1.05]], seed: 42, offset: 0.08, variant: 2 },
    ],
    flocks: [{ obj: 'bird.egret-flight', n: 2, area: [200, 470, 1400, 530], speed: 16, s: 0.7, seed: 12, layer: 'mid' }],
  };
  animRegionSceneUpgrade('asia', 'place:singapore', {
    state: 'draft',
    archetype: 'skyline-water',
    landmarks: ['landmark.marina-bay-sands', 'landmark.singapore-flyer', 'landmark.supertrees'],
    scene: () => sceneFromArchetype('skyline-water', params, patch),
  });
})();
