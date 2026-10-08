/* ============================================================
   UPGRADE of asia-east/xian-skyline (docs/dev/SCENE_ENGINE.md section 16)
   Scaffolded by `node tools/anim-pack.mjs scene upgrade asia-east/xian-skyline`.
   The app keeps showing the hand-drawn art while state is 'draft'; the
   tool shows this scene with --upgrades. Keep the item's identity: the id,
   key, place fields, label, site, tags and when come from the region entry.

   Next:
     node tools/anim-pack.mjs scene sheet asia-east/xian-skyline --compare --upgrades --times
     node tools/anim-pack.mjs scene lint asia-east/xian-skyline --upgrades --perf
   and set state: 'live' only when the lint prints GOLD and the compare
   sheet has been looked at in light and night. Care: no signs or text, at
   most 8 tiny anonymous people, no crowds, no flags or emblems.
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // The Big Wild Goose Pagoda from the south, in the precinct of the Da Ci'en Temple, looking north-north-west across
  // the city to the Ming wall at the South Gate (the archetype's far slot takes the wall: the archery tower and the
  // gate tower over the barbican, the crenellated wall running the width of the view, the moat park's trees in front).
  // The temple's hall beside the pagoda, its stone lanterns up the stair, pagoda trees and cherries round it, and
  // wild geese over the city.
  const params = { id: 'xian', lat: 34.2155, lon: 108.9592, heading: 348, at: 'afternoon', climate: 'temperate',
    kits: ['east-asian', 'temperate', 'people', 'birds'],
    landmarks: ['landmark.xian-city-wall@430@170', 'landmark.big-wild-goose-pagoda@1020@560'], water: 'none', horizon: 520 };
  // the scene's own picks and mixes (8.6), so a new library object never moves them: the temple's cypress-like conifers,
  // cherries and maples (red and gold in autumn), stone lanterns, the city's flats and houses, lawn and flowers, wild geese
  const patch = {
    picks: { frame: ['tree.cedar'], corner: ['tree.cherry-blossom', 'tree.maple-japanese'], bird: ['bird.goose-flight', 'bird.small-flight'] },
    mix: { tree: { 'tree.cedar': 1, 'tree.cherry': 2, 'tree.cherry-blossom': 1, 'tree.maple-japanese': 1 }, street: { 'structure.lantern-stone': 1, 'structure.lantern-stone-garden': 1 },
      'building-far': { 'building.apartment-jp': 2, 'building.house-jp': 1 }, ground: { 'plant.grass': 3, 'plant.wildflowers': 1 }, shrub: { 'plant.azalea': 1, 'plant.shrub': 1 } },
    // the archetype's forest rows give way to the city's: the moat park's broadleaves in front of the wall (no conifer
    // forest), the town re-sized by depth, a few trees and shrubs round the precinct so the pagoda's platform shows
    drop: { scatter: [0, 1, 3, 4, 5], place: ['tree.cedar'] },
    // the temple's main hall to the right of the pagoda, on the precinct's rise; a maple framing the left
    place: [{ obj: 'building.temple-hall', x: 1420, y: 664, s: 0.5, layer: 'mid', seed: 31 }, { obj: 'tree.maple-japanese', x: -70, y: 930, s: 1.5, layer: 'front', seed: 21, variant: 2 }],
    // the wall is 4 km off, not a mountain range: less haze on the far slot than the archetype's default
    layers: SCENE_LAYERS_DEFAULT.map(l => Object.assign({}, l, l.id === 'horizon' ? { haze: 0.42 } : {})),
    scatter: [
      { obj: { 'tree.far-broad': 2, 'tree.distant': 1 }, layer: 'far', seed: 3, area: { rect: [-150, 520, 1750, 556] }, n: 44, minGap: 30, s: [0.12, 0.2], flip: 0.5, variant: [0, 1], tint: { col: '#7a8a8a', k: [0.08, 0.16] }, anim: false, shadow: false },
      { obj: { 'building.apartment-jp': 2, 'building.house-jp': 1 }, layer: 'far', seed: 4, area: { rect: [-150, 566, 640, 630] }, n: 22, minGap: 34, s: [0.24, 0.42], sByY: [[566, 0.8], [630, 1.2]], flip: 0.5, variant: [0, 3], tint: { col: '#8a98a8', k: [0, 0.08] }, anim: false, shadow: false },
      { obj: { 'tree.cherry': 2, 'tree.maple-japanese': 1 }, layer: 'mid', seed: 6, area: { rect: [730, 664, 1740, 720] }, n: 7, minGap: 80, s: [0.4, 0.62], flip: 0.5, variant: [0, 1], tint: { col: '#8a7a50', k: [0.08, 0.08] }, mask: { avoid: [{ rect: [800, 300, 1240, 700] }, { rect: [1330, 600, 1510, 700] }] }, anim: false },
      { obj: { 'tree.cherry': 1, 'tree.cherry-blossom': 1 }, layer: 'near', seed: 7, area: { rect: [-140, 736, 1740, 786] }, n: 4, minGap: 320, s: [0.7, 0.95], flip: 0.5, variant: [0, 1], mask: { avoid: [{ rect: [640, 600, 1280, 800] }] }, anim: false },
      { obj: 'plant.shrub', layer: 'near', seed: 8, area: { rect: [-150, 728, 1750, 806] }, n: 12, minGap: 90, s: [0.45, 0.85], flip: 0.5, variant: [0, 1], tint: { col: '#6a7a40', k: [0, 0.08] }, mask: { avoid: [{ rect: [700, 716, 820, 776] }] }, anim: false },
    ],
  };
  animRegionSceneUpgrade('asia', 'place:xian', {
    state: 'live',
    archetype: 'temple-mountain',
    landmarks: ['landmark.xian-city-wall', 'landmark.big-wild-goose-pagoda'],
    scene: () => sceneFromArchetype('temple-mountain', params, patch),
  });
})();
