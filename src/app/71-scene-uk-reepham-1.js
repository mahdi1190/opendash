/* ============================================================
   COMPOSED SCENES: Reepham, Norfolk. Six DIFFERENT real places, one scene each
   (docs/dev/SCENE_ENGINE.md 3 and 8). No archetype composes these: each scene is
   its own data, drawn for its place (camera, horizon, foreground and life).
   The list of places (6):
     1. the Market Place, from the square's south-west corner at street level (the Georgian row, right)
     2. the churchyard, close up and looking up at the two flint churches (the flint wall, the oak)
     3. the fields west of town, from a field gate, the church towers on the skyline
     4. the old station: the Marriott's Way platform, the station building on the left
     5. under the Marriott's Way overbridge, looking up through the cutting
     6. a sunken lane out of town, the roofs of the Market Place at its end
   Season from the date ('auto'), light from the live sky, weather live. Data only (PURE).
   Registered by 72-anim-pack-uk-area-reepham.js. Lint and look:
     node tools/anim-pack.mjs scene lint --pack uk-area-reepham --perf
     node tools/anim-pack.mjs scene sheet --pack uk-area-reepham --contact
   ============================================================ */
(function () {
  if (typeof sceneAdd !== 'function' || typeof sceneObj !== 'function' || typeof scenePersonHeight !== 'function') return;
  const PACK = 'uk-area-reepham';
  const f1 = v => Math.round(v * 10) / 10;
  const PAL = {
    base: {
      far: ['#9aaeb6', '#b6c4c6'], hedge: ['#4a6a36', '#3c5a2e', '#56763e'], lawn: ['#6e9e4a', '#5a8a3a', '#7aa850'],
      field: ['#8eac56', '#7a9a48', '#a6bb66'], furrow: ['#6e7e40', '#5e6e34'], pave: ['#b8a890', '#9c8c74', '#c8b9a0'],
      sett: ['#8a7f72', '#6f655a'], tarmac: ['#6c6a68', '#55534f', '#7e7c78'], kerb: ['#d2c9b6', '#b8af9c'], gravel: ['#cdbfa0', '#b2a486'],
      cinder: ['#b5a587', '#9a8c72', '#c6b79a'], flint: ['#6b6862', '#8f8c84', '#4c4a46'], stone: ['#d8cfba', '#b8ae98'], verge: ['#86ae4e', '#6a9440'],
    },
    spring: { lawn: ['#82b44e', '#6ca240'], field: ['#9ec65e', '#86b04c', '#b4d26e'], hedge: ['#5a8a3e', '#4a7a34'], verge: ['#94bc52', '#76a044'] },
    summer: { field: ['#cfb66a', '#bca65a', '#dcc87c'], lawn: ['#6aa040', '#5a9038'], hedge: ['#3e6a30', '#34592a'] },
    autumn: { field: ['#a48e62', '#8e7a54', '#b8a06a'], lawn: ['#8a9a48', '#7a8a40'], hedge: ['#7a5a2e', '#6a4a26'], verge: ['#a89c54', '#8a8244'] },
    winter: { field: ['#8e927c', '#7e826c', '#9a9c84'], lawn: ['#7c8a6a', '#6c7a5a'], hedge: ['#5a4e42', '#4a4038'], verge: ['#949a82', '#7c826e'], far: ['#a8b4bc', '#c0ccd0'] },
  };
  const SKY = (n, top, H) => ({ stars: 160, clouds: { n, y: [top, Math.max(top + 60, H - 130)], speed: 6 }, sunR: 26, moonR: 20 });
  const VIEW = (lat, lon, heading, H, fov) => ({ lat, lon, heading, fov: fov || 78, horizon: H, lift: 1 });
  /** a band from y0 down to y1 (x across the whole scene). */
  const band = (layer, y0, y1, fill, x0, x1) => ({ layer, d: `M${x0 == null ? -160 : x0} ${y0}H${x1 == null ? 1760 : x1}V${y1}H${x0 == null ? -160 : x0}Z`, fill });
  const lin = (a, b, y1, y2) => ({ lin: [[0, a], [1, b]], x1: 0, y1, x2: 0, y2 });
  const poly = (layer, pts, fill) => ({ layer, d: 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z', fill });
  /** a person's size at a height on the picture (the people ladder: larger toward the foreground). */
  const pS = (obj, y, view) => scenePersonScale(sceneObj(obj).size[1], y, view);
  const scene = o => ({
    v: 1, id: o.id, view: o.view, at: o.at, season: 'auto', tropic: 'summer', palette: JSON.parse(JSON.stringify(PAL)), setting: o.setting, signage: false,
    sky: o.sky, layers: SCENE_LAYERS_DEFAULT.map(l => Object.assign({}, l)),
    ground: o.ground || [], water: o.water || [], place: o.place || [], scatter: o.scatter || [], actors: o.actors || [], flocks: o.flocks || [],
    particles: 'season', weather: 'live', camera: { pan: 0, period: 90 },
  });
  /* shared helpers for the six builders (plain data) */
  const GRASS = { 'plant.grass': 3, 'plant.wildflowers': 1 };
  const TINT = col => ({ col, k: [0, 0.16] });
  /** the horizon layer: a thin row of distant trees or hedges along the skyline. */
  const hz = (H, obj, n, seed) => ({ obj: obj === 'tree.far-broad' ? { 'tree.far-broad': 2, 'tree.far-pine': 1 } : obj, layer: 'horizon', seed, area: { rect: [-40, H - 12, 1640, H + 12] }, n, minGap: 18, s: [0.6, 1.4], flip: 0.5, variant: 'random', tint: TINT('#4a6a50') });
  /** the fore layer: grass tufts at the very bottom edge. */
  const fore = (obj, n, seed) => ({ obj, layer: 'fore', seed, area: { rect: [-40, 862, 1640, 900] }, n, minGap: 20, s: [0.8, 1.2], flip: 0.5, variant: 'random', anim: 'strip', tint: TINT('#5a4a2a') });
  /** cover in a band of the picture (the lower ground). */
  const cover = (obj, layer, y0, y1, n, seed, s, o) => Object.assign({ obj, layer, seed, area: { rect: [-40, y0, 1640, y1] }, n, minGap: 10, s, sByY: [[y0, 0.7], [y1, 1.3]], flip: 0.5, variant: 'random', tint: TINT('#5a6a3a') }, o || {});
  /** a walker or cyclist on a path, sized by the people ladder at its height. */
  const walker = (obj, layer, path, y, speed, seed, view, loop) => ({ obj, layer, path, speed, loop: loop || 'pingpong', s: pS(obj, y, view), seed, offset: (seed % 10) / 10 });

  /* ---------- 1. the Market Place, street level, from the south-west corner ---------- */
  const market = () => {
    const view = VIEW(52.7616, 1.1124, 25, 470, 80);
    const ground = [
      band('mid', 470, 900, lin('@pave.2', '@pave.1', 470, 900)),
      poly('mid', [[-160, 660], [360, 560], [360, 900], [-160, 900]], '@sett.0'),
      band('near', 700, 900, lin('@pave.0', '@pave.1', 700, 900)),
      poly('mid', [[1010, 490], [1760, 470], [1760, 640], [1120, 600]], '@tarmac.0'),
      poly('mid', [[1000, 488], [1760, 466], [1760, 474], [1008, 496]], '@kerb.0'),
      band('far', 470, 478, '@kerb.1', 0, 1000),
    ];
    { let d = ''; for (let k = 0; k < 14; k++) { const y = 470 + Math.pow(k / 14, 1.8) * 430; d += `M-160 ${f1(y)}H1760V${f1(y + 1.4)}H-160Z`; } ground.push({ layer: 'mid', d, fill: '@sett.1' }); }
    const place = [
      { obj: 'landmark.reepham-market-place', x: 1010, y: 492, s: 1.0, layer: 'far', seed: 4 },
      { obj: 'tree.plane', x: 1518, y: 620, s: 1.45, layer: 'mid', seed: 9, anim: { sway: { k: 1 } } },
      { obj: 'street.market-stall', x: 300, y: 650, s: 1.05, layer: 'mid', seed: 2, flip: false },
      { obj: 'street.market-stall', x: 560, y: 586, s: 0.82, layer: 'far', seed: 5, flip: true },
      { obj: 'vehicle.car-city', x: 1290, y: 640, s: 1.0, layer: 'mid', seed: 7, flip: false },
      { obj: 'vehicle.car-city', x: 1420, y: 812, s: 1.25, layer: 'near', seed: 8, flip: false },
    ];
    const scatter = [
      hz(470, 'tree.plane', 5, 201),
      cover('plant.towpath-hedge', 'mid', 630, 662, 24, 202, [0.7, 0.95], { minGap: 12 }),
      cover({ 'street.bollard': 2, 'street.lamp': 1, 'street.bench': 1 }, 'near', 716, 880, 60, 203, [0.8, 1.2]),
      cover(GRASS, 'near', 700, 900, 120, 204, [0.6, 1.1], { anim: 'strip' }),
      { obj: 'bird.pigeon', layer: 'near', seed: 205, area: { rect: [120, 760, 1100, 900] }, n: 10, minGap: 40, s: [0.6, 1.3], flip: 0.5, variant: 'random', tint: TINT('#7a7068'), mask: { noise: { scale: 180, cut: 0.4 } } },
      fore(GRASS, 16, 206),
    ];
    const actors = [
      walker('person.dog-walker', 'near', [[-60, 746], [1700, 732]], 740, 18, 51, view),
      walker('person.cyclist', 'mid', [[1700, 560], [-60, 560]], 560, 30, 52, view, 'loop'),
      walker('person.shopper', 'mid', [[120, 640], [940, 616]], 630, 14, 53, view),
    ];
    const flocks = [{ obj: 'bird.small-flight', n: 8, area: [200, 60, 1400, 240], speed: 26, s: 0.5, seed: 61, layer: 'far' }];
    return scene({ id: 'norfolk-market-place', view, at: 'morning', setting: 'urban', sky: SKY(4, 50, 470), ground, place, scatter, actors, flocks });
  };

  /* ---------- 2. the churchyard, close up, looking up at the two churches ---------- */
  const churchyard = () => {
    const view = VIEW(52.7619, 1.1112, 10, 250, 74);
    const ground = [
      band('horizon', 244, 262, '@far.0'),
      band('far', 250, 640, lin('@hedge.1', '@hedge.0', 250, 640)),
      band('mid', 628, 900, lin('@lawn.0', '@lawn.1', 628, 900)),
      poly('near', [[860, 652], [1000, 652], [1260, 900], [420, 900]], '@gravel.0'),
      band('near', 690, 720, '@flint.0', -160, 540), band('near', 684, 690, '@stone.0', -160, 540),
    ];
    const place = [
      { obj: 'landmark.reepham-churches', x: 880, y: 648, s: 1.55, layer: 'mid', seed: 3 },
      { obj: 'tree.ancient-oak', x: 96, y: 664, s: 1.9, layer: 'near', seed: 12, anim: { sway: { k: 0.9 } } },
      { obj: 'tree.bank-birch', x: 1490, y: 650, s: 1.5, layer: 'mid', seed: 14, anim: { sway: { k: 1.2 } } },
      { obj: 'structure.stone-wall', x: 232, y: 716, s: 1.2, layer: 'near', seed: 15 },
    ];
    const scatter = [
      hz(250, 'tree.far-broad', 14, 211),
      { obj: { 'structure.sheffield2-headstones': 3, 'structure.fence': 1 }, layer: 'near', seed: 22, area: { rect: [330, 740, 1560, 900] }, n: 16, minGap: 60, s: [0.9, 1.25], sByY: [[740, 0.8], [900, 1.25]], flip: 0.5, variant: 'random', tint: TINT('#7a7a72') },
      { obj: { 'bird.pigeon': 1 }, layer: 'near', seed: 216, area: { rect: [330, 760, 1560, 900] }, n: 8, minGap: 40, s: [0.7, 1.2], flip: 0.5, variant: 'random', tint: TINT('#7a7068') },
      cover(GRASS, 'near', 650, 900, 300, 212, [0.6, 1.1], { anim: 'strip' }),
      cover('plant.wildflowers', 'near', 660, 900, 60, 213, [0.6, 0.9], { anim: 'strip' }),
      cover('plant.towpath-hedge', 'near', 686, 730, 10, 214, [0.8, 1.0], { area: { rect: [-40, 686, 540, 730] } }),
      fore(GRASS, 18, 215),
    ];
    const actors = [
      walker('person.walker', 'near', [[1420, 880], [930, 700]], 800, 16, 61, view),
      walker('person.elderly-couple', 'mid', [[160, 800], [820, 760]], 780, 9, 62, view),
    ];
    const flocks = [{ obj: 'bird.small-flight', n: 6, area: [300, 40, 1500, 200], speed: 22, s: 0.5, seed: 63, layer: 'far' }];
    return scene({ id: 'norfolk-churchyard', view, at: 'afternoon', setting: 'mixed', sky: SKY(6, 40, 250), ground, place, scatter, actors, flocks });
  };

  /* ---------- 3. the fields west of town, from a field gate, the towers on the skyline ---------- */
  const fields = () => {
    const view = VIEW(52.7660, 1.1050, 110, 360, 78);
    const ground = [
      band('horizon', 352, 368, '@hedge.1'),
      band('far', 360, 440, '@hedge.0'),
      band('far', 436, 900, lin('@field.1', '@field.0', 436, 900)),
      poly('mid', [[-160, 520], [620, 500], [1760, 540], [1760, 900], [-160, 900]], '@field.2'),
      poly('mid', [[-160, 600], [1760, 580], [1760, 606], [-160, 626]], '@furrow.0'),
    ];
    { let d = ''; for (let k = 0; k < 22; k++) { const y = 600 + k * 14 + k * k * 0.5; d += `M-160 ${f1(y)}H1760V${f1(y + 3)}H-160Z`; } ground.push({ layer: 'near', d, fill: '@furrow.1' }); }
    const place = [
      { obj: 'landmark.reepham-churches', x: 1080, y: 438, s: 0.86, layer: 'far', seed: 7 },
      { obj: 'vehicle.tractor', x: 520, y: 672, s: 1.1, layer: 'mid', seed: 8, flip: false },
      { obj: 'structure.field-gate', x: 170, y: 820, s: 1.45, layer: 'fore', seed: 9 },
      { obj: 'tree.ancient-oak', x: 760, y: 470, s: 1.0, layer: 'far', seed: 10, anim: { sway: { k: 1 } } },
      { obj: 'animal.deer', x: 1270, y: 620, s: 1.1, layer: 'mid', seed: 11, flip: true },
    ];
    const scatter = [
      hz(360, 'tree.far-broad', 10, 221),
      { obj: { 'plant.towpath-hedge': 2, 'tree.far-broad': 1 }, layer: 'far', seed: 31, area: { rect: [-160, 380, 1760, 440] }, n: 30, minGap: 14, s: [0.5, 0.9], flip: 0.5, variant: 'random', anim: 'strip', tint: TINT('#4a6a36') },
      cover('plant.towpath-hedge', 'mid', 556, 600, 20, 222, [0.7, 1.0], { minGap: 16 }),
      cover(GRASS, 'near', 620, 900, 320, 223, [0.6, 1.1], { anim: 'strip' }),
      { obj: 'bird.goose', layer: 'mid', seed: 33, area: { rect: [900, 640, 1500, 760] }, n: 6, minGap: 40, s: [0.5, 1.2], sByY: [[640, 0.7], [760, 1.2]], flip: 0.5, variant: 'random' },
      fore(GRASS, 14, 224),
    ];
    const actors = [
      { obj: 'animal.sheep', layer: 'mid', path: [[1040, 720], [1560, 690]], speed: 4, loop: 'pingpong', s: 0.9, seed: 71, offset: 0.1 },
    ];
    const flocks = [
      { obj: 'bird.small-flight', n: 8, area: [100, 70, 1500, 250], speed: 26, s: 0.5, seed: 72, layer: 'far' },
      { obj: 'bird.goose-flight', n: 6, area: [200, 40, 1400, 170], speed: 20, s: 0.45, seed: 73, layer: 'far' },
    ];
    return scene({ id: 'norfolk-fields-west', view, at: 'noon', setting: 'natural', sky: SKY(9, 40, 360), ground, place, scatter, actors, flocks });
  };

  /* ---------- 4. the old station, the Marriott's Way platform ---------- */
  const station = () => {
    const view = VIEW(52.7568, 1.1205, 200, 430, 76);
    const ground = [
      band('horizon', 424, 438, '@hedge.1'),
      band('far', 430, 520, lin('@hedge.1', '@hedge.0', 430, 520)),
      band('mid', 500, 900, lin('@verge.0', '@verge.1', 500, 900)),
      band('mid', 520, 606, lin('@cinder.0', '@cinder.1', 520, 606)),
      band('mid', 600, 612, '@kerb.0'),
      band('near', 690, 900, lin('@gravel.0', '@gravel.1', 690, 900)),
    ];
    { let d = ''; for (let i = 0; i < 26; i++) d += `M${-150 + i * 72} ${f1(700 + (i % 3) * 14)}h${f1(14 + (i % 4) * 4)}v2h${f1(-14 - (i % 4) * 4)}Z`; ground.push({ layer: 'near', d, fill: '@cinder.2' }); }
    const place = [
      { obj: 'landmark.reepham-station', x: 430, y: 546, s: 1.15, layer: 'mid', seed: 81 },
      { obj: 'street.bench', x: 1010, y: 600, s: 1.0, layer: 'mid', seed: 82, flip: false },
      { obj: 'street.lamp', x: 1400, y: 586, s: 1.0, layer: 'mid', seed: 83, flip: false },
      { obj: 'tree.ancient-oak', x: 1560, y: 470, s: 1.2, layer: 'far', seed: 84, anim: { sway: { k: 1 } } },
    ];
    const scatter = [
      hz(430, 'tree.bank-birch', 12, 231),
      { obj: 'plant.towpath-hedge', layer: 'far', seed: 91, area: { rect: [-160, 440, 1760, 500] }, n: 40, minGap: 12, s: [0.6, 0.9], flip: 0.5, variant: 'random', anim: 'strip', tint: TINT('#4a6a36') },
      cover('plant.towpath-hedge', 'mid', 600, 650, 40, 232, [0.8, 1.1], { minGap: 18 }),
      cover(GRASS, 'near', 640, 900, 240, 233, [0.6, 1.1], { anim: 'strip' }),
      cover('plant.wildflowers', 'near', 650, 760, 30, 234, [0.6, 0.9], { anim: 'strip' }),
      { obj: 'bird.robin', layer: 'near', seed: 236, area: { rect: [200, 760, 1600, 900] }, n: 6, minGap: 60, s: [0.6, 1.1], flip: 0.5, variant: 'random', tint: TINT('#8a6a4a') },
      fore(GRASS, 16, 235),
    ];
    const actors = [
      walker('person.cyclist', 'near', [[-80, 796], [1720, 780]], 790, 26, 101, view, 'loop'),
      walker('person.walker', 'mid', [[1700, 560], [880, 552]], 556, 12, 102, view),
      walker('person.child-scooter', 'mid', [[120, 580], [700, 584]], 580, 16, 103, view),
    ];
    const flocks = [{ obj: 'bird.robin', n: 6, area: [200, 80, 1400, 240], speed: 20, s: 0.5, seed: 104, layer: 'far' }];
    return scene({ id: 'norfolk-old-station', view, at: 'golden', setting: 'mixed', sky: SKY(5, 50, 430), ground, place, scatter, actors, flocks });
  };

  /* ---------- 5. under the Marriott's Way overbridge, looking up through the cutting ---------- */
  const underBridge = () => {
    const view = VIEW(52.7660, 1.0950, 290, 330, 80);
    const ground = [
      band('horizon', 324, 336, '@hedge.1'),
      band('far', 330, 470, lin('@hedge.1', '@hedge.0', 330, 470)),
      poly('mid', [[-160, 470], [1760, 470], [1760, 900], [-160, 900]], lin('@verge.0', '@verge.1', 470, 900)),
      poly('mid', [[860, 470], [1010, 470], [1520, 900], [300, 900]], lin('@cinder.1', '@cinder.0', 470, 900)),
      poly('near', [[300, 900], [1520, 900], [1420, 900], [400, 900]], '@cinder.2'),
    ];
    const place = [
      { obj: 'landmark.marriotts-way-bridge', x: 1010, y: 452, s: 1.3, layer: 'mid', seed: 111 },
      { obj: 'tree.bank-birch', x: 200, y: 560, s: 2.0, layer: 'mid', seed: 112, anim: { sway: { k: 1.1 } } },
      { obj: 'structure.fence', x: 120, y: 760, s: 1.1, layer: 'near', seed: 113, flip: false },
      { obj: 'structure.fence', x: 1500, y: 700, s: 1.1, layer: 'near', seed: 114, flip: true },
    ];
    const scatter = [
      hz(330, 'plant.towpath-hedge', 20, 241),
      cover('plant.towpath-hedge', 'mid', 530, 700, 30, 242, [0.8, 1.2], { area: { poly: [[-160, 520], [620, 500], [820, 540], [-160, 900]] }, minGap: 22 }),
      cover('plant.towpath-hedge', 'mid', 520, 700, 30, 243, [0.8, 1.2], { area: { poly: [[1200, 500], [1760, 480], [1760, 900], [1440, 900]] }, minGap: 22 }),
      cover(GRASS, 'near', 700, 900, 260, 244, [0.6, 1.2], { anim: 'strip' }),
      cover('plant.wildflowers', 'near', 720, 900, 30, 245, [0.6, 1.0], { anim: 'strip' }),
      { obj: { 'animal.rabbit': 1, 'bird.robin': 1 }, layer: 'near', seed: 246, area: { rect: [640, 780, 1100, 900] }, n: 6, minGap: 60, s: [0.6, 1.3], sByY: [[780, 0.8], [900, 1.2]], flip: 0.5, variant: 'random', tint: TINT('#8a7058'), mask: { noise: { scale: 110, cut: 0.3 } } },
      fore(GRASS, 16, 247),
    ];
    const actors = [
      walker('person.walker', 'mid', [[-60, 540], [1620, 560]], 540, 14, 131, view),
      walker('person.dog-walker', 'near', [[1700, 800], [-60, 790]], 790, 15, 132, view),
      walker('person.cyclist', 'mid', [[-60, 500], [1700, 500]], 500, 30, 133, view, 'loop'),
    ];
    const flocks = [{ obj: 'bird.small-flight', n: 6, area: [240, 40, 1400, 200], speed: 18, s: 0.5, seed: 134, layer: 'far' }];
    return scene({ id: 'norfolk-marriotts-way-bridge', view, at: 'dawn', setting: 'natural', sky: SKY(4, 30, 330), ground, place, scatter, actors, flocks });
  };

  /* ---------- 6. a sunken lane out of town, the Market Place roofs at its end ---------- */
  const lane = () => {
    const view = VIEW(52.7700, 1.1300, 240, 400, 78);
    const ground = [
      band('horizon', 394, 406, '@hedge.1'),
      band('far', 400, 470, lin('@hedge.1', '@hedge.0', 400, 470)),
      poly('mid', [[-160, 470], [1760, 470], [1760, 900], [-160, 900]], lin('@verge.0', '@verge.1', 470, 900)),
      poly('mid', [[700, 470], [900, 470], [1260, 900], [340, 900]], '@tarmac.0'),
      poly('near', [[340, 900], [1260, 900], [1200, 900], [380, 900]], '@tarmac.2'),
      poly('mid', [[700, 470], [700, 478], [1250, 900], [1180, 900]], '@kerb.1'),
    ];
    { let d = ''; for (let k = 0; k < 12; k++) { const y = 470 + Math.pow(k / 12, 1.6) * 430; d += `M700 ${f1(y)}L740 ${f1(y)}L740 ${f1(y + 1)}Z`; } ground.push({ layer: 'mid', d, fill: '@sett.1' }); }
    const place = [
      { obj: 'landmark.reepham-market-place', x: 860, y: 432, s: 0.82, layer: 'far', seed: 141 },
      { obj: 'tree.ancient-oak', x: 96, y: 680, s: 1.7, layer: 'near', seed: 142, anim: { sway: { k: 1 } } },
      { obj: 'tree.plane', x: 1520, y: 610, s: 1.3, layer: 'mid', seed: 143, anim: { sway: { k: 1 } } },
      { obj: 'animal.deer', x: 430, y: 600, s: 1.0, layer: 'mid', seed: 144, flip: false },
    ];
    const scatter = [
      hz(400, 'tree.far-broad', 14, 251),
      cover('plant.towpath-hedge', 'mid', 560, 900, 30, 252, [0.8, 1.25], { area: { poly: [[-160, 470], [700, 470], [340, 900], [-160, 900]] }, minGap: 22 }),
      cover('plant.towpath-hedge', 'mid', 560, 900, 24, 253, [0.8, 1.25], { area: { poly: [[900, 470], [1760, 470], [1760, 900], [1260, 900]] }, minGap: 20 }),
      cover(GRASS, 'near', 740, 900, 270, 254, [0.6, 1.2], { anim: 'strip' }),
      cover('plant.wildflowers', 'near', 760, 900, 30, 255, [0.6, 1.0], { anim: 'strip' }),
      { obj: 'bird.pigeon', layer: 'near', seed: 256, area: { rect: [420, 800, 1200, 900] }, n: 6, minGap: 40, s: [0.6, 1.2], flip: 0.5, variant: 'random' },
      fore(GRASS, 16, 257),
    ];
    const actors = [
      { obj: 'vehicle.car-city', layer: 'mid', path: [[-120, 790], [1700, 740]], speed: 34, loop: 'loop', s: 1.0, seed: 161, offset: 0.1 },
      walker('person.cyclist', 'mid', [[1700, 620], [880, 560]], 600, 20, 162, view),
      walker('person.walker', 'near', [[1500, 880], [860, 640]], 820, 12, 163, view),
      walker('person.jogger', 'near', [[-80, 850], [760, 700]], 800, 22, 164, view),
    ];
    const flocks = [{ obj: 'bird.small-flight', n: 6, area: [200, 60, 1400, 250], speed: 24, s: 0.5, seed: 165, layer: 'far' }];
    return scene({ id: 'norfolk-lane-into-town', view, at: 'sunset', setting: 'natural', sky: SKY(7, 40, 400), ground, place, scatter, actors, flocks });
  };

  const ROWS = [
    ['market-place', 'The Market Place, Reepham', 52.7616, 1.1124, 'town', 'red', 'cheerful', ['reepham', 'market place', 'georgian', 'market town'], market],
    ['churchyard', 'Two churches in one churchyard', 52.7619, 1.1112, 'heritage', 'slate', 'calm', ['reepham', 'churchyard', 'flint church', 'whitwell'], churchyard],
    ['fields-west', 'Reepham towers across the fields', 52.7660, 1.1050, 'landscape', 'green', 'calm', ['reepham', 'fields', 'church towers', 'arable'], fields],
    ['old-station', 'The old station on the Marriott way', 52.7568, 1.1205, 'heritage', 'green', 'cheerful', ['reepham', 'old station', 'marriotts way', 'railway heritage'], station],
    ['marriotts-way-bridge', 'Under the Marriott way bridge', 52.7660, 1.0950, 'heritage', 'amber', 'dreamy', ['reepham', 'marriotts way', 'old railway', 'brick bridge'], underBridge],
    ['lane-into-town', 'A lane out of Reepham', 52.7700, 1.1300, 'landscape', 'orange', 'dreamy', ['reepham', 'country lane', 'hedgerows', 'dawn'], lane],
  ];
  for (const [id, label, lat, lon, ukKind, colour, mood, tags, build] of ROWS) {
    sceneAdd(PACK, { id: 'norfolk-' + id, label, site: label, ukKind, colour, mood, intensity: 'subtle', tags: ['norfolk', 'east of england'].concat(tags), lat, lon }, () => build());
  }
})();
