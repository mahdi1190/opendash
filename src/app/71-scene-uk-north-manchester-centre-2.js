/* ============================================================
   COMPOSED SCENE (v2, by hand) uk-north-west / Manchester civic quarter, view 2: St Peter's Square and the Central Library.
   docs/dev/SCENE_ENGINE_V2.md. Ground plan and landmarks in 70-scene-lib-manchester-centre.js (SCENE_MCR_SPEC.*[0]).

   The view: from the square's south-east corner by One St Peter's Square, looking north-west across the Metrolink stop.
   The four-track stop runs across the middle ground, its two island platforms under the slim glass canopies, M5000 trams
   (yellow and silver) pulling in both ways. Behind it the Central Library's rotunda and portico on the left of centre,
   the Town Hall Extension's tall window strips on the right, the Town Hall clock tower over its roof, the Cenotaph and its
   obelisks in front of the Extension, St Peter's Cross beside the library, the Midland Hotel's turret far off on the left.
   Framing: a young plane tree close on the left, a lamp standard and a bench on the right. The life: people waiting on
   the platforms, the crowd crossing the square both ways, cyclists, pigeons, a pair reading the Cenotaph's stone.
   PURE: defines sceneUkMcrCentre2() -> the scene data, called once, lazily.
   ============================================================ */
function sceneUkMcrCentre2() {
  const M = SCENE_MCR, cam = SCENE_MCR_VIEWS.v2.camera, C = M.cam(cam);
  const R1 = v => Math.round(v * 10) / 10, R2 = v => Math.round(v * 100) / 100;
  const lineD = (d0) => (x) => R2(d0 + x * 0.06);   // the stop's alignment: across the view, a little closer on the left
  const LA = lineD(22), LB = lineD(36), LP = lineD(29);
  const strip = (f) => [[-160, f(-160)], [-40, f(-40)], [40, f(40)], [160, f(160)]];
  const data = {
    v: 2, id: 'mcr-centre-2',
    view: { lat: cam.lat, lon: cam.lon },
    camera: Object.assign({}, cam),
    at: 'afternoon', season: 'auto', setting: 'urban', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season', signage: false,
    kits: ['urban', 'people', 'birds'],
    sky: { stars: 120, clouds: { n: 5, y: [30, 240], speed: 5 }, sunR: 22, moonR: 16 },
    palette: M.palette(),
    surfaces: [
      { id: 'land', kind: 'plaza', rest: true },
      { id: 'lawn', kind: 'lawn', poly: [[-70, 54], [-34, 52], [-30, 66], [-72, 70]] },
      { id: 'line-a', kind: 'tramway', path: strip(LA), width: 7, tracks: 2, markings: 'none' },
      { id: 'line-b', kind: 'tramway', path: strip(LB), width: 7, tracks: 2, markings: 'none' },
      { id: 'island', kind: 'platform', path: [[-38, LP(-38)], [38, LP(38)]], width: 5 },
      { id: 'near-sq', kind: 'plaza', poly: [[-60, 6], [60, 6], [60, LA(60) - 4], [-60, LA(-60) - 4]] },
      { id: 'far-sq', kind: 'plaza', poly: [[-30, LB(-30) + 5], [70, LB(70) + 5], [70, 90], [-30, 70]] },
    ],
    water: [], ground: [], place: [], scatter: [], actors: [], flocks: [], buildings: [],
    flows: [
      { id: 'trams-a', kind: 'tram', on: 'line-a', timetable: { every: 3, dwell: 22, stops: [{ along: 0.5 }] }, obj: 'vehicle.metrolink-m5000', seed: 21 },
      { id: 'trams-b', kind: 'tram', on: 'line-b', timetable: { every: 4, dwell: 22, stops: [{ along: 0.5 }] }, obj: 'vehicle.metrolink-m5000', seed: 22 },
      { id: 'crowd', kind: 'walk', on: ['near-sq'], density: 9, profile: 'town', mix: { 'person.commuter': 5, 'person.walker': 5, 'person.student': 3, 'person.shopper': 2, 'person.couple': 2, 'person.takeaway-walker': 2, 'person.buggy-walker': 1, 'person.elderly-walker': 1 }, speed: [1.0, 1.5], both: true, max: 24, seed: 23,
        lanes: [{ path: [[-40, 12.6], [-6, 13.2], [36, 12.4]], dir: 1 }, { path: [[-44, 15.6], [0, 15], [44, 16.2]], dir: -1 }, { path: [[-30, 14.2], [8, 14.6], [44, 14.4]], dir: 1 },
          { path: [[-30, 40], [10, 39], [50, 41]], dir: 1 }, { path: [[18, 58], [40, 56], [70, 59]], dir: -1 }, { path: [[-28, 50], [-12, 46], [0, 41]], dir: 1 }] },
      { id: 'platform', kind: 'walk', on: ['island'], density: 2, profile: 'commuter', mix: { 'person.commuter-station': 3, 'person.commuter': 2, 'person.student': 1 }, speed: [0.8, 1.2], both: true, max: 6, seed: 24 },
    ],
  };
  const Pl = data.place;
  // ---- the paving: long pale bands parallel to the stop, joints across
  data.ground.push(...M.paving(cam, [0, 8], [1, 0.06], [0, 1], -80, 80, [2, 5, 8, 11], 0.16, '@plaza.1', null));
  data.ground.push(...M.paving(cam, [0, 52], [1, 0.06], [0, 1], -30, 80, [4, 9, 14, 20], 0.16, '@plaza.1', null));
  // ---- the landmarks, each in this camera (pinned at their nearest ground point)
  const pin = (obj, x, d, v, layer, extra) => { const p = C.p(x, d, 0); Pl.push(Object.assign({ obj, variant: v || 0, x: R1(p[0]), y: R1(p[1]), s: 1, pin: true, layer, shadow: false, anim: false }, extra || {})); };
  pin('landmark.mcr-town-hall-tower-far', 34, 205, 0, 'far');
  { const F = SCENE_MCR_SPEC.extension[0].foot; pin('landmark.mcr-town-hall-extension', F[1][0], F[1][1], 0, 'mid'); }
  { const n = SCENE_MCR_NEAR(SCENE_MCR_SPEC.midland[1].foot); pin('landmark.mcr-midland-hotel', n[0], n[1], 1, 'mid'); }
  { const S = SCENE_MCR_SPEC.library[0], fa = Math.atan2(S.face[1], S.face[0]); pin('landmark.mcr-central-library', S.at[0] + Math.cos(fa) * S.r, S.at[1] + Math.sin(fa) * S.r - 6, 0, 'mid', { subject: true }); }
  pin('landmark.mcr-cenotaph', 6, 47, 0, 'near');
  // the Peter Street blocks beyond the library on the left, the Mosley Street ones far right
  data.buildings.push({ style: 'mcr-palazzo', foot: [[-92, 150], [-60, 128], [-46, 146], [-78, 168]], front: 0, storeys: 6, seed: 511 });
  data.buildings.push({ style: 'mcr-palazzo', foot: [[96, 150], [140, 150], [140, 175], [96, 175]], front: 0, storeys: 6, seed: 512 });
  // ---- the stop: the canopies on the island, bins and the ticket machine, people waiting
  Pl.push({ obj: 'street.mcr-tram-shelter', on: 'island', along: 0.32, u: 0.5, k: 1, variant: 0 }, { obj: 'street.mcr-tram-shelter', on: 'island', along: 0.68, u: 0.5, k: 1, variant: 1 });
  for (const [al, u, o, v] of [[0.24, 0.35, 'person.phone-idler', 1], [0.5, 0.3, 'person.student', 0]])
    Pl.push({ obj: o, on: 'island', along: al, u, k: 1, variant: v, anim: false });
  // ---- the square: St Peter's Cross by the library, the lawn, lamp standards (not in a row), benches, a pair at the Cenotaph
  Pl.push({ obj: 'street.mcr-peters-cross', at: [-40, 60], k: 1 },
    { obj: 'person.couple', at: [3, 43.2], k: 1, anim: false, face: 'away' },
    { obj: 'street.lamppost', at: [-7, 17.9], k: 1.2, variant: 0 }, { obj: 'street.lamppost', at: [8.5, 18.3], k: 1.2, variant: 0, flip: true }, { obj: 'street.lamppost', at: [44, 58], k: 1.2, variant: 3 }, { obj: 'street.lamppost', at: [-36, 56], k: 1.2, variant: 3, flip: true },
    { obj: 'street.bench', at: [-28, 64], k: 1 }, { obj: 'person.bench-reader', at: [-25.5, 64.2], k: 1 },
    { obj: 'tree.plane-avenue', at: [-52, 60], k: 0.9, variant: 2, pit: true }, { obj: 'tree.plane-avenue', at: [-64, 66], k: 0.95, variant: 1, pit: true }, { obj: 'tree.plane-avenue', at: [58, 64], k: 0.9, variant: 2, pit: true });
  Pl.push(...M.pigeons(29, [[-3, 11.6, 6, 4], [5, 12.6, 4, 3]], (x, d) => [x, d]));
  data.flocks.push({ obj: 'bird.small-flight', n: 7, area: [200, 300, 900, 480], speed: 55, s: 0.45, seed: 26, layer: 'mid' });
  data.flocks.push({ obj: 'bird.gull', n: 3, area: [300, 60, 1500, 220], speed: 24, s: 0.35, seed: 27, layer: 'far' });
  // ---- close by: a child chasing the pigeons and the family dog, someone on the phone, bollards along the tram corridor
  Pl.push({ obj: 'person.child-ball', at: [2.2, 15.4], k: 1 },
    { obj: 'street.bollard', at: [-6, 17.6], k: 1 }, { obj: 'street.bollard', at: [-1.6, 17.8], k: 1 }, { obj: 'street.bollard', at: [3, 17.7], k: 1 });
  // ---- framing: a young plane close on the left, a lamp standard, a bench and its sitter on the right
  Pl.push({ obj: 'structure.mcr-planter', at: [-6.5, 7.2], k: 1, variant: 1 }, { obj: 'structure.mcr-planter', at: [9.5, 10.5], k: 1, variant: 0, flip: true });
  data.ground.push(...M.paving(cam, [0, 5.5], [0, 1], [1, 0], 0, 14, [-12, -6, 0, 6, 12], 0.1, '@plaza.1', null));
  
  // ---- pass 2 (the review: too empty): the ground's variation, leaves, the square's street trees and furniture, the near life
  const F = SCENE_MCR_FILL;
  data.ground.push(...F.tone(cam, { seed: 2101, n: 50, box: [-60, 70, 5.5, 90], w: [3, 2, 2, 1], clip: (x, d) => d < LA(x) - 4.5 || d > LB(x) + 4.5 }));
  data.scatter.push({ obj: { 'ground.leaf-litter': 1, 'ground.leaves': 1 }, on: ['near-sq', 'far-sq'], d: [6, 40], n: 24, dist: 'ground', cluster: { centres: 6, spread: 3 }, k: [0.7, 1.1], seed: 2102, anim: false, tint: { col: '#7a6a50', k: [0, 0.1] } });
  Pl.push({ obj: 'tree.mcr-street-tree', at: [-8.6, 13.4], k: 0.95, variant: 1, pit: true }, { obj: 'tree.mcr-street-tree', at: [10.6, 15.6], k: 1, variant: 0, pit: true, flip: true },
    { obj: 'street.mcr-bin', at: [-4.2, 8.6], k: 1, variant: 1 }, { obj: 'street.mcr-bin', at: [8.4, 19.4], k: 1 },
    { obj: 'street.mcr-cycle-stand', at: [5.2, 8.2], k: 1, variant: 0 }, { obj: 'street.mcr-totem', at: [-14.5, 18.5], k: 1, variant: 1 },
    { obj: 'person.bench-sitter', at: [-1.2, 11.5], k: 0.8, variant: 3 });
  Pl.push(...M.pigeons(2103, [[1, 7.6, 5, 3], [-7, 10.2, 3, 2]], (x, d) => [x, d]));
  data.actors.push(...F.life(data, [
    { obj: 'person.walker', preset: 'brisk', route: [[-14, 13.6], [0, 14.2], [14, 13.8]], seed: 2111, offset: 0.15, variant: 2 },
    { obj: 'person.dog-walker', preset: 'dog-walker', route: [[12, 16.5], [2, 16.8], [-12, 16.2]], seed: 2112, offset: 0.6 },
  ]));
  Pl.push({ obj: 'street.lamppost', x: 1550, y: 930, s: 2.3, pin: true, layer: 'front', shadow: false, variant: 0 });
  return data;
}
