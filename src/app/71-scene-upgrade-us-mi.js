/* ============================================================
   UPGRADE (GOLD, held at draft) of us-midwest/mi-mackinac-bridge (docs/dev/SCENE_ENGINE.md section 16)
   Written by hand after `node tools/anim-pack.mjs scene upgrade us-midwest/mi-mackinac-bridge --dry-run`.
   HELD AT DRAFT (SQ-32): its hand-drawn art is a gold-standard exemplar in tools/anim-reference.json,
   which tests/anim-quality.test.mjs requires to be judged as a hand-drawn scene; flip to live once
   that is resolved. When live, the app shows this composed scene in place of the hand-drawn art (kept
   as the item's legacySvg). The item keeps its identity: the id, key, place
   fields, label, site, tags and when come from the region entry
   (tests/scene-upgrades-live.test.mjs). After any change, re-check:
     node tools/anim-pack.mjs scene sheet us-midwest/mi-mackinac-bridge --compare --upgrades --times
     node tools/anim-pack.mjs scene lint us-midwest/mi-mackinac-bridge --upgrades --perf   (GOLD)
   Care: no signs or text, at most 8 tiny anonymous people, no crowds, no flags or emblems.
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // The Straits of Mackinac from the shore west of the bridge, looking east at sunrise: the Mackinac Bridge striding
  // across the straits on its two ivory towers, the low wooded shores and the islands beyond, ferries and fishing
  // boats on the water in front of it, gulls, a cedar and a paper birch framing the shoreline path.
  const params = { id: 'mi', lat: 45.79, lon: -84.77, heading: 80, at: 'dawn', climate: 'temperate',
    kits: ['temperate', 'alpine', 'people', 'boats', 'birds', 'water'],
    landmarks: ['landmark.mackinac-bridge@800@378@front@60'], water: 'bay', horizon: 480,
    palette: { base: { water: ['#9ab8cc', '#4a7a98', '#1e4662'], quay: ['#40564a', '#2e4036'] } } };
  // the straits' boats, all in front of the bridge's waterline (566), scaled by depth
  const boat = (obj, y, back, speed, seed, offset, v) => ({ obj, layer: 'mid', path: back ? [[1820, y], [-220, y]] : [[-220, y], [1820, y]], speed, loop: 'loop', s: 1, sByY: [[566, 0.42], [732, 1.05]], seed, offset, flip: back, variant: v });
  const patch = {
    // the scene's own picks and mixes (8.6), so a new library object never moves them: pines and birches on the far
    // shores, meadow grass and wildflowers by the path, the path's lamps, gulls
    picks: { lamp: ['street.lamp'] },
    mix: { tree: { 'tree.far-pine': 2, 'tree.far-birch': 1 }, ground: { 'plant.grass': 3, 'plant.wildflowers': 1 }, shrub: { 'plant.shrub': 1 },
      boat: { 'boat.ferry': 1 }, bird: { 'bird.gull': 1, 'bird.herring-gull-flight': 1 } },
    // the archetype's one boat (behind the bridge's waterline) and its two frame trees are replaced by the scene's own
    // the far quay's tree row becomes a loose wooded shore (pines and birches in clumps)
    drop: { place: [1, 2], actors: [0], scatter: [0] },
    scatter: [
      { obj: { 'tree.far-pine': 2, 'tree.far-birch': 1 }, layer: 'mid', seed: 15, area: { rect: [-140, 499, 1740, 505] }, n: 44, minGap: 18, s: [0.12, 0.24], flip: 0.5, variant: [0, 1], tint: { col: '#6a8a9a', k: [0, 0.16] }, mask: { noise: { scale: 170, cut: 0.35 } }, anim: false, reflect: true },
    ],
    // the far shores: low wooded hills on the horizon (the north shore and the islands)
    ground: [
      { layer: 'horizon', d: 'M-160 486Q120 452 380 462T900 466Q1080 448 1240 458T1760 462V494H-160Z', fill: { lin: [[0, '@hills.0'], [1, '@hills.1']], x1: 0, y1: 448, x2: 0, y2: 494 } },
      // the near shore line over the archetype's straight quay: low and wooded, with an uneven top
      { layer: 'mid', d: 'M-160 491Q140 478 420 485T980 482T1760 487V508H-160Z', fill: { lin: [[0, '@quay.0'], [1, '@quay.1']], x1: 0, y1: 480, x2: 0, y2: 508 } },
    ],
    place: [
      { obj: 'tree.cedar', x: 30, y: 910, s: 1.7, layer: 'front', seed: 21, variant: 0 },
      { obj: 'tree.green-birch', x: 1600, y: 912, s: 1.2, layer: 'front', seed: 22, flip: true, variant: 1 },
    ],
    actors: [boat('boat.ferry', 604, true, 9, 41, 0.2, 0), boat('boat.fishing-boat', 640, false, 7, 42, 0.62, 1), boat('boat.dinghy', 680, true, 6, 43, 0.4, 0), boat('boat.ferry', 714, false, 10, 44, 0.86, 1)],
  };
  animRegionSceneUpgrade('us', 'state:MI', {
    state: 'draft',
    archetype: 'skyline-water',
    landmarks: ['landmark.mackinac-bridge'],
    scene: () => sceneFromArchetype('skyline-water', params, patch),
  });
})();
