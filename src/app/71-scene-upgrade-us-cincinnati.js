/* ============================================================
   UPGRADE (live) of us-midwest/cincinnati-flying-pig (docs/dev/SCENE_ENGINE.md section 16)
   Scaffolded by `node tools/anim-pack.mjs scene upgrade us-midwest/cincinnati-flying-pig --box 380,370,1220,700 --slug roebling-bridge`.
   LIVE: the app shows this composed scene in place of the hand-drawn art (kept
   as the item's legacySvg). The item keeps its identity: the id, key, place
   fields, label, site, tags and when come from the region entry
   (tests/scene-upgrades-live.test.mjs).
   After any change, re-check:
     node tools/anim-pack.mjs scene sheet us-midwest/cincinnati-flying-pig --compare --upgrades --times
     node tools/anim-pack.mjs scene lint us-midwest/cincinnati-flying-pig --upgrades --perf   (GOLD)
   Care: no signs or text, at most 8 tiny anonymous people, no crowds, no flags or emblems.
   The old art's flying pig (a mascot) is left out.
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // The Ohio from the Covington riverwalk on the Kentucky bank, looking north-east across the river: the Roebling
  // Suspension Bridge broadside, its sandstone towers and blue cables, traffic on its deck; behind it the downtown
  // skyline under the hills of the basin, the Great American Tower with its tiara seen through the main span. A
  // towboat and riverboats on the river, sycamores along the walk.
  const params = { id: 'cincinnati', lat: 39.088, lon: -84.512, heading: 25, at: 'sunset', climate: 'temperate',
    kits: ['towers', 'urban', 'temperate', 'people', 'boats', 'birds', 'water'],
    landmarks: ['landmark.great-american-tower@600@290', 'landmark.roebling-bridge@800@375@front@150'],
    water: 'river', horizon: 520, palette: { base: { water: ['#a4bcb6', '#56786e', '#2a423c'] } } };
  // a boat on the river at y, scaled by its depth as the archetype scales them (0.38 at the far bank, 1.05 at the walk);
  // boats beyond the bridge go in the far layer, which draws behind it
  const boat = (obj, y, layer, x0, x1, speed, seed, offset, v, loop) => ({ obj, layer, path: [[x0, y], [x1, y]], speed, loop: loop || 'pingpong', s: 1,
    sByY: [[546, 0.38], [748, 1.05]], seed, offset, variant: v });
  // traffic on the bridge's roadway, in the near layer so the railing never hides it
  const deck = 575, car = (i, back, v) => ({ obj: 'vehicle.car', layer: 'near', path: back ? [[1760, deck - 2], [-160, deck - 2]] : [[-160, deck], [1760, deck]], speed: 28 + i * 4, loop: 'loop', s: 0.28, seed: 60 + i, offset: (0.17 + i * 0.29) % 1, flip: back, variant: v });
  const patch = {
    // the scene's own picks and mixes (8.6), so a new library object never moves them
    picks: { lamp: ['street.lamppost'], frame: ['tree.plane'] },
    mix: { tree: { 'tree.plane': 2, 'tree.pond-oak': 1 }, ground: { 'plant.grass': 1, 'plant.wildflowers': 1 }, shrub: { 'plant.shrub': 1 } },
    // the archetype's boats are replaced by lanes either side of the bridge; its far row, quay trees and beds by the scene's
    // own; its second frame tree (x 1690) stands outside the 16:9 view. Both landmarks are placed again: the tower without
    // the archetype's ground shadow (it would fall on the river), and the tower before the bridge so the bridge's cables
    // draw over it
    drop: { scatter: [1, 2, 5, 6, 7], place: [3, 'landmark.great-american-tower', 'landmark.roebling-bridge'], actors: [0, 1, 2, 3, 4] },
    ground: [{ layer: 'horizon', d: 'M-160 514Q160 470 420 486T900 474Q1200 478 1400 496T1760 500V532H-160Z', fill: { lin: [[0, '#8a9c94'], [1, '#a4b2ac']], x1: 0, y1: 470, x2: 0, y2: 532 } }],
    place: [{ obj: 'landmark.great-american-tower', x: 600, y: 542, s: 0.57, layer: 'mid', seed: 11, reflect: true, shadow: false },
      { obj: 'landmark.roebling-bridge', x: 800, y: 696, s: 1.5, layer: 'mid', seed: 12, reflect: true, shadow: false },
      // sycamores and an oak on the Covington walk, at the edges of the view (they cast the scene's shadows)
      { obj: 'tree.plane', x: 130, y: 846, s: 0.55, layer: 'fore', seed: 23, variant: 2 }, { obj: 'tree.pond-oak', x: 60, y: 836, s: 0.42, layer: 'fore', seed: 24, flip: true, variant: 1 },
      { obj: 'tree.pond-oak', x: 1545, y: 838, s: 0.42, layer: 'fore', seed: 25, variant: 2 }, { obj: 'tree.plane', x: 1480, y: 850, s: 0.58, layer: 'fore', seed: 26, flip: true, variant: 1 },
      { obj: 'tree.plane', x: 1600, y: 914, s: 1.05, layer: 'front', seed: 22, flip: true, variant: 1 }],
    scatter: [
      // downtown behind the river: glass and stone towers, thinning out towards Covington on the right
      { obj: { 'building.tower-glass': 1, 'building.tower-stone': 1 }, layer: 'far', seed: 4, area: { rect: [-150, 524, 1450, 529] }, n: 22, minGap: 34, s: [0.3, 0.6], maxH: 250, flip: 0.5, variant: [0, 2],
        tint: { col: '#8a9aac', k: [0.08, 0.08] }, mask: { noise: { scale: 140, cut: 0.3 }, avoid: [{ rect: [540, 300, 660, 560] }] }, shadow: false, anim: false },
      // sycamores and oaks along the far bank, behind the bridge (in the far layer, so they never draw over it)
      { obj: { 'tree.plane': 2, 'tree.pond-oak': 1 }, layer: 'far', seed: 15, area: { rect: [-140, 540, 1740, 546] }, n: 24, minGap: 44, s: [0.11, 0.2], flip: 0.5, variant: [0, 1],
        tint: { col: '#6a8a9a', k: [0.08, 0.08] }, mask: { noise: { scale: 180, cut: 0.2 }, avoid: [{ rect: [560, 470, 640, 548] }] }, anim: false, reflect: true },
      // the planting along the Covington walk
      { obj: { 'plant.grass': 1, 'plant.wildflowers': 1 }, layer: 'fore', seed: 7, area: { rect: [-150, 796, 1750, 856] }, n: 170, minGap: 15, s: [0.55, 0.9], flip: 0.5, variant: [0, 0], tint: { col: '#6a7a40', k: [0, 0.08] }, anim: 'strip' },
      { obj: { 'plant.grass': 3, 'plant.wildflowers': 1 }, layer: 'fore', seed: 8, area: { rect: [-150, 856, 1750, 905] }, n: 125, minGap: 24, s: [0.9, 1.3], flip: 0.5, variant: [1, 1], tint: { col: '#6a7a40', k: [0.08, 0.08] }, anim: 'strip' },
      { obj: 'plant.shrub', layer: 'fore', seed: 19, area: { rect: [-150, 800, 1750, 840] }, n: 7, minGap: 120, s: [0.5, 0.9], flip: 0.5, variant: [0, 1], mask: { noise: { scale: 260, cut: 0.35 } }, anim: false },
    ],
    actors: [boat('boat.tug', 584, 'far', 120, 1480, 5, 30, 0.3, 1), boat('boat.ferry', 618, 'far', 300, 1560, 6, 31, 0.7, 0),
      boat('boat.water-taxi', 724, 'mid', 80, 1300, 7, 32, 0.55, 1),
      car(0, false, 0), car(1, true, 1), car(2, false, 3), car(3, true, 2)],
  };
  animRegionSceneUpgrade('us', 'place:cincinnati', {
    state: 'live',
    archetype: 'skyline-water',
    landmarks: ['landmark.great-american-tower', 'landmark.roebling-bridge'],
    scene: () => sceneFromArchetype('skyline-water', params, patch),
  });
})();
