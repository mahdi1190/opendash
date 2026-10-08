/* ============================================================
   UPGRADE (live) of us-southeast/nashville-music-city-skyline (docs/dev/SCENE_ENGINE.md section 16)
   Scaffolded by `node tools/anim-pack.mjs scene upgrade us-southeast/nashville-music-city-skyline --box 510,180,630,582 --slug nashville-twin-spires`.
   LIVE: the app shows this composed scene in place of the hand-drawn art (kept
   as the item's legacySvg). The item keeps its identity: the id, key, place
   fields, label, site, tags and when come from the region entry
   (tests/scene-upgrades-live.test.mjs).
   After any change, re-check:
     node tools/anim-pack.mjs scene sheet us-southeast/nashville-music-city-skyline --compare --upgrades --times
     node tools/anim-pack.mjs scene lint us-southeast/nashville-music-city-skyline --upgrades --perf   (GOLD)
   Care: no signs or text, at most 8 tiny anonymous people, no crowds, no flags or emblems.
   The region's default kit (colonial) has no library objects: the scene is composed from the
   temperate, urban, towers and always-on kits.
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // The Cumberland from the greenway on the east bank, south of the pedestrian bridge, looking north-west: the old
  // Shelby Street Bridge across the river (its three steel trusses and the concrete arches over the east bank on the
  // right), and behind it downtown on the west bank with the twin-spired tower rising over the skyline. Walkers on the
  // bridge, a towboat and riverboats on the river, oaks and sycamores along the bank.
  const params = { id: 'nashville', lat: 36.157, lon: -86.769, heading: 320, at: 'sunset', climate: 'temperate',
    kits: ['towers', 'urban', 'temperate', 'people', 'boats', 'birds', 'water'],
    landmarks: ['landmark.nashville-twin-spires@560@420', 'landmark.shelby-street-bridge@700@187@front@144'],
    water: 'river', horizon: 520, palette: { base: { water: ['#a8b8a4', '#5e7866', '#2e4236'] } } };
  // a boat on the river at y, scaled by its depth as the archetype scales them (0.38 at the far bank, 1.05 at the walk);
  // boats beyond the bridge go in the far layer, which draws behind it
  const boat = (obj, y, layer, x0, x1, speed, seed, offset, v, loop) => ({ obj, layer, path: [[x0, y], [x1, y]], speed, loop: loop || 'pingpong', s: 1,
    sByY: [[546, 0.38], [748, 1.05]], seed, offset, variant: v });
  // two walkers on the bridge's walkway (sized by the depth of the bridge's waterline, not of its deck)
  const deck = 614, view = { horizon: 520, lift: 1 };
  const onDeck = (id, back, speed, seed, offset) => ({ obj: id, layer: 'mid', path: back ? [[1540, deck], [80, deck]] : [[80, deck], [1540, deck]], speed, loop: 'pingpong',
    s: typeof scenePersonScale === 'function' && typeof sceneObj === 'function' && sceneObj(id) ? scenePersonScale(sceneObj(id).size[1], 690, view) : 0.2, seed, offset, flip: back });
  const patch = {
    // the scene's own picks and mixes (8.6), so a new library object never moves them
    picks: { lamp: ['street.lamppost'], frame: ['tree.pond-oak'] },
    mix: { tree: { 'tree.pond-oak': 2, 'tree.plane': 1 }, ground: { 'plant.grass': 1, 'plant.wildflowers': 1 }, shrub: { 'plant.shrub': 1 } },
    // the archetype's boats are replaced by lanes either side of the bridge; its far row, quay trees and beds by the scene's
    // own; its second frame tree (x 1690) stands outside the 16:9 view. Both landmarks are placed again: the tower without
    // the archetype's ground shadow (it would fall on the river), and the tower before the bridge so the trusses draw over it
    drop: { scatter: [1, 2, 5, 6, 7], place: [3, 'landmark.nashville-twin-spires', 'landmark.shelby-street-bridge'], actors: [0, 1, 2, 3, 4] },
    place: [{ obj: 'landmark.nashville-twin-spires', x: 560, y: 542, s: 0.89, layer: 'mid', seed: 11, reflect: true, shadow: false },
      { obj: 'landmark.shelby-street-bridge', x: 700, y: 690, s: 1.7, layer: 'mid', seed: 12, reflect: true, shadow: false },
      // oaks and sycamores on the east bank walk, at the edges of the view (they cast the scene's shadows)
      { obj: 'tree.pond-oak', x: 140, y: 848, s: 0.5, layer: 'fore', seed: 23, variant: 2 }, { obj: 'tree.plane', x: 60, y: 838, s: 0.5, layer: 'fore', seed: 24, flip: true, variant: 1 },
      { obj: 'tree.plane', x: 1545, y: 840, s: 0.5, layer: 'fore', seed: 25, variant: 1 }, { obj: 'tree.pond-oak', x: 1475, y: 850, s: 0.5, layer: 'fore', seed: 26, flip: true, variant: 1 },
      { obj: 'tree.pond-oak', x: 1600, y: 914, s: 1.36, layer: 'front', seed: 22, flip: true, variant: 1 }],
    scatter: [
      // downtown on the west bank: glass and stone towers, with the low riverfront and the east bank's trees to the right
      { obj: { 'building.tower-glass': 1, 'building.tower-stone': 1 }, layer: 'far', seed: 5, area: { rect: [-150, 524, 1150, 529] }, n: 18, minGap: 34, s: [0.3, 0.6], maxH: 260, flip: 0.5, variant: [0, 2],
        tint: { col: '#8a9aac', k: [0.08, 0.08] }, mask: { noise: { scale: 150, cut: 0.28 }, avoid: [{ rect: [500, 300, 620, 560] }] }, shadow: false, anim: false },
      // oaks and sycamores along the far bank, behind the bridge (in the far layer, so they never draw over it)
      { obj: { 'tree.pond-oak': 2, 'tree.plane': 1 }, layer: 'far', seed: 16, area: { rect: [-140, 540, 1740, 546] }, n: 32, minGap: 38, s: [0.11, 0.2], flip: 0.5, variant: [0, 1],
        tint: { col: '#6a8a9a', k: [0.08, 0.08] }, mask: { noise: { scale: 180, cut: 0.2 }, avoid: [{ rect: [520, 470, 600, 548] }] }, anim: false, reflect: true },
      // the planting along the greenway
      { obj: { 'plant.grass': 1, 'plant.wildflowers': 1 }, layer: 'fore', seed: 17, area: { rect: [-150, 796, 1750, 856] }, n: 170, minGap: 15, s: [0.55, 0.9], flip: 0.5, variant: [0, 0], tint: { col: '#6a7a40', k: [0, 0.08] }, anim: 'strip' },
      { obj: { 'plant.grass': 3, 'plant.wildflowers': 1 }, layer: 'fore', seed: 18, area: { rect: [-150, 856, 1750, 905] }, n: 125, minGap: 24, s: [0.9, 1.3], flip: 0.5, variant: [1, 1], tint: { col: '#6a7a40', k: [0.08, 0.08] }, anim: 'strip' },
      { obj: 'plant.shrub', layer: 'fore', seed: 33, area: { rect: [-150, 800, 1750, 840] }, n: 7, minGap: 110, s: [0.5, 0.9], flip: 0.5, variant: [0, 1], mask: { noise: { scale: 260, cut: 0.35 } }, anim: false },
    ],
    actors: [boat('boat.tug', 580, 'far', 200, 1500, 5, 40, 0.6, 0), boat('boat.ferry', 622, 'far', 100, 1300, 6, 41, 0.2, 1),
      boat('boat.water-taxi', 722, 'mid', 300, 1500, 7, 42, 0.35, 0),
      onDeck('person.walker', false, 12, 44, 0.2), onDeck('person.walker', true, 10, 45, 0.7)],
  };
  animRegionSceneUpgrade('us', 'place:nashville', {
    state: 'live',
    archetype: 'skyline-water',
    landmarks: ['landmark.nashville-twin-spires', 'landmark.shelby-street-bridge'],
    scene: () => sceneFromArchetype('skyline-water', params, patch),
  });
})();
