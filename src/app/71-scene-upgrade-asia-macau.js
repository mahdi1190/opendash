/* ============================================================
   UPGRADE (live) of asia-east/macau-skyline (docs/dev/SCENE_ENGINE.md section 16)
   Written by hand: `node tools/anim-pack.mjs scene upgrade asia-east/macau-skyline --dry-run` stops on
   the old art ("sceneShapesFromSvg: colour #00000033"), so the three landmarks were drawn new.
   LIVE: the app shows this composed scene in place of the hand-drawn art (kept as the item's legacySvg).
   The item keeps its identity: the id, key, place fields, label, site, tags and when
   come from the region entry (tests/scene-upgrades-live.test.mjs). After any change, re-check:
     node tools/anim-pack.mjs scene sheet asia-east/macau-skyline --compare --upgrades --times
     node tools/anim-pack.mjs scene lint asia-east/macau-skyline --upgrades --perf   (GOLD)
   Care: no signs or text, at most 8 tiny anonymous people, no crowds, no flags or emblems; the old
   facade is architecture only (no statues, symbols or inscriptions).
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // The Macau peninsula from the water east of the old bridge to Taipa, looking west in the golden hour (the sun low
  // over the city): the long bridge with its hump crossing in front, the observation tower at the water's edge on the
  // left, the towers of the casino era in the middle (plain, no boards or names), and on the right the old town's hill
  // with the old granite facade at the head of its stair among banyan-like trees (drawn closer than it is); ferries,
  // tugs and sampans on the water, cars and taxis over the hump. Macau lies just south of the Tropic: green all year.
  const params = { id: 'macau', lat: 22.19, lon: 113.56, heading: 270, at: 'golden', climate: 'tropical',
    kits: ['tropical', 'towers', 'urban', 'shophouse', 'people', 'vehicles', 'boats', 'birds', 'water'],
    landmarks: ['landmark.macau-taipa-bridge@800@92@front@104'], water: 'bay', horizon: 520,
    palette: { base: { water: ['#8ab4bc', '#4e8496', '#2a5a72'] } } };
  // the bridge's waterline is y 650; its deck rises into the hump round x 1050 (the object's own profile)
  const deckY = x => { const u = Math.min(1, Math.abs(x - 1050) / 300); return Math.round((626 - 58 * Math.pow(Math.cos(u * Math.PI / 2), 2)) * 10) / 10; };
  const road = [-120, 700, 800, 900, 980, 1050, 1120, 1200, 1300, 1400, 1720];
  const car = (obj, i, back, v) => { const d = back ? -2 : 0, pts = road.map(x => [x, deckY(x) + d]); return { obj, layer: 'near', path: back ? pts.reverse() : pts, speed: 24 + (i % 3) * 5, loop: 'loop', s: 0.2, seed: 60 + i, offset: (0.17 + i * 0.29) % 1, flip: back, variant: v }; };
  const boat = (obj, y, back, speed, seed, offset, v) => ({ obj, layer: 'mid', path: back ? [[1820, y], [-220, y]] : [[-220, y], [1820, y]], speed, loop: 'loop', s: 1, sByY: [[546, 0.38], [748, 1.05]], seed, offset, flip: back, variant: v });
  const far = (obj, seed, area, n, s, maxH, col, k, gap) => ({ obj, layer: 'far', seed, area: { rect: area }, n, minGap: gap, s, maxH, flip: 0.5, variant: [0, 2], tint: { col, k: [k, k] },
    mask: { noise: { scale: 140, cut: 0.25 }, avoid: [{ rect: [415, 300, 525, 560] }, { rect: [1120, 200, 1390, 560] }] }, shadow: false, anim: false, reflect: true });
  const patch = {
    // the scene's own picks and mixes (8.6), so a new library object never moves them: a coconut palm framing the left,
    // rain trees (for their shade) and palms along the far shore, tropical grass, ixora and bougainvillea in the beds
    picks: { frame: ['plant.palm-coconut', 'tree.rain-tree'], lamp: ['street.lamppost'], bench: ['street.bench'] },
    mix: { tree: { 'tree.rain-tree': 1, 'plant.palm-coconut': 2 }, ground: { 'plant.grass-tropical': 3, 'plant.ixora': 1, 'plant.bougainvillea': 1 },
      shrub: { 'plant.bougainvillea-hedge': 1 }, boat: { 'boat.ferry': 1 }, bird: { 'bird.egret-flight': 1, 'bird.kite-brahminy': 1 } },
    // the archetype's far row and quay trees are replaced below, its one boat (actors[0]) by the harbour's own traffic in
    // front of the bridge; its second frame tree (x 1690) stands outside the 16:9 view
    drop: { scatter: [1, 2], place: ['tree.rain-tree'], actors: [0] },
    // the old town's hill on the right (the facade at its head)
    ground: [{ layer: 'far', d: 'M960 530Q1060 486 1170 470T1380 466T1760 498V532H960Z', fill: { lin: [[0, '@ground.1'], [1, '@ground.2']], x1: 0, y1: 466, x2: 0, y2: 532 } }],
    place: [
      // the observation tower at the water's edge and the old facade on its hill: no ground shadow (it would lie on the water)
      { obj: 'landmark.macau-tower', x: 470, y: 542, s: 1.38, layer: 'mid', seed: 11, reflect: true, shadow: false },
      { obj: 'landmark.st-pauls-facade', x: 1255, y: 478, s: 1.7, layer: 'mid', seed: 12, shadow: false },
      { obj: 'tree.rain-tree', x: 1590, y: 912, s: 1.15, layer: 'front', seed: 22, flip: true, variant: 2 }],
    scatter: [
      // the towers of the casino era in the middle, tall and close; the rest of the city lower and gappier either side
      far({ 'building.tower-glass': 3, 'building.tower': 1 }, 4, [540, 524, 1010, 529], 9, [0.55, 0.85], 300, '#c8a060', 0.16, 36),
      far({ 'building.tower-glass': 1, 'building.tower': 2 }, 6, [-150, 524, 1750, 529], 14, [0.24, 0.42], 150, '#9a9aac', 0.14, 50),
      // the old town's houses on the hill's slopes, and its trees round and behind the facade
      { obj: 'building.shophouse', layer: 'far', seed: 7, area: { poly: [[980, 530], [1080, 492], [1160, 478], [1360, 474], [1500, 480], [1700, 500], [1700, 530]] }, n: 10, minGap: 44, s: [0.16, 0.26], maxH: 60, flip: 0.5, variant: [0, 1],
        tint: { col: '#a89a8a', k: [0.1, 0.1] }, mask: { avoid: [{ rect: [1120, 300, 1390, 500] }] }, shadow: false, anim: false, reflect: true },
      { obj: { 'tree.rain-tree': 1, 'plant.palm-coconut': 2 }, layer: 'far', seed: 9, area: { poly: [[1000, 520], [1100, 484], [1180, 468], [1340, 464], [1480, 474], [1700, 494], [1700, 520]] }, n: 9, minGap: 40, s: [0.16, 0.3], flip: 0.5, variant: 0,
        tint: { col: '#6a8a6a', k: [0.08, 0.08] }, mask: { avoid: [{ rect: [1150, 200, 1360, 478] }] }, shadow: false, anim: false, reflect: true },
      // the far shore's rain trees and palms in sizes that vary more than the archetype's quay row
      { obj: { 'tree.rain-tree': 1, 'plant.palm-coconut': 2 }, layer: 'mid', seed: 15, area: { rect: [-140, 540, 1740, 546] }, n: 22, minGap: 46, s: [0.13, 0.28], flip: 0.5, variant: [0, 1],
        tint: { col: '#6a8a9a', k: [0.08, 0.08] }, mask: { avoid: [{ rect: [430, 500, 510, 560] }] }, anim: false, reflect: true }],
    actors: [boat('boat.ferry', 668, true, 9, 41, 0.55, 0), boat('boat.sampan', 690, false, 6, 42, 0.3, 1), boat('boat.tug', 712, true, 7, 43, 0.82, 2), boat('boat.fishing-boat', 730, false, 8, 44, 0.08, 1),
      car('vehicle.taxi', 0, false, 0), car('vehicle.car', 1, true, 2), car('vehicle.car', 2, false, 3), car('vehicle.taxi', 3, true, 1)],
    // egrets low over the water, besides the archetype's two flocks
    flocks: [{ obj: 'bird.egret-flight', n: 3, area: [200, 540, 1400, 600], speed: 16, s: 0.7, seed: 12, layer: 'mid' }],
  };
  animRegionSceneUpgrade('asia', 'place:macau', {
    state: 'live',
    archetype: 'skyline-water',
    landmarks: ['landmark.macau-tower', 'landmark.st-pauls-facade', 'landmark.macau-taipa-bridge'],
    scene: () => sceneFromArchetype('skyline-water', params, patch),
  });
})();
