// Geodesy for the scene tools (tools/lib/geo.mjs; docs/dev/SCENE_ENGINE_V2.md 17.3, 18.2, 27.5; builder E): local metres, the
// camera's ground frame, great circles, the view wedge, the British National Grid against published control values, tiles, and
// the planar helpers (clipping, simplification, rings).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enuOf, groundOf, haversine, destination, wedgeBBox, circleBBox, wgs84ToOsgb36, osgb36ToGrid, wgs84ToBng, gridRef, tileXY, tileLatLon, metresPerPixel,
  ringArea, ringCentroid, pointInRing, nearestOnLine, lineLength, simplify, clipRing, clipLine, wedgePlanes } from '../tools/lib/geo.mjs';

const close = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg || ''} ${a} vs ${b} (eps ${eps})`);

test('ENU and the camera ground frame round-trip; the axes follow the heading', () => {
  const E = enuOf(53.38, -1.47);
  for (const [e, n] of [[0, 0], [120, -45], [-800, 650], [3000, 2000]]) {
    const [la, lo] = E.toLatLon(e, n), [e2, n2] = E.toLocal(la, lo);
    close(e2, e, 1e-6); close(n2, n, 1e-6);
  }
  // V2 17.3: east = (lon - lon0) * cos(lat0) * 111320, north = (lat - lat0) * 110540
  const [e, n] = E.toLocal(53.39, -1.46);
  close(e, 0.01 * Math.cos(53.38 * Math.PI / 180) * 111320, 1e-6); close(n, 0.01 * 110540, 1e-6);
  const north = groundOf({ lat: 53.38, lon: -1.47, heading: 0 }), east = groundOf({ lat: 53.38, lon: -1.47, heading: 90 });
  const pE = enuOf(53.38, -1.47).toLatLon(100, 0);   // 100 m due east
  let [x, d] = north.toGround(...pE); close(x, 100, 1e-6); close(d, 0, 1e-6);
  [x, d] = east.toGround(...pE); close(x, 0, 1e-6); close(d, 100, 1e-6);
  const g = groundOf({ lat: 51.27, lon: -0.85, heading: 237 });
  for (const [x0, d0] of [[5, 40], [-60, 300], [0, 0.5]]) { const [x1, d1] = g.toGround(...g.fromGround(x0, d0)); close(x1, x0, 1e-6); close(d1, d0, 1e-6); }
  // the equirectangular frame agrees with the great circle to a few metres over 2 km
  const [la, lo] = g.fromGround(0, 2000);
  close(haversine(51.27, -0.85, la, lo), 2000, 6);
});

test('great circles and the view wedge', () => {
  close(haversine(51.5074, -0.1278, 48.8566, 2.3522), 343556, 300, 'London to Paris');
  const [la, lo] = destination(53.35, -1.81, 65, 10000);
  close(haversine(53.35, -1.81, la, lo), 10000, 0.01);
  const cam = { lat: 53.38, lon: -1.47, heading: 15, fov: 66 }, b = wedgeBBox(cam, 700);
  assert.ok(b[0] < 53.38 && b[2] > 53.38 && b[1] < -1.47 && b[3] > -1.47, 'the camera is inside its bbox');
  const g = groundOf(cam);
  for (const [x, d] of [[0, 700], [-500, 690], [500, 690]]) { const [p, q] = g.fromGround(x, d); assert.ok(p >= b[0] && p <= b[2] && q >= b[1] && q <= b[3], `${x},${d}`); }
  const c = circleBBox(53.38, -1.47, 500);
  close(haversine(c[0], -1.47, c[2], -1.47), 1000, 30);
});

test('the British National Grid: the OS worked example and the Helmert shift', () => {
  // OS "A guide to coordinate systems in Great Britain", the Transverse Mercator worked example (Caister water tower, OSGB36 lat/lon)
  const [e, n] = osgb36ToGrid(52 + 39 / 60 + 27.2531 / 3600, 1 + 43 / 60 + 4.5177 / 3600);
  close(e, 651409.903, 0.01, 'easting'); close(n, 313177.270, 0.01, 'northing');
  // the same tower from WGS84 (52 39 28.723 N, 1 42 57.787 E) through the 7-parameter Helmert: within 5 m (V2 18.2)
  const [e2, n2] = wgs84ToBng(52 + 39 / 60 + 28.723 / 3600, 1 + 42 / 60 + 57.787 / 3600);
  assert.ok(Math.hypot(e2 - 651409.903, n2 - 313177.270) < 5, `${e2}, ${n2}`);
  const [p, l] = wgs84ToOsgb36(52.65798, 1.71605, 0);
  assert.ok(p < 52.65798 && l > 1.71605, 'OSGB36 lies south and east of WGS84 in East Anglia (about 45 m and 126 m)');
  assert.equal(gridRef(651409, 313177, 6), 'TG 514 131');
  assert.equal(gridRef(412780, 383610, 8), 'SK 1278 8361');
  assert.equal(gridRef(-5, 10), null);
});

test('tiles: round trip and scale', () => {
  const t = tileXY(53.349, -1.81, 12);
  assert.equal(Math.floor(t.x), 2027); assert.equal(Math.floor(t.y), 1327);
  const [la, lo] = tileLatLon(t.x, t.y, 12);
  close(la, 53.349, 1e-9); close(lo, -1.81, 1e-9);
  close(metresPerPixel(0, 0), 156543.03, 0.01);
});

test('planar helpers: rings, clipping, simplification', () => {
  const sq = [[0, 0], [10, 0], [10, 10], [0, 10]];
  assert.equal(ringArea(sq), 100); assert.equal(ringArea(sq.slice().reverse()), -100);
  assert.deepEqual(ringCentroid(sq), [5, 5]);
  assert.ok(pointInRing([5, 5], sq) && !pointInRing([15, 5], sq));
  close(nearestOnLine([5, 3], [[0, 0], [10, 0]]).m, 3, 1e-12);
  assert.equal(lineLength([[0, 0], [3, 4], [3, 10]]), 11);
  const W = wedgePlanes({ dNear: 1, dFar: 100, t: 0.5 });
  const tri = clipRing([[-100, 50], [100, 50], [0, 200]], W);
  for (const [x, d] of tri) assert.ok(d >= 1 - 1e-9 && d <= 100 + 1e-9 && Math.abs(x) <= d * 0.5 + 1e-9);
  assert.ok(Math.abs(ringArea(tri)) > 0);
  assert.deepEqual(clipRing([[-10, 200], [10, 200], [0, 300]], W), [], 'beyond dFar: nothing');
  const runs = clipLine([[-100, 50], [100, 50]], W);
  assert.equal(runs.length, 1); close(runs[0][0][0], -25, 1e-9); close(runs[0][1][0], 25, 1e-9);
  const two = clipLine([[0, 10], [0, 150], [0, 50]], W);
  assert.equal(two.length, 2, 'a line that leaves and comes back: two runs');
  const pts = [[0, 0], [1, 0.01], [2, 0], [3, 2], [4, 0]];
  assert.deepEqual(simplify(pts, 0.1), [[0, 0], [2, 0], [3, 2], [4, 0]]);
  const ring = simplify([[0, 0], [5, 0.01], [10, 0], [10, 10], [0, 10]], 0.1, true);
  assert.equal(ring.length, 4);
});
