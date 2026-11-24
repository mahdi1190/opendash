/* ============================================================
   COMPOSED SCENES (v2, by hand) uk-north / Manchester and Salford: Salford Quays, MediaCityUK, the Northern Quarter and
   Ancoats. docs/dev/SCENE_ENGINE_V2.md. Four views, each a different real viewpoint; cameras and the landmarks drawn in
   each camera's perspective in 70-scene-lib-manchester-quays-nq.js (SCENE_MQN). PURE: each function returns its view's
   scene data, called once, lazily (72-anim-pack-uk-north-manchester-quays-nq.js).
     https://thelowry.com/about-us/the-building/   https://www.iwm.org.uk/visits/iwm-north
     https://www.mediacityuk.co.uk/   https://www.manchester.gov.uk/ (Stevenson Square; Ancoats conservation area)
   ============================================================ */
/** A pinned pixel placement of a perspective object at its anchor. */
function _mqnPin(id, v, o) {
  const a = typeof SCENE_MQN_ANCHORS !== 'undefined' && SCENE_MQN_ANCHORS[id] ? SCENE_MQN_ANCHORS[id](v || 0) : null;
  if (!a) return null;
  return Object.assign({ obj: id, variant: v || 0, x: Math.round(a[0] * 10) / 10, y: Math.round(a[1] * 10) / 10, s: 1, pin: true, shadow: false, anim: false }, o || {});
}
/** The common people mixes. */
const _MQN_WALK = { 'person.walker': 4, 'person.dog-walker': 2, 'person.couple': 2, 'person.student': 2, 'person.shopper': 1 };
/** A mover built by a behaviour preset (70-scene-lib-behaviours.js): on its water or ground, true scale, eased, no teleports. */
function _mqnBehave(data, spec) {
  if (typeof sceneBehave === 'undefined') return [];
  return sceneBehave.actors(data, spec).map(a => { delete a.$behave; return a; });
}

/* ============================================================
   View 1: Salford Quays, the Lowry's south promenade on Pier 8, looking west down the Manchester Ship Canal.
   On the right the Lowry's stainless steel rises over its glazed promenade bars: the Lyric drum, the flytower, the slim
   triangular tower at the plaza end. The promenade and its black railing run away beside the water (the leading line) to the
   Lowry lift footbridge, its four masts across the canal; on the far (Trafford) bank Imperial War Museum North's aluminium
   shards, the Air shard leaning up over everything; beyond, MediaCity's glass blocks and the white pylon of its swing
   footbridge. People and dogs on the promenade, cyclists, a rowing four on the canal, geese and gulls, pigeons by the bins.
   ============================================================ */
function sceneUkMqnV1() {
  const cam = SCENE_MQN.cams.v1, Vw = SCENE_MQN.view(cam), P = Vw.p, R1 = SCENE_MQN.r1;
  const data = {
    v: 2, id: 'mqn-quays-lowry',
    view: { lat: cam.lat, lon: cam.lon },
    camera: Object.assign({}, cam),
    at: 'afternoon', season: 'auto', setting: 'urban', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season', signage: false,
    kits: ['urban', 'water', 'birds', 'people'],
    sky: { stars: 120, clouds: { n: 4, y: [40, 300], speed: 5 }, sunR: 24, moonR: 18 },
    palette: { base: Object.assign({ far: ['#8e98a4', '#6e7884'] }, SCENE_MQN_PV.base), autumn: Object.assign({ plaza: ['#8a8070', '#968c7c'], plot: ['#7a7064', '#86796a'] }, SCENE_MQN_PV.autumn), winter: Object.assign({ far: ['#9aa2ac', '#7e8690'], plaza: ['#c4c4c2', '#cecdca'], plot: ['#b8b8b6', '#c2c1be'] }, SCENE_MQN_PV.winter) },
    surfaces: [
      { id: 'land', kind: 'plot', rest: true },
      { id: 'trafford', kind: 'plaza', poly: [[-600, 120], [-78, 120], [-78, 1000], [-600, 1000]] },
      { id: 'iwm-lawn', kind: 'park', poly: [[-200, 150], [-150, 150], [-128, 280], [-200, 300]] },
      { id: 'prom', kind: 'plaza', poly: [[-1, 3.5], [18, 3.5], [18, 420], [-1, 420]] },
      { id: 'pier9', kind: 'plaza', poly: [[-1, 420], [200, 420], [200, 1000], [-1, 1000]] },
    ],
    water: [{ id: 'canal', kind: 'harbour', poly: [[-1.0, 3], [-1.0, 900], [-78, 900], [-78, 3]], edge: 'quay', ripple: 0.25, mirror: 0.75 }],
    buildings: [], ground: [], place: [], scatter: [], actors: [], flocks: [], flows: [],
  };
  const B = data.buildings, Pl = data.place, A = data.actors, S = data.scatter;
  const H = cam.horizon;
  // the far skyline over Trafford Park and Ordsall (a low band of roofs and sheds)
  data.ground.push({ layer: 'horizon', d: `M-170 ${H + 4}L-170 ${H - 8}L120 ${H - 10}L160 ${H - 18}L260 ${H - 18}L290 ${H - 9}L620 ${H - 7}L1400 ${H - 12}L1770 ${H - 9}L1770 ${H + 4}Z`, fill: { lin: [[0, '@far.0'], [1, '@far.1']], y1: H - 20, y2: H + 4 } });
  // ---- the landmarks (drawn in this camera's perspective)
  Pl.push(_mqnPin('landmark.mqn-lowry-v1', 0), _mqnPin('landmark.mqn-iwm-v1', 0),
    _mqnPin('structure.mqn-liftbridge-v1', 0), _mqnPin('structure.mqn-mcbridge-v1', 0));
  data.ground.push(...sceneMqnPaving(cam, [[-1.0, 18, 3.5, 6], [-1.0, 18, 6, 9], [-1.0, 18, 9, 13], [-1.0, 18, 13, 18], [-1.0, 18, 18, 25], [-1.0, 18, 25, 36], [-1.0, 18, 36, 54], [-1.0, 18, 54, 90], [-1.0, 18, 90, 200]], { coping: -1.0, drain: 9.5, band: 9, flag: [0.6, 1.2] }, 11));
  for (let v = 0; v < (SCENE_MQN_ANCHORS._rails ? SCENE_MQN_ANCHORS._rails.v1 : 0); v++) Pl.push(_mqnPin('structure.mqn-quayrail-v1', v));
  // ---- MediaCity on Pier 9 beyond the bridge, Trafford Wharf's blocks along the far bank
  B.push({ foot: [[4, 470], [44, 470], [44, 510], [4, 510]], style: 'mqn-media', storeys: 12, seed: 11 });
  B.push({ foot: [[-6, 600], [30, 600], [30, 640], [-6, 640]], style: 'mqn-media', storeys: 18, seed: 12 });
  B.push({ foot: [[40, 560], [90, 560], [90, 600], [40, 600]], style: 'mqn-media', storeys: 9, seed: 13 });
  B.push({ foot: [[-150, 330], [-110, 330], [-110, 370], [-150, 370]], style: 'mqn-media', storeys: 7, seed: 14 });
  B.push({ foot: [[-240, 380], [-170, 380], [-170, 420], [-240, 420]], style: 'brutalist', storeys: 5, seed: 15 });
  B.push({ foot: [[-120, 640], [-90, 640], [-90, 700], [-120, 700]], style: 'mqn-media', storeys: 14, seed: 16 });
  // ---- the promenade: tall lamp columns by the rail, benches facing the water, lifebuoys, bollards
  for (const d of [26, 62, 118, 180]) Pl.push({ obj: 'street.lamppost', at: [-0.2, d], variant: 2, flip: true });
  for (const d of [23, 47]) Pl.push({ obj: 'street.bench', at: [0.4, d], face: 'left' });
  [16, 36, 56, 80, 104].forEach((d, i) => Pl.push({ obj: 'street.bollard', at: [-0.4, d], variant: i % 4, flip: i % 2 === 0 }));
  for (const d of [8.6, 40, 90]) Pl.push({ obj: 'street.mqn-lifebuoy', at: [-0.5, d] });
  // the bar terrace along the Lowry's glass: parasols over cafe tables, planters of grasses closing it off; bikes at a stand
  [[15, 27, 0], [15.2, 33, 1], [15, 40, 0], [15.3, 48, 1], [15, 57, 3]].forEach(([x, d, v], i) => Pl.push({ obj: 'street.mqn-parasol', at: [x, d], variant: v, flip: i % 2 === 1 }));
  for (const [x, d, v, fl] of [[14.4, 26.6, 0, true], [15.6, 40.4, 3, false], [15.8, 56.6, 1, true]]) Pl.push({ obj: 'person.cafe-goer', at: [x, d], variant: v, flip: fl, k: 0.82, anim: false });
  [[12.8, 24, 0], [12.8, 36.5, 1], [12.8, 52, 2], [12.8, 64, 0]].forEach(([x, d, v], i) => Pl.push({ obj: 'street.mqn-planter-grass', at: [x, d], variant: v, flip: i % 2 === 1, anim: false }));
  for (const [x, d, v] of [[8.2, 14.6, 0], [8.2, 16.2, 2], [8.3, 17.8, 1]]) Pl.push({ obj: 'street.mqn-bike-hoop', at: [x, d], variant: v, face: 'left' });
  // ---- the people standing still: a photographer at the rail, couples on the benches, a child on a scooter, a busker
  Pl.push({ obj: 'person.photographer', at: [-0.3, 15.5], face: 'left' }, { obj: 'person.bench-reader', at: [0.5, 23.2] },
    { obj: 'person.couple', at: [-0.2, 36], face: 'left' }, { obj: 'person.child-scooter', at: [4.6, 19] });
  // young street trees in the planting strip along the Lowry's glass (the seasons show in them)
  for (const [x, d, v] of [[11.6, 62, 0], [11.8, 98, 1], [11.6, 134, 2]]) Pl.push({ obj: 'tree.mqn-street-tree', at: [x, d], variant: v, pit: true, anim: false, flip: v === 1 });
  // pigeons pecking on the promenade, a gull on the coping
  for (const [x, d, v] of [[1.6, 7.4, 0], [2.2, 7.9, 1], [1.2, 8.3, 2], [2.8, 7.6, 3], [4.6, 11.4, 4], [5, 12, 0], [2.6, 8.8, 2]]) Pl.push({ obj: 'bird.pigeon-feral', at: [x, d], variant: v, flip: v % 2 === 1, anim: v < 2 ? undefined : false });
  Pl.push({ obj: 'bird.herring-gull', at: [-0.7, 19.6], k: 1 });
  // the near promenade: a planter of grasses and a bin at the right of the frame, a gull on the rail
  Pl.push({ obj: 'street.mqn-planter-grass', at: [4.6, 9.6], variant: 2, anim: false }, { obj: 'street.bollard', at: [2.8, 7.6], variant: 1, k: 0.8, flip: true });
  // ---- the flows: walkers, dogs, joggers both ways along the promenade (straight lanes clear of the Lowry's glass)
  const promLanes = [[1.2, 1, 300], [2.6, -1, 300], [4, 1, 300], [5.4, -1, 260], [6.8, 1, 70], [8.2, -1, 60], [9.6, 1, 22]].map(([x, dir, e]) => ({ path: [[x, 4], [x, e]], dir }));
  data.flows.push({ id: 'walkers', kind: 'walk', on: ['prom'], lanes: promLanes, density: 11, profile: 'town', mix: Object.assign({ 'person.jogger': 1, 'person.family': 1, 'person.buggy-walker': 1, 'person.elderly-couple': 1 }, _MQN_WALK), speed: [1.0, 1.5], both: true, max: 34 });
  data.flows.push({ id: 'far-walk', kind: 'walk', on: ['trafford'], lanes: [{ path: [[-84, 20], [-84, 140]], dir: 1 }, { path: [[-90, 20], [-90, 140]], dir: -1 }], density: 1.2, profile: 'town', mix: { 'person.walker': 2, 'person.couple': 1 }, speed: [1, 1.4], both: true, max: 8 });
  // ---- the near promenade: people standing about, a bin and a wayfinding totem, leaves blown against the planters
  Pl.push({ obj: 'person.phone-idler', at: [3.1, 7.4], face: 'left' }, { obj: 'person.student', at: [3.7, 7.9], face: 'left' }, { obj: 'person.takeaway-walker', at: [4.3, 8.3], face: 'right' },
    { obj: 'person.busker', at: [6.4, 12.6], face: 'left' }, { obj: 'person.bench-reader', at: [0.5, 47.2], anim: false }, { obj: 'person.elderly-walker', at: [3.4, 30], face: 'away', anim: false });
  Pl.push({ obj: 'street.mqn-bin', at: [5.4, 10.4], variant: 0 }, { obj: 'street.mqn-bin', at: [-0.3, 31], variant: 1 }, { obj: 'street.mqn-totem', at: [8.6, 22], variant: 1 },
    { obj: 'street.mqn-aboard', at: [12.4, 19.5], variant: 0 }, { obj: 'street.mqn-aboard', at: [12.2, 45], variant: 1 });
  Pl.push({ obj: 'person.couple', at: [1.5, 10.4], face: 'left' }, { obj: 'street.bench', at: [1.4, 17], face: 'left' }, { obj: 'person.bench-reader', at: [1.4, 17.2] }, { obj: 'person.child-ball', at: [2.6, 12.4], face: 'right' });
  S.push({ obj: { 'ground.leaf-litter': 3, 'ground.leaves': 1 }, tint: { col: '#6a5a3a', k: [0, 0.18] }, minGap: 8, on: 'prom', d: [5.5, 14], n: 14, dist: 'ground', cluster: { centres: 5, spread: 0.8 }, k: [0.8, 1.2], seed: 18, anim: false });
  S.push({ obj: { 'ground.leaf-litter': 3, 'ground.leaves': 1 }, tint: { col: '#6a5a3a', k: [0, 0.18] }, minGap: 8, on: 'prom', d: [5, 60], n: 70, dist: 'ground', cluster: { centres: 9, spread: 1.2 }, k: [0.7, 1.2], seed: 17, anim: false });
  // ---- the water: a rowing four on the canal, geese and a swan by the quay, mallards (behaviour presets: on the water, true scale)
  A.push(..._mqnBehave(data, { obj: 'person.rower', preset: 'swan', speedM: 3.2, route: [[-30, 60], [-36, 160], [-40, 320]], acts: false, seed: 21, offset: 0.3 }));
  A.push(..._mqnBehave(data, { obj: 'bird.goose', preset: 'goose-swim', route: [[-5, 14], [-8, 20], [-7, 26]], seed: 23 }));
  Pl.push({ obj: 'bird.goose', at: [-10, 22], variant: 1, face: 'left' });
  A.push(..._mqnBehave(data, { obj: 'bird.swan', preset: 'swan', route: [[-40, 70], [-30, 80], [-24, 96]], seed: 26, offset: 0.4 }));
  Pl.push({ obj: 'bird.mallard', at: [-3.4, 11], k: 1.45 });
  Pl.push({ obj: 'bird.coot', at: [-6, 46] });
  data.flocks.push({ obj: 'bird.herring-gull-flight', n: 4, area: [200, 80, 1300, 300], speed: 36, s: 0.5, seed: 65, layer: 'mid' });
  data.flocks.push({ obj: 'bird.goose-flight', n: 5, area: [300, 100, 1500, 260], speed: 30, s: 0.3, seed: 66, layer: 'horizon' });
  // ---- framing: the lamp standard close on the left over the water, a lifebuoy post
  
  return Object.assign(data, { place: Pl.filter(Boolean) });
}


/* ============================================================
   View 2: MediaCityUK, from the upper terrace over the Metrolink stop at the piazza, looking south to the Ship Canal.
   The stop's yellow-edged shelters and the tracks run away beside us (the leading line), curving off left between the glass
   blocks under their overhead wires; a tram comes in or pulls out every few minutes. Ahead the open piazza: the big screen on
   the studios' wall, cafe parasols, planters and young birches, people crossing in every direction, cyclists. At its end the
   quay rail, the water, and the swing footbridge's white pylon leaning back over the quay with its fan of stays; across the
   water Imperial War Museum North's shards. Commuters waiting on the platform, pigeons, gulls over the water.
   ============================================================ */
function sceneUkMqnV2() { return null; }   // superseded: a world scene (79-world-zzgallery.js OPENING) draws this item; the old builder is gone
function sceneUkMqnV3() { return null; }   // superseded: a world scene (79-world-zzgallery.js OPENING) draws this item; the old builder is gone
function sceneUkMqnV4() { return null; }   // superseded: a world scene (79-world-zzgallery.js OPENING) draws this item; the old builder is gone
