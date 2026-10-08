/* ============================================================
   UPGRADE (live) of us-mountain/oklahoma-city-skyline-wheel (docs/dev/SCENE_ENGINE.md section 16)
   Drawn after `node tools/anim-pack.mjs scene upgrade us-mountain/oklahoma-city-skyline-wheel --dry-run`
   (its clusters gave no landmark box: the three landmarks are drawn by hand from the old art's source).
   LIVE: the app shows this composed scene in place of the hand-drawn art (kept as the item's
   legacySvg). The item keeps its identity: the id, key, place fields, label, site, tags and when come from
   the region entry (tests/scene-upgrades-live.test.mjs). After any change, re-check:
     node tools/anim-pack.mjs scene sheet us-mountain/oklahoma-city-skyline-wheel --compare --upgrades --times
     node tools/anim-pack.mjs scene lint us-mountain/oklahoma-city-skyline-wheel --upgrades --perf   (GOLD)
   Care: no signs or text, at most 8 tiny anonymous people, no crowds, no flags or emblems.
   The region's default kits (alpine, arid) are nearly empty: it is composed from the temperate,
   urban, towers and water kits.
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // The Oklahoma River from the riverside walk of the Wheeler District, looking north-north-east at the city in golden light:
  // the Ferris wheel on this bank (left), across the river the trees of the north bank, the downtown towers with the Devon
  // tower above them, the low brick blocks of Bricktown to the right and the Skydance Bridge's white tail rising over
  // Scissortail Park; river cruise boats and a fishing boat on the water, Canada geese, willows and oaks along the banks.
  const params = { id: 'oklahoma-city', lat: 35.452, lon: -97.528, heading: 20, at: 'golden', climate: 'temperate',
    kits: 'towers|urban|temperate|people|boats|birds|water', landmarks: 'landmark.devon-tower@820@500|landmark.skydance-bridge@1250@210', horizon: 520,
    palette: { base: { water: ['#94b8c4', '#56849a', '#2e566a'], pave: ['#bc8068', '#a06652', '#80503e'] } } };
  const H = 520, yQ = 542, yP = 748;
  // a boat on the river at y, scaled by its depth as the archetype scales them (0.38 at the far bank, 1.05 at the walk)
  const boat = (obj, y, back, speed, seed, offset, v) => ({ obj, layer: 'mid', path: back ? [[1820, y], [-220, y]] : [[-220, y], [1820, y]], speed, loop: 'loop', s: 1,
    sByY: [[546, 0.38], [748, 1.05]], seed, offset, flip: back, variant: v });
  const patch = {
    // the scene's own picks and mixes (8.6), so a new library object never moves them; one archetype boat, dropped below
    picks: { lamp: ['street.lamppost'], bench: ['street.bench'], frame: ['tree.pond-oak'], walker: ['person.walker', 'person.dog-walker', 'person.jogger'] },
    mix: { tree: { 'tree.pond-oak': 2, 'tree.pond-willow': 1 }, ground: { 'plant.grass': 3, 'plant.wildflowers': 1 }, shrub: { 'plant.shrub': 1 },
      boat: { 'boat.water-taxi': 1 }, bird: { 'bird.goose-flight': 1, 'bird.small-flight': 1 } },
    // the archetype's far row, bank trees, beds and shrubs give way to the city's own; the two landmarks are placed again
    // without the archetype's ground shadow (it would fall on the river); both frame trees go (the wheel frames the left)
    drop: { scatter: [1, 2, 5, 6, 7], place: [2, 3, 'landmark.devon-tower', 'landmark.skydance-bridge'], actors: [0] },
    place: [{ obj: 'landmark.devon-tower', x: 820, y: yQ, s: 0.89, layer: 'mid', seed: 11, reflect: true, shadow: false },
      { obj: 'landmark.skydance-bridge', x: 1260, y: yQ, s: 0.88, layer: 'mid', seed: 12, reflect: true, shadow: false },
      // the Ferris wheel on this bank, on the walk at the left
      { obj: 'landmark.wheeler-wheel', x: 232, y: yP + 14, s: 1.3, layer: 'near', seed: 13, shadow: true },
      { obj: 'tree.pond-oak', x: 1600, y: 912, s: 1.2, layer: 'front', seed: 22, flip: true, variant: 1 },
      // Canada geese on the river
      { obj: 'bird.goose', x: 560, y: 640, s: 0.5, layer: 'mid', seed: 31, reflect: true }, { obj: 'bird.goose', x: 610, y: 646, s: 0.52, layer: 'mid', seed: 32, flip: true, reflect: true },
      { obj: 'bird.goose', x: 1380, y: 700, s: 0.7, layer: 'mid', seed: 33, reflect: true }],
    scatter: [
      // downtown: glass and stone towers under the Devon tower (its column kept clear)
      { obj: { 'building.tower-glass': 3, 'building.skyscraper': 1, 'building.tower-stone': 2 }, layer: 'far', seed: 4, area: { rect: [420, H + 4, 1180, H + 9] }, n: 16, minGap: 36, s: [0.45, 0.85], maxH: 300, flip: 0.5, variant: [0, 2],
        tint: { col: '#8a9aac', k: [0.08, 0.08] }, mask: { noise: { scale: 160, cut: 0.2 }, avoid: [{ rect: [740, 0, 900, 530] }] }, shadow: false, anim: false },
      // Bricktown's low brick warehouses to the right, and the lower blocks to the left
      { obj: { 'building.tower-stone': 2, 'building.tower': 1 }, layer: 'far', seed: 5, area: { rect: [-150, H + 4, 1750, H + 9] }, n: 22, minGap: 40, s: [0.22, 0.42], maxH: 110, flip: 0.5, variant: [0, 2],
        tint: { col: '#a0564a', k: [0.24, 0.24] }, mask: { noise: { scale: 180, cut: 0.3 }, avoid: [{ rect: [740, 0, 900, 530] }, { rect: [1060, 0, 1500, 530] }] }, shadow: false, anim: false },
      // the bridge's park: lower blocks only behind its white tail, so it stands clear against the sky
      { obj: 'building.tower-stone', layer: 'far', seed: 6, area: { rect: [1040, H + 4, 1520, H + 9] }, n: 7, minGap: 44, s: [0.2, 0.3], maxH: 60, flip: 0.5, variant: [0, 2],
        tint: { col: '#a0564a', k: [0.24, 0.24] }, mask: { noise: { scale: 120, cut: 0.3 } }, shadow: false, anim: false },
      // willows and oaks along the north bank (the Devon tower's foot and the bridge's middle kept clear)
      { obj: { 'tree.pond-oak': 2, 'tree.pond-willow': 2, 'tree.far-broad': 1 }, layer: 'mid', seed: 15, area: { rect: [-140, yQ + 1, 1740, yQ + 6] }, n: 30, minGap: 42, s: [0.13, 0.24], flip: 0.5, variant: [0, 1],
        tint: { col: '#6a8a9a', k: [0.08, 0.08] }, mask: { noise: { scale: 150, cut: 0.25 }, avoid: [{ rect: [700, 400, 940, 550] }, { rect: [1100, 400, 1400, 550] }] }, anim: false, reflect: true },
      // the beds along the walk: prairie grass and wildflowers, a few shrubs
      { obj: { 'plant.grass': 1, 'plant.wildflowers': 1 }, layer: 'fore', seed: 7, area: { rect: [-150, 796, 1750, 856] }, n: 170, minGap: 15, s: [0.55, 0.9], flip: 0.5, variant: [0, 1], tint: { col: '#7a7a40', k: [0, 0.08] }, anim: 'strip' },
      { obj: { 'plant.grass': 3, 'plant.wildflowers': 1 }, layer: 'fore', seed: 8, area: { rect: [-150, 856, 1750, 905] }, n: 125, minGap: 24, s: [0.9, 1.3], flip: 0.5, variant: [1, 1], tint: { col: '#7a7a40', k: [0.08, 0.08] }, anim: 'strip' },
      { obj: 'plant.shrub', layer: 'fore', seed: 23, area: { rect: [-150, 800, 1750, 846] }, n: 9, minGap: 90, s: [0.5, 0.9], flip: 0.5, variant: [0, 1], mask: { noise: { scale: 260, cut: 0.35 } }, anim: false },
    ],
    actors: [boat('boat.water-taxi', 584, true, 8, 41, 0.3, 0), boat('boat.water-taxi', 704, false, 9, 42, 0.75, 1), boat('boat.fishing-boat', 640, true, 6, 43, 0.55, 1)],
  };
  animRegionSceneUpgrade('us', 'place:oklahoma-city', {
    state: 'live',
    archetype: 'skyline-water',
    landmarks: ['landmark.devon-tower', 'landmark.skydance-bridge', 'landmark.wheeler-wheel'],
    scene: () => sceneFromArchetype('skyline-water', params, patch),
  });
})();
