// World engine v3, frame time (docs/dev/SCENE_LESSONS.md T): the pure parts of what makes a frame cheap. The browser half (call counts, the
// sections of stats().prof, the warm remount) is measured by `node tools/world.mjs perf <ref> --browser --single --throttle=4`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadScenes, repoRoot } from '../tools/lib/scene-page.mjs';

const NAMES = ['worldHostClock', 'WORLD_HOST_CATCHUP', 'WORLD_HOST_MAX_DT', 'worldOrderNearby', 'worldFrameOrder', 'worldWaterDraw', 'worldWaterRipple', 'WORLD_WATER_LOOK',
  'worldShadowPlan', '_wlWaterPieces', '_wlSurfPoly', '_wfrOffCanvas', 'worldAgents'];
function load() {
  const x = 'globalThis.__ft = {' + NAMES.map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ') + '};';
  loadScenes(repoRoot(), { fixtures: false, browser: true, extra: '\n;\n' + x });
  const E = globalThis.__ft;
  delete globalThis.__ft;
  return E;
}
const E = load();

test('a slow frame moves the scene by at most the catch-up (no tick spiral); normal frames and pauses are as before', () => {
  let wall = 0;
  const c = E.worldHostClock({ now: () => wall });
  wall += 16; assert.equal(c.frame('a', 10, {}), 0, 'the first visible frame is scene time 0');
  let t = 10;
  for (let i = 0; i < 30; i++) { t += 1 / 60; wall += 16; c.frame('a', t, {}); }
  assert.ok(Math.abs(c.tau - 0.5) < 1e-9, 'frames at 60 Hz: real time');
  const k = E.WORLD_HOST_CATCHUP;
  assert.ok(k > 1 / 30 && k < 0.1, 'about two ticks of the 30 Hz step');
  const before = c.tau;
  t += 0.2; wall += 200; c.frame('a', t, {});
  assert.ok(Math.abs(c.tau - before - k) < 1e-9, 'a 200 ms frame owes the catch-up, not 200 ms of every system');
  t += 1 / 30; wall += 33; c.frame('a', t, {});
  assert.ok(Math.abs(c.tau - before - k - 1 / 30) < 1e-9, 'a 30 Hz frame is real time');
  const b2 = c.tau;
  t += 60; wall += 60000; c.frame('a', t, {});
  assert.ok(c.tau - b2 < 0.02 + 1e-9, 'a minute offscreen is still one nominal frame (a pause, not a catch-up)');
});

test('the occluder query returns exactly the statics whose box meets the mover (cells, big pieces, boxes off the frame)', () => {
  let s = 12345;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const ents = [];
  for (let i = 0; i < 400; i++) {
    const x0 = rnd() * 1800 - 100, y0 = rnd() * 1000 - 50, w = 4 + rnd() * (i % 17 === 0 ? 1400 : 90), h = 4 + rnd() * (i % 23 === 0 ? 800 : 120);
    ents.push({ id: 'e' + i, box: { x0, y0, x1: x0 + w, y1: y0 + h }, static: true, x: 0, z: 5 + i * 0.01, foot: [[0, 5 + i * 0.01]] });
  }
  // some far outside the frame (a 21:9 crop and beyond), some wholly negative
  ents.push({ id: 'off1', box: { x0: -1700, y0: -800, x1: -1650, y1: -700 }, static: true, x: 0, z: 9, foot: [[0, 9]] });
  ents.push({ id: 'off2', box: { x0: 3300, y0: 1700, x1: 3390, y1: 1790 }, static: true, x: 0, z: 9, foot: [[0, 9]] });
  const ch = { ents, z0: 5, z1: 9 };
  for (let q = 0; q < 200; q++) {
    const x0 = rnd() * 1900 - 150, y0 = rnd() * 1100 - 100, box = { x0, y0, x1: x0 + 6 + rnd() * 120, y1: y0 + 6 + rnd() * 160 };
    const got = E.worldOrderNearby(ch, box, null, null).map(e => e.id);
    const want = ents.filter(e => box.x0 < e.box.x1 && e.box.x0 < box.x1 && box.y0 < e.box.y1 && e.box.y0 < box.y1).map(e => e.id);
    assert.deepEqual(got, want, 'the same statics in the same (chunk) order');
  }
  assert.deepEqual(E.worldOrderNearby(ch, null, null, null), [], 'no box: nothing');
});

test('water bands: every row is within 0.3 px of its band and a band never exceeds 8 rows; fewer draws than two-row bands', () => {
  globalThis.document = globalThis.document || {};
  const look = E.WORLD_WATER_LOOK.pond || Object.values(E.WORLD_WATER_LOOK)[0];
  const R = { box: [0, 120, 1600, 520], look, phase: 0.7 };
  const calls = [];
  const ctx = { save() {}, restore() {}, setTransform() {}, globalAlpha: 1, drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh) { calls.push({ sy, sh, dx, dy, dw, dh }); } };
  const res = { w: 1600, h: 400, x0: 0, y0: 120, baseCanvas: {}, reflCanvas: {} };
  for (const t of [0, 1.3, 7.7]) {
    calls.length = 0;
    E.worldWaterDraw(ctx, res, R, t, { vs: 1, oy: 0, wind: 1 });
    const bands = calls.filter(c => c.sh !== undefined && c.dw === res.w);
    assert.ok(bands.length > 0 && bands.length <= 200, 'no more draws than the two-row bands (200)');
    let rows = 0;
    for (const b of bands) {
      assert.ok(b.sh >= 1 && b.sh <= 8, 'a band is 1 to 8 rows');
      for (let r = 0; r < b.sh; r++) {
        const own = E.worldWaterRipple(R, res.y0 + b.sy + r, t, { vs: 1, oy: 0, wind: 1 });
        assert.ok(Math.abs(own - b.dx) <= 0.3 + 1e-9 || b.sh <= 2, `row ${b.sy + r} is ${Math.abs(own - b.dx).toFixed(2)} px off its band`);
      }
      rows += b.sh;
    }
    assert.equal(rows, res.h, 'every row is drawn once');
  }
});

test('the shadow plan memoises the water pieces per surfaces array and keeps its holes', () => {
  const lake = { id: 'lake', kind: 'water', poly: [[-6, 12], [6, 12], [6, 30], [-6, 30]] };
  const surfaces = [lake, { id: 'grass', kind: 'ground', poly: [[-30, 3], [30, 3], [30, 60], [-30, 60]] }];
  const a = E._wlWaterPieces(surfaces), b = E._wlWaterPieces(surfaces);
  assert.equal(a, b, 'the same pieces object for the same surfaces');
  assert.equal(a.length, 1);
  assert.deepEqual([a[0].x0, a[0].z0, a[0].x1, a[0].z1], [-6, 12, 6, 30], 'with its box');
  assert.notEqual(E._wlWaterPieces(surfaces.slice()), a, 'another array is looked at again');
  const cam = { f: 800, eye: 1.6, x0: 800, horizon: 360, dMin: 3, water: 0 };
  const sun = { az: 200, alt: 40, kind: 'sun' };
  const plan = E.worldShadowPlan({ entities: [], surfaces, cam }, cam, sun, { agents: [
    { id: 'near', obj: 'person.walker', cls: 'person', x: 5.8, z: 13, y: 0, h: 1.7, layer: 'walk' },
    { id: 'far', obj: 'person.walker', cls: 'person', x: -25, z: 50, y: 0, h: 1.7, layer: 'walk' }] });
  const holes = (id) => plan.filter(p => p.ref === id).reduce((n, p) => n + (p.holes || []).length, 0);
  assert.ok(holes('near') > 0, 'a walker at the water\'s edge has its shadow cut by the water');
  assert.equal(holes('far'), 0, 'one far from it has no hole (and no clip made)');
});
