/* ============================================================
   COMPOSED SCENES, Farnborough (Rushmoor, Hampshire): EIGHT scenes, EIGHT real places.
   Each scene is its own composition (docs/dev/SCENE_ENGINE.md section 3): a camera, a
   foreground that fits the place, and the library objects placed by hand, with seeded scatter
   for the cover. No shared archetype lays them out. The season comes from the date ('auto'),
   the light from the live sky. Registered by 72-anim-pack-uk-area-farnborough.js.

   THE LOCATIONS (one scene each; the same spot is never drawn twice):
     1  Farnborough International Airshow: the crowd line, looking UP at a display pair
     2  St Michael's Abbey: up the path from the lower lawn, framed by two plane trees
     3  FAST museum (Farnborough Air Sciences Trust): from the kerb across the road, a bus passing
     4  Farnborough Main station: along the platform, one-point perspective down the tracks
     5  Farnborough North station: the level crossing from the road, a train on the line
     6  Queensmead: down the pedestrian street, the block closing the view at its end
     7  Farnborough Business Park: from the lakeside jetty, offices across the water
     8  Basingstoke Canal at Farnborough: looking down the cut from the bridge parapet

   Scene space is 1600 x 900 (x -160 to 1760 for drift). Layers: horizon, far, mid, near, fore, front.
   PURE: the scene records are built only when shown or linted (thunks).
   ============================================================ */
const FARN_PAL = {
  base: { wood: ['#4e6844', '#3c5436'], ground: ['#6a8a44', '#557236', '#42602c'], lawn: ['#6e9246', '#5a7c3a', '#486832'],
    tarmac: ['#6a6c6e', '#56585a', '#808284'], pave: ['#b8b0a2', '#9c958a', '#cfc8ba'], path: ['#b49c76', '#9a8462'], ballast: ['#8a8478', '#6a665c'] },
  spring: { wood: ['#5f7e48', '#486640'], ground: ['#74983e', '#5a7a30', '#466228'], lawn: ['#78a048', '#628a3c', '#4e7432'] },
  autumn: { wood: ['#8a6a3a', '#6a5232'], ground: ['#8a7e40', '#6e6232', '#54502a'], lawn: ['#7e8a44', '#687236', '#545c2c'] },
  winter: { wood: ['#5a5a50', '#47483f'], ground: ['#8a9080', '#6e766a', '#586058'], lawn: ['#8a9480', '#727c6a', '#5e6858'], pave: ['#bcb8b0', '#a29e96', '#d4d0c8'] },
};
const FARN_LAYERS = [{ id: 'horizon', depth: 0.08, haze: 0.45 }, { id: 'far', depth: 0.2, haze: 0.24 }, { id: 'mid', depth: 0.45, haze: 0.1 }, { id: 'near', depth: 0.75, haze: 0 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 }];
/** A scene record: the view, the sky (clouds, sun, moon) and empty arrays. */
function farnScene(o) {
  const H = o.horizon;
  return { v: 1, id: o.id, view: { lat: o.lat, lon: o.lon, heading: o.heading, fov: o.fov || 78, horizon: H, lift: 1 },
    at: o.at || 'afternoon', season: 'auto', tropic: 'summer', setting: o.setting || 'mixed', signage: false,
    palette: JSON.parse(JSON.stringify(FARN_PAL)), layers: JSON.parse(JSON.stringify(FARN_LAYERS)),
    sky: { stars: 200, clouds: { n: o.clouds == null ? 4 : o.clouds, y: [40, Math.max(200, H - 140)], speed: 5 }, sunR: 24, moonR: 18 },
    ground: [], water: [], place: [], scatter: [], actors: [], flocks: [], particles: 'season', weather: 'live', camera: { pan: 0, period: 90 } };
}
/** The heavy cover (hedges, shrubs, holly, wildflowers, planters, heather, gorse) costs three to four times a grass tuft in the SVG
    tile, so half of its weight goes to grass (the same look, inside the tile budget: scene lint, data rules). */
const FARN_HEAVY = ['plant.hedge', 'plant.shrub', 'plant.holly', 'plant.wildflowers', 'plant.heather', 'plant.gorse', 'plant.towpath-hedge', 'plant.planter'];
function farnWeights(obj) {
  if (typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  let moved = 0;
  for (const [k, w] of Object.entries(obj)) { if (FARN_HEAVY.includes(k)) { out[k] = w * 0.5; moved += w * 0.5; } else out[k] = w; }
  if (moved) out['plant.grass'] = (out['plant.grass'] || 0) + moved;
  return out;
}
/** One scatter rule over a rect [x0, y0, x1, y1]; o: seed, minGap, s, sByY, mask, extra. */
function farnScat(obj, layer, rect, n, o) {
  o = o || {};
  const r = { obj: farnWeights(obj), layer, seed: o.seed || 7, area: { rect }, n, minGap: o.minGap || 14, s: o.s || [0.5, 1], flip: 0.5, variant: 'random', anim: false };
  if (o.sByY) r.sByY = o.sByY;
  if (o.mask) r.mask = o.mask;
  if (n >= 20 && o.tint !== false) r.tint = { col: '#7a8a6a', k: [0, 0.1] };
  return Object.assign(r, o.extra || {});
}
/** The horizon layer: a band of distant wood and a few far trees along the skyline at H. */
function farnHorizon(d, H, trees) {
  d.ground.push({ layer: 'horizon', d: `M-160 ${H - 12}Q800 ${H - 26} 1760 ${H - 12}V${H + 14}H-160Z`, fill: '@wood.0' });
  d.scatter.push(farnScat(trees || { 'tree.far-broad': 2, 'tree.far-pine': 1 }, 'horizon', [-160, H - 14, 1760, H + 8], 14, { seed: 13, s: [0.2, 0.45] }));
}
/** A person at (x, y), sized for that depth. o: v (variant), flip, layer, seed, anim (true = animated). */
function farnPerson(d, id, x, y, o) {
  o = o || {};
  const def = sceneObj(id), h = def ? def.size[1] : 64;
  const r = { obj: id, x, y, s: scenePersonScale(h, y, d.view), variant: o.v || 0, flip: !!o.flip, layer: o.layer || (y > 800 ? 'fore' : 'near'), seed: o.seed || 11 };
  if (!o.anim) r.anim = false;
  return r;
}
/** A static object at (x, y) with size s. o: layer, seed, v, flip, reflect. */
function farnPut(obj, x, y, s, o) {
  o = o || {};
  const r = { obj, x, y, s, layer: o.layer || 'mid', seed: o.seed || 3, variant: o.v || 0, anim: false };
  if (o.flip) r.flip = true;
  if (o.reflect) r.reflect = true;
  return r;
}
/** A mover along a path. o: layer, speed, loop, s, seed, offset, flip, v. */
function farnWalk(obj, path, o) {
  o = o || {};
  const r = { obj, layer: o.layer || 'near', path, speed: o.speed || 8, loop: o.loop || 'loop', s: o.s || 1, seed: o.seed || 5, offset: o.offset || 0 };
  if (o.flip) r.flip = true;
  if (o.v) r.variant = o.v;
  return r;
}
/** The display pair and the airliner for the airshow sky. */
function farnDisplays(d, H) {
  d.actors.push({ obj: 'vehicle.display-jet', layer: 'horizon', path: [[-400, 250], [700, 170], [2000, 240]], speed: 120, loop: 'loop', s: 0.9, seed: 201, variant: 0, offset: 0.1 });
  d.actors.push({ obj: 'vehicle.display-jet', layer: 'horizon', path: [[-460, 286], [640, 206], [1940, 276]], speed: 120, loop: 'loop', s: 0.9, seed: 202, variant: 1, offset: 0.1 });
  d.actors.push({ obj: 'vehicle.airliner', layer: 'horizon', path: [[-500, Math.max(160, H - 260)], [2100, Math.max(120, H - 330)]], speed: 55, loop: 'loop', s: 0.9, seed: 204, offset: 0.35 });
}

const FARN_SCENES = {
  /* 1. The Farnborough International Airshow: the crowd line, looking UP at the display pair. */
  'farnborough-airshow': function () {
    const H = 640, d = farnScene({ id: 'farnborough-airshow', lat: 51.2790, lon: -0.7640, heading: 220, horizon: H, at: 'afternoon', setting: 'mixed', clouds: 5 });
    d.ground.push({ layer: 'far', d: `M-160 ${H}H1760V905H-160Z`, fill: { lin: [[0, '@lawn.0'], [1, '@lawn.1']], y1: H, y2: 905 } });
    d.ground.push({ layer: 'far', d: `M-160 ${H + 14}H1760V${H + 40}H-160Z`, fill: '@tarmac.1' });
    d.ground.push({ layer: 'far', d: `M-160 ${H + 26}H1760V${H + 28}H-160Z`, fill: '#e8e8e0' });
    d.place.push({ obj: 'landmark.farnborough-airport', x: 1180, y: H + 14, s: 0.9, layer: 'far', seed: 3, anim: false });
    farnHorizon(d, H, { 'tree.far-broad': 2, 'tree.far-pine': 1 });
    d.scatter.push(farnScat({ 'structure.fence': 1 }, 'mid', [-160, 736, 1760, 748], 12, { seed: 21, minGap: 80, s: [0.7, 1.5], sByY: [[736, 0.9], [748, 1.1]] }));
    d.scatter.push(farnScat({ 'plant.grass': 3, 'plant.wildflowers': 1.4, 'plant.heather': 1.2 }, 'near', [-160, 752, 1760, 905], 370, { seed: 28, minGap: 9, s: [0.5, 1.1], sByY: [[752, 0.7], [905, 1.3]] }));
    d.flocks.push({ obj: 'bird.gull', n: 5, area: [300, 120, 1400, 400], speed: 30, s: 0.42, seed: 93, layer: 'horizon' });
    d.scatter.push(farnScat({ 'plant.grass': 2, 'plant.wildflowers': 1 }, 'mid', [-160, 690, 1760, 742], 90, { seed: 27, minGap: 12, s: [0.3, 0.5] }));
    // the crowd from behind: a picnic, a photographer, a family, a phone, a child with a ball
    const crowd = [['person.picnicker', 180, 850, false, 0], ['person.couple', 470, 800, true, 1], ['person.photographer', 720, 884, false, 2],
      ['person.phone-idler', 1000, 812, true, 0], ['person.child-ball', 1230, 862, false, 1], ['person.elderly-couple', 1480, 800, true, 0], ['person.couple', 1600, 880, false, 1]];
    for (const [id, x, y, flip, v] of crowd) d.place.push(farnPerson(d, id, x, y, { flip, v, seed: x }));
    d.actors.push(farnWalk('person.walker', [[-100, 884], [1700, 876]], { layer: 'fore', speed: 12, s: 1.2, seed: 60, offset: 0.3, v: 5 }));
    d.actors.push(farnWalk('vehicle.car', [[-260, 712], [1860, 712]], { layer: 'mid', speed: 14, s: 0.6, seed: 62, offset: 0.5 }));
    d.place.push(farnPut('animal.rabbit', 300, 830, 0.5, { layer: 'near', seed: 63 }), farnPut('bird.pigeon', 1000, 880, 0.8, { layer: 'fore', seed: 64, flip: true }));
    farnDisplays(d, H);
    d.flocks.push({ obj: 'bird.small-flight', n: 3, area: [200, 80, 1400, 380], speed: 40, s: 0.45, seed: 99, layer: 'horizon' });
    d.flocks.push({ obj: 'bird.gull', n: 4, area: [100, 300, 1500, 420], speed: 26, s: 0.4, seed: 90, layer: 'horizon' });
    return d;
  },

  /* 2. St Michael's Abbey: up the path from the lower lawn, two plane trees framing the view. */
  'st-michaels-abbey': function () {
    const H = 500, d = farnScene({ id: 'st-michaels-abbey', lat: 51.2960, lon: -0.7512, heading: 80, horizon: H, at: 'golden', setting: 'natural', clouds: 3 });
    d.ground.push({ layer: 'far', d: `M-160 ${H}Q800 ${H - 26} 1760 ${H}V905H-160Z`, fill: { lin: [[0, '@lawn.0'], [1, '@lawn.2']], y1: H, y2: 905 } });
    d.ground.push({ layer: 'near', d: 'M700 905L752 640Q798 618 846 640L830 905Z', fill: '@path.0' });
    d.scatter.push(farnScat({ 'tree.far-broad': 3, 'tree.pond-wood': 2, 'tree.far-pine': 1 }, 'far', [-160, H - 30, 1760, H + 6], 26, { seed: 12, s: [0.3, 0.7] }));
    d.scatter.push(farnScat({ 'plant.grass': 3, 'plant.wildflowers': 1.2, 'plant.bluebells': 1 }, 'near', [-160, 640, 1760, 905], 180, { seed: 14, minGap: 14, s: [0.5, 1.1], sByY: [[640, 0.7], [905, 1.3]], mask: { avoid: [{ poly: [[700, 905], [752, 640], [846, 640], [830, 905]] }] } }));
    d.scatter.push(farnScat({ 'plant.grass': 2, 'plant.hedge': 1 }, 'mid', [-160, 690, 420, 905], 36, { seed: 15, minGap: 16, s: [0.6, 1.0], tint: false }));
    d.scatter.push(farnScat({ 'plant.grass': 3, 'plant.holly': 1 }, 'mid', [1000, 640, 1760, 905], 70, { seed: 16, minGap: 12, s: [0.5, 0.9], tint: false }));
    d.place.push(farnPut('landmark.st-michaels-abbey', 830, 640, 0.95, { layer: 'mid', seed: 3 }));
    d.place.push(farnPut('tree.plane', -30, 905, 2.4, { layer: 'fore', seed: 31, flip: true }), farnPut('tree.plane', 1640, 905, 2.1, { layer: 'fore', seed: 32 }));
    for (let i = 0; i < 4; i++) d.place.push(farnPut('structure.stone-wall', -120 + i * 170 + (i % 2) * 14, 738 + (i % 2) * 6, 1.1, { layer: 'near', seed: 40 + i, flip: i % 2 === 1 }));
    d.place.push(farnPut('street.bench', 1220, 760, 1.0, { layer: 'near', seed: 41 }), farnPut('street.bench', 330, 856, 1.1, { layer: 'fore', seed: 42, flip: true }));
    farnHorizon(d, H, { 'tree.far-broad': 2, 'tree.pond-wood': 1 });
    d.scatter.push(farnScat({ 'plant.grass': 3, 'plant.wildflowers': 1 }, 'fore', [-160, 820, 1760, 905], 100, { seed: 18, minGap: 14, tint: false, s: [0.8, 1.3], mask: { avoid: [{ poly: [[700, 905], [752, 640], [846, 640], [830, 905]] }] } }));
    d.place.push(farnPerson(d, 'person.elderly-walker', 520, 800, { layer: 'near', seed: 43, flip: true }), farnPerson(d, 'person.couple', 1100, 880, { seed: 44 }));
    d.flocks.push({ obj: 'bird.gull', n: 4, area: [300, 200, 1300, 420], speed: 26, s: 0.38, seed: 89, layer: 'horizon' }, { obj: 'bird.small-flight', n: 6, area: [200, 100, 1400, 360], speed: 34, s: 0.4, seed: 88, layer: 'horizon' });
    d.actors.push(farnWalk('person.walker', [[700, 905], [860, 650]], { layer: 'near', speed: 8, loop: 'pingpong', s: 1.0, seed: 45, offset: 0.2 }));
    d.actors.push(farnWalk('person.dog-walker', [[1700, 770], [1000, 790]], { layer: 'near', speed: 7, loop: 'pingpong', s: 1.0, seed: 46, offset: 0.6, flip: true }));
    d.actors.push(farnWalk('person.jogger', [[-100, 700], [600, 690]], { layer: 'mid', speed: 16, loop: 'loop', s: 0.9, seed: 47, offset: 0.4 }));
    d.flocks.push({ obj: 'bird.small-flight', n: 4, area: [200, 120, 1400, 400], speed: 34, s: 0.4, seed: 98, layer: 'horizon' });
    return d;
  },

  /* 3. FAST museum: from the kerb across the road, a bus passing in front of the lawn. */
  'farnborough-fast-museum': function () {
    const H = 600, d = farnScene({ id: 'farnborough-fast-museum', lat: 51.2826, lon: -0.7660, heading: 280, horizon: H, at: 'morning', setting: 'urban', clouds: 3 });
    d.ground.push({ layer: 'far', d: `M-160 ${H}H1760V660H-160Z`, fill: { lin: [[0, '@lawn.0'], [1, '@lawn.2']], y1: H, y2: 660 } });
    d.ground.push({ layer: 'mid', d: 'M-160 664H1760V724H-160Z', fill: '@tarmac.1' });
    d.ground.push({ layer: 'mid', d: 'M-160 693H1760V695H-160Z', fill: '#e8e4d0' });
    d.ground.push({ layer: 'near', d: 'M-160 724H1760V731H-160Z', fill: '#b0aca4' });
    d.ground.push({ layer: 'near', d: 'M-160 731H1760V905H-160Z', fill: { lin: [[0, '@pave.0'], [1, '@pave.2']], y1: 731, y2: 905 } });
    d.ground.push({ layer: 'near', d: 'M-160 790H1760V792H-160Z', fill: '#9c958a' }, { layer: 'near', d: 'M-160 850H1760V852H-160Z', fill: '#9c958a' });
    d.place.push(farnPut('landmark.fast-museum', 1000, 652, 1.05, { layer: 'mid', seed: 3 }));
    d.place.push(farnPut('tree.plane-avenue', 80, 680, 1.5, { layer: 'mid', seed: 71 }), farnPut('tree.plane', 1560, 690, 1.2, { layer: 'mid', seed: 72 }));
    d.place.push(farnPut('plant.planter', 360, 820, 1.2, { layer: 'near', seed: 73 }), farnPut('plant.planter', 1280, 790, 1.0, { layer: 'near', seed: 74 }));
    d.place.push(farnPut('street.bench', 760, 868, 1.1, { layer: 'fore', seed: 75, flip: true }), farnPut('street.lamppost', 1420, 760, 1.0, { layer: 'near', seed: 76 }));
    d.place.push(farnPut('vehicle.car', 1260, 706, 0.9, { layer: 'mid', seed: 77, flip: true }));
    d.scatter.push(farnScat({ 'plant.shrub': 2, 'plant.hedge': 1, 'plant.grass': 2 }, 'far', [-160, H + 10, 1760, 650], 60, { seed: 78, minGap: 16, s: [0.4, 0.8] }));
    d.scatter.push(farnScat({ 'plant.planter': 2, 'plant.shrub': 2, 'plant.grass': 2 }, 'near', [-160, 736, 1760, 905], 170, { seed: 79, minGap: 18, s: [0.6, 1.2], sByY: [[736, 0.7], [905, 1.3]] }));
    farnHorizon(d, H, { 'tree.far-broad': 2, 'tree.plane': 1 });
    d.actors.push(farnWalk('vehicle.bus', [[-300, 702], [1900, 702]], { layer: 'mid', speed: 24, s: 1.0, seed: 81, offset: 0.2 }));
    d.actors.push(farnWalk('vehicle.car', [[1900, 682], [-300, 682]], { layer: 'mid', speed: 19, s: 0.7, seed: 82, offset: 0.7, flip: true }));
    d.actors.push(farnWalk('person.student', [[-100, 770], [1700, 770]], { layer: 'near', speed: 9, s: 1.0, seed: 83, offset: 0.1 }));
    d.flocks.push({ obj: 'bird.pigeon', n: 5, area: [200, 200, 1400, 420], speed: 26, s: 0.7, seed: 87, layer: 'horizon' }, { obj: 'bird.small-flight', n: 4, area: [300, 90, 1300, 300], speed: 30, s: 0.4, seed: 86, layer: 'horizon' });
    d.actors.push(farnWalk('person.takeaway-walker', [[1700, 862], [-100, 862]], { layer: 'fore', speed: 8, s: 1.1, seed: 84, offset: 0.5, flip: true }));
    d.place.push(farnPerson(d, 'person.student', 620, 780, { seed: 85, layer: 'near' }), farnPerson(d, 'person.student', 1020, 884, { seed: 86, v: 1, flip: true }));
    d.flocks.push({ obj: 'bird.gull', n: 4, area: [300, 120, 1400, 380], speed: 30, s: 0.45, seed: 97, layer: 'horizon' });
    return d;
  },

  /* 4. Farnborough Main station: along the platform, one-point perspective down the tracks. */
  'farnborough-main-station': function () {
    const H = 470, VX = 820, d = farnScene({ id: 'farnborough-main-station', lat: 51.2966, lon: -0.7559, heading: 120, horizon: H, at: 'morning', setting: 'urban', clouds: 4 });
    d.ground.push({ layer: 'far', d: `M-160 ${H}H1760V905H-160Z`, fill: { lin: [[0, '@ballast.0'], [1, '@ballast.1']], y1: H, y2: 905 } });
    d.ground.push({ layer: 'near', d: `M${VX} ${H}H1760V905H420Z`, fill: { lin: [[0, '@pave.2'], [1, '@pave.0']], y1: H, y2: 905 } });
    for (const x of [1000, 1180, 1360, 1540, 1720]) d.ground.push({ layer: 'near', d: `M${VX} ${H}L${x} 905L${x + 2.5} 905L${VX + 1.2} ${H}Z`, fill: '@pave.1' });
    d.ground.push({ layer: 'near', d: `M${VX - 1} ${H}H${VX + 1}L442 905H420Z`, fill: '#d8b840' });
    for (const xb of [-20, 200]) d.ground.push({ layer: 'far', d: `M${VX - 0.8} ${H}H${VX + 0.8}L${xb + 5} 905H${xb - 5}Z`, fill: '#9a9a9a' });
    const xAt = (xb, y) => VX + (xb - VX) * ((y - H) / (905 - H));
    for (let k = 1; k <= 10; k++) {
      const y = H + 435 * Math.pow(k / 10, 1.6), x0 = Math.min(xAt(-20, y), xAt(200, y)) - 30, x1 = xAt(200, y) + 10;
      d.ground.push({ layer: 'near', d: `M${x0} ${y}H${x1}V${y + 2 + k * 0.4}H${x0}Z`, fill: '#5a4a3a' });
    }
    farnHorizon(d, H, { 'tree.far-broad': 3, 'tree.far-pine': 1, 'tree.plane': 1 });
    d.place.push(farnPut('landmark.farnborough-main-station', 1120, H, 0.9, { layer: 'far', seed: 3 }));
    d.scatter.push(farnScat({ 'plant.grass': 3, 'plant.shrub': 1, 'plant.wildflowers': 1, 'tree.far-birch': 0.5 }, 'near', [-160, H + 4, 800, 905], 110, { seed: 36, minGap: 12, s: [0.5, 1.0], sByY: [[H + 4, 0.5], [905, 1.3]], mask: { avoid: [{ poly: [[812, 470], [828, 470], [220, 905], [-40, 905]] }] } }));
    d.place.push(farnPut('rail.canopy', 1180, 540, 0.7, { layer: 'mid', seed: 21 }), farnPut('rail.canopy', 1420, 650, 0.95, { layer: 'near', seed: 22 }), farnPut('rail.canopy', 1640, 800, 1.3, { layer: 'fore', seed: 23 }));
    d.place.push(farnPut('street.station-clock', 1350, 560, 0.9, { layer: 'mid', seed: 24 }));
    d.place.push(farnPut('street.bench', 1250, 716, 1.0, { layer: 'near', seed: 25 }), farnPut('street.bench', 1500, 866, 1.2, { layer: 'fore', seed: 26, flip: true }));
    d.place.push(farnPerson(d, 'person.walker', 1280, 610, { seed: 27, layer: 'mid' }), farnPerson(d, 'person.walker', 1470, 760, { seed: 28, flip: true }), farnPerson(d, 'person.phone-idler', 1600, 880, { seed: 29, v: 2 }));
    d.scatter.push(farnScat({ 'street.bollard': 1, 'plant.planter': 1, 'street.bench': 0.4 }, 'near', [VX - 10, 480, 1760, 905], 260, { seed: 38, minGap: 18, s: [0.6, 1.2], sByY: [[480, 0.6], [905, 1.3]], mask: { avoid: [{ poly: [[-160, 470], [820, 470], [420, 905], [-160, 905]] }, { rect: [1100, 520, 1420, 600] }] } }));
    d.place.push(farnPut('bird.pigeon', 1000, 800, 0.9, { layer: 'near', seed: 31 }), farnPut('bird.pigeon', 1330, 860, 1.0, { layer: 'fore', seed: 32, flip: true }));
    d.actors.push(farnWalk('rail.train', [[-60, 905], [820, 470]], { layer: 'mid', speed: 16, s: 0.8, seed: 33, offset: 0.2 }));
    d.actors.push(farnWalk('person.student', [[1700, 700], [700, 690]], { layer: 'near', speed: 8, s: 1.0, seed: 34, offset: 0.4 }));
    d.scatter.push(farnScat({ 'plant.grass': 1, 'plant.wildflowers': 1 }, 'far', [-160, H + 4, 760, H + 60], 40, { seed: 35, minGap: 16, s: [0.3, 0.5] }));
    d.actors.push(farnWalk('person.walker', [[1700, 880], [900, 760]], { layer: 'near', speed: 7, s: 1.0, seed: 37, offset: 0.7 }));
    d.flocks.push({ obj: 'bird.small-flight', n: 3, area: [260, 90, 1300, 300], speed: 36, s: 0.4, seed: 96, layer: 'horizon' }, { obj: 'bird.gull', n: 5, area: [200, 120, 1500, 330], speed: 30, s: 0.4, seed: 85, layer: 'horizon' }, { obj: 'bird.pigeon', n: 4, area: [900, 700, 1700, 860], speed: 6, s: 0.8, seed: 84, layer: 'near' });
    return d;
  },

  /* 5. Farnborough North station: the level crossing from the road, a train crossing the road ahead. */
  'farnborough-north-station': function () {
    const H = 480, d = farnScene({ id: 'farnborough-north-station', lat: 51.3020, lon: -0.7430, heading: 20, horizon: H, at: 'sunset', setting: 'mixed', clouds: 5 });
    d.ground.push({ layer: 'far', d: `M-160 ${H}H1760V905H-160Z`, fill: { lin: [[0, '@lawn.0'], [1, '@lawn.2']], y1: H, y2: 905 } });
    d.ground.push({ layer: 'mid', d: 'M-160 600H1760V630H-160Z', fill: '@ballast.0' });
    d.ground.push({ layer: 'mid', d: 'M-160 606H1760V608H-160Z', fill: '#9a9a9a' }, { layer: 'mid', d: 'M-160 620H1760V622H-160Z', fill: '#9a9a9a' });
    d.ground.push({ layer: 'near', d: 'M500 905L760 905L790 480L765 480Z', fill: { lin: [[0, '@tarmac.2'], [1, '@tarmac.0']], y1: 480, y2: 905 } });
    farnHorizon(d, H, { 'tree.far-pine': 2, 'tree.far-broad': 1 });
    d.place.push(farnPut('landmark.farnborough-north-station', 1220, 600, 1.1, { layer: 'far', seed: 3 }));
    d.scatter.push(farnScat({ 'plant.grass': 1, 'plant.heather': 3 }, 'fore', [-160, 800, 1760, 905], 110, { seed: 47, minGap: 14, s: [0.8, 1.3], mask: { avoid: [{ poly: [[500, 905], [760, 905], [790, 480], [765, 480]] }] } }));
    d.place.push(farnPut('structure.level-crossing', 722, 650, 1.3, { layer: 'near', seed: 4 }));
    d.scatter.push(farnScat({ 'plant.hedge': 2, 'plant.shrub': 1, 'tree.far-pine': 1 }, 'mid', [-160, 520, 400, 905], 34, { seed: 36, minGap: 16, s: [0.6, 1.1], mask: { avoid: [{ poly: [[500, 905], [760, 905], [790, 480], [765, 480]] }] } }));
    d.scatter.push(farnScat({ 'tree.far-broad': 2, 'tree.far-pine': 1 }, 'far', [900, 470, 1760, 520], 14, { seed: 37, s: [0.25, 0.5] }));
    d.scatter.push(farnScat({ 'plant.grass': 2, 'plant.heather': 2 }, 'near', [-160, 640, 1760, 905], 170, { seed: 48, minGap: 24, s: [0.5, 1.0], sByY: [[640, 0.7], [905, 1.2]], mask: { avoid: [{ poly: [[500, 905], [760, 905], [790, 480], [765, 480]] }] } }));
d.scatter.push(farnScat({ 'plant.grass': 2, 'plant.heather': 2 }, 'near', [980, 640, 1760, 905], 150, { seed: 38, minGap: 13, s: [0.5, 1.0], sByY: [[640, 0.7], [905, 1.2]] }));
    d.place.push(farnPut('vehicle.car', 600, 760, 0.95, { layer: 'near', seed: 39, flip: true }));
    d.actors.push(farnWalk('vehicle.car', [[560, 905], [690, 690]], { layer: 'near', speed: 8, loop: 'pingpong', s: 0.9, seed: 40, offset: 0.2 }));
    d.actors.push(farnWalk('rail.train', [[-200, 614], [1800, 614]], { layer: 'mid', speed: 60, s: 0.75, seed: 41, offset: 0.3 }));
    d.actors.push(farnWalk('person.cyclist', [[700, 905], [776, 560]], { layer: 'near', speed: 10, loop: 'pingpong', s: 1.0, seed: 42, offset: 0.6 }));
    d.place.push(farnPerson(d, 'person.student', 520, 716, { seed: 43, flip: true, layer: 'near' }), farnPerson(d, 'person.dog-walker', 1380, 820, { seed: 44, v: 1 }), farnPerson(d, 'person.elderly-walker', 1180, 884, { seed: 45, flip: true }));
    d.actors.push(farnWalk('animal.sheep', [[1300, 760], [1520, 790]], { layer: 'mid', loop: 'pingpong', speed: 3, s: 0.8, seed: 46, offset: 0.3 }));
    d.flocks.push({ obj: 'bird.small-flight', n: 4, area: [200, 80, 1300, 360], speed: 34, s: 0.4, seed: 95, layer: 'horizon' }, { obj: 'bird.gull', n: 4, area: [200, 100, 1400, 300], speed: 28, s: 0.4, seed: 94, layer: 'horizon' }, { obj: 'bird.pigeon', n: 4, area: [700, 560, 1400, 620], speed: 5, s: 0.7, seed: 93, layer: 'mid' });
    return d;
  },

  /* 6. Queensmead: down the pedestrian street, the Queensmead block closing the view at its end. */
  'farnborough-queensmead': function () {
    const VX = 830, H = 420, d = farnScene({ id: 'farnborough-queensmead', lat: 51.2925, lon: -0.7555, heading: 20, horizon: H, at: 'day', setting: 'urban', clouds: 3 });
    farnHorizon(d, H, { 'tree.far-broad': 1, 'tree.plane': 1 });
    d.ground.push({ layer: 'far', d: `M-160 ${H}H1760V905H-160Z`, fill: { lin: [[0, '@pave.1'], [1, '@pave.0']], y1: H, y2: 905 } });
    for (let i = 0; i < 9; i++) { const x = -160 + i * 240; d.ground.push({ layer: 'near', d: `M${VX} ${H}L${x} 905L${x + 2} 905L${VX + 1} ${H}Z`, fill: '@pave.2' }); }
    const LEFT = [-160, 905], RIGHT = [1760, 905];
    const onEdge = (e, t) => [VX + (e[0] - VX) * t, H + (e[1] - H) * t];
    // the shopfronts: bases on the street edges, the far ones smaller
    for (const t of [0.11, 0.27, 0.52, 0.79]) { const [x, y] = onEdge(LEFT, t); d.place.push(farnPut('building.shopfront', x + 40 * t, y, 0.3 + 0.9 * t, { layer: t < 0.5 ? 'mid' : 'near', seed: Math.round(t * 100), v: Math.round(t * 17) % 6, flip: t > 0.5 })); }
    for (const t of [0.16, 0.41, 0.68]) { const [x, y] = onEdge(RIGHT, t); d.place.push(farnPut('building.shopfront', x - 40 * t, y, 0.3 + 0.9 * t, { layer: t < 0.5 ? 'mid' : 'near', seed: 200 + Math.round(t * 100), v: Math.round(t * 29) % 6 })); }
    const [lx, ly] = onEdge(LEFT, 0.06), [rx, ry] = onEdge(RIGHT, 0.08);
    d.place.push(farnPut('building.wokingham-street', lx + 30, ly, 0.45, { layer: 'far', seed: 61, flip: true }), farnPut('building.wokingham-street', rx - 30, ry, 0.5, { layer: 'far', seed: 62 }));
    d.place.push(farnPut('landmark.queensmead', VX, H, 0.8, { layer: 'far', seed: 3 }));
    d.scatter.push(farnScat({ 'plant.planter': 2, 'plant.shrub': 1, 'street.bollard': 0.8, 'street.bench': 0.3, 'plant.grass': 1 }, 'near', [-160, 600, 1760, 905], 170, { seed: 76, minGap: 16, s: [0.6, 1.2], sByY: [[600, 0.7], [905, 1.3]] }));
    const sx = VX - 330 * 0.35, sy = H + 485 * 0.35, sx2 = VX - 330 * 0.72, sy2 = H + 485 * 0.72;
    d.place.push(farnPut('street.market-stall', sx, sy, 0.9, { layer: 'mid', seed: 63 }), farnPut('street.market-stall', sx2, sy2, 1.2, { layer: 'near', seed: 64, flip: true }));
    d.place.push(farnPut('plant.planter', 1460, 720, 1.2, { layer: 'near', seed: 65 }), farnPut('plant.planter', 240, 700, 1.1, { layer: 'near', seed: 66 }));
    d.place.push(farnPut('street.bench', 420, 880, 1.2, { layer: 'fore', seed: 67, flip: true }));
    d.place.push(farnPerson(d, 'person.buggy-walker', 690, 820, { seed: 68, layer: 'fore', flip: true }), farnPerson(d, 'person.bench-sitter', 1350, 770, { seed: 69, v: 1, layer: 'near' }));
    d.place.push(farnPut('bird.pigeon', 930, 760, 0.9, { layer: 'fore', seed: 70 }), farnPut('bird.pigeon', 976, 772, 0.85, { layer: 'fore', seed: 71, flip: true, v: 1 }));
    d.actors.push(farnWalk('person.shopper', [[790, 440], [560, 905]], { layer: 'near', speed: 7, s: 1.0, seed: 72, offset: 0.1 }));
    d.actors.push(farnWalk('person.couple', [[880, 440], [1200, 905]], { layer: 'near', speed: 6, s: 1.0, seed: 73, offset: 0.5, flip: true }));
    d.actors.push(farnWalk('person.takeaway-walker', [[860, 460], [1000, 905]], { layer: 'fore', speed: 8, s: 1.1, seed: 74, offset: 0.8 }));
    d.actors.push(farnWalk('person.elderly-walker', [[1450, 905], [880, 470]], { layer: 'near', speed: 5, s: 1.0, seed: 75, offset: 0.35 }));
    d.flocks.push({ obj: 'bird.gull', n: 3, area: [300, 60, 1400, 260], speed: 26, s: 0.42, seed: 94, layer: 'horizon' }, { obj: 'bird.pigeon', n: 6, area: [200, 220, 1400, 380], speed: 22, s: 0.7, seed: 92, layer: 'horizon' }, { obj: 'bird.small-flight', n: 4, area: [300, 60, 1300, 240], speed: 34, s: 0.4, seed: 91, layer: 'horizon' });
    return d;
  },

  /* 7. Farnborough Business Park: from the lakeside jetty, the offices across the water, a jet climbing out. */
  'farnborough-business-park': function () {
    const H = 430, d = farnScene({ id: 'farnborough-business-park', lat: 51.2800, lon: -0.7730, heading: 160, horizon: H, at: 'afternoon', setting: 'mixed', clouds: 5 });
    d.ground.push({ layer: 'far', d: `M-160 ${H}H1760V482H-160Z`, fill: '@lawn.0' });
    d.water.push({ layer: 'mid', d: 'M-160 482Q800 474 1760 482V760Q800 748 -160 760Z', y0: 474, y1: 760, base: ['#8ab6c4', '#4f8ca0', '#2c5f74'], reflect: true, shimmer: 18, lightPath: true });
    d.ground.push({ layer: 'near', d: 'M-160 760Q800 748 1760 760V792H-160Z', fill: '@pave.0' });
    d.ground.push({ layer: 'near', d: 'M-160 792H1760V905H-160Z', fill: { lin: [[0, '@lawn.1'], [1, '@lawn.2']], y1: 792, y2: 905 } });
    const offices = [[-60, 1.2, 0, false], [330, 1.0, 1, true], [680, 1.15, 2, false], [1010, 1.0, 0, true], [1330, 1.2, 1, false]];
    for (const [x, s, v, flip] of offices) d.place.push(farnPut('building.business-park-office', x, 478, s, { layer: 'far', seed: 80 + (x % 97), v, flip, reflect: true }));
    d.place.push(farnPut('landmark.farnborough-airport', 1500, 440, 0.7, { layer: 'far', seed: 3 }));
    d.place.push(farnPut('structure.boardwalk', 1000, 770, 1.2, { layer: 'near', seed: 82 }));
    d.scatter.push(farnScat({ 'plant.reed': 2, 'plant.bulrush': 1 }, 'near', [-160, 752, 1760, 772], 56, { seed: 83, minGap: 12, s: [0.6, 1.0], mask: { avoid: [{ rect: [860, 740, 1140, 800] }] } }));
    farnHorizon(d, H, { 'tree.far-broad': 2, 'tree.plane': 1 });
    d.scatter.push(farnScat({ 'water.lily': 3, 'water.edge': 1 }, 'mid', [-160, 560, 1760, 740], 26, { seed: 84, minGap: 22, s: [0.6, 1.1] }));
    d.scatter.push(farnScat({ 'plant.grass': 3, 'plant.wildflowers': 1, 'plant.shrub': 1 }, 'near', [-160, 800, 1760, 905], 340, { seed: 85, minGap: 13, s: [0.5, 1.0], sByY: [[800, 0.7], [905, 1.2]], mask: { avoid: [{ rect: [860, 790, 1140, 905] }] } }));
    d.place.push(farnPut('street.bench', 1220, 860, 1.1, { layer: 'fore', seed: 86 }), farnPut('street.bench', 460, 874, 1.1, { layer: 'fore', seed: 87, flip: true }));
    d.place.push(farnPerson(d, 'person.bench-reader', 470, 820, { seed: 88, layer: 'near' }), farnPerson(d, 'person.phone-idler', 1230, 820, { seed: 89, v: 2 }), farnPerson(d, 'person.walker', 690, 860, { seed: 90, flip: true }));
    d.actors.push(farnWalk('bird.mallard', [[300, 640], [700, 650]], { layer: 'mid', loop: 'pingpong', speed: 4, s: 0.45, seed: 91, offset: 0.2 }));
    d.actors.push(farnWalk('bird.coot', [[1100, 700], [860, 690]], { layer: 'mid', loop: 'pingpong', speed: 4, s: 0.4, seed: 92, offset: 0.4, flip: true }));
    d.actors.push(farnWalk('bird.swan', [[-100, 600], [1700, 610]], { layer: 'mid', loop: 'loop', speed: 3, s: 0.5, seed: 93, offset: 0.6 }));
    d.actors.push(farnWalk('person.jogger', [[-100, 776], [1700, 778]], { layer: 'near', speed: 18, s: 1.0, seed: 100, offset: 0.2 }));
    d.actors.push(farnWalk('person.cyclist', [[1700, 812], [-100, 812]], { layer: 'fore', speed: 22, s: 1.1, seed: 101, offset: 0.6, flip: true }));
    d.actors.push(farnWalk('vehicle.display-jet', [[-200, 300], [1900, 120]], { layer: 'horizon', loop: 'loop', speed: 60, s: 0.55, seed: 102, offset: 0.5, v: 2 }));
    d.flocks.push({ obj: 'bird.goose-flight', n: 5, area: [200, 160, 1400, 300], speed: 30, s: 0.32, seed: 103, layer: 'horizon' }, { obj: 'bird.small-flight', n: 4, area: [300, 220, 1300, 340], speed: 38, s: 0.4, seed: 104, layer: 'horizon' }, { obj: 'bird.gull', n: 3, area: [400, 90, 1500, 230], speed: 28, s: 0.4, seed: 105, layer: 'horizon' });
    return d;
  },

  /* 8. The Basingstoke Canal at Farnborough: looking down the cut from the bridge parapet to the next bridge. */
  'farnborough-canal': function () {
    const H = 300, d = farnScene({ id: 'farnborough-canal', lat: 51.2690, lon: -0.7790, heading: 30, horizon: H, at: 'dusk', setting: 'mixed', clouds: 4 });
    d.ground.push({ layer: 'far', d: `M-160 ${H}H1760V905H-160Z`, fill: { lin: [[0, '@lawn.0'], [1, '@lawn.1']], y1: H, y2: 905 } });
    d.ground.push({ layer: 'far', d: `M-160 ${H}H1760V320H-160Z`, fill: '@wood.1' });
    d.water.push({ layer: 'mid', d: 'M846 310L120 905H1480L874 310Z', y0: 310, y1: 905, base: ['#7aa6b0', '#3f7080', '#24495a'], reflect: true, shimmer: 22, lightPath: true });
    d.ground.push({ layer: 'near', d: 'M846 310L120 905L150 905L858 310Z', fill: '@path.0' });
    d.ground.push({ layer: 'near', d: 'M874 310L1480 905L1450 905L866 310Z', fill: '@path.0' });
    d.ground.push({ layer: 'fore', d: 'M-160 856H1760V905H-160Z', fill: '#9c9486' }, { layer: 'fore', d: 'M-160 850H1760V858H-160Z', fill: '#d0c8b8' });
    d.place.push(farnPut('landmark.farnborough-cut-bridge', 860, 318, 1.0, { layer: 'far', seed: 3 }));
    d.scatter.push(farnScat({ 'tree.far-broad': 3, 'tree.bank-birch': 1, 'plant.towpath-hedge': 1 }, 'far', [-160, 292, 1760, 330], 26, { seed: 110, s: [0.3, 0.6] }));
    const wet = { poly: [[846, 310], [120, 905], [1480, 905], [874, 310]] };
    farnHorizon(d, H, { 'tree.far-broad': 2, 'tree.bank-birch': 1 });
    d.scatter.push(farnScat({ 'plant.reed': 3, 'plant.bulrush': 1.5, 'plant.grass': 2 }, 'mid', [-160, 330, 880, 905], 280, { seed: 111, minGap: 12, s: [0.5, 1.0], sByY: [[330, 0.6], [905, 1.3]], mask: { avoid: [wet] } }));
    d.scatter.push(farnScat({ 'plant.reed': 3, 'plant.bulrush': 1.5, 'plant.grass': 2 }, 'mid', [870, 330, 1760, 905], 280, { seed: 112, minGap: 12, s: [0.5, 1.0], sByY: [[330, 0.6], [905, 1.3]], mask: { avoid: [wet] } }));
    d.place.push(farnPut('tree.bank-birch', 200, 430, 0.9, { layer: 'mid', seed: 123 }), farnPut('tree.bank-birch', 1300, 420, 0.8, { layer: 'mid', seed: 124, flip: true }), farnPut('tree.bank-birch', 1540, 520, 1.0, { layer: 'mid', seed: 125 }), farnPut('tree.bank-birch', 1620, 700, 1.2, { layer: 'near', seed: 126, flip: true }));
    d.scatter.push(farnScat({ 'plant.grass': 3, 'plant.towpath-hedge': 1 }, 'mid', [-160, 600, 880, 905], 90, { seed: 127, minGap: 14, s: [0.5, 1.0], mask: { avoid: [wet] } }), farnScat({ 'plant.grass': 3, 'plant.towpath-hedge': 1 }, 'mid', [870, 600, 1760, 905], 90, { seed: 128, minGap: 14, s: [0.5, 1.0], mask: { avoid: [wet] } }));
    d.place.push(farnPut('boat.narrowboat', 1210, 700, 1.0, { layer: 'near', seed: 113, anim: false }));
    d.actors.push(farnWalk('boat.narrowboat', [[930, 350], [1180, 880]], { layer: 'mid', speed: 5, loop: 'loop', s: 0.6, seed: 114, offset: 0.4 }));
    d.actors.push(farnWalk('bird.mallard', [[640, 520], [740, 536]], { layer: 'mid', loop: 'pingpong', speed: 3, s: 0.4, seed: 115, offset: 0.2 }));
    d.actors.push(farnWalk('bird.coot', [[780, 720], [1000, 730]], { layer: 'near', loop: 'pingpong', speed: 3, s: 0.5, seed: 116, offset: 0.4 }));
    d.actors.push(farnWalk('person.walker', [[470, 600], [120, 890]], { layer: 'near', loop: 'pingpong', speed: 6, s: 1.0, seed: 117, offset: 0.3 }));
    d.actors.push(farnWalk('person.cyclist', [[1194, 600], [1500, 890]], { layer: 'near', loop: 'loop', speed: 10, s: 1.0, seed: 118, offset: 0.6, flip: true }));
    d.place.push(farnPerson(d, 'person.angler', 220, 790, { seed: 119, layer: 'near', flip: true }), farnPerson(d, 'person.birdwatcher', 1450, 700, { seed: 120, layer: 'mid' }));
    d.place.push(farnPut('bird.heron', 470, 560, 0.9, { layer: 'mid', seed: 121, flip: true }));
    d.flocks.push({ obj: 'bird.small-flight', n: 4, area: [300, 60, 1300, 240], speed: 34, s: 0.4, seed: 122, layer: 'horizon' }, { obj: 'bird.gull', n: 4, area: [200, 80, 1400, 260], speed: 28, s: 0.4, seed: 123, layer: 'horizon' }, { obj: 'bird.goose-flight', n: 4, area: [300, 180, 1300, 270], speed: 30, s: 0.3, seed: 124, layer: 'horizon' });
    return d;
  },
};

/* The eight rows: id, label, the place key, the view, the reason (the caption), kind, colour, mood, tags, live-sky place. */
const FARN_META = [
  ['farnborough-airshow', 'Farnborough Airshow', 'farnborough-airshow', 'wide', 'Looking up at a display pair over the crowd line', 'landmark', 'blue', 'cheerful', ['airshow', 'aviation', 'aircraft', 'crowd', 'airfield'], 51.2790, -0.7640],
  ['st-michaels-abbey', "St Michael's Abbey", 'st-michaels-abbey', 'wide', 'The abbey church up the path, framed by the trees', 'heritage', 'slate', 'calm', ['abbey', 'church', 'gothic', 'path', 'trees'], 51.2960, -0.7512],
  ['fast-museum', 'FAST museum', 'farnborough-fast-museum', 'wide', 'The museum across the road from the pavement, a bus passing', 'heritage', 'slate', 'calm', ['museum', 'aviation', 'heritage', 'street', 'bus'], 51.2826, -0.7660],
  ['main-station', 'Farnborough Main station', 'farnborough-main-station', 'wide', 'Along the platform, the tracks running away', 'heritage', 'slate', 'calm', ['station', 'railway', 'platform', 'tracks', 'commuters'], 51.2966, -0.7559],
  ['north-station', 'Farnborough North station', 'farnborough-north-station', 'wide', 'The level crossing from the road, a train on the line', 'heritage', 'slate', 'dreamy', ['station', 'level crossing', 'railway', 'road', 'heath'], 51.3020, -0.7430],
  ['queensmead', 'Queensmead, Farnborough', 'farnborough-queensmead', 'wide', 'Down the pedestrian street to the block at its end', 'heritage', 'amber', 'cheerful', ['shopping', 'pedestrian street', 'town centre', 'shopfronts', 'market'], 51.2925, -0.7555],
  ['business-park', 'Farnborough Business Park', 'farnborough-business-park', 'wide', 'The offices across the lake from the jetty, a jet climbing out', 'landscape', 'blue', 'calm', ['business park', 'offices', 'lake', 'airport', 'aviation'], 51.2800, -0.7730],
  ['canal', 'Basingstoke Canal, Farnborough', 'farnborough-canal', 'wide', 'Looking down the cut from the bridge to the next bridge', 'heritage', 'green', 'dreamy', ['canal', 'towpath', 'bridge', 'narrowboat', 'anglers'], 51.2690, -0.7790],
];
(function () {
  if (typeof sceneAdd !== 'function') return;
  for (const [key, label, place, view, reason, kind, colour, mood, tags, lat, lon] of FARN_META) {
    sceneAdd('uk-area-farnborough', { id: key, label, site: label + ' - ' + reason, tags: ['uk', 'farnborough', 'hampshire'].concat(tags), mood, colour,
      ukPlace: place, ukView: view, viewReason: reason, ukKind: kind, liveSky: { lat, lon } },
      () => FARN_SCENES[place]());
  }
})();
