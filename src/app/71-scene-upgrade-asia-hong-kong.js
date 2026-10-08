/* ============================================================
   UPGRADE (live) of asia-east/hong-kong-skyline (docs/dev/SCENE_ENGINE.md section 16)
   Written by hand in the form `node tools/anim-pack.mjs scene upgrade` scaffolds (its landmark
   extraction cannot parse this art: sceneShapesFromSvg rejects a #rrggbbaa colour in it).
   LIVE: the app shows this composed scene in place of the hand-drawn art (kept
   as the item's legacySvg). The item keeps its identity: the id, key, place
   fields, label, site, tags and when come from the region entry
   (tests/scene-upgrades-live.test.mjs). After any change, re-check:
     node tools/anim-pack.mjs scene sheet asia-east/hong-kong-skyline --compare --upgrades --times
     node tools/anim-pack.mjs scene lint asia-east/hong-kong-skyline --upgrades --perf   (GOLD)
   Care: no signs or text, at most 8 tiny anonymous people, no crowds, no flags or emblems.
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // Victoria Harbour from the Tsim Sha Tsui promenade, looking south-south-west at dusk: Central Plaza on the Wan Chai
  // shore on the left, the Bank of China Tower and Two IFC on the right (their real order, drawn closer together),
  // the hills of the island and Victoria Peak behind; the green-and-white ferries, tugs, launches and a red-sailed junk
  const params = { id: 'hong-kong', lat: 22.294, lon: 114.169, heading: 205, at: 'dusk', climate: 'tropical',
    kits: ['tropical', 'towers', 'urban', 'east-asian', 'people', 'boats', 'birds', 'water'],
    landmarks: ['landmark.central-plaza@440@410', 'landmark.bank-of-china@790@430', 'landmark.two-ifc@1130@480'],
    water: 'bay', horizon: 540, palette: { base: { water: ['#7e9cb0', '#3e6482', '#1c3a56'] } } };
  const patch = {
    picks: { frame: ['plant.palm-royal', 'tree.rain-tree'], lamp: ['street.lamppost'] },
    mix: { tree: { 'plant.palm-royal': 2, 'plant.palm-coconut': 1 }, ground: { 'plant.grass-tropical': 3, 'plant.ixora': 1 }, shrub: { 'plant.bougainvillea-hedge': 1 },
      boat: { 'boat.ferry': 2, 'boat.tug': 1, 'boat.water-taxi': 1 } },
    // the island's hills behind the towers: Mount Butler and Jardine's Lookout on the left, Mount Nicholson and Mount
    // Cameron, the dip of Wan Chai Gap, then Victoria Peak, highest, on the right
    ground: [{ layer: 'horizon', d: 'M-160 336Q40 300 150 304Q240 286 320 296Q440 284 560 282Q640 276 700 288Q780 300 850 318Q960 300 1080 270Q1180 246 1260 246Q1330 248 1380 268Q1480 300 1600 344Q1700 370 1760 380V538H-160Z',
      fill: { lin: [[0, '#34584a'], [1, '#5a7c6c']], x1: 0, y1: 250, x2: 0, y2: 540 } }],
    // the island's wall of towers, kept below the three (the archetype's far row drops: its 1700-unit skyscrapers stand in a grid)
    drop: { scatter: [1] },
    scatter: [{ obj: { 'building.tower-glass': 2, 'building.tower': 2, 'building.tower-stone': 1 }, layer: 'far', seed: 4, area: { rect: [-150, 544, 1750, 549] }, n: 30, minGap: 38, s: [0.3, 0.62], maxH: 280, flip: 0.5, variant: [0, 5], tint: { col: '#8a9aac', k: [0.08, 0.08] }, mask: { noise: { scale: 140, cut: 0.3 }, avoid: [{ rect: [405, 500, 475, 570] }, { rect: [750, 500, 830, 570] }, { rect: [1090, 500, 1170, 570] }] }, shadow: false, anim: false, reflect: true }],
    // two red-sailed junks: one in the near lane clear of the railing, one far out heading the other way
    actors: [{ obj: 'boat.junk', layer: 'mid', path: [[-240, 702], [1840, 702]], speed: 5, loop: 'loop', s: 1, sByY: [[566, 0.38], [756, 1.05]], seed: 45, offset: 0.38 },
      { obj: 'boat.junk', layer: 'mid', path: [[1840, 604], [-240, 604]], speed: 3, loop: 'loop', s: 1, sByY: [[566, 0.38], [756, 1.05]], seed: 46, offset: 0.22, flip: true }],
  };
  animRegionSceneUpgrade('asia', 'place:hong-kong', {
    state: 'live',
    archetype: 'skyline-water',
    landmarks: ['landmark.central-plaza', 'landmark.bank-of-china', 'landmark.two-ifc'],
    scene: () => sceneFromArchetype('skyline-water', params, patch),
  });
})();
