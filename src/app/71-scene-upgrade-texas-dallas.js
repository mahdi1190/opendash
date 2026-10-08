/* ============================================================
   UPGRADE (draft) of texas/dallas-skyline (docs/dev/SCENE_ENGINE.md section 16)
   Written by hand: Texas is not a region, so `scene upgrade` does not scaffold it (16.2, last
   bullet). The upgrade registers under the pack id ('texas') and the Texas pack applies it
   (72-anim-pack-texas.js, animSceneUpgradeFinish). While state is 'draft' the app keeps the
   hand-drawn art; the tools show this scene with --upgrades. The item keeps its identity: the
   id, label, site, tags, place fields and when come from the Texas scene entry.
   After any change, re-check:
     node tools/anim-pack.mjs scene sheet texas/dallas-skyline --compare --upgrades --times
     node tools/anim-pack.mjs scene lint texas/dallas-skyline --upgrades --perf   (GOLD)
   Care: no signs or text, at most 8 tiny anonymous people, no crowds, no flags or emblems.
   Texas's own kits (arid, adobe) have no library objects: the scene is composed from the
   temperate, urban, towers and always-on kits (sycamores and oaks do line the Trinity).
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // The Trinity from the West Dallas bank at golden hour, looking east: the white arch of the Margaret Hunt Hill Bridge
  // over the river on the left, traffic on its deck; beyond the levee the downtown skyline, the green-edged Bank of
  // America Plaza and, on the right, Reunion Tower's geodesic ball. Egrets and ducks on the river (no boats: the Trinity
  // is not a working river here), walkers on the riverside walk, oaks and sycamores along both banks.
  const params = { id: 'dallas', lat: 32.784, lon: -96.817, heading: 95, at: 'golden',
    landmarks: 'landmark.bank-of-america-plaza|landmark.reunion-tower|landmark.margaret-hunt-hill-bridge', water: 'river', horizon: 520,
    palette: { base: { water: ['#b4b89c', '#748064', '#3e4a38'], quay: ['#7c8a5a', '#5e6c44'] }, winter: { quay: ['#a89c74', '#8a7e5a'], bed: ['#9a8c62', '#7a6c48'], pave: ['#c8c2b6', '#aea89c', '#928c80'] } } };
  // traffic on the bridge's deck, in the near layer so the walk's railing never hides it
  const deck = 664, car = (i, back, v) => ({ obj: 'vehicle.car', layer: 'near', path: back ? [[1760, deck - 2], [-160, deck - 2]] : [[-160, deck], [1760, deck]], speed: 26 + i * 4, loop: 'loop', s: 0.28, seed: 60 + i, offset: (0.17 + i * 0.29) % 1, flip: back, variant: v });
  // a duck paddling along the river at y, scaled by its depth (a duck is about a third of a walker's height: 0.16 at the far bank, 0.42 at the walk)
  const duck = (obj, y, x0, x1, speed, seed, offset) => ({ obj, layer: 'mid', path: [[x0, y], [x1, y]], speed, loop: 'pingpong', s: 1, sByY: [[546, 0.16], [748, 0.42]], seed, offset });
  const patch = {
    // the scene's own picks and mixes (8.6), so a new library object never moves them
    picks: { lamp: ['street.lamppost'], frame: ['tree.pond-oak'] },
    mix: { tree: { 'tree.pond-oak': 2, 'tree.plane': 1 }, ground: { 'plant.grass': 1, 'plant.wildflowers': 1 }, shrub: { 'plant.shrub': 1 } },
    // the archetype's boats, far row, quay trees and beds are replaced by the scene's own; its second frame tree (x 1690)
    // stands outside the 16:9 view. The three landmarks are placed again: the towers without the archetype's ground
    // shadow (it would fall on the river), and before the bridge so its arch and cables draw over them
    drop: { scatter: [1, 2, 5, 6, 7], place: [4, 'landmark.bank-of-america-plaza', 'landmark.reunion-tower', 'landmark.margaret-hunt-hill-bridge'], actors: [0, 1, 2, 3, 4] },
    place: [{ obj: 'landmark.bank-of-america-plaza', x: 860, y: 542, s: 1.67, layer: 'mid', seed: 11, reflect: true, shadow: false },
      { obj: 'landmark.reunion-tower', x: 1190, y: 542, s: 2.33, layer: 'mid', seed: 12, reflect: true, shadow: false },
      { obj: 'landmark.margaret-hunt-hill-bridge', x: 430, y: 696, s: 1.75, layer: 'mid', seed: 13, reflect: true, shadow: false },
      // oaks and sycamores on the West Dallas bank, at the edges of the view (they cast the scene's shadows)
      { obj: 'tree.pond-oak', x: 130, y: 846, s: 0.5, layer: 'fore', seed: 23, variant: 2 }, { obj: 'tree.plane', x: 55, y: 836, s: 0.5, layer: 'fore', seed: 24, flip: true, variant: 1 },
      { obj: 'tree.plane', x: 1548, y: 840, s: 0.5, layer: 'fore', seed: 25, variant: 1 }, { obj: 'tree.pond-oak', x: 1478, y: 850, s: 0.5, layer: 'fore', seed: 26, flip: true, variant: 1 },
      { obj: 'tree.plane', x: 1405, y: 856, s: 0.42, layer: 'fore', seed: 27, variant: 2 },
      { obj: 'tree.pond-oak', x: 1600, y: 914, s: 1.36, layer: 'front', seed: 22, flip: true, variant: 1 }],
    scatter: [
      // downtown beyond the levee: glass and stone towers, thinning out to the low buildings of the Design District on the left
      { obj: { 'building.tower-glass': 2, 'building.tower-stone': 1 }, layer: 'far', seed: 4, area: { rect: [380, 524, 1700, 529] }, n: 22, minGap: 34, s: [0.3, 0.6], maxH: 280, flip: 0.5, variant: [0, 2],
        tint: { col: '#8a9aac', k: [0.08, 0.08] }, mask: { noise: { scale: 140, cut: 0.28 }, avoid: [{ rect: [800, 60, 920, 560] }, { rect: [1150, 140, 1230, 560] }] }, shadow: false, anim: false },
      { obj: { 'building.tower': 1 }, layer: 'far', seed: 5, area: { rect: [-150, 526, 420, 530] }, n: 7, minGap: 60, s: [0.2, 0.32], maxH: 120, flip: 0.5, variant: [0, 2],
        tint: { col: '#8a9aac', k: [0.08, 0.08] }, shadow: false, anim: false },
      // oaks and sycamores along the levee, behind the bridge (in the far layer, so they never draw over it)
      { obj: { 'tree.pond-oak': 2, 'tree.plane': 1 }, layer: 'far', seed: 15, area: { rect: [-140, 540, 1740, 546] }, n: 26, minGap: 42, s: [0.11, 0.2], flip: 0.5, variant: [0, 1],
        tint: { col: '#6a8a9a', k: [0.08, 0.08] }, mask: { noise: { scale: 180, cut: 0.2 } }, anim: false, reflect: true },
      // the planting along the riverside walk
      { obj: { 'plant.grass': 1, 'plant.wildflowers': 1 }, layer: 'fore', seed: 7, area: { rect: [-150, 796, 1750, 856] }, n: 170, minGap: 15, s: [0.55, 0.9], flip: 0.5, variant: [0, 0], tint: { col: '#6a7a40', k: [0, 0.08] }, anim: 'strip' },
      { obj: { 'plant.grass': 3, 'plant.wildflowers': 1 }, layer: 'fore', seed: 8, area: { rect: [-150, 856, 1750, 905] }, n: 125, minGap: 24, s: [0.9, 1.3], flip: 0.5, variant: [1, 1], tint: { col: '#6a7a40', k: [0.08, 0.08] }, anim: 'strip' },
      { obj: 'plant.shrub', layer: 'fore', seed: 19, area: { rect: [-150, 800, 1750, 840] }, n: 7, minGap: 120, s: [0.5, 0.9], flip: 0.5, variant: [0, 1], mask: { noise: { scale: 260, cut: 0.35 } }, anim: false },
    ],
    actors: [car(0, false, 0), car(1, true, 1), car(2, false, 3), car(3, true, 2),
      duck('bird.mallard', 712, 200, 1200, 3, 70, 0.2), duck('bird.mallard', 718, 260, 1300, 3.4, 71, 0.6), duck('bird.coot', 604, 700, 1500, 2.6, 72, 0.4)],
    flocks: [{ obj: 'bird.egret-flight', n: 4, area: [200, 300, 1400, 470], speed: 16, s: 0.5, seed: 73, layer: 'mid' }],
  };
  animRegionSceneUpgrade('texas', 'place:dallas', {
    state: 'draft',
    archetype: 'skyline-water',
    landmarks: ['landmark.bank-of-america-plaza', 'landmark.reunion-tower', 'landmark.margaret-hunt-hill-bridge'],
    scene: () => sceneFromArchetype('skyline-water', params, patch),
  });
})();
