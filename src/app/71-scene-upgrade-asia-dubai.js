/* ============================================================
   UPGRADE (live) of asia-west/dubai-skyline (docs/dev/SCENE_ENGINE.md section 16)
   Scaffolded by `node tools/anim-pack.mjs scene upgrade asia-west/dubai-skyline`.
   LIVE: the app shows this composed scene in place of the hand-drawn art (kept
   as the item's legacySvg). The item keeps its identity: the id, key, place
   fields, label, site, tags and when come from the region entry
   (tests/scene-upgrades-live.test.mjs). After any change, re-check:
     node tools/anim-pack.mjs scene sheet asia-west/dubai-skyline --compare --upgrades --times
     node tools/anim-pack.mjs scene lint asia-west/dubai-skyline --upgrades --perf   (GOLD)
   Care: no signs or text, at most 8 tiny anonymous people, no crowds, no flags or emblems.
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // Downtown Dubai across the Creek from its east bank at golden hour, looking west-south-west into the low sun:
  // the Burj Khalifa over the downtown towers, the twin Emirates Towers to its right (their real bearings from the
  // Creek), abras and boats on the water, palms, bougainvillea and ixora in the promenade beds.
  const params = { id: 'dubai', lat: 25.205, lon: 55.345, heading: 263, at: 'golden', climate: 'arid',
    kits: ['tropical', 'towers', 'urban', 'people', 'boats', 'birds', 'water'],
    landmarks: ['landmark.burj-khalifa@740@520', 'landmark.emirates-towers@1110@270'],
    water: 'river', horizon: 570 };
  const patch = {
    // Dubai's own seasons (the palette replaces the archetype's, which would snow on the beds in winter): the dusty haze
    // and sun-tired beds of summer, the beds cleared to sandy soil for replanting in autumn, the clear air and the bright
    // overseeded lawns of winter, spring in flower
    palette: {
      base: { far: ['#b8aea4', '#cdc2b4'], quay: ['#c2b49a', '#9a8e78'], pave: ['#e0d2b4', '#cbbb9a', '#ab9b7c'], rail: ['#4a463e', '#6e675c'],
        bed: ['#5c6a3a', '#48562e'], water: ['#a8bcbc', '#5f8492', '#2e4a5c'] },
      spring: { bed: ['#5a8a3a', '#467030'] },
      autumn: { bed: ['#cab088', '#aa926c'], far: ['#d6be96', '#e2cca8'] },
      winter: { bed: ['#6e9e42', '#557e34'], far: ['#9eaab4', '#b8c2c8'] },
    },
    // the scene's own picks and mixes (8.6), so a new library object never moves them
    picks: { frame: ['plant.palm-coconut-tall'], lamp: ['street.lamppost'] },
    mix: { tree: { 'plant.palm-coconut': 2, 'plant.palm-coconut-tall': 1, 'plant.frangipani': 2 }, ground: { 'plant.grass-tropical': 3, 'plant.ixora': 1, 'plant.bougainvillea': 1 },
      shrub: { 'plant.bougainvillea-hedge': 1 }, boat: { 'boat.water-taxi': 2, 'boat.ferry': 1, 'boat.fishing-boat': 1 },
      bird: { 'bird.herring-gull-flight': 1, 'bird.egret-flight': 1 }, walker: { 'person.walker': 2, 'person.jogger': 1, 'person.family': 1 } },
    // the archetype's second frame tree stands outside the 16:9 view: a tall palm frames the right instead
    drop: { place: [3], scatter: [1] },
    place: [{ obj: 'plant.palm-coconut-tall', x: 1540, y: 906, s: 1, layer: 'front', seed: 22, flip: true, variant: 1 }],
    // downtown's glass towers across the Creek, kept well below the Burj Khalifa and the Emirates Towers and clear of them
    // (the archetype's far row reaches 0.8 of the sky and swamped both)
    scatter: [{ obj: { 'building.tower-glass': 2, 'building.tower': 1 }, layer: 'far', seed: 4, area: { rect: [-150, 574, 1750, 579] }, n: 26, minGap: 40, s: [0.22, 0.55], maxH: 230,
      flip: 0.5, variant: [0, 3], tint: { col: '#a89a94', k: [0.1, 0.1] }, mask: { noise: { scale: 140, cut: 0.3 }, avoid: [{ rect: [690, 520, 790, 600] }, { rect: [990, 520, 1230, 600] }] },
      shadow: false, anim: false, reflect: true },
      // frangipani in the promenade beds, the city's common flowering tree: it yellows and drops its leaves in the cool
      // season and flowers again in spring (kept off the middle, so the view stays open)
      { obj: 'plant.frangipani', layer: 'fore', seed: 31, area: { rect: [-120, 814, 1720, 842] }, n: 11, minGap: 100, s: [0.55, 1], flip: 0.5, variant: [0, 1],
        mask: { noise: { scale: 90, cut: 0.25 }, avoid: [{ rect: [520, 780, 1260, 900] }] }, anim: false }],
  };
  animRegionSceneUpgrade('asia', 'place:dubai', {
    state: 'live',
    archetype: 'skyline-water',
    landmarks: ['landmark.burj-khalifa', 'landmark.emirates-towers'],
    scene: () => sceneFromArchetype('skyline-water', params, patch),
  });
})();
