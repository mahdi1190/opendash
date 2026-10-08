/* ============================================================
   UPGRADE (live) of asia-west/baku-skyline (docs/dev/SCENE_ENGINE.md section 16)
   Scaffolded by `node tools/anim-pack.mjs scene upgrade asia-west/baku-skyline`.
   LIVE: the app shows this composed scene in place of the hand-drawn art (kept
   as the item's legacySvg). The item keeps its identity: the id, key, place
   fields, label, site, tags and when come from the region entry
   (tests/scene-upgrades-live.test.mjs). After any change, re-check:
     node tools/anim-pack.mjs scene sheet asia-west/baku-skyline --compare --upgrades --times
     node tools/anim-pack.mjs scene lint asia-west/baku-skyline --upgrades --perf   (GOLD)
   Care: no signs or text, at most 8 tiny anonymous people, no crowds, no flags or emblems.
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // Baku Bay from the water off the seafront boulevard, looking west-north-west at dusk: the three Flame Towers on
  // their hill above the city on the left, the Maiden Tower and the old city walls by the shore on the right (their
  // real bearings from the bay); ferries, yachts and tugs on the Caspian, plane trees and pines along the boulevard.
  const params = { id: 'baku', lat: 40.36, lon: 49.85, heading: 290, at: 'dusk', climate: 'temperate',
    kits: ['towers', 'urban', 'temperate', 'people', 'boats', 'birds', 'water'],
    landmarks: ['landmark.flame-towers@700@480', 'landmark.maiden-tower@1230@210'],
    water: 'bay', horizon: 540, palette: { base: { water: ['#8e9cb8', '#4c5f88', '#24305a'] } } };
  const patch = {
    // the scene's own picks and mixes (8.6), so a new library object never moves them
    picks: { frame: ['tree.plane'], lamp: ['street.lamppost'] },
    mix: { tree: { 'tree.plane': 2, 'tree.pond-pine': 1 }, ground: { 'plant.grass': 3, 'plant.hedge': 1 }, shrub: { 'plant.shrub': 1 },
      boat: { 'boat.ferry': 1, 'boat.dinghy': 1, 'boat.tug': 1, 'boat.water-taxi': 1 },
      bird: { 'bird.herring-gull-flight': 1, 'bird.gull': 1 }, walker: { 'person.walker': 2, 'person.jogger': 1 } },
    // the archetype's second frame tree stands outside the 16:9 view: a plane frames the right instead
    // (the archetype's loose shrubs are left out: the beds' grass and clipped hedges carry the cover, and the tile stays light)
    drop: { place: [3], scatter: [1, 7] },
    place: [{ obj: 'tree.plane', x: 1560, y: 910, s: 1, layer: 'front', seed: 22, flip: true, variant: 1 }],
    // the city beyond the bay: stone and plain mid-rise towers, lower than the archetype's glass row, kept clear of the
    // hill (it hides them) and of the Maiden Tower
    scatter: [{ obj: { 'building.tower-stone': 2, 'building.tower': 1 }, layer: 'far', seed: 4, area: { rect: [-150, 544, 1750, 549] }, n: 22, minGap: 40, s: [0.22, 0.55], maxH: 240,
      flip: 0.5, variant: [0, 3], tint: { col: '#8a8aa8', k: [0.08, 0.08] }, mask: { noise: { scale: 140, cut: 0.3 }, avoid: [{ rect: [395, 500, 1005, 570] }, { rect: [1150, 500, 1320, 570] }] },
      shadow: false, anim: false, reflect: true }],
  };
  animRegionSceneUpgrade('asia', 'place:baku', {
    state: 'live',
    archetype: 'skyline-water',
    landmarks: ['landmark.flame-towers', 'landmark.maiden-tower'],
    scene: () => sceneFromArchetype('skyline-water', params, patch),
  });
})();
