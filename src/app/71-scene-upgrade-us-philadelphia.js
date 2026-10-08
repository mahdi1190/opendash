/* ============================================================
   UPGRADE (live) of us-northeast/philadelphia-city-hall (docs/dev/SCENE_ENGINE.md section 16)
   Drawn after `node tools/anim-pack.mjs scene upgrade us-northeast/philadelphia-city-hall --dry-run`
   (its clusters missed the building: the landmark is drawn by hand from the old art's source).
   LIVE: the app shows this composed scene in place of the hand-drawn art (kept as the item's
   legacySvg). The item keeps its identity: the id, key, place fields, label, site, tags and when come from
   the region entry (tests/scene-upgrades-live.test.mjs). After any change, re-check:
     node tools/anim-pack.mjs scene sheet us-northeast/philadelphia-city-hall --compare --upgrades --times
     node tools/anim-pack.mjs scene lint us-northeast/philadelphia-city-hall --upgrades --perf   (GOLD)
   Care: no signs or text, at most 8 tiny anonymous people, no crowds, no flags or emblems (the old
   art's Parkway flags are not drawn: the care rules override it).
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // Down the Benjamin Franklin Parkway from the rim of the fountain pool at Logan Circle, looking south-east: City Hall at
  // the end of the Parkway with its clock tower, the Parkway's plane trees either side, the glass and stone towers of Center
  // City round it (the tallest to the right, as they stand), traffic round the circle, the fountain's low jets.
  const params = { id: 'philadelphia', lat: 39.958, lon: -75.171, heading: 128, at: 'afternoon', climate: 'temperate',
    kits: 'towers|urban|temperate|people|birds', landmarks: 'landmark.philadelphia-city-hall@760@470', horizon: 540,
    palette: { base: { water: ['#9cc8d6', '#5592ac', '#2c5c74'] } } };
  const H = 540, yQ = 562, yP = 756;
  // traffic round the circle, beyond the pool (in front of the far trees' feet)
  const car = (obj, i, back, v) => ({ obj, layer: 'mid', path: back ? [[1760, yQ + 3], [-160, yQ + 3]] : [[-160, yQ + 5], [1760, yQ + 5]], speed: 26 + i * 5, loop: 'loop', s: 0.17, seed: 60 + i, offset: (0.11 + i * 0.27) % 1, flip: back, variant: v });
  // a low arching jet of the fountain (a thin crescent) and the pool's stone coping over the archetype's railing
  const jet = (x, y, w, h) => `M${x} ${y}Q${x + w / 2} ${y - h} ${x + w} ${y}Q${x + w / 2} ${y - h + 6} ${x} ${y}Z`;
  const spray = { lin: [[0, '#ffffff', 0.75], [1, '#e8f4fa', 0.25]], x1: 0, y1: 520, x2: 0, y2: 660 };
  const patch = {
    // the scene's own picks and mixes (8.6), so a new library object never moves them
    picks: { lamp: ['street.lamppost'], bench: ['street.bench'], frame: ['tree.plane'], walker: ['person.walker', 'person.dog-walker', 'person.jogger'] },
    mix: { tree: { 'tree.plane': 2, 'tree.pond-oak': 1 }, ground: { 'plant.grass': 3, 'plant.wildflowers': 1 }, shrub: { 'plant.shrub': 1 },
      bird: { 'bird.small-flight': 1, 'bird.herring-gull-flight': 1 } },
    // the archetype's far row, quay trees, beds and shrubs give way to the Parkway's own, and its three boats go (a fountain
    // pool has none: actors 0 to 2, the walkers follow them); City Hall is placed again without
    // the archetype's ground shadow (it would fall on the pool); the second frame tree (x 1690) is outside the 16:9 view
    drop: { scatter: [1, 2, 5, 6, 7], place: [2, 'landmark.philadelphia-city-hall'], actors: [0, 1, 2] },
    place: [{ obj: 'landmark.philadelphia-city-hall', x: 760, y: yQ, s: 0.84, layer: 'mid', seed: 11, reflect: true, shadow: false },
      { obj: 'tree.plane', x: 1600, y: 912, s: 1.25, layer: 'front', seed: 22, flip: true, variant: 1 }],
    ground: [
      // the pool's granite coping along the near rim (over the railing), with its lit top edge
      { layer: 'near', d: `M-160 ${yP - 26}H1760V${yP + 3}H-160Z`, fill: { lin: [[0, '@pave.0'], [1, '@pave.2']], x1: 0, y1: yP - 26, x2: 0, y2: yP + 3 } },
      { layer: 'near', d: `M-160 ${yP - 27}H1760V${yP - 23}H-160Z`, fill: '@pave.0' },
      // the fountain: a ring of slim upright jets with their foam (the axis to the portal kept clear) and the low arching jets
      { layer: 'near', d: [[300, 610, 64], [390, 616, 82], [480, 612, 70], [570, 618, 92], [950, 618, 92], [1040, 612, 70], [1130, 616, 82], [1220, 610, 64]]
        .map(([x, y, h]) => `M${x - 4} ${y}Q${x - 2} ${y - h * 0.6} ${x} ${y - h}Q${x + 2} ${y - h * 0.6} ${x + 4} ${y}Q${x + 12} ${y + 4} ${x} ${y + 5}Q${x - 12} ${y + 4} ${x - 4} ${y}Z`).join(''), fill: spray },
      { layer: 'near', d: jet(230, 652, 90, 52) + jet(1290, 652, 90, 52) + jet(420, 664, 80, 40) + jet(1110, 664, 80, 40), fill: spray },
    ],
    scatter: [
      // Center City round City Hall: the tall glass and stone towers to the right, lower blocks to the left
      { obj: { 'building.tower-glass': 3, 'building.skyscraper': 1, 'building.tower-stone': 1 }, layer: 'far', seed: 4, area: { rect: [880, H + 4, 1700, H + 9] }, n: 14, minGap: 40, s: [0.55, 0.95], maxH: 420, flip: 0.5, variant: [0, 2],
        tint: { col: '#8a9aac', k: [0.08, 0.08] }, mask: { noise: { scale: 160, cut: 0.25 } }, shadow: false, anim: false },
      { obj: { 'building.tower-stone': 2, 'building.tower': 1, 'building.tower-glass': 1 }, layer: 'far', seed: 5, area: { rect: [-150, H + 4, 900, H + 9] }, n: 14, minGap: 40, s: [0.35, 0.6], maxH: 230, flip: 0.5, variant: [0, 2],
        tint: { col: '#8a9aac', k: [0.08, 0.08] }, mask: { noise: { scale: 160, cut: 0.3 }, avoid: [{ rect: [690, 0, 830, 570] }] }, shadow: false, anim: false },
      // the Parkway's plane trees either side, in front of the building's wings (the axis to the portal kept clear)
      { obj: { 'tree.plane': 2, 'tree.pond-oak': 1, 'tree.far-broad': 1 }, layer: 'mid', seed: 15, area: { rect: [-140, yQ + 1, 1740, yQ + 6] }, n: 34, minGap: 38, s: [0.14, 0.24], flip: 0.5, variant: [0, 1],
        tint: { col: '#6a8a9a', k: [0.08, 0.08] }, mask: { avoid: [{ rect: [680, 480, 840, 575] }] }, anim: false, reflect: true },
      // the beds round the circle: grass and flowers, a few shrubs
      { obj: { 'plant.grass': 1, 'plant.wildflowers': 1 }, layer: 'fore', seed: 7, area: { rect: [-150, 804, 1750, 862] }, n: 170, minGap: 15, s: [0.55, 0.9], flip: 0.5, variant: [0, 1], tint: { col: '#6a7a40', k: [0, 0.08] }, anim: 'strip' },
      { obj: { 'plant.grass': 3, 'plant.wildflowers': 1 }, layer: 'fore', seed: 8, area: { rect: [-150, 862, 1750, 905] }, n: 125, minGap: 24, s: [0.9, 1.3], flip: 0.5, variant: [1, 1], tint: { col: '#6a7a40', k: [0.08, 0.08] }, anim: 'strip' },
      { obj: 'plant.shrub', layer: 'fore', seed: 23, area: { rect: [-150, 806, 1750, 846] }, n: 9, minGap: 90, s: [0.5, 0.9], flip: 0.5, variant: [0, 1], mask: { noise: { scale: 260, cut: 0.35 } }, anim: false },
    ],
    actors: [car('vehicle.car', 0, false, 0), car('vehicle.taxi', 1, true, 0), car('vehicle.bus', 2, false, 0), car('vehicle.car', 3, true, 2), car('vehicle.car', 4, false, 1)],
  };
  animRegionSceneUpgrade('us', 'place:philadelphia', {
    state: 'live',
    archetype: 'skyline-water',
    landmarks: ['landmark.philadelphia-city-hall'],
    scene: () => sceneFromArchetype('skyline-water', params, patch),
  });
})();
