/* ============================================================
   UPGRADE (live) of asia-southeast/da-nang-skyline (docs/dev/SCENE_ENGINE.md section 16)
   Scaffolded by `node tools/anim-pack.mjs scene upgrade asia-southeast/da-nang-skyline`.
   LIVE: the app shows this composed scene in place of the hand-drawn art (kept as the item's legacySvg).
   The item keeps its identity: the id, key, place fields, label, site, tags and when
   come from the region entry (tests/scene-upgrades-live.test.mjs). After any change, re-check:
     node tools/anim-pack.mjs scene sheet asia-southeast/da-nang-skyline --compare --upgrades --times
     node tools/anim-pack.mjs scene lint asia-southeast/da-nang-skyline --upgrades --perf   (GOLD)
   Care: no signs or text, at most 8 tiny anonymous people, no crowds, no flags or emblems.
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // The Han River from the riverside south of the Dragon Bridge, looking north at dusk: the bridge's three yellow
  // humps across the river with the head at the east end, the towers of the west bank on the left, the lower east bank
  // under the Son Tra peninsula on the right and the far mountains of the Hai Van pass on the left; river cruisers,
  // sampans and fishing boats in front of the bridge, motorbikes and cars on its deck. Tropical: green all year.
  const params = { id: 'da-nang', lat: 16.055, lon: 108.226, heading: 0, at: 'dusk', climate: 'tropical',
    kits: ['tropical', 'towers', 'urban', 'people', 'vehicles', 'boats', 'birds', 'water'],
    landmarks: ['landmark.dragon-bridge@640@220@front@124'], water: 'river', horizon: 500,
    palette: { base: { water: ['#8aa6ae', '#4e727c', '#26404a'] } } };
  // the river's traffic, in front of the bridge's piers (its waterline is y 650); the deck's motorbikes and cars
  const boat = (obj, y, back, speed, seed, offset, v) => ({ obj, layer: 'mid', path: back ? [[1820, y], [-220, y]] : [[-220, y], [1820, y]], speed, loop: 'loop', s: 1, sByY: [[526, 0.38], [740, 1.05]], seed, offset, flip: back, variant: v });
  const deck = (obj, i, back, s, v) => { const y = back ? 605 : 608; return { obj, layer: 'near', path: back ? [[1720, y], [-120, y]] : [[-120, y], [1720, y]], speed: 22 + (i % 4) * 5, loop: 'loop', s, seed: 60 + i, offset: (0.11 + i * 0.23) % 1, flip: back, variant: v }; };
  const far = (obj, seed, area, n, s, maxH, k, gap) => ({ obj, layer: 'far', seed, area: { rect: area }, n, minGap: gap, s, maxH, flip: 0.5, variant: [0, 5], tint: { col: '#8a92b0', k: [k, k] }, mask: { noise: { scale: 140, cut: 0.28 } }, shadow: false, anim: false, reflect: true });
  const patch = {
    // the scene's own picks and mixes (8.6), so a new library object never moves them: a coconut palm framing the
    // left, rain trees and palms along the far bank, tropical grass, ixora and bougainvillea in the beds, the river's boats
    picks: { frame: ['plant.palm-coconut', 'tree.rain-tree'], lamp: ['street.lamppost'], bench: ['street.bench'] },
    mix: { tree: { 'tree.rain-tree': 1, 'plant.palm-coconut': 2 }, ground: { 'plant.grass-tropical': 3, 'plant.ixora': 1, 'plant.bougainvillea': 1 },
      shrub: { 'plant.bougainvillea-hedge': 1 }, boat: { 'boat.sampan': 1 }, bird: { 'bird.egret-flight': 1, 'bird.kite-brahminy': 1 } },
    // the archetype's far row and quay trees are replaced below, its one boat (actors[0]) by the river's own traffic in
    // front of the bridge; its second frame tree (x 1690) stands outside the 16:9 view
    drop: { scatter: [1, 2], place: ['tree.rain-tree'], actors: [0] },
    // the far mountains: the Hai Van pass on the left, the Son Tra peninsula on the right
    ground: [{ layer: 'horizon', d: 'M-160 502Q40 450 240 464T600 494H880Q1040 470 1180 444T1470 432T1760 468V506H-160Z', fill: { lin: [[0, '@hills.0'], [1, '@hills.1']], x1: 0, y1: 432, x2: 0, y2: 506 } }],
    place: [{ obj: 'tree.rain-tree', x: 1590, y: 912, s: 1.15, layer: 'front', seed: 22, flip: true, variant: 2 }],
    scatter: [
      // the west bank's towers, taller and closer together on the left; the east bank lower and gappier on the right
      far({ 'building.tower-glass': 3, 'building.tower': 1 }, 4, [-150, 504, 760, 509], 16, [0.4, 0.7], 250, 0.12, 34),
      far({ 'building.tower-glass': 1, 'building.tower': 2 }, 6, [760, 504, 1750, 509], 13, [0.22, 0.46], 170, 0.16, 46),
      // the far banks' rain trees and palms in sizes that vary more than the archetype's quay row
      { obj: { 'tree.rain-tree': 1, 'plant.palm-coconut': 2 }, layer: 'mid', seed: 15, area: { rect: [-140, 520, 1740, 526] }, n: 24, minGap: 46, s: [0.13, 0.28], flip: 0.5, variant: [0, 1],
        tint: { col: '#6a7a9a', k: [0.08, 0.08] }, anim: false, reflect: true }],
    actors: [boat('boat.ferry', 668, true, 7, 41, 0.55, 0), boat('boat.sampan', 692, false, 6, 42, 0.3, 1), boat('boat.fishing-boat', 712, true, 8, 43, 0.82, 2), boat('boat.water-taxi', 728, false, 10, 44, 0.08, 1),
      deck('vehicle.scooter', 0, false, 0.11, 0), deck('vehicle.car', 1, true, 0.2, 2), deck('vehicle.scooter', 2, true, 0.11, 1), deck('vehicle.taxi', 3, false, 0.2, 0),
      deck('vehicle.scooter', 4, false, 0.11, 2), deck('vehicle.car', 5, true, 0.2, 3)],
    // egrets low over the river, besides the archetype's two flocks
    flocks: [{ obj: 'bird.egret-flight', n: 3, area: [200, 520, 1400, 580], speed: 16, s: 0.7, seed: 12, layer: 'mid' }],
  };
  animRegionSceneUpgrade('asia', 'place:da-nang', {
    state: 'live',
    archetype: 'skyline-water',
    landmarks: ['landmark.dragon-bridge'],
    scene: () => sceneFromArchetype('skyline-water', params, patch),
  });
})();
