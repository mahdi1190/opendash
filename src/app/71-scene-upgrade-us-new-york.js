/* ============================================================
   UPGRADE (draft) of us-northeast/new-york-skyline (docs/dev/SCENE_ENGINE.md section 16)
   Scaffolded by `node tools/anim-pack.mjs scene upgrade us-northeast/new-york-skyline`.
   The app keeps showing the hand-drawn art while state is 'draft'; the
   tool shows this scene with --upgrades. Keep the item's identity: the id,
   key, place fields, label, site, tags and when come from the region entry.

   Next:
     node tools/anim-pack.mjs scene sheet us-northeast/new-york-skyline --compare --upgrades --times
     node tools/anim-pack.mjs scene lint us-northeast/new-york-skyline --upgrades --perf
   and set state: 'live' only when the lint prints GOLD and the compare
   sheet has been looked at in light and night. Care: no signs or text, at
   most 8 tiny anonymous people, no crowds, no flags or emblems.
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // Lower Manhattan across the East River from Brooklyn Bridge Park, looking west-north-west at golden hour:
  // One World Trade Center on the left, the Brooklyn Bridge striding across the river, Midtown's Empire State
  // and Chrysler buildings framed between its towers, the promenade and its planting in front.
  const params = { id: 'new-york', lat: 40.7022, lon: -73.9965, heading: 295, at: 'golden', climate: 'temperate',
    kits: ['towers', 'urban', 'people', 'boats', 'birds', 'water'],
    landmarks: ['landmark.one-wtc@380@440', 'landmark.empire-state@1000@290', 'landmark.chrysler@1150@250', 'landmark.brooklyn-bridge@960@420@front@130'],
    water: 'river', horizon: 540, palette: { base: { water: ['#8fa8b8', '#4c6e86', '#23405a'] } } };
  // traffic on the bridge's roadway: cars and cabs both ways, in the near layer so the deck never hides them
  const deck = 518, car = (obj, i, back, v) => ({ obj, layer: 'near', path: back ? [[1760, deck - 3], [160, deck - 3]] : [[160, deck], [1760, deck]], speed: 34 + i * 5, loop: 'loop', s: 0.34, seed: 60 + i, offset: (0.11 + i * 0.27) % 1, flip: back, variant: v });
  // the park's own planting, named (not left to the kit): London planes and a few flowering cherries on the far quay, planes framing the view,
  // meadow grasses and wildflowers in the beds, a few clipped shrubs (Brooklyn Bridge Park's waterfront look)
  const bed = { 'plant.grass': 4, 'plant.wildflowers': 2 }, bed2 = { 'plant.grass': 3, 'plant.wildflowers': 1 }, plane = 'tree.plane', quayTrees = { 'tree.plane': 3, 'tree.cherry': 1 };
  const patch = {
    drop: { scatter: [2, 5, 6, 7], place: [4, 5] },
    scatter: [
      { obj: quayTrees, layer: 'mid', seed: 15, area: { rect: [-140, 560, 1740, 566] }, n: 18, minGap: 60, s: [0.1, 0.16], flip: 0.5, variant: [0, 1], tint: { col: '#6a8a9a', k: [0, 0.08] }, mask: { avoid: [{ rect: [300, 500, 460, 570] }, { rect: [940, 500, 1200, 570] }] }, anim: false, reflect: true },
      { obj: bed, layer: 'fore', seed: 7, area: { rect: [-150, 792, 1750, 850] }, n: 170, minGap: 15, s: [0.6, 1], flip: 0.5, variant: [0, 1], anim: 'strip' },
      { obj: bed2, layer: 'fore', seed: 8, area: { rect: [-150, 850, 1750, 905] }, n: 125, minGap: 22, s: [1, 1.4], flip: 0.5, variant: [1, 1], tint: { col: '#6a7a40', k: [0.08, 0.08] }, anim: 'strip' },
      { obj: 'plant.shrub', layer: 'fore', seed: 9, area: { rect: [-150, 800, 1750, 830] }, n: 5, minGap: 260, s: [0.28, 0.46], flip: 0.4, variant: 0, anim: false },
    ],
    place: [{ obj: plane, x: -30, y: 915, s: 1.6, layer: 'front', seed: 21 }, { obj: plane, x: 1700, y: 915, s: 1.5, layer: 'front', seed: 22, flip: true, variant: 2 }],
    actors: [car('vehicle.taxi', 0, false, 0), car('vehicle.car', 1, true, 1), car('vehicle.car', 2, false, 3), car('vehicle.taxi', 3, true, 1)],
  };
  animRegionSceneUpgrade('us', 'place:new-york', {
    state: 'draft',
    archetype: 'skyline-water',
    landmarks: ['landmark.brooklyn-bridge', 'landmark.one-wtc', 'landmark.empire-state', 'landmark.chrysler'],
    scene: () => sceneFromArchetype('skyline-water', params, patch),
  });
})();
