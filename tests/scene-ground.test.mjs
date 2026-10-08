// Scene engine v2, builder A (docs/dev/SCENE_ENGINE_V2.md 2 to 4, 12, 27.1): the camera and projection (the 2.2 worked numbers,
// round trips, relief by Newton, view sync), surfaces (strip spans, beside, the rest covers the frame, paint order, dashed
// markings in perspective, water cut from nearer ground), ground placements (every 4.1 form, the scale from real sizes, snapping
// to a lane, refusal, the boat inset, landmarks never moved, the care cap, the view by angle, pixel placements checked not moved),
// the draw order with buildings, real sizes for the whole library, and a compile with the other builders' files absent.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';
import { loadRegistry } from '../tools/lib/anim-render.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REG = loadRegistry(ROOT);
const G = REG.R.get;
const E = new Proxy({}, { get: (_, n) => G(n) });
const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg || ''} ${a} vs ${b} (eps ${eps})`);
const rect = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}z`;

// test objects with known sizes (so the library can change without breaking these numbers)
E.sceneObjDefine({ id: 'person.v2atest', category: 'person', size: [20, 64], real: { h: 1.72, l: 0.5, w: 0.45 }, tags: ['kit:people', 'role:walker'], build: () => ({ body: [['#334455', rect(-10, -64, 20, 64)]] }) });
E.sceneObjDefine({ id: 'vehicle.v2atest', category: 'vehicle', size: [90, 30], real: { h: 1.5, l: 4.2, w: 1.8 }, views: { front: 'vehicle.v2atest-front', rear: 'vehicle.v2atest-rear' }, tags: ['car', 'kit:vehicles', 'role:vehicle'], build: () => ({ body: [['#aa3333', rect(-45, -30, 90, 30)]] }) });
E.sceneObjDefine({ id: 'vehicle.v2atest-front', category: 'vehicle', size: [40, 30], real: { h: 1.5, l: 1.8, w: 4.2 }, tags: ['car', 'kit:vehicles', 'role:vehicle'], build: () => ({ body: [['#aa3333', rect(-20, -30, 40, 30)]] }) });
E.sceneObjDefine({ id: 'vehicle.v2atest-rear', category: 'vehicle', size: [40, 30], real: { h: 1.5, l: 1.8, w: 4.2 }, tags: ['car', 'kit:vehicles', 'role:vehicle'], build: () => ({ body: [['#993333', rect(-20, -30, 40, 30)]] }) });
E.sceneObjDefine({ id: 'boat.v2atest', category: 'boat', size: [200, 40], real: { h: 1.9, l: 18, w: 2.1 }, tags: ['kit:boats', 'role:boat'], build: () => ({ body: [['#336633', rect(-100, -40, 200, 40)]] }) });
E.sceneObjDefine({ id: 'landmark.v2atest', category: 'landmark', size: [100, 300], real: { h: 60 }, tags: ['landmark'], build: () => ({ body: [['#888888', rect(-50, -300, 100, 300)]] }) });
E.sceneObjDefine({ id: 'tree.v2atest', category: 'tree', size: [100, 200], real: { h: 15 }, tags: ['deciduous', 'kit:temperate', 'role:tree'], build: () => ({ body: [['#336633', rect(-50, -200, 100, 200)]] }) });

const base = (over = {}) => Object.assign({ id: 'v2a-ground', v: 2, view: { lat: 51.5, lon: -0.8 }, camera: { eye: 1.65, fov: 66, horizon: 470, heading: 180 }, season: 'summer', cover: false,
  surfaces: [{ id: 'land', kind: 'grass', rest: true }, { id: 'road', kind: 'road', path: [[0, 2], [0, 400]], width: 7.3, markings: 'centre' },
    { id: 'pave-r', kind: 'pavement', beside: 'road', side: 'right', width: 2, kerb: 0.12 }, { id: 'pave-l', kind: 'pavement', beside: 'road', side: 'left', width: 2 }],
  water: [{ id: 'canal', kind: 'canal', path: [[-14, 2], [-14, 300]], width: 8, banks: { right: { surface: 'towpath', width: 2.2, edge: 'coping' } } }], place: [] }, over);
const compile = (d, o) => E.sceneCompile(d, Object.assign({ season: 'summer', lod: 1 }, o || {}));
const probs = (C, rule) => C.problems.filter(p => p.rule === rule);

test('camera: the 2.2 worked numbers, defaults, memoised per data, v2 only with eye / fov / horizon / preset', () => {
  const d = base(), cam = E.sceneCamera(d);
  near(cam.f, 1231.89, 0.01, 'f'); near(cam.dMin, 4.727, 0.001, 'dMin');
  near(cam.f * 1.72 / 20, 105.9, 0.1, 'a person at 20 m'); near(cam.f * 1.72 / 8, 264.9, 0.1, 'at 8 m');
  near(cam.f * 4.4 / 40, 135.5, 0.1, 'a bus at 40 m');
  assert.equal(E.sceneCamera(d), cam, 'memoised per data');
  assert.equal(E.sceneIsV2(d), true);
  assert.equal(E.sceneIsV2({ camera: { pan: 0, period: 90 } }), false, 'the v1 pan camera is not v2');
  assert.equal(E.sceneIsV2({ camera: { preset: 'street' } }), true);
  assert.deepEqual(cam.bands.map(b => b.id), ['horizon', 'far', 'mid', 'near', 'fore', 'front']);
  assert.equal(E.sceneDepthBand(cam, 20), 3); assert.equal(E.sceneDepthBand(cam, 5), 4); assert.equal(E.sceneDepthBand(cam, 120), 2); assert.equal(E.sceneDepthBand(cam, 5000), 0);
});

test('projection: round trips flat and on a relief (Newton on a 1:5 slope); nothing above the horizon', () => {
  const cam = E.sceneCamera(base());
  for (const [x, d] of [[0, 10], [-12.5, 33], [40, 700], [3, 4.8]]) {
    const p = E.sceneProject(cam, x, d), q = E.sceneUnproject(cam, p.X, p.Y);
    near(q.x, x, 1e-6, 'x'); near(q.d, d, 1e-6, 'd');
  }
  assert.equal(E.sceneUnproject(cam, 800, 470), null, 'the horizon row has no ground point');
  assert.equal(E.sceneUnproject(cam, 800, 300), null);
  // a rise of 1 in 5 from 5 m to 40 m (7 m up: above the eye from 13 m on), sampled on the log-depth grid
  const nd = 9, ds = Array.from({ length: nd }, (_, j) => 5 * Math.pow(40 / 5, j / (nd - 1)));
  const h = []; for (let j = 0; j < nd; j++) for (let i = 0; i < 3; i++) h.push((ds[j] - 5) / 5);
  const R = base({ id: 'v2a-relief', ground: { relief: { x: [-100, 100], d: [5, 40], nx: 3, nd, h } } }), rc = E.sceneCamera(R);
  assert.ok(rc.relief, 'the relief is read');
  near(E.sceneGroundHeight(rc, 0, 20), 3, 0.4, 'h at 20 m on the 1:5 rise');
  for (const [x, d] of [[0, 7], [-3, 10], [2, 15], [0, 25]]) {
    const p = E.sceneProject(rc, x, d), q = E.sceneUnproject(rc, p.X, p.Y);
    near(q.d, d, 1e-3 * d, 'relief d'); near(q.x, x, 1e-3 * Math.max(1, Math.abs(x)), 'relief x');
  }
  const flat = E.sceneProject(rc, 0, 30, 0), up = E.sceneProject(rc, 0, 30);
  assert.ok(up.Y < flat.Y, 'a point on the rise stands higher on screen than the flat ground');
});

test('view sync: the camera fills view.horizon / fov / heading and wins over a different view (a viewSync warning)', () => {
  const C = compile(base({ id: 'v2a-sync', view: { lat: 51.5, lon: -0.8, horizon: 520, fov: 80 } }));
  assert.equal(C.v, 2);
  assert.equal(C.view.horizon, 470); assert.equal(C.view.fov, 66); assert.equal(C.view.heading, 180);
  const vs = probs(C, 'viewSync');
  assert.equal(vs.length, 2); assert.ok(vs.every(p => p.sev === 'warn'));
  assert.equal(C.cam.horizon, 470); near(C.cam.f, 1231.9, 0.01);
  assert.ok(C.layers.every(l => l.haze === 0), 'no layer haze in v2: haze comes from the depth');
});

test('surfaces: strip spans, beside offsets, a rest that leaves no hole, the last surface wins, band clipping', () => {
  const C = compile(base());
  const sp = E.sceneSurfaceSpan(C, 'road', 30);
  assert.equal(sp.length, 1); near(sp[0][0], -3.65, 0.01); near(sp[0][1], 3.65, 0.01);
  const pr = E.sceneSurfaceSpan(C, 'pave-r', 30)[0], pl = E.sceneSurfaceSpan(C, 'pave-l', 30)[0];
  near(pr[0], 3.65, 0.01, 'pave-r starts at the road edge (right = +x for a road running away)'); near(pr[1], 5.65, 0.01);
  near(pl[0], -5.65, 0.01); near(pl[1], -3.65, 0.01);
  assert.equal(E.sceneSurfaceAt(C, 0, 30).id, 'road'); assert.equal(E.sceneSurfaceAt(C, 4.5, 30).id, 'pave-r');
  assert.equal(E.sceneSurfaceAt(C, 12, 30).kind, 'grass'); assert.equal(E.sceneSurfaceAt(C, -14, 30).kind, 'water');
  assert.equal(E.sceneSurfaceAt(C, -8.9, 40).id, 'canal-right', 'the canal bank became a towpath surface');
  // no hole: every sampled frame point below the horizon is on some surface
  const cam = C.cam;
  for (let X = -150; X <= 1750; X += 50) for (let Y = cam.horizon + 2; Y <= 900; Y += 15) { const g = E.sceneUnproject(cam, X, Y); assert.ok(E.sceneSurfaceAt(C, g.x, g.d), `a hole at ${X},${Y}`); }
  // paint order: a later polygon covers an earlier one
  const C2 = compile(base({ id: 'v2a-order', surfaces: [{ id: 'land', kind: 'grass', rest: true }, { id: 'a', kind: 'plaza', poly: [[-10, 10], [10, 10], [10, 40], [-10, 40]] }, { id: 'b', kind: 'lawn', poly: [[0, 20], [20, 20], [20, 30], [0, 30]] }], water: [] }));
  assert.equal(E.sceneSurfaceAt(C2, 5, 25).id, 'b'); assert.equal(E.sceneSurfaceAt(C2, -5, 25).id, 'a');
  // a long road is drawn partly in each band it crosses, every fill tagged with its surface
  const roadFills = C.ground.filter(g => g.surf === 'road' && !g.mark);
  assert.deepEqual([...new Set(roadFills.map(g => g.layer))].sort(), [1, 2, 3, 4], 'a road to 400 m: far, mid, near, fore');
  assert.ok(C.surfaces.find(s => s.id === 'road').groundIdx.every(i => C.ground[i].surf === 'road'));
});

test('surfaces: road markings are 3 m dashes every 9 m in perspective, dropped where thinner than 0.6 units', () => {
  const C = compile(base({ id: 'v2a-marks', surfaces: [{ id: 'land', kind: 'grass', rest: true }, { id: 'road', kind: 'road', path: [[0, 2], [0, 400]], width: 7.3, markings: 'centre' }], water: [] }));
  const cam = C.cam, dashes = [];
  for (const g of C.ground.filter(x => x.surf === 'road' && x.mark === 'centre')) {
    for (const sub of g.d.split('z').filter(Boolean)) {
      const pts = sub.replace('M', '').split('L').map(p => p.trim().split(' ').map(Number));
      const ds = pts.map(p => E.sceneUnproject(cam, p[0], p[1]).d);
      dashes.push([Math.min(...ds), Math.max(...ds)]);
    }
  }
  dashes.sort((a, b) => a[0] - b[0]);
  const full = dashes.filter(([a, b]) => b - a > 1);
  assert.ok(full.length >= 6, 'dashes in the near bands: ' + full.length);
  for (const [a, b] of full) if (a > cam.dMin + 1 && b < 50) near(b - a, 3, 0.15, 'a dash is 3 m');
  for (let i = 1; i < full.length; i++) if (full[i - 1][0] > 15 && full[i][1] < 50 && Math.abs(full[i][0] - full[i - 1][0]) > 1) near(full[i][0] - full[i - 1][0], 9, 0.2, 'one every 9 m');
  const farthest = Math.max(...dashes.map(d => d[1]));
  assert.ok(cam.f * 0.1 / farthest >= 0.55, 'no marking thinner than 0.6 units: ' + farthest);
});

test('water: a canal is a channel in perspective, in the layer of its far edge, cut from nearer ground, with a v2 record', () => {
  const C = compile(base());
  const w = C.water.find(x => x.v2 && x.v2.id === 'canal');
  assert.ok(w, 'a C.water entry with a v2 record');
  assert.equal(w.layer, E.sceneDepthBand(C.cam, w.v2.dFar * 0.999));
  assert.equal(w.v2.kind, 'canal'); near(w.v2.level, 0, 1e-9); near(w.v2.mirror, 0.85, 1e-9);
  assert.equal(w.v2.rowAt.length, 16); assert.ok(w.v2.rowAt.every((r, i) => !i || r[1] < w.v2.rowAt[i - 1][1]), 'rows rise with depth');
  assert.ok(w.v2.edges.length >= 1 && w.v2.edges.every(e => e.pts.length >= 2));
  assert.equal(w.reflect, true); assert.equal(w.shimmer, 0); assert.equal(w.lightPath, true);
  // the rest grass of a nearer band has the canal cut out: its fill does not cover a point in the middle of the channel
  const cam = C.cam, p = E.sceneProject(cam, -14, 10);
  const restNear = C.ground.filter(g => g.surf === 'land' && g.layer === 4 && !g.mark);
  assert.ok(restNear.length, 'the rest has a fore fill');
  // even-odd point test on the path's subpaths (the fills are simple polygons)
  const inPath = (d, X, Y) => d.split('z').filter(Boolean).some(sub => { const P = sub.replace('M', '').split('L').map(q => q.trim().split(' ').map(Number)); let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > Y) !== (P[j][1] > Y) && X < (P[j][0] - P[i][0]) * (Y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; });
  assert.ok(restNear.every(g => !inPath(g.d, p.X, p.Y)), 'the canal shows through the nearer grass');
  const q = E.sceneProject(cam, -6.7, 14);
  assert.ok(restNear.some(g => inPath(g.d, q.X, q.Y)), 'the grass beside it is drawn');
});

test('placements: every 4.1 form, the scale from the real size, layers by depth, z by row', () => {
  const C = compile(base({ id: 'v2a-forms', place: [
    { obj: 'person.v2atest', on: 'pave-r', d: 20, u: 0.5, k: 1 },
    { obj: 'person.v2atest', on: 'canal-right', along: 0.1, u: 0.5, k: 1 },
    { obj: 'person.v2atest', at: [12, 40], k: 1 },
    { obj: 'person.v2atest', x: 300, y: 700, s: 1, layer: 'near' },
  ] }));
  const its = C.items.filter(i => i.o === 'person.v2atest');
  assert.equal(its.length, 4);
  const a = its.find(i => i.g && Math.abs(i.g.d - 20) < 0.01);
  near(a.g.x, 4.65, 0.01, 'u 0.5 across pave-r'); assert.equal(a.g.surf, 'pave-r');
  near(a.s * 64, C.cam.f * 1.72 / 20, 0.15, 'the scale is the real height at the depth');
  near(a.y, 470 + C.cam.f * 1.65 / 20, 0.06, 'the anchor row');
  assert.equal(a.layer, 3, 'near band'); assert.equal(a.dz, 20); assert.equal(a.cls, 'person'); assert.equal(a.haze, null);
  const b = its.find(i => i.g && i.g.surf === 'canal-right');
  near(b.g.d, 2 + 0.1 * 298, 0.3, 'along 0.1 of the towpath');
  const c = its.find(i => i.g && Math.abs(i.g.d - 40) < 0.01);
  near(c.g.x, 12, 1e-9); near(c.x, 800 + C.cam.f * 12 / 40, 0.06);
  const px = its.find(i => i.x === 300);
  assert.equal(px.y, 700); assert.equal(px.s, 1, 'a pixel placement is drawn as given');
  for (let i = 1; i < C.items.length; i++) { const p = C.items[i - 1], q = C.items[i]; assert.ok(p.layer < q.layer || (p.layer === q.layer && p.z <= q.z), 'sorted by layer, then z'); }
});

test('snapping: a car on the verge goes to a lane centre (keep left); too far is refused; a car never stands on grass', () => {
  const C = compile(base({ id: 'v2a-snap', place: [
    { obj: 'vehicle.v2atest', at: [6.2, 30] },        // on pave-r / grass, 2.5 m from the road
    { obj: 'vehicle.v2atest', at: [11, 30] },         // 7 m off: refused
    { obj: 'vehicle.v2atest', on: 'road', d: 50, dir: 'away' },
    { obj: 'vehicle.v2atest', on: 'road', d: 60, dir: 'toward' },
  ] }));
  const cars = C.items.filter(i => i.o.startsWith('vehicle.v2atest'));
  assert.equal(cars.length, 3, 'one refused');
  const sn = cars.find(i => Math.abs(i.g.d - 30) < 2);
  assert.ok(sn, 'the snapped car'); assert.equal(sn.g.surf, 'road');
  near(Math.abs(sn.g.x), 7.3 / 4, 0.05, 'a lane centre'); assert.ok(sn.g.snapped > 0 && sn.g.snapped <= 3);
  assert.ok(probs(C, 'snapped').some(p => p.sev === 'warn' && p.i === 0));
  assert.ok(probs(C, 'refused').some(p => p.sev === 'error' && p.i === 1));
  const away = cars.find(i => Math.abs(i.g.d - 50) < 0.5), toward = cars.find(i => Math.abs(i.g.d - 60) < 0.5);
  assert.ok(away.g.x < 0, 'keep left: going away, the left lane (-x)'); assert.ok(toward.g.x > 0, 'coming toward: the other lane');
  for (const c of cars) assert.equal(E.sceneSurfaceAt(C, c.g.x, c.g.d).kind, 'road');
  assert.equal(C.stats.v2.refused, 1); assert.equal(C.stats.v2.snapped, 1);
});

test('the view follows the angle: rear going away, front coming, side across; a missing view is a warning', () => {
  const C = compile(base({ id: 'v2a-views', surfaces: [{ id: 'land', kind: 'grass', rest: true }, { id: 'road', kind: 'road', path: [[0, 2], [0, 400]], width: 7.3 }, { id: 'cross', kind: 'road', path: [[-60, 35], [60, 35]], width: 7 }], water: [],
    place: [{ obj: 'vehicle.v2atest', on: 'road', d: 20, dir: 'away' }, { obj: 'vehicle.v2atest', on: 'road', d: 22, dir: 'toward' }, { obj: 'vehicle.v2atest', on: 'cross', d: 35, u: 0.6 }, { obj: 'vehicle.car', on: 'road', d: 18, dir: 'away' }] }));
  const byD = d => C.items.find(i => i.g && Math.abs(i.g.d - d) < (d === 35 ? 2.5 : 1.5) && i.o.startsWith('vehicle.v2atest'));
  assert.equal(byD(20).view, 'rear'); assert.equal(byD(20).o, 'vehicle.v2atest-rear');
  assert.equal(byD(22).view, 'front'); assert.equal(byD(22).o, 'vehicle.v2atest-front');
  assert.equal(byD(35).view, 'side'); assert.equal(byD(35).o, 'vehicle.v2atest');
  const s = E.sceneViewOf('vehicle.v2atest', [1, 0], 0, 40, null);
  assert.equal(s.view, 'side');
  const m = E.sceneViewOf('boat.v2atest', [0, 1], 0, 20, null);
  assert.equal(m.view, 'side'); assert.equal(m.missing, true, 'no rear view: kept side-on and reported');
});

test('boats keep inside the inset water; birds float at the water level; landmarks are never moved', () => {
  const C = compile(base({ id: 'v2a-water', camera: { eye: 1.65, fov: 66, horizon: 470, heading: 180, water: -0.4 }, place: [
    { obj: 'boat.v2atest', on: 'canal', d: 30, u: 0 }, { obj: 'boat.v2atest', on: 'canal', d: 50, u: 1 },
    { obj: 'boat.v2atest', at: [-10.5, 70] },            // too close to the bank: moved in
    { obj: 'landmark.v2atest', at: [40, 300] }, { obj: 'landmark.v2atest', at: [0, 200] },   // on grass; on the road: refused, never snapped
  ] }));
  const boats = C.items.filter(i => i.o === 'boat.v2atest');
  assert.equal(boats.length, 3);
  for (const b of boats) { assert.ok(Math.abs(b.g.x + 14) <= 4 - (2.1 / 2 + 0.3) + 1e-6, 'inside the inset: ' + b.g.x); near(b.g.h, -0.4, 1e-9, 'at the water level'); assert.equal(b.reflect, true); }
  const lm = C.items.filter(i => i.o === 'landmark.v2atest');
  assert.equal(lm.length, 1); assert.equal(lm[0].g.x, 40); assert.equal(lm[0].g.d, 300); assert.equal(lm[0].g.snapped, 0);
  assert.ok(probs(C, 'refused').some(p => p.obj === 'landmark.v2atest'));
});

test('the care cap pushes a near person back along the ray; pixel placements are checked, never moved', () => {
  const C = compile(base({ id: 'v2a-care', place: [{ obj: 'person.v2atest', at: [4.5, 6], k: 1 }, { obj: 'vehicle.v2atest', x: 1500, y: 720, s: 1, layer: 'near' }] }));
  const p = C.items.find(i => i.o === 'person.v2atest');
  near(p.s * 64, 150, 0.5, '150 units tall'); near(p.g.d, C.cam.f * 1.72 / 150, 0.05); near(p.g.x / p.g.d, 4.5 / 6, 1e-3, 'along the ray');
  assert.ok(probs(C, 'capped').some(x => x.sev === 'info'));
  const car = C.items.find(i => i.o === 'vehicle.v2atest');
  assert.equal(car.x, 1500); assert.equal(car.y, 720);
  assert.ok(C.problems.some(x => x.rule === 'vehicleSurface' && x.pixel && x.sev === 'error'), 'a pixel car on grass is reported');
  const pinned = compile(base({ id: 'v2a-pin', place: [{ obj: 'vehicle.v2atest', x: 1500, y: 720, s: 1, pin: true }] }));
  assert.ok(!pinned.problems.some(x => x.rule === 'vehicleSurface'), 'pin: true skips the checks');
});

test('draw order: an item in front of a building is drawn after it, one behind before it; a cycle falls back to depth', () => {
  const cam = E.sceneCamera(base());
  const foot = [[-10, 20], [-2, 20], [-2, 60], [-10, 60]];   // a long terrace receding on the left
  const box = (x, d, w, h) => { const p = E.sceneProject(cam, x, d); return [p.X - w, p.Y - h, p.X + w, p.Y]; };
  const items = [
    { layer: 3, z: 470 + cam.f * 1.65 / 20, box: [100, 200, 830, 572], g: { x: -6, d: 20 } },                  // 0: the terrace (anchored at its front)
    { layer: 2, z: 470 + cam.f * 1.65 / 50, box: box(0, 50, 10, 60), g: { x: 0, d: 50 } },                   // 1: a walker beside it, in front of its face
    { layer: 2, z: 470 + cam.f * 1.65 / 80, box: box(-8, 80, 10, 40), g: { x: -8, d: 80 } },                 // 2: behind it
  ];
  items[2].box = [400, 450, 700, 560];
  const r = E.sceneDepthOrder(items, [{ i: 0, foot }], cam);
  const pos = (i) => r.order.indexOf(i);
  assert.ok(pos(1) > pos(0), 'the walker in front of the face comes after the terrace');
  assert.equal(r.layers[1], 3, 'its layer is raised to the terrace\'s');
  assert.ok(pos(2) < pos(0), 'the one behind comes before');
  // two buildings that each claim the other: a cycle, kept by depth, an order problem
  const f1 = [[-5, 30], [5, 30], [5, 40], [-5, 40]], f2 = [[-5, 31], [5, 31], [5, 39], [-5, 39]];
  const it2 = [{ layer: 3, z: 500, box: [0, 0, 100, 100], g: { x: 0, d: 30 } }, { layer: 3, z: 501, box: [0, 0, 100, 100], g: { x: 0, d: 31 } }];
  const r2 = E.sceneDepthOrder(it2, [{ i: 0, foot: f1 }, { i: 1, foot: f2 }], cam);
  assert.equal(r2.order.length, 2);
});

test('real sizes: every library object resolves; a def beats the table, the table beats the class', () => {
  const objs = E.sceneObjs(), fallback = [];
  for (const d of objs) {
    const r = E.sceneObjReal(d.id);
    assert.ok(r && r.h > 0 && r.l > 0 && r.w > 0, 'no real size for ' + d.id);
    if (r.src === 'class') { assert.ok(r.warn, 'a class fallback carries its warning line: ' + d.id); fallback.push(d.id); }
  }
  assert.deepEqual(fallback.filter(id => !/v2atest|test/.test(id)), [], 'every library object is in the table');
  assert.equal(E.sceneObjReal('person.v2atest').src, 'def');
  assert.equal(E.sceneObjReal('vehicle.car').src, 'table'); assert.equal(E.sceneObjReal('vehicle.car').h, 1.5);
  assert.equal(E.sceneObjReal('person.walker').h, 1.72, 'people: the shared 64-unit figure is 1.72 m');
  assert.equal(E.sceneObjReal('tree.oak').h, 18); assert.equal(E.sceneObjReal('landmark.burj-khalifa').h, 828);
  E.sceneObjDefine({ id: 'sky.v2atest', category: 'sky', size: [10, 10], build: () => ({ body: [['#ffffff', rect(-5, -10, 10, 10)]] }) });
  const k = E.sceneObjReal('sky.v2atest');
  assert.equal(k.src, 'class'); assert.match(k.warn, /class default/);
});

test('classes: from category, role and tags; an explicit class tag wins', () => {
  assert.equal(E.sceneObjClass('vehicle.car'), 'car'); assert.equal(E.sceneObjClass('vehicle.bus-double-decker'), 'bus');
  assert.equal(E.sceneObjClass('vehicle.nottingham-tram'), 'tram'); assert.equal(E.sceneObjClass('rail.train'), 'train');
  assert.equal(E.sceneObjClass('bird.mallard'), 'bird-water'); assert.equal(E.sceneObjClass('bird.gull'), 'bird-air');
  assert.equal(E.sceneObjClass('bird.robin'), 'bird-ground'); assert.equal(E.sceneObjClass('person.cyclist'), 'cyclist');
  assert.equal(E.sceneObjClass('plant.reed'), 'shrub'); assert.equal(E.sceneObjClass('plant.planter'), 'street');
  assert.equal(E.sceneObjClass('animal.sheep'), 'animal-graze'); assert.equal(E.sceneObjClass('landmark.burj-khalifa'), 'landmark');
  E.sceneObjDefine({ id: 'prop.v2atest', category: 'prop', size: [10, 10], tags: ['class:rock'], build: () => ({ body: [['#777777', rect(-5, -10, 10, 10)]] }) });
  assert.equal(E.sceneObjClass('prop.v2atest'), 'rock');
  assert.equal(E.scenePlaceAllowed('car', { kind: 'grass' }), false); assert.equal(E.scenePlaceAllowed('car', { kind: 'road' }), true);
  assert.equal(E.scenePlaceAllowed('person', { kind: 'road' }), false); assert.equal(E.scenePlaceAllowed('person', { kind: 'road', crossing: true }), true);
  assert.equal(E.scenePlaceAllowed('tree', { kind: 'pavement' }), false); assert.equal(E.scenePlaceAllowed('tree', { kind: 'pavement' }, { pit: true }), true);
  assert.equal(E.scenePlaceAllowed('shrub', { kind: 'road' }), false, 'no shrubs on roads, ever');
});

test('actors on the ground: a projected path with the scale by depth, and sceneActorAtV2 any moment', () => {
  const C = compile(base({ id: 'v2a-actor', actors: [{ obj: 'person.v2atest', on: 'canal-right', speedM: 1.3, k: 1 }, { obj: 'person.v2atest', ground: [[2, 6], [2, 60]], k: 1, loop: 'loop' }] }));
  assert.equal(C.actors.length, 2);
  const a = C.actors[1];
  assert.ok(a.path.length > 10 && a.ground.length === a.path.length && a.sByY.length >= 2);
  const at = E.sceneActorAtV2(a, 10, C.cam);
  near(at.d, 6 + 1.3 * 10 + a.offset * (54), 0.6, 'metres per second along the ground');
  near(at.s * 64, C.cam.f * 1.72 / at.d, 0.5, 'its scale from its depth');
  assert.ok(a.speed > 0);
});

test('terrain ridges become hazed hill fills in the horizon and far bands; fx rides on a v1 compile only when set', () => {
  const C = compile(base({ id: 'v2a-ridges', terrain: { src: 'terrarium', ridges: [{ band: 'far', d: 3000, pts: [[-200, 440], [400, 420], [900, 452], [1800, 445]] }, { band: 'horizon', d: 9000, pts: [[-200, 455], [800, 430], [1800, 450]] }] } }));
  const hills = C.ground.filter(g => g.ridge);
  assert.equal(hills.length, 2);
  assert.ok(C.ground.indexOf(hills[0]) < C.ground.findIndex(g => g.surf), 'hills are drawn before the surfaces');
  assert.deepEqual(hills.map(h => h.layer).sort(), [0, 1]);
  assert.match(hills[0].d, /^M-200 /);
  assert.deepEqual(C.source.terrain, { src: 'terrarium', fetched: null });
  const v1 = { v: 1, id: 'v2a-fx', view: { lat: 51, lon: -1, horizon: 520 }, place: [] };
  assert.equal(E.sceneCompile(v1, { season: 'summer', lod: 1 }).fx, undefined, 'no fx: the v1 form is untouched');
  assert.deepEqual(E.sceneCompile(Object.assign({}, v1, { id: 'v2a-fx2', fx: { water: 2, shadows: 1, weather: 2 } }), { season: 'summer', lod: 1 }).fx, { water: 2, weather: 2 });
});

test('the editor\'s calls on a COMPILED scene: unproject a click, find the surface, snap a car to its lane', () => {
  const C = compile(base({ id: 'v2a-editor' }));
  const p = E.sceneProject(C.cam, 6.5, 25), g = E.sceneUnproject(C.cam, p.X, p.Y);
  const hit = E.sceneGroundSnap(C, 'car', g.x, g.d, { obj: 'vehicle.v2atest' });
  assert.ok(hit && hit.id === 'road' && Math.abs(Math.abs(hit.x) - 7.3 / 4) < 0.05, JSON.stringify(hit));
  assert.equal(E.sceneSurfaceAt(C, hit.x, hit.d).kind, 'road');
  assert.equal(C.drive, 'left');
});

test('callee absent: without the flows, atmosphere, weather, presets and generator files the v2 compile still works', () => {
  const gen = readdirSync(join(ROOT, 'src', 'app')).filter(f => /^70-scene-gen-/.test(f));
  const R = loadRegistry(ROOT, { omit: ['70-scene-1flow.js', '70-scene-1atmos.js', '70-scene-1weather.js', '70-scene-1camera.js', '70-scene-1credit.js', ...gen] }).R.get;
  const C = R('sceneCompile')(base({ id: 'v2a-absent', streets: [{ side: 'left', along: 'road', from: 8, to: 60 }], flows: [{ id: 'w', kind: 'walk', on: 'pave-r' }], place: [{ obj: 'vehicle.car', on: 'road', d: 30 }] }), { season: 'summer', lod: 1 });
  assert.equal(C.v, 2); assert.deepEqual(C.flows, []); assert.equal(C.atmos, null); assert.deepEqual(C.lights, []);
  assert.ok(C.items.some(i => i.o === 'vehicle.car'));
  assert.ok(C.problems.some(p => p.rule === 'missing'), 'the missing generator is an info problem');
});
