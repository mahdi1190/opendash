/* ============================================================
   UPGRADE (live) of asia-east/taipei-skyline (docs/dev/SCENE_ENGINE.md section 16)
   Scaffolded by `node tools/anim-pack.mjs scene upgrade asia-east/taipei-skyline`.
   LIVE: the app shows this composed scene in place of the hand-drawn art (kept
   as the item's legacySvg). The item keeps its identity: the id, key, place
   fields, label, site, tags and when come from the region entry
   (tests/scene-upgrades-live.test.mjs). After any change, re-check:
     node tools/anim-pack.mjs scene sheet asia-east/taipei-skyline --compare --upgrades --times
     node tools/anim-pack.mjs scene lint asia-east/taipei-skyline --upgrades --perf   (GOLD)
   Care: no signs or text, at most 8 tiny anonymous people, no crowds, no flags or emblems.
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // Taipei 101 from a riverside park on the Keelung River, north-west of Xinyi, looking south-east in the morning:
  // the tower over the low city, Elephant Mountain and the Four Beasts hills behind it (higher ridges beyond),
  // cherries and royal palms on the banks, azaleas (the city's flower) in the beds, river boats and egrets
  const params = { id: 'taipei', lat: 25.076, lon: 121.535, heading: 145, at: 'morning', climate: 'temperate',
    kits: ['towers', 'urban', 'east-asian', 'temperate', 'tropical', 'people', 'boats', 'birds', 'water'],
    landmarks: ['landmark.taipei-101@860@540'], water: 'river', horizon: 540, palette: { base: { water: ['#a4bab4', '#5f807e', '#2c4a4e'] } } };
  // the hills: [layer, fill top, fill foot, path]; the far ridges (the higher hills beyond) paler, Elephant Mountain and the
  // Four Beasts nearer, rising behind the tower and running off to the left
  const hill = (layer, a, b, d) => ({ layer, d, fill: { lin: [[0, a], [1, b]], x1: 0, y1: 380, x2: 0, y2: 540 } });
  const patch = {
    picks: { frame: ['plant.palm-royal', 'tree.cherry'], lamp: ['street.lamp'] },
    mix: { tree: { 'tree.cherry': 1, 'tree.maple-japanese': 1, 'plant.palm-royal': 1 }, ground: { 'plant.grass': 3, 'plant.susuki': 1 }, shrub: { 'plant.azalea': 1 },
      boat: { 'boat.water-taxi': 2, 'boat.ferry': 1 } },
    // a royal palm frames the left; a cherry frames the right (the archetype's second frame tree at x 1690 stands outside the 16:9 view)
    drop: { scatter: [1, 2], place: [2] },
    place: [{ obj: 'tree.cherry', x: 1560, y: 912, s: 1.4, layer: 'front', seed: 22, flip: true, variant: 1 }],
    ground: [
      hill('horizon', '#5a7a80', '#8aa2a2', 'M-160 470Q60 430 260 446Q420 400 600 418Q700 388 760 396Q980 420 1180 452Q1400 470 1760 450V538H-160Z'),
      hill('horizon', '#2a5444', '#5a7e6c', 'M-160 498Q120 470 330 482Q460 452 560 462Q640 440 700 452Q760 420 830 432Q900 446 960 472Q1100 488 1300 486Q1520 480 1760 494V538H-160Z'),
      // the morning mist lying over the city at the foot of the hills
      { layer: 'far', d: 'M-160 486Q400 474 800 484T1760 480V548H-160Z', fill: { lin: [[0, '#eef4f2', 0], [0.55, '#eef4f2', 0.42], [1, '#eef4f2', 0.5]], x1: 0, y1: 480, x2: 0, y2: 548 } },
    ],
    // the low city: apartment blocks and a few glass towers, kept well under the tower
    scatter: [{ obj: { 'building.apartment-jp': 3, 'building.tower-glass': 1, 'building.tower': 1 }, layer: 'far', seed: 4, area: { rect: [-150, 544, 1750, 549] }, n: 30, minGap: 36, s: [0.22, 0.42], maxH: 170, flip: 0.5, variant: [0, 3], tint: { col: '#8a9aac', k: [0.1, 0.1] }, mask: { noise: { scale: 140, cut: 0.3 }, avoid: [{ rect: [800, 500, 920, 570] }] }, shadow: false, anim: false, reflect: true },
      // the far bank's cherries, maples and palms in sizes that vary more than the archetype's quay row
      { obj: { 'tree.cherry': 1, 'tree.maple-japanese': 1, 'plant.palm-royal': 1 }, layer: 'mid', seed: 15, area: { rect: [-140, 560, 1740, 566] }, n: 24, minGap: 46, s: [0.13, 0.28], flip: 0.5, variant: [0, 1], tint: { col: '#6a8a9a', k: [0.08, 0.08] }, mask: { noise: { scale: 120, cut: 0.25 }, avoid: [{ rect: [815, 500, 905, 570] }] }, anim: false, reflect: true }],
  };
  animRegionSceneUpgrade('asia', 'place:taipei', {
    state: 'live',
    archetype: 'skyline-water',
    landmarks: ['landmark.taipei-101'],
    scene: () => sceneFromArchetype('skyline-water', params, patch),
  });
})();
