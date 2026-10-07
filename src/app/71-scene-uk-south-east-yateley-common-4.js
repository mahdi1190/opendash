/* ============================================================
   COMPOSED SCENE uk-south-east / Yateley Common, view 4 of 4 (evening):
   looking west over the open heath toward the sunset (docs/dev/SCENE_ENGINE.md
   section 3; helpers and sources in 71-scene-uk-south-east-yateley-common-0.js).
   The signature is the tall lone Scots pine on the left, the nightjars' song
   post at dusk; younger pines stand across the heath. A small heathland pond
   on the right holds the sky (the glitter road of the low sun in it), the
   sandy track winds away between heather and gorse, cattle graze on the left
   and a roe deer comes out at the scrub edge. The view is authored for the
   golden hour and dusk, but the sky is live: the real sun, moon and stars
   for Yateley at the user's clock. Light aircraft out of Blackbushe show
   their navigation lights after dark; in spring and summer nightjars hawk
   over the heath.
   Lint, look and time it with:
     node tools/anim-pack.mjs scene lint uk-south-east/hampshire-yateley-common-4 --perf
     node tools/anim-pack.mjs scene sheet uk-south-east/hampshire-yateley-common-4 --times --seasons
   ============================================================ */
function sceneYateleyCommon4(season) {
  const Y = _scYc, winter = season === 'winter', summer = season === 'summer', spring = season === 'spring';
  const TRACK = [[740, 498, 5], [760, 520, 12], [700, 556, 24], [760, 600, 40], [700, 660, 70], [640, 740, 120], [700, 820, 180], [690, 905, 240]];
  const POND = { x0: 1010, x1: 1350, y0: 594, y1: 638 };
  const trackMid = Y.around(TRACK, 494, 662, 10), trackNear = Y.around(TRACK, 650, 800, 22), trackFore = Y.around(TRACK, 790, 910, 18);
  const pondAvoid = { rect: [POND.x0 - 44, POND.y0 - 40, POND.x1 + 44, POND.y1 + 42] };
  const sand = { lin: [[0, '@sand.0'], [0.5, '@sand.1'], [1, '@sand.2']], y1: 498, y2: 905 };
  const d = {
    v: 1, id: 'yateley-common-evening-' + season,
    view: { lat: 51.339, lon: -0.836, heading: 262, fov: 80, horizon: 492, lift: 1 },
    at: 'sunset', season: 'auto', tropic: 'summer', setting: 'natural', weather: 'live', particles: 'season',
    palette: Y.palette, layers: Y.layers,
    sky: { stars: 240, clouds: { n: 5, y: [60, 320], speed: 4 }, sunR: 30, moonR: 20 },
    ground: [
      { layer: 'horizon', d: Y.band(486, 4, 0, 510), fill: '@wood.0' },
      { layer: 'far', d: Y.band(494, 5, 30, 580), fill: { lin: [[0, '@heath.0'], [1, '@heath.1']], y1: 494, y2: 600 } },
      { layer: 'far', d: Y.mounds(-160, 1760, 506, 552, 44, 911, [22, 44]), fill: '@mound.0' },
      { layer: 'far', d: Y.track(TRACK, 494, 556), fill: sand },
      { layer: 'mid', d: Y.band(552, 6, -40, 668), fill: { lin: [[0, '@heath.1'], [1, '@heath.2']], y1: 552, y2: 700 } },
      { layer: 'mid', d: Y.mounds(-160, 1760, 566, 646, 30, 912, [36, 70]), fill: '@mound.1' },
      { layer: 'mid', d: Y.pond(POND.x0 - 8, POND.x1 + 8, POND.y0 - 4, POND.y1 + 6, 9271), fill: '@bank.0' },
      { layer: 'mid', d: Y.track(TRACK, 552, 662), fill: sand },
      { layer: 'near', d: Y.band(650, 8, 60, 812), fill: '@heath.2' },
      { layer: 'near', d: Y.track(TRACK, 648, 802), fill: sand },
      { layer: 'fore', d: Y.band(796, 6, -80), fill: '@heath.2' },
      { layer: 'fore', d: Y.track(TRACK, 792, 905), fill: sand },
    ],
    water: [{ layer: 'mid', d: Y.pond(POND.x0, POND.x1, POND.y0, POND.y1, 9270), y0: POND.y0, y1: POND.y1, base: ['#8aa8b0', '#44707a', '#24424a'], reflect: true, shimmer: 18, lightPath: true }],
    place: [
      // the signature: the tall lone Scots pine, the nightjars' song post; younger pines across the heath
      { obj: 'tree.pine-veteran', x: 410, y: 640, s: 0.78, layer: 'mid', variant: 0, flip: true, seed: 1, anim: false },
      { obj: 'tree.pine-veteran', x: 980, y: 560, s: 0.34, layer: 'far', variant: 1, seed: 2, anim: false },
      { obj: 'tree.pine-veteran', x: 1260, y: 584, s: 0.28, layer: 'mid', variant: 1, flip: true, seed: 3, anim: false, reflect: true },
      { obj: 'tree.birch-heath', x: 1150, y: 582, s: 0.28, layer: 'mid', variant: 0, seed: 4, anim: false, reflect: true },
      ...Y.bank(POND, 'mid', 9300, 10, [0.32, 0.48]),
      // cattle grazing on the left, a roe deer at the scrub edge right
      { obj: 'animal.cattle', x: 240, y: 590, s: 0.4, layer: 'mid', variant: 2, seed: 11 },
      { obj: 'animal.cattle', x: 330, y: 594, s: 0.38, layer: 'mid', variant: 0, flip: true, seed: 12 },
      { obj: 'animal.cattle', x: 540, y: 600, s: 0.4, layer: 'mid', variant: 1, seed: 13 },
      { obj: 'animal.deer', x: 1460, y: 570, s: 0.3, layer: 'mid', variant: 0, flip: true, seed: 14 },
      // gorse with a stonechat and a Dartford warbler
      { obj: 'plant.gorse', x: 560, y: 680, s: 0.5, layer: 'near', variant: 0, seed: 31, anim: false },
      { obj: 'plant.gorse', x: 920, y: 670, s: 0.46, layer: 'near', variant: 1, flip: true, seed: 32, anim: false },
      { obj: 'plant.gorse', x: 1180, y: 700, s: 0.6, layer: 'near', variant: 0, seed: 33, anim: false },
      { obj: 'plant.gorse', x: 1420, y: 676, s: 0.5, layer: 'near', variant: 1, seed: 34, anim: false },
      { obj: 'plant.gorse', x: 140, y: 720, s: 0.6, layer: 'near', variant: 1, flip: true, seed: 35, anim: false },
      { obj: 'bird.stonechat', x: 926, y: 622, s: 0.85, layer: 'near', variant: 0, seed: 37 },
      { obj: 'bird.dartford-warbler', x: 566, y: 628, s: 0.85, layer: 'near', flip: true, seed: 38 },
      { obj: 'animal.rabbit', x: 820, y: 780, s: 0.9, layer: 'near', variant: 1, seed: 41 },
      // the foreground: gorse, a fallen branch
      { obj: 'plant.gorse', x: 1260, y: 890, s: 1.3, layer: 'fore', variant: 0, flip: true, seed: 51, anim: false },
      { obj: 'plant.gorse', x: 300, y: 900, s: 1.2, layer: 'fore', variant: 1, seed: 52, anim: false },
      // framing: silver birches at both edges
      { obj: 'tree.birch-heath', x: 70, y: 860, s: 1.3, layer: 'front', variant: 1, seed: 61, anim: { sway: { k: 0.8 } } },
      { obj: 'tree.birch-heath', x: 1540, y: 880, s: 1.2, layer: 'fore', variant: 0, flip: true, seed: 62, anim: { sway: { k: 0.7 } } },
    ],
    scatter: [
      { obj: 'tree.woods-edge', layer: 'horizon', seed: 1, area: { rect: [-160, 484, 1760, 492] }, n: 12, minGap: 130, s: [0.36, 0.6], flip: 0.5, variant: [0, 1], anim: false },
      { obj: 'tree.woods-edge', layer: 'far', seed: 2, area: { rect: [-160, 498, 600, 504] }, n: 4, minGap: 140, s: [0.42, 0.66], flip: 0.5, variant: [1, 2], anim: false },
      { obj: 'tree.woods-edge', layer: 'far', seed: 3, area: { rect: [1100, 498, 1760, 504] }, n: 3, minGap: 140, s: [0.4, 0.6], flip: 0.5, variant: [1, 2], anim: false },
      { obj: 'tree.pine-veteran', layer: 'far', seed: 4, area: { rect: [-120, 514, 1720, 544] }, n: 7, minGap: 160, s: [0.06, 0.1], sByY: [[514, 0.85], [544, 1.15]], mask: { avoid: [{ rect: [900, 490, 1060, 560] }] }, flip: 0.5, variant: 1, anim: false },
      ...Y.carpet({ season, seed: 40, far: [498, 556], mid: [560, 650], near: [656, 790], fore: [798, 905], n: { far: 150, mid: 170, near: 200, fore: 120, grass: 50 },
        avoid: { far: [{ poly: trackMid }, pondAvoid], mid: [{ poly: trackMid }, pondAvoid], near: [{ poly: trackNear }], fore: [{ poly: trackFore }] } }),
      { obj: { 'plant.reed': 2, 'plant.bulrush': 1 }, layer: 'mid', seed: 9, area: { rect: [980, 616, 1060, 646] }, n: 8, minGap: 9, s: [0.26, 0.5], flip: 0.5, variant: [0, 1], anim: false, reflect: true },
      { obj: 'plant.reed', layer: 'mid', seed: 10, area: { rect: [1300, 618, 1380, 646] }, n: 7, minGap: 9, s: [0.28, 0.46], flip: 0.5, variant: [0, 1], anim: false, reflect: true },
      { obj: 'plant.bracken', layer: 'near', seed: 12, area: { rect: [1250, 720, 1760, 800] }, n: 3, minGap: 80, s: [0.55, 1.05], flip: 0.5, variant: 0, anim: false },
      { obj: 'plant.bracken', layer: 'near', seed: 13, area: { rect: [-160, 730, 400, 800] }, n: 2, minGap: 80, s: [0.55, 1.05], flip: 0.5, variant: 0, anim: false },
    ],
    actors: [
      // the last dog walker of the day heading home, a walker far off
      { obj: 'person.dog-walker', layer: 'near', path: Y.path(TRACK, 660, 790), speed: 7, loop: 'pingpong', s: 0.8, variant: 1, sByY: [[660, 0.85], [790, 1.15]], seed: 71, offset: 0.35 },
      { obj: 'person.walker', layer: 'mid', path: Y.path(TRACK, 560, 650, 14), speed: 4, loop: 'pingpong', s: 0.45, variant: 2, sByY: [[560, 0.7], [650, 1]], seed: 72, offset: 0.65 },
      // Blackbushe light aircraft: navigation lights and the beacon after dark
      { obj: 'vehicle.light-aircraft', layer: 'horizon', path: [[1820, 210], [-220, 170]], speed: 24, loop: 'loop', s: 0.75, seed: 73, offset: 0.2 },
      { obj: 'vehicle.light-aircraft', layer: 'horizon', path: [[-220, 330], [1820, 300]], speed: 20, loop: 'loop', s: 0.5, variant: 1, seed: 74, offset: 0.65 },
    ],
    flocks: [
      { obj: 'bird.small-flight', n: winter ? 10 : 7, area: [300, 140, 1300, 300], speed: 24, s: 0.55, seed: 81, layer: 'horizon' },
      { obj: 'bird.small-flight', n: 3, area: [700, 380, 1200, 440], speed: 30, s: 0.45, seed: 82, layer: 'far' },
    ],
  };
  // the season's own life: nightjars hawking at dusk (they are here May to August), insects, robins in winter
  if (summer || spring) {
    d.actors.push({ obj: 'bird.nightjar', layer: 'mid', path: [[300, 420], [520, 380], [760, 450], [600, 500], [360, 470]], speed: 60, loop: 'loop', s: 0.7, seed: 77, offset: 0.1 });
    d.actors.push({ obj: 'bird.nightjar', layer: 'mid', path: [[1100, 440], [900, 400], [1000, 480], [1220, 460]], speed: 54, loop: 'loop', s: 0.6, seed: 78, offset: 0.5 });
    d.actors.push({ obj: 'animal.bee', layer: 'fore', path: [[1180, 840], [1260, 822], [1220, 860]], speed: 26, loop: 'pingpong', s: 1, seed: 84 });
  }
  if (!winter) d.actors.push({ obj: 'bird.mallard', layer: 'mid', path: [[1080, 618], [1220, 622]], speed: 2.5, loop: 'pingpong', s: 0.4, variant: 1, seed: 75, offset: 0.4 });
  Y.butterflies[season].slice(0, 2).forEach((v, i) => d.actors.push({ obj: 'animal.butterfly', layer: 'near', path: [[480 + i * 420, 730], [620 + i * 380, 700], [540 + i * 400, 770], [700 + i * 360, 740]], speed: 20, loop: 'pingpong', s: 1, variant: v, seed: 90 + i, offset: i * 0.4 }));
  if (winter) d.place.push({ obj: 'bird.robin', x: 1250, y: 820, s: 1.3, layer: 'fore', variant: 0, seed: 95 }, { obj: 'bird.robin', x: 470, y: 790, s: 1, layer: 'near', variant: 1, flip: true, seed: 96 });
  if (season === 'autumn') d.flocks.push({ obj: 'bird.goose-flight', n: 7, area: [500, 120, 1300, 240], speed: 30, s: 0.5, seed: 97, layer: 'horizon' });
  return d;
}
