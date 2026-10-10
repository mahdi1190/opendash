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
/** Office and studio workers (MediaCity, weekdays): commuters, phones, takeaway coffee. */
const _MQN_WORK = { 'person.commuter': 4, 'person.walker': 3, 'person.takeaway-walker': 2, 'person.student': 1, 'person.couple': 1, 'person.phone-idler': 1 };
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
function sceneUkMqnV2() {
  const cam = SCENE_MQN.cams.v2, H = cam.horizon;
  const data = {
    v: 2, id: 'mqn-mediacity-piazza',
    view: { lat: cam.lat, lon: cam.lon },
    camera: Object.assign({}, cam),
    at: 'afternoon', season: 'auto', setting: 'urban', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season', signage: false,
    kits: ['urban', 'water', 'birds', 'people'],
    sky: { stars: 120, clouds: { n: 4, y: [40, 300], speed: 5 }, sunR: 24, moonR: 18 },
    palette: { base: Object.assign({ far: ['#8e98a4', '#6e7884'], plaza: ['#aaa49c', '#b4aea4'] }, SCENE_MQN_PV.base), autumn: Object.assign({ plaza: ['#8e8476', '#9a9080'] }, SCENE_MQN_PV.autumn), winter: Object.assign({ far: ['#9aa2ac', '#7e8690'], plaza: ['#c6c6c4', '#d0cfcc'] }, SCENE_MQN_PV.winter) },
    surfaces: [
      { id: 'land', kind: 'plot', rest: true },
      { id: 'piazza', kind: 'plaza', poly: [[4, 3], [400, 3], [400, 130], [-400, 130], [-400, 112], [-60, 106], [-24, 92], [-8, 76], [3, 60], [4, 56]] },
      { id: 'piazza-w', kind: 'plaza', poly: [[-400, 3], [-12, 3], [-12, 40], [-400, 60]] },
      { id: 'trafford', kind: 'plaza', poly: [[-600, 318], [600, 318], [600, 1500], [-600, 1500]] },
      { id: 'tramway', kind: 'tramway', path: SCENE_MQN.track2.map(p => p.slice()), width: 7.2, markings: 'none' },
      { id: 'platform', kind: 'platform', poly: [[0.2, 20], [3.8, 20], [3.8, 56], [0.2, 56]] },
      { id: 'platform-l', kind: 'platform', poly: [[-10.8, 20], [-7.2, 20], [-7.6, 46], [-11.2, 46]] },
    ],
    water: [{ id: 'canal', kind: 'harbour', poly: [[-600, 130.2], [600, 130.2], [600, 318], [-600, 318]], edge: 'quay', ripple: 0.25, mirror: 0.75 }],
    buildings: [], ground: [], place: [], scatter: [], actors: [], flocks: [], flows: [],
  };
  const B = data.buildings, Pl = data.place, A = data.actors, S = data.scatter;
  data.ground.push({ layer: 'horizon', d: `M-170 ${H + 4}L-170 ${H - 10}L300 ${H - 12}L340 ${H - 20}L520 ${H - 20}L560 ${H - 10}L1100 ${H - 9}L1180 ${H - 16}L1300 ${H - 16}L1340 ${H - 9}L1770 ${H - 10}L1770 ${H + 4}Z`, fill: { lin: [[0, '@far.0'], [1, '@far.1']], y1: H - 22, y2: H + 4 } });
  // ---- the landmarks and the stop (drawn in this camera's perspective)
  Pl.push(_mqnPin('landmark.mqn-iwm-v2', 0), _mqnPin('structure.mqn-mcbridge-v2', 0), _mqnPin('structure.mqn-screen-v2', 0));
  const n = (k) => (SCENE_MQN_ANCHORS[k] ? SCENE_MQN_ANCHORS[k].v2 : 0);
  data.ground.push(...sceneMqnPaving(cam, [[3.8, 30, 20, 30], [-1, 30, 30, 50], [-4, 40, 50, 70], [-20, 60, 70, 86], [-26, 60, 86, 129.8], [-34, -7.4, 20, 30], [-40, -9, 30, 46]], { band: 6, flag: [0.8, 0.8] }, 12));
  for (let v = 0; v < n('_rails'); v++) Pl.push(_mqnPin('structure.mqn-quayrail-v2', v));
  for (let v = 0; v < 5; v++) Pl.push(_mqnPin('structure.mqn-ole-v2', v));
  for (let v = 0; v < 3; v++) Pl.push(_mqnPin('structure.mqn-tramstop-v2', v));
  // ---- MediaCity's glass blocks either side of the piazza, Trafford Wharf's offices across the water
  B.push({ foot: [[-46, 16], [-14, 16], [-14, 52], [-46, 52]], style: 'mqn-media', storeys: 8, seed: 31 });
  B.push({ foot: [[-70, 108], [-30, 108], [-30, 126], [-70, 126]], style: 'mqn-media', storeys: 6, seed: 22 });
  B.push({ foot: [[28.5, 18], [62, 18], [62, 48], [28.5, 48]], style: 'mqn-media', storeys: 8, seed: 22 });
  B.push({ foot: [[28.5, 50], [60, 50], [60, 98], [28.5, 98]], style: 'mqn-media', storeys: 5, seed: 34 });
  B.push({ foot: [[30, 102], [64, 102], [64, 126], [30, 126]], style: 'mqn-media', storeys: 11, seed: 20 });
  B.push({ foot: [[-200, 380], [-130, 380], [-130, 420], [-200, 420]], style: 'brutalist', storeys: 5, seed: 27 });
  // ---- the piazza: cafe parasols by the studios, planters and young birches, bike stands, benches
  [[24.5, 36, 0], [24, 42, 3], [24.4, 70, 1], [24, 77, 0]].forEach(([x, d, v], i) => Pl.push({ obj: 'street.mqn-parasol', at: [x, d], variant: v, flip: i % 2 === 1 }));
  for (const [x, d, v, fl] of [[25, 42.4, 3, false]]) Pl.push({ obj: 'person.cafe-goer', at: [x, d], variant: v, flip: fl, k: 0.82 });
  [[9, 20, 0], [14, 34, 1], [8, 52, 2], [16, 64, 0], [6, 88, 1], [18, 104, 2], [-8, 116, 0]].forEach(([x, d, v], i) => Pl.push({ obj: 'street.mqn-planter-grass', at: [x, d], variant: v, flip: i % 2 === 0, anim: false }));
  for (const [x, d, v] of [[11, 24, 0], [15, 40, 1], [10, 58, 2], [19, 70, 0], [8, 96, 1]]) Pl.push({ obj: 'tree.mqn-street-tree', at: [x, d], variant: v, k: 0.9, pit: true, anim: false });
  for (const [x, d, v] of [[5.4, 25, 0], [5.4, 26.8, 2], [5.5, 28.6, 1], [5.5, 30.4, 0]]) Pl.push({ obj: 'street.mqn-bike-hoop', at: [x, d], variant: v, flip: v === 1 });
  for (const [x, d] of [[0, 128.5], [8, 128.5], [-20, 128.5]]) Pl.push({ obj: 'street.bench', at: [x, d], face: 'away' });
  for (const [x, d] of [[-6, 126], [10, 126], [-24, 126]]) Pl.push({ obj: 'street.lamppost', at: [x, d], variant: 2 });
  Pl.push({ obj: 'street.mqn-lifebuoy', at: [4, 129.4] }, { obj: 'street.mqn-lifebuoy', at: [-14, 129.4] });
  // ---- people standing: commuters waiting on the platform, a photographer at the quay, a group by the screen
  // waiting on the platforms (anonymous silhouettes; the crowds are the flows)
  Pl.push({ obj: 'person.phone-idler', at: [1.6, 25] }, { obj: 'person.student', at: [2.4, 37], face: 'left' }, { obj: 'person.shopper', at: [1.8, 50] }, { obj: 'person.takeaway-walker', at: [-9, 26], face: 'right' });
  Pl.push({ obj: 'person.photographer', at: [2, 128], face: 'away' }, { obj: 'person.couple', at: [12, 127.5] });
  for (const [x, d, v] of [[7.4, 24, 0], [8.1, 24.6, 1], [6.8, 25.3, 2], [8.8, 25.8, 3], [9.6, 24.4, 4]]) Pl.push({ obj: 'bird.pigeon-feral', at: [x, d], variant: v, flip: v % 2 === 0 });
  // ---- the flows: the trams on their timetable (a stop at the platform), people crossing the piazza, cyclists
  data.flows.push({ id: 'trams', kind: 'tram', on: 'tramway', timetable: { every: 4, dwell: 22, stops: [{ along: 0.11 }] }, obj: 'vehicle.metrolink-m5000', mix: { 'vehicle.metrolink-m5000': 1 }, speed: [5, 7], seed: 45 });
  // people crossing the piazza on its desire lines (all clear of the tram tracks): from the stop to the studios, along the quay
  const lanes = [[[5, 22], [10, 60], [18, 124]], [[5, 34], [12, 70], [4, 126]], [[26, 26], [12, 38], [5, 46]], [[-40, 124], [0, 122], [40, 124]],
    [[26, 96], [10, 104], [-10, 116], [-40, 120]], [[5, 30], [20, 50], [26, 90]], [[3, 60], [12, 64], [26, 62]], [[12, 128], [14, 90], [6, 40]],
    [[4.6, 20], [4.6, 56]], [[22, 20], [22, 120]], [[7, 20], [8, 50], [5, 80], [-8, 118]], [[-30, 128], [20, 127.6]]].map((path, i) => ({ path, dir: i % 2 ? -1 : 1 }));
  data.flows.push({ id: 'walkers', kind: 'walk', on: ['piazza'], lanes, density: 34, profile: 'town', mix: Object.assign({}, _MQN_WORK, { 'person.family': 1, 'person.buggy-walker': 1, 'person.dog-walker': 1 }), speed: [1.0, 1.6], both: true, max: 64 });
  // ---- the water: geese, a swan (behaviour presets); gulls over
  A.push(..._mqnBehave(data, { obj: 'bird.goose', preset: 'goose-swim', route: [[-40, 190], [-20, 200], [0, 196]], seed: 43 }));
  A.push(..._mqnBehave(data, { obj: 'bird.swan', preset: 'swan', route: [[40, 230], [20, 220], [-10, 236]], seed: 45, offset: 0.4 }));
  // ---- the piazza's dressing: more trees and planters, benches with people on them, bins, totems, a coffee kiosk's tables
  for (const [x, d, v] of [[4.6, 40, 1], [20, 30, 2], [6, 66, 0], [14, 84, 2], [22, 100, 1], [-4, 104, 0]]) Pl.push({ obj: 'tree.mqn-street-tree', at: [x, d], variant: v, k: 0.95, pit: true, anim: false, flip: v === 2 });
  for (const [x, d, v] of [[3.4, 44, 0], [12, 30, 2], [18, 58, 1], [10, 92, 0]]) Pl.push({ obj: 'street.mqn-planter-grass', at: [x, d], variant: v, flip: v === 1, anim: false });
  for (const [x, d] of [[16.5, 44], [-14, 100], [26, 84]]) Pl.push({ obj: 'street.bench', at: [x, d], face: 'toward' });
  Pl.push({ obj: 'person.bench-reader', at: [16.5, 44.2] }, { obj: 'person.bench-reader', at: [-14, 100.2] }, { obj: 'person.bench-reader', at: [26, 84.2] });
  for (const [x, d, v] of [[4.4, 24, 0], [16, 52, 1], [3.6, 70, 0], [24, 66, 1]]) Pl.push({ obj: 'street.mqn-bin', at: [x, d], variant: v });
  Pl.push({ obj: 'street.mqn-totem', at: [6, 36], variant: 0 }, { obj: 'street.mqn-totem', at: [12, 112], variant: 1 }, { obj: 'street.mqn-aboard', at: [22.4, 34], variant: 0 }, { obj: 'street.mqn-aboard', at: [22.6, 74], variant: 1 });
  [[18.4, 38, 2], [19, 44, 0], [18.6, 50, 3]].forEach(([x, d, v], i) => Pl.push({ obj: 'street.mqn-parasol', at: [x, d], variant: v, flip: i % 2 === 0 }));
  for (const [x, d, v, fl] of [[18, 38.4, 1, false], [19.4, 44.4, 2, true], [18.2, 50.4, 0, false]]) Pl.push({ obj: 'person.cafe-goer', at: [x, d], variant: v, flip: fl, k: 0.82 });
  // people standing in twos and threes: a group outside the studios, a smoker, people at the screen
  Pl.push({ obj: 'person.phone-idler', at: [9, 27], face: 'left' }, { obj: 'person.commuter', at: [9.8, 27.6], face: 'right' }, { obj: 'person.student', at: [16, 62], face: 'away' }, { obj: 'person.student', at: [16.8, 62.4], face: 'left' },
    { obj: 'person.photographer', at: [20, 104], face: 'left', anim: false }, { obj: 'person.elderly-couple', at: [6, 98], face: 'away', anim: false });
  // the near platform end and the west pavement: people waiting for the tram, a planter, a bin
  Pl.push({ obj: 'person.commuter', at: [5.2, 19.6], face: 'left' }, { obj: 'person.takeaway-walker', at: [6, 20.4], face: 'left' }, { obj: 'person.student', at: [8.6, 21], face: 'right' },
    { obj: 'person.commuter-station', at: [-9, 22], face: 'right' }, { obj: 'person.phone-idler', at: [-8.6, 30], face: 'right' }, { obj: 'person.shopper', at: [-9.4, 38], face: 'right' }, { obj: 'person.commuter', at: [2.2, 31], face: 'left' }, { obj: 'person.student', at: [1.6, 44], face: 'left' });
  Pl.push({ obj: 'street.mqn-planter-grass', at: [10.6, 19.4], variant: 1 }, { obj: 'street.mqn-bin', at: [-11.4, 20], variant: 0 }, { obj: 'street.mqn-totem', at: [-11.6, 28], variant: 0 });
  S.push({ obj: { 'ground.leaf-litter': 3, 'ground.leaves': 1 }, tint: { col: '#6a5a3a', k: [0, 0.18] }, minGap: 8, on: 'piazza', d: [18, 110], n: 80, dist: 'ground', cluster: { centres: 14, spread: 1.8 }, k: [0.8, 1.3], seed: 37, anim: false });
  data.flocks.push({ obj: 'bird.herring-gull-flight', n: 5, area: [200, 80, 1400, 320], speed: 36, s: 0.5, seed: 47, layer: 'mid' });
  return Object.assign(data, { place: Pl.filter(Boolean) });
}

/* ============================================================
   View 3: the Northern Quarter, Stevenson Square from its south-west corner, looking north-east up the square.
   Lever Street runs away on the left between its Victorian warehouses (cafes, bars and shops in their ground floors, awnings
   out), the buses and black cabs coming down it, cyclists among them. The square opens on the right: setts and flags, the
   little kiosk in the middle covered all over in paint, trees in pits, bike stands, cafe tables out on the stones. At the far
   end, across Hilton Street, a tall gable painted from pavement to parapet; more warehouses round the corner. People
   everywhere: drinkers, a busker, students, a photographer at the mural, dog walkers; pigeons on the stones.
   ============================================================ */
function sceneUkMqnV3() {
  const cam = SCENE_MQN.cams.v3, H = cam.horizon;
  const data = {
    v: 2, id: 'mqn-stevenson-square',
    view: { lat: cam.lat, lon: cam.lon },
    camera: Object.assign({}, cam),
    at: 'afternoon', season: 'auto', setting: 'urban', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season', signage: false,
    kits: ['urban', 'birds', 'people'],
    sky: { stars: 80, clouds: { n: 4, y: [40, 260], speed: 5 }, sunR: 24, moonR: 18 },
    palette: { base: Object.assign({ plaza: ['#9e968c', '#aaa298'] }, SCENE_MQN_PV.base), autumn: Object.assign({ plaza: ['#887e70', '#948a7c'] }, SCENE_MQN_PV.autumn), winter: Object.assign({ plaza: ['#c2c0bc', '#cccac6'] }, SCENE_MQN_PV.winter) },
    surfaces: [
      { id: 'land', kind: 'plot', rest: true },
      { id: 'square', kind: 'plaza', poly: [[-6.5, 2], [36, 2], [36, 76.4], [-6.5, 76.4]] },
      { id: 'lever', kind: 'road', path: [[-10, 1], [-10, 72], [-14, 79], [-24, 80], [-160, 80]], width: 7, markings: 'centre' },
      { id: 'pave-l', kind: 'pavement', beside: 'lever', side: 'left', width: 3.2, kerb: 0.12 },
      { id: 'hilton', kind: 'road', path: [[-160, 80], [160, 80]], width: 7, markings: 'centre' },
      { id: 'pave-n', kind: 'pavement', beside: 'hilton', side: 'left', width: 2.4, kerb: 0.12 },
      { id: 'pave-e', kind: 'pavement', poly: [[36, 2], [39, 2], [39, 76.4], [36, 76.4]] },
    ],
    buildings: [], ground: [], place: [], scatter: [], actors: [], flocks: [], flows: [],
  };
  const B = data.buildings, Pl = data.place, A = data.actors;
  // the square's paving: setts-sized flags, bands across
  data.ground.push(...sceneMqnPaving(cam, [[-6.5, 36, 4.4, 8], [-6.5, 36, 8, 13], [-6.5, 36, 13, 20], [-6.5, 36, 20, 30], [-6.5, 36, 30, 45], [-6.5, 36, 45, 76.4]], { band: 7, flag: [0.75, 0.75] }, 13));
  // ---- the warehouses: Lever Street's west side, the far side of Hilton Street, the square's east side
  const W = (x0, x1, d0, d1, st, seed, o) => B.push(Object.assign({ foot: [[x0, d0], [x1, d0], [x1, d1], [x0, d1]], style: 'mqn-nq-warehouse', storeys: st, seed }, o || {}));
  const L = { front: 1 }, Rr = { front: 3 };
  W(-32, -16.8, 2, 16, 5, 31, L); W(-31, -16.8, 16, 29, 4, 32, L); W(-34, -16.8, 29, 45, 6, 33, L); W(-32, -16.8, 45, 58, 5, 34, L); W(-30, -16.8, 58, 76.4, 4, 35, Object.assign({ party: 'left' }, L));
  B.push({ foot: [[-22, 88], [-4, 88], [-4, 104], [-22, 104]], style: 'mqn-ancoats-mill', storeys: 6, seed: 41 });
  W(-4, 14, 86, 102, 5, 42); W(14, 30, 86, 100, 4, 43); W(30, 52, 86, 104, 6, 44); W(-46, -22, 86, 102, 5, 45); W(-70, -46, 86, 100, 4, 46);
  W(39.2, 56, 6, 26, 5, 47, Rr); W(39.2, 54, 26, 48, 4, 48, Rr); W(39.2, 58, 48, 76.4, 6, 49, Object.assign({ party: 'right' }, Rr));
  B.push({ foot: [[-20, 130], [20, 130], [20, 150], [-20, 150]], style: 'mqn-ancoats-mill', storeys: 8, seed: 50 });
  // ---- the kiosk and the painted gable (drawn in this camera's perspective)
  Pl.push(_mqnPin('structure.mqn-kiosk-v3', 0), _mqnPin('structure.mqn-mural-v3', 0));
  // ---- the square's furniture: trees in pits, lamps, bike stands, benches round the kiosk, planters, cafe tables out
  for (const [x, d, v] of [[13, 20, 0], [25.8, 31.8, 1], [20, 52, 2], [30, 66, 0], [-2, 60, 1]]) Pl.push({ obj: 'tree.mqn-street-tree', at: [x, d], variant: v, pit: true, anim: false });
  for (const [x, d] of [[-6, 10], [-6, 34], [-6, 58], [37.4, 64]]) Pl.push({ obj: 'street.lamppost', at: [x, d], variant: 3 });
  for (const [x, d, v] of [[14, 34, 0], [15.8, 34, 2], [24, 50, 0], [25.8, 50, 2]]) Pl.push({ obj: 'street.mqn-bike-hoop', at: [x, d], variant: v, flip: x > 20 });
  for (const [x, d] of [[2, 28.5], [12.5, 33], [7, 37]]) Pl.push({ obj: 'street.bench', at: [x, d], face: 'toward' });
  for (const [x, d, v] of [[-4, 6, 0], [5, 9, 1], [30, 46, 2], [-4.5, 44, 1], [20, 72, 0]]) Pl.push({ obj: 'street.mqn-planter-grass', at: [x, d], variant: v, flip: v === 1 });
  [[-3.6, 14, 0], [-3.4, 19, 2], [-3.8, 30.4, 3], [-3.4, 41.4, 1], [-3.6, 56.4, 0], [16.6, 41, 2]].forEach(([x, d, v], i) => Pl.push({ obj: 'street.mqn-parasol', at: [x, d], variant: v, flip: i % 2 === 1 }));
  for (const [x, d, v, fl] of [[-3, 19.4, 3, true], [-4.4, 30, 2, false], [16.2, 40.6, 0, true]]) Pl.push({ obj: 'person.cafe-goer', at: [x, d], variant: v, flip: fl, k: 0.82 });
  [8, 16, 26, 40, 54, 68].forEach((d, i) => Pl.push({ obj: 'street.bollard', at: [-6.2, d], variant: i % 4, flip: i % 2 === 0 }));
  // ---- people standing about: a busker by the kiosk, a photographer at the gable, students, a couple, a dog walker
  Pl.push({ obj: 'person.photographer', at: [4, 74], face: 'away' }, { obj: 'person.bench-reader', at: [12.5, 33.1] }, { obj: 'person.skateboarder', at: [16, 58] },
    { obj: 'person.child-scooter', at: [7, 24] });
  for (const [x, d, v] of [[2.6, 6.4, 1], [3.6, 6.6, 0]]) Pl.push({ obj: 'street.mqn-bike-hoop', at: [x, d], variant: v, flip: v === 1 });
  for (const [x, d, v] of [[-1.2, 7.4, 1], [-0.4, 7.8, 3], [0.6, 7.2, 0], [2.4, 8.2, 0], [3.1, 8.8, 1], [1.8, 9.2, 2], [3.8, 8.5, 3], [11, 12.4, 4], [11.6, 13, 0], [2.6, 9.8, 2]]) Pl.push({ obj: 'bird.pigeon-feral', at: [x, d], variant: v, flip: v % 2 === 1 });
  // ---- the flows: buses, cabs and cars down Lever Street and along Hilton Street; cyclists; crowds on the pavements and the square
  data.flows.push({ id: 'traffic', kind: 'drive', on: 'lever', density: 1.2, profile: 'town', mix: { 'vehicle.car-city': 4, 'vehicle.taxi-black': 2, 'vehicle.car': 2 },
    bus: { obj: 'vehicle.bus-double-decker', every: 5, stops: [{ along: 0.12, dwell: 18 }] }, max: 8, seed: 51 });
  data.flows.push({ id: 'hilton', kind: 'drive', on: 'hilton', density: 0.6, profile: 'town', mix: { 'vehicle.car-city': 3, 'vehicle.taxi-black': 1 }, max: 4, seed: 52 });
  data.flows.push({ id: 'cycles', kind: 'cycle', on: ['lever'], density: 0.5, profile: 'commuter', mix: { 'person.cyclist': 1 }, max: 4, seed: 53 });
  data.flows.push({ id: 'pavements', kind: 'walk', on: ['pave-l', 'pave-n', 'pave-e'], density: 9, profile: 'town', mix: Object.assign({ 'person.takeaway-walker': 2, 'person.commuter': 2 }, _MQN_WALK), speed: [1.0, 1.5], both: true, max: 30, seed: 54 });
  const lanes = [[[-5, 6], [6, 22], [20, 40], [34, 60]], [[34, 8], [22, 26], [10, 50], [0, 74]], [[-5, 44], [12, 46], [34, 44]], [[2, 74], [8, 50], [16, 20], [26, 5]], [[-5, 28], [10, 24], [34, 30]], [[-5, 7.2], [8, 7.6]], [[8, 9.4], [-5, 9]]].map((path, i) => ({ path, dir: i % 2 ? -1 : 1 }));
  data.flows.push({ id: 'square', kind: 'walk', on: ['square'], lanes, density: 20, profile: 'town', mix: Object.assign({ 'person.takeaway-walker': 2, 'person.family': 1, 'person.skateboarder': 1 }, _MQN_WALK), speed: [0.9, 1.4], both: true, max: 34, seed: 55 });
  // ---- the near corner of the square: people standing and talking, a busker, bins and A-boards by the cafes, leaves on the setts
  Pl.push({ obj: 'person.busker', at: [3.8, 11.2], face: 'left' }, { obj: 'person.couple', at: [1.6, 9.4], face: 'right' }, { obj: 'person.phone-idler', at: [4.6, 8.2], face: 'left' },
    { obj: 'person.student', at: [-2.2, 12.6], face: 'right' }, { obj: 'person.student', at: [-1.6, 13.2], face: 'left' }, { obj: 'person.wheelchair-user', at: [8, 18], face: 'left' }, { obj: 'person.bench-reader', at: [2, 28.7] }, { obj: 'person.bench-reader', at: [7, 37.2] });
  for (const [x, d, v] of [[-5.2, 16, 0], [6.6, 14, 1], [22, 40, 0]]) Pl.push({ obj: 'street.mqn-bin', at: [x, d], variant: v });
  for (const [x, d, v] of [[-2.6, 8.6, 0], [-2.8, 24, 1], [-2.6, 36, 0]]) Pl.push({ obj: 'street.mqn-aboard', at: [x, d], variant: v });
  Pl.push({ obj: 'street.mqn-totem', at: [9, 26], variant: 1 });
  [[-3.4, 9.8, 1], [-3.6, 24.6, 0]].forEach(([x, d, v], i) => Pl.push({ obj: 'street.mqn-parasol', at: [x, d], variant: v, flip: i % 2 === 0 }));
  for (const [x, d, v, fl] of [[-3, 10.2, 1, true], [-4, 24.8, 0, false]]) Pl.push({ obj: 'person.cafe-goer', at: [x, d], variant: v, flip: fl, k: 0.82 });
  data.scatter.push({ obj: { 'ground.leaf-litter': 3, 'ground.leaves': 1 }, tint: { col: '#6a5a3a', k: [0, 0.18] }, minGap: 8, on: 'square', d: [5, 50], n: 70, dist: 'ground', cluster: { centres: 12, spread: 1.4 }, k: [0.7, 1.2], seed: 57, anim: false });
  data.flocks.push({ obj: 'bird.herring-gull-flight', n: 3, area: [300, 60, 1300, 240], speed: 30, s: 0.45, seed: 56, layer: 'mid' });
  // ---- framing: a heritage lamp close on the left
  Pl.push({ obj: 'street.lamppost', x: 40, y: 930, s: 2.4, pin: true, layer: 'front', shadow: false, anim: false, variant: 3 });
  return Object.assign(data, { place: Pl.filter(Boolean), flocks: data.flocks.filter(Boolean) });
}

/* ============================================================
   View 4: Ancoats, on the Rochdale Canal towpath below the Redhill Street mills, looking east.
   The canal runs straight away from us between stone copings (the leading line), through a lock: the black-and-white
   balance beams of its lower gates lying back over the towpath, the upper gates beyond. On the far bank the cotton mills rise
   sheer from the wharf, six, seven and eight storeys of soot-dark brick and long ranks of small-paned windows, one after
   another into the distance, the engine-house chimney over the roofs; buddleia sprouting from the walls. Narrowboats moored
   above and below the lock, one coming down; cyclists, runners and dog walkers on the towpath, the New Islington flats
   behind its trees on the right. A heron on the lock side, mallards and a pair of swans; pigeons on the mill ledges.
   ============================================================ */
function sceneUkMqnV4() {
  const cam = SCENE_MQN.cams.v4, H = cam.horizon;
  const data = {
    v: 2, id: 'mqn-ancoats-canal',
    view: { lat: cam.lat, lon: cam.lon },
    camera: Object.assign({}, cam),
    at: 'afternoon', season: 'auto', setting: 'urban', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season', signage: false,
    kits: ['urban', 'water', 'temperate', 'birds', 'people'],
    sky: { stars: 100, clouds: { n: 4, y: [40, 280], speed: 5 }, sunR: 24, moonR: 18 },
    palette: { base: { far: ['#8a7e78', '#6a605a'] }, winter: { far: ['#9a9290', '#7a7270'] } },
    surfaces: [
      { id: 'land', kind: 'plot', rest: true },
      { id: 'wharf', kind: 'path', path: [[-10.1, 1], [-10.1, 120], [-10.6, 205]], width: 3 },
      { id: 'towpath', kind: 'towpath', path: [[0.2, 1], [0.2, 120], [-0.3, 205]], width: 3.2 },
      { id: 'wallfoot', kind: 'verge', path: [[-11.35, 1], [-11.35, 120], [-11.95, 220], [-13.35, 400]], width: 0.7 },
      { id: 'verge', kind: 'verge', path: [[3.4, 1], [3.4, 120], [2.8, 220], [1.4, 400]], width: 3.2 },
      { id: 'green', kind: 'park', poly: [[5, 1], [60, 1], [60, 300], [4, 300]] },
    ],
    water: [{ id: 'canal', kind: 'canal', path: [[-5, 1], [-5, 120], [-5.6, 220], [-6.4, 300]], width: 7.2, edge: 'coping', ripple: 0.12, mirror: 0.85 }],
    buildings: [], ground: [], place: [], scatter: [], actors: [], flocks: [], flows: [],
  };
  const B = data.buildings, Pl = data.place, A = data.actors, S = data.scatter;
  S.push({ obj: { 'ground.leaf-litter': 3, 'ground.leaves': 1 }, tint: { col: '#6a5a3a', k: [0, 0.18] }, minGap: 8, on: 'towpath', d: [4, 60], n: 40, dist: 'ground', cluster: { centres: 8, spread: 1 }, k: [0.7, 1.2], seed: 79, anim: false });
  data.ground.push({ layer: 'horizon', d: `M-170 ${H + 4}L-170 ${H - 14}L400 ${H - 16}L460 ${H - 26}L620 ${H - 26}L660 ${H - 12}L1200 ${H - 10}L1770 ${H - 14}L1770 ${H + 4}Z`, fill: { lin: [[0, '@far.0'], [1, '@far.1']], y1: H - 30, y2: H + 4 } });
  // ---- the mills along the far bank, standing on the wharf (their canal fronts face us across the water)
  const M = (x0, d0, d1, st, seed, o) => B.push(Object.assign({ foot: [[x0, d0], [-11.7, d0], [-11.7, d1], [x0, d1]], style: 'mqn-ancoats-mill', storeys: st, seed, front: 1 }, o || {}));
  M(-34, 3, 60, 7, 61); M(-32, 62, 118, 8, 62); M(-36, 120, 182, 7, 63); M(-30, 186, 250, 6, 64);
  // ---- the New Islington side: flats behind the trees (restored warehouses and new brick)
  const N = (x0, x1, d0, d1, st, seed, style) => B.push({ foot: [[x0, d0], [x1, d0], [x1, d1], [x0, d1]], style, storeys: st, seed, front: 3 });
  N(26, 44, 30, 56, 4, 71, 'victorian-terrace'); N(24, 42, 62, 96, 5, 72, 'mqn-nq-warehouse'); N(22, 46, 104, 140, 6, 73, 'mill'); N(18, 36, 150, 196, 4, 74, 'mqn-nq-warehouse');
  // ---- the lock (drawn in this camera's perspective): gates, beams, copings
  Pl.push(_mqnPin('structure.mqn-arch-v4', 0), _mqnPin('structure.mqn-lockside-v4', 0), _mqnPin('structure.mqn-lock-v4', 0), _mqnPin('structure.mqn-lock-v4', 1));
  // ---- the towpath: lamps, a bench, the railing to the green, trees and buddleia
  for (const d of [12, 40, 78, 120, 170]) Pl.push({ obj: 'street.lamppost', at: [1.7, d], variant: 3 });
  Pl.push({ obj: 'street.bench', at: [3.6, 22], face: 'left' }, { obj: 'street.bench', at: [3.6, 96], face: 'left' });
  for (const [x, d, v] of [[5.6, 18, 0], [6.2, 64, 1]]) Pl.push({ obj: 'tree.mqn-street-tree', at: [x, d], variant: v, k: 1.1, flip: d % 4 === 2, anim: false });
  S.push({ obj: { 'plant.grass': 4, 'plant.grass-long': 3, 'plant.wildflowers': 1 }, on: 'verge', d: [4, 160], n: 120, dist: 'screen', cluster: { centres: 12, spread: 2.5 }, k: [0.7, 1.15], seed: 81, anim: false, tint: { col: '#8a7a40', k: [0, 0.16] } });
  S.push({ obj: { 'plant.mqn-buddleia': 1 }, on: 'verge', d: [18, 160], n: 9, dist: 'ground', cluster: { centres: 5, spread: 6 }, k: [0.7, 1.0], seed: 80, anim: false });
  // mooring bollards along the coping, a lifebuoy, a bin
  for (const d of [64, 76]) Pl.push({ obj: 'street.bollard', at: [-1.1, d], k: 0.7, variant: d % 4, flip: d % 3 === 1 });
  Pl.push({ obj: 'street.mqn-lifebuoy', at: [2.6, 40] });
  S.push({ obj: { 'plant.grass': 3, 'plant.daisies': 1, 'plant.grass-long': 1 }, on: 'green', d: [8, 120], n: 50, dist: 'screen', cluster: { centres: 8, spread: 4 }, k: [0.7, 1.1], seed: 82, anim: false, tint: { col: '#8a8a40', k: [0, 0.16] } });
  // buddleia growing out of the wharf edge and the foot of the mill walls
  for (const [x, d, v, k] of [[-11.35, 40, 1, 1], [-11.35, 88, 2, 1.1], [-11.6, 150, 1, 1]]) Pl.push({ obj: 'plant.mqn-buddleia', at: [x, d], variant: v, k, anim: false });
  // ---- the boats: moored below and above the lock, one on the move (a flow both ways)
  Pl.push({ obj: 'boat.narrowboat', on: 'canal', d: 16, u: 0.22, variant: 0, face: 'away' }, { obj: 'boat.narrowboat', on: 'canal', d: 94, u: 0.2, variant: 1, face: 'toward' },
    { obj: 'boat.narrowboat', on: 'canal', d: 132, u: 0.22, variant: 2, face: 'away' });
  // ---- the towpath's people: cyclists, runners, walkers with dogs; a couple on the bench, someone at the lock
  data.flows.push({ id: 'towpath', kind: 'walk', on: ['towpath'], lanes: [{ path: [[-0.4, 1], [-0.4, 22], [0.9, 28], [0.9, 58], [-0.4, 64], [-0.4, 120], [-0.8, 204]], dir: 1 }, { path: [[1.2, 1], [1.2, 120], [0.4, 204]], dir: -1 }], density: 8, profile: 'leisure', mix: { 'person.walker': 3, 'person.dog-walker': 3, 'person.jogger': 2, 'person.couple': 2, 'person.student': 2, 'person.buggy-walker': 1 }, speed: [1.0, 2.6], both: true, max: 18, seed: 84 });
  data.flows.push({ id: 'cycles', kind: 'cycle', on: 'towpath', lanes: [{ path: [[0.3, 1], [0.3, 22], [1.0, 28], [1.0, 58], [0.3, 64], [0.3, 120], [-0.2, 204]], dir: 1 }], density: 0.8, profile: 'commuter', mix: { 'person.cyclist': 1 }, max: 4, seed: 85 });
  Pl.push({ obj: 'person.bench-reader', at: [3.6, 22.2] }, { obj: 'person.bench-reader', at: [3.6, 96.2] }, { obj: 'street.mqn-bin', at: [1.7, 66], variant: 1 }, { obj: 'person.couple', at: [-10.2, 70], face: 'away' }, { obj: 'person.walker', at: [-10.4, 110], face: 'toward' }, { obj: 'person.photographer', at: [-0.8, 46], face: 'left' }, { obj: 'person.angler', at: [-1.2, 104], face: 'left' });
  // ---- the water birds: a heron on the coping by the lock, mallards, swans, a coot; gulls over
  Pl.push({ obj: 'bird.heron', at: [-1.3, 27], k: 1.05 });
  A.push(..._mqnBehave(data, { obj: 'bird.mallard', preset: 'duck', route: [[-2.8, 10], [-3.6, 15], [-2.9, 20]], acts: ['look', 'preen'], k: 1.45, seed: 87 }));
  A.push(..._mqnBehave(data, { obj: 'bird.mallard', preset: 'duck', route: [[-6.6, 8], [-7.3, 13], [-6.8, 19]], acts: ['look', 'preen'], k: 1.45, variant: 1, seed: 88, offset: 0.55 }));
  A.push(..._mqnBehave(data, { obj: 'bird.swan', preset: 'swan', route: [[-5, 110], [-4, 130], [-5.4, 150]], seed: 89, offset: 0.3 }));
  Pl.push({ obj: 'bird.coot', at: [-6.4, 22] });
  // near the camera on the towpath: a runner (behaviour preset; the walkers and dogs are the towpath flow)
  A.push(..._mqnBehave(data, { obj: 'person.jogger', preset: 'jogger', route: [[1.3, 3], [1.3, 120], [0.6, 200]], loop: 'through', seed: 103, offset: 0.35 }));
  Pl.push({ obj: 'person.angler', at: [-1.1, 12], face: 'left' }, { obj: 'person.couple', at: [1.4, 16], face: 'left' });
  S.push({ obj: { 'ground.leaf-litter': 3, 'ground.leaves': 1 }, tint: { col: '#6a5a3a', k: [0, 0.18] }, minGap: 8, on: 'towpath', d: [6, 18], n: 26, dist: 'ground', cluster: { centres: 5, spread: 0.8 }, k: [0.8, 1.2], seed: 78, anim: false });
  data.flocks.push({ obj: 'bird.herring-gull-flight', n: 3, area: [300, 60, 1300, 260], speed: 30, s: 0.45, seed: 91, layer: 'mid' });
  data.flocks.push({ obj: 'bird.pigeon', n: 5, area: [200, 120, 700, 300], speed: 40, s: 0.4, seed: 92, layer: 'near' });
  // ---- framing: a big buddleia at the bottom right, its spikes nodding into the frame
  Pl.push({ obj: 'plant.mqn-buddleia', x: 1580, y: 930, s: 1.1, pin: true, layer: 'front', shadow: false, anim: false, variant: 2 });
  return Object.assign(data, { place: Pl.filter(Boolean) });
}
