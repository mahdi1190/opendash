/* ============================================================
   UPGRADE (live) of asia-west/riyadh-skyline (docs/dev/SCENE_ENGINE.md section 16)
   Scaffolded by `node tools/anim-pack.mjs scene upgrade asia-west/riyadh-skyline`.
   LIVE: the app shows this composed scene in place of the hand-drawn art (kept
   as the item's legacySvg). The item keeps its identity: the id, key, place
   fields, label, site, tags and when come from the region entry
   (tests/scene-upgrades-live.test.mjs). After any change, re-check:
     node tools/anim-pack.mjs scene sheet asia-west/riyadh-skyline --compare --upgrades --times
     node tools/anim-pack.mjs scene lint asia-west/riyadh-skyline --upgrades --perf   (GOLD)
   Care: no signs or text, at most 8 tiny anonymous people, no crowds, no flags or emblems.
   Built on `basic` (no water): the item's site is the skyline across the Najd desert, so the
   skyline-water archetype's bay and promenade would not be true to the place.
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // Riyadh from the desert edge west of the city, looking east at golden hour: the Kingdom Centre on the left,
  // Al Faisaliah with its globe on the right (in their real order from the west), the city's towers low in the haze,
  // a palm-lined boulevard with its traffic, and the desert ground in front.
  const params = { id: 'riyadh', lat: 24.7, lon: 46.62, heading: 90, at: 'golden', climate: 'arid',
    kits: ['towers', 'urban', 'tropical', 'people', 'vehicles', 'birds', 'arid'],
    landmarks: ['landmark.kingdom-centre', 'landmark.al-faisaliah'], water: 'none', horizon: 540 };
  const sz = (id, h, w) => { const d = sceneObj(id); return d && d.size ? Math.round((w ? w / d.size[0] : h / d.size[1]) * 100) / 100 : 1; };
  let patch = null;
  const mkPatch = () => {
    const view = { horizon: 540, lift: 1 };
    const car = (obj, i, back, v, y) => ({ obj, layer: 'near', path: back ? [[1800, y], [-200, y]] : [[-200, y], [1800, y]], speed: 44 + i * 7, loop: 'loop', s: sz(obj, 0, 62), seed: 60 + i, offset: (0.08 + i * 0.29) % 1, flip: back, variant: v });
    const walker = (obj, i, back, y) => ({ obj, layer: 'near', path: back ? [[1720, y], [-120, y]] : [[-120, y], [1720, y]], speed: 13 + i * 3, loop: 'loop', s: scenePersonScale(sceneObj(obj).size[1], y, view), seed: 50 + i, offset: (0.17 + i * 0.31) % 1, flip: back });
    let dash = ''; for (let x = -150; x < 1760; x += 64) dash += `M${x} 755h30v2.4h-30z`;
    return {
      // the scene's own picks and mixes (8.6): small birds over the city
      mix: { bird: { 'bird.small-flight': 1 } },
      // the archetype's generic rows are replaced by the city's own (its landmarks, palms and ground cover)
      drop: { scatter: [0, 1, 2, 3, 4, 5], place: [0, 1, 2, 3], actors: [0, 1, 2, 3, 4, 5] },
      // the Najd's colours by season: bleached sand in summer, a faint green after the winter rains, dust in autumn
      palette: {
        base: { hills: ['#c9a27c', '#dfc09c'], ground: ['#d6b47e', '#bc9660', '#9c784a'], road: ['#5e5852', '#7a726a'], pave: ['#d8c8a8', '#bcac8c'] },
        summer: { hills: ['#d0aa84', '#e4c6a2'], ground: ['#dcbc88', '#c4a06a', '#a48252'] },
        spring: { ground: ['#c6b27c', '#a6945c', '#887644'] },
        autumn: { hills: ['#c89878', '#dcb494'], ground: ['#d0a46c', '#b48450', '#90663c'] },
        winter: { hills: ['#a8a090', '#c4bcae'], ground: ['#a49478', '#857760', '#675c48'] },
      },
      // the boulevard: its pavement, the road and its lane marks, the kerb; the desert ground in front
      ground: [
        { layer: 'near', d: 'M-160 724H1760V736H-160Z', fill: '@pave.0' },
        { layer: 'near', d: 'M-160 736H1760V778H-160Z', fill: { lin: [[0, '@road.0'], [1, '@road.1']], x1: 0, y1: 736, x2: 0, y2: 778 } },
        { layer: 'near', d: dash, fill: '#d8d0c0' },
        { layer: 'near', d: 'M-160 778H1760V783H-160Z', fill: '@pave.1' },
        { layer: 'fore', d: 'M-160 786Q400 780 800 788T1760 784V905H-160Z', fill: { lin: [[0, '@ground.0'], [1, '@ground.1']], x1: 0, y1: 784, x2: 0, y2: 900 } },
      ],
      place: [
        { obj: 'landmark.kingdom-centre', x: 620, y: 620, s: 1.64, layer: 'mid', seed: 11, shadow: true },
        { obj: 'landmark.al-faisaliah', x: 1090, y: 624, s: 1.46, layer: 'mid', seed: 12, shadow: true },
        { obj: 'plant.palm-royal', x: 40, y: 912, s: sz('plant.palm-royal', 560), layer: 'front', seed: 21, variant: 0 },
        { obj: 'plant.palm-royal', x: 1575, y: 914, s: sz('plant.palm-royal', 500), layer: 'front', seed: 22, flip: true, variant: 1 },
      ],
      scatter: [
        // the city low in the haze: a far band of towers, then a row of nearer ones with gaps round the two landmarks
        { obj: 'building.skyline-band', layer: 'horizon', seed: 2, area: { rect: [-120, 548, 1720, 550] }, n: 5, minGap: 300, s: [0.4, 0.62], flip: 0.4, variant: [0, 5], tint: { col: '#d8bc98', k: [0.3, 0.3] }, shadow: false, anim: false },
        { obj: { 'building.tower-glass': 2, 'building.tower': 1 }, layer: 'far', seed: 4, area: { rect: [-150, 556, 1750, 562] }, n: 22, minGap: 40, s: [0.22, 0.46], maxH: 210, flip: 0.5, variant: [0, 5], tint: { col: '#d4b892', k: [0.22, 0.22] }, mask: { noise: { scale: 140, cut: 0.32 }, avoid: [{ rect: [530, 500, 710, 600] }, { rect: [1030, 500, 1150, 600] }] }, shadow: false, anim: false },
        // the boulevard's palms, its lampposts and the bougainvillea along the pavement
        { obj: { 'plant.palm-royal': 2, 'plant.palm-coconut-tall': 1 }, layer: 'mid', seed: 15, area: { rect: [-140, 700, 1740, 706] }, n: 16, minGap: 90, s: [0.3, 0.46], flip: 0.5, variant: [0, 1], anim: false },
        { obj: 'street.lamppost', layer: 'near', seed: 13, area: { rect: [-100, 726, 1700, 728] }, n: 6, minGap: 260, s: [0.62, 0.72], flip: 0.4, variant: 1, anim: false },
        { obj: 'plant.bougainvillea-hedge', layer: 'near', seed: 14, area: { rect: [-150, 718, 1750, 722] }, n: 8, minGap: 150, s: [0.4, 0.62], flip: 0.5, variant: [0, 2], mask: { noise: { scale: 160, cut: 0.3 } }, anim: false },
        // the desert ground: dry tussocks (wind strips) and stones
        { obj: { 'plant.grass': 3, 'plant.grass-tropical': 2 }, layer: 'fore', seed: 7, area: { rect: [-150, 790, 1750, 845] }, n: 170, minGap: 15, s: [0.5, 0.85], flip: 0.5, variant: [0, 1], tint: { col: '#c8a46a', k: [0.16, 0.24] }, anim: 'strip' },
        { obj: { 'plant.grass': 3, 'plant.grass-tropical': 2 }, layer: 'fore', seed: 8, area: { rect: [-150, 845, 1750, 905] }, n: 125, minGap: 22, s: [0.85, 1.25], flip: 0.5, variant: [1, 2], tint: { col: '#b89458', k: [0.16, 0.24] }, anim: 'strip' },
        { obj: { 'rock.stones': 3, 'rock.boulder': 1 }, layer: 'fore', seed: 9, area: { rect: [-150, 792, 1750, 900] }, n: 60, minGap: 30, s: [0.4, 0.8], flip: 0.5, variant: [0, 3], tint: { col: '#c8a46a', k: [0.12, 0.26] }, anim: false },
      ],
      actors: [car('vehicle.car', 0, false, 0, 770), car('vehicle.car', 1, true, 2, 748), car('vehicle.car-city', 2, false, 4, 770), car('vehicle.car', 3, true, 3, 748),
        walker('person.walker', 0, false, 730), walker('person.walker', 1, true, 733), walker('person.jogger', 2, false, 731)],
      flocks: [{ obj: 'bird.small-flight', n: 4, area: [900, 160, 1500, 380], speed: 20, s: 0.7, seed: 19, layer: 'mid' }],
    };
  };
  animRegionSceneUpgrade('asia', 'place:riyadh', {
    state: 'live',
    archetype: 'basic',
    landmarks: ['landmark.kingdom-centre', 'landmark.al-faisaliah'],
    scene: () => sceneFromArchetype('basic', params, patch || (patch = mkPatch())),
  });
})();
