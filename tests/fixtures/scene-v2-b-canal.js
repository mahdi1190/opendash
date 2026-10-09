/* Builder B's v2 demo and test fixture (docs/dev/SCENE_ENGINE_V2.md 5, 6, 12, 27.2): a canal seen from a bridge, with a
   towpath, a mill, a terrace, trees, lamps, people, swans and ducks, a moored boat, reeds at the near bank and a narrowboat
   moving across where the canal turns. Classic script (loaded by the page harness and by Node through loadScenes extra).

   It builds the COMPILED v2 form (V2 12) by hand from ground metres and a camera, through the v1 compiler plus the v2
   fields (C.v, C.cam, items' g / dz / cls, C.water[i].v2), so B's passes can be built and tested before A's compile
   lands; the geometry follows V2 2.2 exactly (f = 800 / tan(fov / 2); X = x0 + f x / d; Y = horizon + f (eye - h) / d).

     sceneV2BCanal(o)   -> the compiled scene; o: { season ('autumn'), lod (1), id, noReeds }
     SCENE_V2B_CAM      the camera
     sceneV2BProj(x, d, h)   the projection
*/
const SCENE_V2B_CAM = (() => {
  const fov = 66, eye = 5.5, horizon = 430, f = 800 / Math.tan(fov / 2 * Math.PI / 180);
  return { eye, fov, horizon, heading: 252, x0: 800, f, dMin: f * eye / (900 - horizon), dMax: 20000, water: -0.4, lat: 53.474, lon: -2.257, alt: 35,
    bands: [{ id: 'horizon', i: 0, d0: 800, d1: Infinity }, { id: 'far', i: 1, d0: 200, d1: 800 }, { id: 'mid', i: 2, d0: 50, d1: 200 }, { id: 'near', i: 3, d0: 15, d1: 50 }, { id: 'fore', i: 4, d0: 0, d1: 15 }, { id: 'front', i: 5, d0: null, d1: null }],
    relief: null };
})();
function sceneV2BProj(x, d, h) { const c = SCENE_V2B_CAM; return [c.x0 + c.f * x / d, c.horizon + c.f * (c.eye - (h || 0)) / d]; }
function sceneV2BCanal(o) {
  o = o || {};
  const cam = SCENE_V2B_CAM, f = cam.f, lvl = cam.water;
  const R1 = v => Math.round(v * 10) / 10;
  // the canal: a centreline in ground metres, 9 m wide, turning left across the view at 100 to 125 m
  const centre = [[2, 9], [2, 42], [-3, 66], [-30, 92], [-140, 108], [-3000, 128]], half = 4.5;
  const sides = (off) => centre.map((p, i) => {
    const a = centre[Math.max(0, i - 1)], b = centre[Math.min(centre.length - 1, i + 1)], tx = b[0] - a[0], td = b[1] - a[1], L = Math.hypot(tx, td) || 1;
    return [p[0] + (-td / L) * off, p[1] + (tx / L) * off];
  });
  const left = sides(half), right = sides(-half), tow = sides(-half - 3);
  const path = (pts, h) => 'M' + pts.map(p => sceneV2BProj(p[0], p[1], h)).map(q => R1(q[0]) + ' ' + R1(q[1])).join('L') + 'Z';
  // clip a ground polygon to a depth band [d0, d1] (Sutherland-Hodgman on d)
  const clipD = (poly, d0, d1) => {
    const cut = (P, inside, at) => { const out = []; for (let i = 0; i < P.length; i++) { const A = P[i], B = P[(i + 1) % P.length], ia = inside(A), ib = inside(B); if (ia) out.push(A); if (ia !== ib) out.push(at(A, B)); } return out; };
    const atD = (dv) => (A, B) => { const u = (dv - A[1]) / (B[1] - A[1]); return [A[0] + u * (B[0] - A[0]), dv]; };
    let P = cut(poly, p => p[1] >= d0, atD(d0));
    if (P.length && Number.isFinite(d1)) P = cut(P, p => p[1] <= d1, atD(d1));
    return P;
  };
  const bands = [['horizon', 800, 20000], ['far', 200, 800], ['mid', 50, 200], ['near', 15, 50], ['fore', cam.dMin * 0.9, 15]];
  const ground = [];
  const addG = (poly, fill, h) => { for (const [id, d0, d1] of bands) { const P = clipD(poly, d0, d1); if (P.length >= 3) ground.push({ layer: id, d: path(P, h), fill }); } };
  const near0 = cam.dMin * 0.9;
  // the land left of the canal (the pocket inside the bend) and right of it (everything else, beyond the turn too)
  const leftLand = [[-5000, near0], ...left.filter(p => p[1] >= near0).map(p => [p[0], Math.max(near0, p[1])]), [-5000, left[left.length - 1][1]]];
  leftLand.splice(1, 0, [left[0][0], near0]);
  const rightLand = [[right[0][0], near0], ...right, [-5000, 20000], [5000, 20000], [5000, near0]];
  const grass = { lin: [[0, '#5d7a3a'], [1, '#46622c']], x1: 0, y1: cam.horizon, x2: 0, y2: 900 };
  addG(rightLand, grass); addG(leftLand, { lin: [[0, '#62804a'], [1, '#4a6a34']], x1: 0, y1: cam.horizon, x2: 0, y2: 900 });
  addG([...right, ...tow.slice().reverse()], { lin: [[0, '#a89a7a'], [1, '#8f805e']], x1: 0, y1: cam.horizon, x2: 0, y2: 900 });   // the towpath
  // the canal: one v2 region in the band of its far edge
  const waterPoly = [...left, ...right.slice().reverse()];
  const toScreen = (pts) => pts.map(p => sceneV2BProj(p[0], p[1], 0)).map(q => [R1(q[0]), R1(q[1])]);
  const wd = path(waterPoly, lvl), wpts = waterPoly.map(p => sceneV2BProj(p[0], p[1], lvl));
  const y0 = Math.max(cam.horizon, Math.min(...wpts.map(p => p[1]))), y1 = Math.min(900, Math.max(...wpts.map(p => p[1])));
  // the placements, in ground metres: [obj, x, d, real height (m), extra]
  const P = [
    ['building.townhouse', -34, 74, 19], ['building.shopfront', -70, 150, 16], ['building.terrace-victorian', 30, 62, 10], ['building.shopfront', 46, 118, 15],
    ['tree.oak', 19, 34, 15], ['tree.oak', -16, 32, 14], ['tree.birch', 13, 84, 13], ['tree.birch', -48, 88, 12], ['tree.alder', 10, 24, 11], ['tree.alder', -9, 47, 10],
    ['street.lamp', 8.6, 19, 4.6], ['street.lamp', 8.6, 41, 4.6], ['street.bench', 9.7, 29, 0.85],
    ['person.walker', 7.6, 25, 1.72], ['person.dog-walker', 8.0, 52, 1.72],
    ['bird.swan', 0.6, 27, 0.75], ['bird.mallard', 3.2, 20, 0.35], ['bird.mallard', 3.9, 20.8, 0.35],
    ['boat.narrowboat-receding', -1.0, 34, 2.4, { float: true }],
  ];
  // reeds in the margin, in front of the water: three near ones and a far one (in the water's own bake group: the mask test)
  if (!o.noReeds) P.push(['plant.reed', -1.9, 16, 1.6], ['plant.reed', -2.1, 18.5, 1.5], ['plant.reed', -2.0, 21, 1.7], ['plant.reed', -5.0, 57, 1.8]);
  const bandOf = (d) => (d >= 800 ? 'horizon' : d >= 200 ? 'far' : d >= 50 ? 'mid' : d >= 15 ? 'near' : 'fore');
  const place = [], meta = [];
  P.forEach(([obj, x, d, H, ex], i) => {
    const sh = sceneObjShapes(obj, 0, o.season || 'autumn');
    if (!sh) return;
    const floating = ex && ex.float || /^bird\.(swan|mallard)/.test(obj), h = floating ? lvl : 0;
    const [X, Y] = sceneV2BProj(x, d, h), s = Math.round(f / d * H / (-sh.box[1]) * 1000) / 1000;
    place.push({ obj, x: R1(X), y: R1(Y), s, layer: bandOf(d), seed: 1000 + i, flip: x < 0 && !/building|boat/.test(obj) });
    meta.push({ seed: 1000 + i, x, d, h, floating });
  });
  // the movers: a narrowboat crossing where the canal turns (side view, 1 m/s) and a walker on the towpath
  const boatD = 112, boatY = sceneV2BProj(0, boatD, lvl)[1], boatSh = sceneObjShapes('boat.narrowboat', 0, o.season || 'autumn');
  const boatS = Math.round(f / boatD * 1.9 / (-boatSh.box[1]) * 1000) / 1000;
  const walkPts = [[7.9, 17], [7.9, 60]].map(p => sceneV2BProj(p[0], p[1], 0)).map(q => [R1(q[0]), R1(q[1])]);
  const sByY = [17, 25, 35, 45, 60].map(d => [R1(sceneV2BProj(0, d, 0)[1]), Math.round(f / d * 1.72 / 66 * 1000) / 1000]).sort((a, b) => a[0] - b[0]);
  const data = {
    v: 1, id: o.id || 'v2b-canal', view: { lat: cam.lat, lon: cam.lon, heading: cam.heading, fov: cam.fov, horizon: cam.horizon, lift: 1 }, at: 'afternoon', season: o.season || 'autumn',
    setting: 'urban', sky: { stars: 160, clouds: { n: 4, y: [60, 300], speed: 5 }, sunR: 24, moonR: 18 },
    layers: [{ id: 'horizon', depth: 0.08, haze: 0 }, { id: 'far', depth: 0.2, haze: 0 }, { id: 'mid', depth: 0.45, haze: 0 }, { id: 'near', depth: 0.75, haze: 0 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 }],
    ground, water: [{ layer: 'mid', d: wd, y0: R1(y0), y1: R1(y1), base: ['#4a5a48', '#3a4a3e', '#2a362e'], reflect: true, shimmer: 0, lightPath: true }],
    place,
    actors: [
      { obj: 'boat.narrowboat', layer: 'mid', path: [[1750, R1(boatY)], [-150, R1(boatY)]], speed: Math.round(f / boatD * 1.0 * 100) / 100, loop: 'loop', s: boatS, seed: 7, offset: 0.55 },
      { obj: 'person.walker', layer: 'near', path: walkPts, speed: 6, loop: 'pingpong', s: 1, sByY, seed: 9, offset: 0.2 },
    ],
    particles: 'none', weather: 'none',
  };
  const C = sceneCompile(data, { season: o.season || 'autumn', lod: o.lod == null ? 1 : o.lod });
  if (C.v === 2) return C;
  // the v2 fields (V2 12)
  C.v = 2;
  C.cam = Object.assign({}, cam, { bands: cam.bands.map(b => Object.assign({}, b)) });
  const bySeed = new Map(meta.map(m => [m.seed, m]));
  for (const it of C.items) {
    const m = bySeed.get(it.seed);
    it.cls = sceneObjClassOf(it.o);
    if (m) { it.g = { x: m.x, d: m.d, h: m.h, surf: m.floating ? 'canal' : m.x > 6.5 && m.x < 9.5 ? 'towpath' : 'grass', snapped: 0 }; it.dz = m.d; it.haze = null; it.shadow = it.cls !== 'shrub' && it.cls !== 'boat' && it.cls !== 'bird-water'; }
  }
  for (const a of C.actors) a.cls = sceneObjClassOf(a.o);
  // the land edges of the canal (screen points at ground level): the coping on both banks
  const edgeL = toScreen(left.filter(p => p[1] >= near0)), edgeR = toScreen(right.filter(p => p[1] >= near0));
  C.water[0].v2 = { id: 'canal', kind: 'canal', polyM: waterPoly, dNear: near0, dFar: 128, level: lvl,
    rowAt: [10, 20, 40, 80, 128].map(d => [d, R1(cam.horizon + f * (cam.eye - lvl) / d)]),
    edges: [{ pts: edgeL, kind: 'coping' }, { pts: edgeR, kind: 'coping' }],
    mirror: 0.85, ripple: 0.15, clarity: 0.05, bed: '#4a4030', glint: true, foam: 'none', wakes: true, rings: true, flow: [0, 0] };
  C.stats.v2 = { groundItems: meta.length, pixelItems: 0, snapped: 0, refused: 0, surfaces: 3, waterV2: 1, flows: 0, flowMax: 0, flowDraws: 0, fxDraws: 90 + 30 + 6 + 4, lights: 2, buildings: 0, coverItems: 0, problems: { info: 0, warn: 0, error: 0 } };
  C.lights = [{ kind: 'lamp', x: 8.6, d: 19, r: 7, h: 4.6, col: '#ffd9a0' }, { kind: 'lamp', x: 8.6, d: 41, r: 7, h: 4.6, col: '#ffd9a0' }];
  C.problems = [];
  return C;
}
