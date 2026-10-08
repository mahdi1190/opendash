/* ============================================================
   UPGRADE (live) of asia-east/shanghai-skyline (docs/dev/SCENE_ENGINE.md section 16)
   Scaffolded by `node tools/anim-pack.mjs scene upgrade asia-east/shanghai-skyline`.
   LIVE: the app shows this composed scene in place of the hand-drawn art (kept
   as the item's legacySvg). The item keeps its identity: the id, key, place
   fields, label, site, tags and when come from the region entry
   (tests/scene-upgrades-live.test.mjs). After any change, re-check:
     node tools/anim-pack.mjs scene sheet asia-east/shanghai-skyline --compare --upgrades --times
     node tools/anim-pack.mjs scene lint asia-east/shanghai-skyline --upgrades --perf   (GOLD)
   Care: no signs or text, at most 8 tiny anonymous people, no crowds, no flags or emblems.
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // Pudong from the Bund, looking east-south-east across the Huangpu: the Oriental Pearl Tower on the left, then
  // the Jin Mao Tower, the World Financial Center with the opening at its top and the Shanghai Tower, tallest, on the
  // right (in their real order from the Bund); ferries, tugs and water taxis on the river, plane trees on both banks.
  const params = { id: 'shanghai', lat: 31.239, lon: 121.49, heading: 100, climate: 'temperate',
    kits: ['towers', 'urban', 'east-asian', 'temperate', 'people', 'boats', 'birds', 'water'],
    landmarks: ['landmark.oriental-pearl@400@470', 'landmark.jin-mao@760@375', 'landmark.shanghai-wfc@900@430', 'landmark.shanghai-tower@1080@520'],
    water: 'river', horizon: 540, palette: { base: { water: ['#9aa8a4', '#5a6c6c', '#2a3a40'] } } };
  // the river's traffic: a ferry crossing back and a tug on the far lane, besides the archetype's boats
  const boat = (obj, y, back, speed, seed, offset) => ({ obj, layer: 'mid', path: back ? [[1820, y], [-220, y]] : [[-220, y], [1820, y]], speed, loop: 'loop', s: 1, sByY: [[566, 0.38], [764, 1.05]], seed, offset, flip: back });
  const far = (obj, seed, n, s, variant, k = 0.08) => ({ obj, layer: 'far', seed, area: { rect: [-150, 544, 1750, 549] }, n, minGap: 40, s, maxH: 210, flip: 0.5, variant, tint: { col: '#8a9aac', k: [k, k] }, mask: { noise: { scale: 140, cut: 0.3 }, avoid: [{ rect: [335, 500, 465, 570] }, { rect: [715, 500, 1125, 570] }] }, shadow: false, anim: false, reflect: true });
  const patch = {
    // the scene's own picks and mixes (8.6), so a new library object never moves them: plane trees (the city's street
    // tree) framing the Bund and along the Lujiazui bank, grass and dwarf bamboo with azaleas in the beds, the Bund's
    // lampposts, the river's ferries, tugs and water taxis
    picks: { lamp: ['street.lamppost'] },
    mix: { tree: { 'tree.plane': 2, 'tree.cedar': 1 }, ground: { 'plant.grass': 3, 'plant.sasa': 1 }, shrub: { 'plant.azalea': 1 },
      boat: { 'boat.ferry': 1, 'boat.tug': 1, 'boat.water-taxi': 1 } },
    // a plane frames the right too (the archetype's second frame tree, a slim cedar at x 1690, stands outside the 16:9 view)
    drop: { scatter: [1, 2], place: ['tree.cedar'] },
    place: [{ obj: 'tree.plane', x: 1660, y: 912, s: 1.05, layer: 'front', seed: 22, flip: true, variant: 1 }],
    // Lujiazui's glass towers kept below the four (light enough for the tile), a few masonry towers among them;
    // the Lujiazui bank's planes and cedars in sizes that vary more than the archetype's quay row
    scatter: [far('building.tower-glass', 4, 16, [0.3, 0.6], [0, 5]), far('building.tower-glass', 6, 7, [0.35, 0.55], [0, 2], 0.16), far('building.tower-stone', 5, 5, [0.25, 0.45], 1),
      { obj: { 'tree.plane': 2, 'tree.cedar': 1 }, layer: 'mid', seed: 15, area: { rect: [-140, 560, 1740, 566] }, n: 24, minGap: 46, s: [0.13, 0.28], flip: 0.5, variant: [0, 1], tint: { col: '#6a8a9a', k: [0.08, 0.08] }, mask: { avoid: [{ rect: [370, 500, 430, 570] }, { rect: [740, 500, 780, 570] }, { rect: [885, 500, 915, 570] }, { rect: [1050, 500, 1110, 570] }] }, anim: false, reflect: true }],
    actors: [boat('boat.ferry', 640, true, 8, 41, 0.55), boat('boat.tug', 600, false, 6, 42, 0.3)],
  };
  animRegionSceneUpgrade('asia', 'place:shanghai', {
    state: 'live',
    archetype: 'skyline-water',
    landmarks: ['landmark.oriental-pearl', 'landmark.jin-mao', 'landmark.shanghai-wfc', 'landmark.shanghai-tower'],
    scene: () => sceneFromArchetype('skyline-water', params, patch),
  });
})();
