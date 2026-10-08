/* ============================================================
   UPGRADE (draft) of asia-east/jp-signature (docs/dev/SCENE_ENGINE.md section 16)
   Scaffolded by `node tools/anim-pack.mjs scene upgrade asia-east/jp-signature`.
   The app keeps showing the hand-drawn art while state is 'draft'; the
   tool shows this scene with --upgrades. Keep the item's identity: the id,
   key, place fields, label, site, tags and when come from the region entry.

   Next:
     node tools/anim-pack.mjs scene sheet asia-east/jp-signature --compare --upgrades --times
     node tools/anim-pack.mjs scene lint asia-east/jp-signature --upgrades --perf
   and set state: 'live' only when the lint prints GOLD and the compare
   sheet has been looked at in light and night. Care: no signs or text, at
   most 8 tiny anonymous people, no crowds, no flags or emblems.
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // Mount Fuji at dawn from the hillside of the Chureito Pagoda above Fujiyoshida, looking south-south-west:
  // the cone over its forested foothills, the town in the valley, the five-storied pagoda on its terrace with
  // the stair climbing to it, cherries and maples round it (blossom in spring, red in autumn, snow in winter).
  const params = { id: 'jp', lat: 35.5014, lon: 138.8017, heading: 205, at: 'dawn', climate: 'temperate',
    kits: ['east-asian', 'people', 'birds'],
    landmarks: ['landmark.mount-fuji@620@380', 'landmark.chureito-pagoda@1130@280'], water: 'none', horizon: 560 };
  // the scene's own picks (8.6), so a new library object never moves them: bamboo and a Japanese maple in the near corners,
  // stone lanterns first on the terrace; the town's houses before its flats, cherries and maples round the pagoda
  const patch = {
    picks: { corner: ['plant.bamboo', 'tree.maple-japanese'], lantern: ['structure.lantern-stone', 'street.lantern-string', 'structure.lantern-stone-garden'] },
    mix: { 'building-far': { 'building.house-jp': 1, 'building.apartment-jp': 1 },
      tree: { 'plant.bamboo': 1, 'tree.cherry-blossom': 1, 'tree.maple-japanese': 1, 'tree.maple-momiji': 1, 'tree.cherry': 1 } },
  };
  animRegionSceneUpgrade('asia', 'country:JP', {
    state: 'draft',
    archetype: 'temple-mountain',
    landmarks: ['landmark.mount-fuji', 'landmark.chureito-pagoda'],
    scene: () => sceneFromArchetype('temple-mountain', params, patch),
  });
})();
