/* ============================================================
   UPGRADE (live) of us-northeast/ny-statue (docs/dev/SCENE_ENGINE.md section 16)
   Scaffolded by `node tools/anim-pack.mjs scene upgrade us-northeast/ny-statue --box 900,100,1470,668 --slug statue-of-liberty`.
   LIVE: the app shows this composed scene in place of the hand-drawn art (kept
   as the item's legacySvg). The item keeps its identity: the id, key, place
   fields, label, site, tags and when come from the region entry
   (tests/scene-upgrades-live.test.mjs).
   After any change, re-check:
     node tools/anim-pack.mjs scene sheet us-northeast/ny-statue --compare --upgrades --times
     node tools/anim-pack.mjs scene lint us-northeast/ny-statue --upgrades --perf   (GOLD)
   Care: no signs or text, at most 8 tiny anonymous people, no crowds, no flags or emblems.
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // Upper New York Bay at dawn from the waterfront walk of Liberty State Park, looking north-east: the statue on
  // Liberty Island close across the water, in near profile facing the Narrows, and behind it to the left the towers
  // of lower Manhattan (One World Trade Center) with Midtown's Empire State Building further off; to the right the low
  // shore of Brooklyn and Governors Island. Ferries, a tug, a water taxi and a sailboat cross the bay. Unlike the
  // Brooklyn Bridge view (new-york-skyline: golden hour from Brooklyn Bridge Park, the bridge and the skyline), the
  // statue is the subject here, and the foreground is the park's open shore of meadow and tall grasses.
  const params = { id: 'ny', lat: 40.685, lon: -74.056, heading: 57, at: 'dawn', climate: 'temperate',
    kits: ['towers', 'urban', 'temperate', 'people', 'boats', 'birds', 'water'],
    landmarks: ['landmark.empire-state@330@200', 'landmark.one-wtc@560@330', 'landmark.statue-of-liberty@1000@600@front@110'],
    water: 'bay', horizon: 520, palette: { base: { water: ['#9ab4c6', '#4e7290', '#24425c'] } } };
  // the statue's island stands in the bay (y 656): the far towers and the far quay's trees keep clear of it
  const clear = { rect: [870, 300, 1130, 560] };
  // a boat crossing the bay at y, scaled by its depth as the archetype scales them (0.38 at the quay, 1.05 at the walk)
  const boat = (obj, y, layer, speed, back, seed, offset, v) => ({ obj, layer, path: back ? [[1820, y], [-220, y]] : [[-220, y], [1820, y]], speed, loop: 'loop', s: 1,
    sByY: [[546, 0.38], [748, 1.05]], seed, offset, flip: back, variant: v });
  const patch = {
    // the scene's own picks and mixes (8.6), so a new library object never moves them
    picks: { lamp: ['street.lamppost'], boat: ['boat.ferry', 'boat.tug', 'boat.water-taxi', 'boat.dinghy'], frame: ['tree.green-oak'] },
    mix: { tree: { 'tree.plane': 2, 'tree.green-oak': 1 }, ground: { 'plant.grass': 2, 'plant.susuki': 1 }, shrub: { 'plant.shrub': 1 } },
    // the archetype's horizon band, far row and far-quay trees are replaced (towers only on the Manhattan and Jersey City side,
    // nothing behind the statue, the low shore of Brooklyn and Governors Island to the right); its second frame tree (x 1690)
    // stands outside the 16:9 view; its boats and planting beds are replaced by the scene's own (boats beyond the island go in
    // the far layer, which draws behind it). The Manhattan towers are placed again without the archetype's ground shadow,
    // which would fall on the bay
    drop: { scatter: [0, 1, 2, 5, 6, 7], place: [4, 'landmark.empire-state', 'landmark.one-wtc'], actors: [0, 1, 2, 3, 4] },
    place: [{ obj: 'landmark.empire-state', x: 330, y: 542, s: 0.48, layer: 'mid', seed: 11, reflect: true, shadow: false },
      { obj: 'landmark.one-wtc', x: 560, y: 542, s: 0.7, layer: 'mid', seed: 12, reflect: true, shadow: false }],
    actors: [boat('boat.water-taxi', 566, 'far', 9, true, 30, 0.2, 0), boat('boat.tug', 592, 'far', 6, false, 31, 0.55, 1), boat('boat.ferry', 690, 'mid', 8, true, 32, 0.7, 0),
      { obj: 'boat.dinghy', layer: 'mid', path: [[140, 728], [1460, 728]], speed: 6, loop: 'pingpong', s: 1, sByY: [[546, 0.38], [748, 1.05]], seed: 33, offset: 0.15, variant: 2 }, boat('boat.ferry', 574, 'far', 7, false, 34, 0.9, 1)],
    scatter: [
      { obj: 'building.skyline-band', layer: 'horizon', seed: 2, area: { rect: [-120, 520, 760, 522] }, n: 3, minGap: 260, s: [0.5, 0.8], flip: 0.4, variant: 'random', tint: { col: '#9aaabb', k: [0.08, 0.08] }, shadow: false, anim: false },
      { obj: { 'tree.bank-distant': 2, 'tree.far-broad': 1 }, layer: 'horizon', seed: 3, area: { rect: [1150, 521, 1750, 524] }, n: 16, minGap: 30, s: [0.1, 0.16], flip: 0.5, variant: [0, 1], tint: { col: '#8a9cae', k: [0.16, 0.16] }, shadow: false, anim: false },
      { obj: { 'building.tower-glass': 2, 'building.tower-stone': 1 }, layer: 'far', seed: 4, area: { rect: [-150, 524, 860, 529] }, n: 26, minGap: 30, s: [0.4, 0.75], maxH: 330, flip: 0.5, variant: [0, 2],
        tint: { col: '#8a9aac', k: [0.08, 0.08] }, mask: { noise: { scale: 140, cut: 0.3 }, avoid: [{ rect: [290, 300, 370, 560] }, { rect: [515, 300, 605, 560] }] }, shadow: false, anim: false },
      { obj: { 'tree.plane': 2, 'tree.pond-oak': 1, 'tree.far-broad': 1 }, layer: 'mid', seed: 15, area: { rect: [-140, 540, 1740, 546] }, n: 16, minGap: 60, s: [0.12, 0.2], flip: 0.5, variant: [0, 1],
        tint: { col: '#6a8a9a', k: [0.08, 0.08] }, mask: { avoid: [clear] }, anim: false, reflect: true },
      // the park's shore planting: meadow grass and tall ornamental grasses in plumes, a few shrubs
      { obj: { 'plant.grass': 1, 'plant.susuki': 1 }, layer: 'fore', seed: 7, area: { rect: [-150, 796, 1750, 856] }, n: 170, minGap: 15, s: [0.55, 0.9], flip: 0.5, variant: [0, 1], tint: { col: '#6a7a40', k: [0, 0.08] }, anim: 'strip' },
      { obj: 'plant.grass', layer: 'fore', seed: 8, area: { rect: [-150, 856, 1750, 905] }, n: 125, minGap: 24, s: [0.9, 1.3], flip: 0.5, variant: [1, 1], tint: { col: '#6a7a40', k: [0.08, 0.08] }, anim: 'strip' },
      { obj: 'plant.shrub', layer: 'fore', seed: 19, area: { rect: [-150, 800, 1750, 840] }, n: 7, minGap: 120, s: [0.5, 0.9], flip: 0.5, variant: [0, 1], mask: { noise: { scale: 260, cut: 0.35 } }, anim: false },
    ],
  };
  animRegionSceneUpgrade('us', 'state:NY', {
    state: 'live',
    archetype: 'skyline-water',
    landmarks: ['landmark.statue-of-liberty', 'landmark.one-wtc', 'landmark.empire-state'],
    scene: () => sceneFromArchetype('skyline-water', params, patch),
  });
})();
