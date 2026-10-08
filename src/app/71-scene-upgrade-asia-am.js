/* ============================================================
   UPGRADE of asia-west/am-signature (docs/dev/SCENE_ENGINE.md section 16)
   Scaffolded by `node tools/anim-pack.mjs scene upgrade asia-west/am-signature`.
   The app keeps showing the hand-drawn art while state is 'draft'; the
   tool shows this scene with --upgrades. Keep the item's identity: the id,
   key, place fields, label, site, tags and when come from the region entry.

   Next:
     node tools/anim-pack.mjs scene sheet asia-west/am-signature --compare --upgrades --times
     node tools/anim-pack.mjs scene lint asia-west/am-signature --upgrades --perf
   and set state: 'live' only when the lint prints GOLD and the compare
   sheet has been looked at in light and night. Care: no signs or text, at
   most 8 tiny anonymous people, no crowds, no flags or emblems.
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // Khor Virap on its knoll above the Ararat plain at dawn, looking south-west: Greater Ararat rising behind on the
  // right, Little Ararat on the left, the plain's orchards and a village between, sheep on the slope below the walls.
  // The region's own kits (arid, islamic) have no library objects yet: the scene is composed from the temperate,
  // alpine and east-asian kits (orchard trees for the apricots, the far village's houses) and the always-on kits.
  const params = { id: 'am', lat: 39.8783, lon: 44.5764, heading: 222, at: 'dawn', climate: 'temperate',
    kits: ['temperate', 'alpine', 'people', 'birds'],
    landmarks: ['landmark.ararat@560@440', 'landmark.khor-virap@600@260'], water: 'none', horizon: 560 };
  // the scene's own picks and mixes (8.6): fruit trees (the apricot orchards) round the knoll, meadow cover, small birds
  const patch = {
    picks: { frame: ['tree.cedar'], corner: ['tree.cherry', 'tree.cherry-blossom'], bird: ['bird.small-flight', 'bird.goose-flight'] },
    mix: { tree: { 'tree.cedar': 1, 'tree.cherry': 2, 'tree.cherry-blossom': 1 }, ground: { 'plant.grass': 3, 'plant.wildflowers': 1 }, shrub: { 'plant.shrub': 2, 'plant.hedgerow-blackberry': 1 } },
    // no conifer forests on the plain: the archetype's cedars (far, behind the temple, the framing pair) give way to
    // the plain's own trees and a walnut-like broadleaf framing the right
    // (the orchards, trees and shrubs round the knoll are the scene's own, sparse, so the monastery and its knoll show)
    drop: { scatter: [0, 1, 2, 3, 4], place: ['tree.cedar'] },
    place: [{ obj: 'tree.green-oak', x: 1650, y: 935, s: 1.15, layer: 'front', seed: 21, flip: true, variant: 0 }],
    scatter: [
      // the far edge of the plain: rows of orchard and shelter trees, low in the haze
      { obj: { 'tree.far-broad': 2, 'tree.distant': 1 }, layer: 'far', seed: 41, area: { rect: [-150, 558, 1750, 600] }, n: 34, minGap: 34, s: [0.12, 0.2], flip: 0.5, variant: [0, 1], tint: { col: '#8a8a7a', k: [0.08, 0.16] }, anim: false, shadow: false },
      // a village on the plain to the right of the knoll
      { obj: 'building.house-jp', layer: 'far', seed: 42, area: { rect: [980, 610, 1750, 660] }, n: 12, minGap: 40, s: [0.18, 0.32], sByY: [[610, 0.85], [660, 1.15]], flip: 0.5, variant: [0, 3], tint: { col: '#b0a088', k: [0.16, 0.16] }, anim: false, shadow: false },
      // orchards on the plain beside the knoll, a few near trees and shrubs
      { obj: 'tree.cherry', layer: 'mid', seed: 6, area: { rect: [900, 700, 1740, 740] }, n: 8, minGap: 80, s: [0.34, 0.55], flip: 0.5, variant: [0, 1], tint: { col: '#8a7a50', k: [0.08, 0.08] }, mask: { avoid: [{ rect: [700, 690, 920, 800] }] }, anim: false },
      { obj: 'tree.cherry', layer: 'near', seed: 7, area: { rect: [-140, 776, 1740, 822] }, n: 4, minGap: 320, s: [0.75, 1], flip: 0.5, variant: [0, 1], mask: { avoid: [{ rect: [760, 740, 980, 830] }] }, anim: false },
      { obj: 'plant.shrub', layer: 'near', seed: 8, area: { rect: [-150, 768, 1750, 846] }, n: 12, minGap: 90, s: [0.45, 0.85], flip: 0.5, variant: [0, 1], tint: { col: '#7a7a48', k: [0, 0.08] }, mask: { avoid: [{ rect: [780, 756, 900, 816] }] }, anim: false },
      // stones and boulders in the grass of the plain
      { obj: { 'rock.stones': 2, 'rock.boulder': 1 }, layer: 'near', seed: 44, area: { rect: [-150, 790, 1750, 880] }, n: 14, minGap: 60, s: [0.3, 0.6], flip: 0.5, variant: [0, 1], tint: { col: '#9a8a6a', k: [0.08, 0.16] }, mask: { noise: { scale: 140, cut: 0.3 } }, anim: false },
    ],
  };
  // a small flock grazing on the slope below the walls (placed by hand: a loose group, not a row)
  [[1028, 776, 0.3, 0], [1061, 795, 0.36, 1], [1139, 783, 0.27, 1], [1160, 805, 0.4, 0], [1262, 790, 0.32, 1], [1380, 812, 0.38, 0]]
    .forEach(([x, y, s, variant], i) => patch.place.push({ obj: 'animal.sheep', x, y, s, variant, flip: i % 3 === 1, layer: 'near', seed: 60 + i }));
  // the plain's haze is thinner than the archetype's default: Ararat keeps its colour across the 30 km
  patch.layers = SCENE_LAYERS_DEFAULT.map(l => Object.assign({}, l, l.id === 'horizon' ? { haze: 0.5 } : {}));
  animRegionSceneUpgrade('asia', 'country:AM', {
    state: 'live',
    archetype: 'temple-mountain',
    landmarks: ['landmark.ararat', 'landmark.khor-virap'],
    scene: () => sceneFromArchetype('temple-mountain', params, patch),
  });
})();
