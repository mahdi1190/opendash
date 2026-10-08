// The v2 water (docs/dev/SCENE_ENGINE_V2.md 5 and 27.2; builder B): the pure maths in Node (70-scene-svg.js and the pure
// helpers of 78-scene-water.js), on the canal fixture (tests/fixtures/scene-v2-b-canal.js). The canvas checks (ripple, mask,
// glint) are in tests/scene-render-v2.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScenes } from '../tools/lib/scene-page.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const S = loadScenes(ROOT, { fixtures: true, browser: true, extra: readFileSync(join(ROOT, 'tests', 'fixtures', 'scene-v2-b-canal.js'), 'utf8') });
const close = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a} vs ${b}`);

test('the waterline row Yw(d) and the mirror row of a base above the water (5.3)', () => {
  const cam = S.SCENE_V2B_CAM;
  // Yw(d) = horizon + f (eye - level) / d
  close(S.sceneWaterRow(cam, 20, -0.4), cam.horizon + cam.f * (cam.eye + 0.4) / 20, 1e-9, 'Yw(20)');
  assert.ok(S.sceneWaterRow(cam, 20, -0.4) > S.sceneCamProject(cam, 0, 20).Y, 'water below the ground plane sits lower on the screen');
  assert.ok(S.sceneWaterRow(cam, 400, -0.4) < S.sceneWaterRow(cam, 40, -0.4), 'farther water is nearer the horizon');
  // a tree standing on a bank 0.4 m above the water mirrors its foot to Yw + f * 0.4 / d: below its own foot, by twice the bank
  const d = 30, foot = S.sceneCamProject(cam, 10, d).Y, mirror = S.sceneWaterMirrorY(cam, d, -0.4, 0.4);
  close(mirror - S.sceneWaterRow(cam, d, -0.4), cam.f * 0.4 / d, 1e-9, 'Yw + f hb / d');
  close(mirror - foot, 2 * cam.f * 0.4 / d, 1e-9, 'the image of the foot is as far below the water as the foot is above it');
  // a floating object (hb 0) mirrors about its own waterline: each object about its own line, never about the far edge
  close(S.sceneWaterMirrorY(cam, 55, -0.4, 0), S.sceneWaterRow(cam, 55, -0.4), 1e-9, 'floating');
  assert.notEqual(S.sceneWaterRow(cam, 55, -0.4), S.sceneWaterRow(cam, 128, -0.4), 'two depths, two mirror rows');
  // the depth of a row inverts the projection
  close(S.sceneCamDepthAt(cam, S.sceneWaterRow(cam, 37, -0.4), -0.4), 37, 1e-9, 'd(Y) inverts Y(d)');
  assert.equal(S.sceneCamDepthAt(cam, cam.horizon - 5), Infinity, 'above the horizon there is no ground');
});

test('ripple bands: 2 px far to 6 px near, cover every row once, at most 90 per region; the amplitude grows toward the camera (5.4)', () => {
  const b = S.sceneWaterBands(0, 300, 1, 90);
  assert.equal(b[0].y, 0);
  let y = 0;
  for (const band of b) { assert.equal(band.y, y, 'contiguous'); y += band.h; }
  assert.equal(y, 300, 'every row once');
  assert.ok(b[0].h <= 2.5 && b[b.length - 1].h >= 5, 'thin far, thick near: ' + b[0].h + ' .. ' + b[b.length - 1].h);
  assert.ok(b.length <= 90, 'cap ' + b.length);
  const capped = S.sceneWaterBands(0, 900, 1, 40);
  assert.ok(capped.length <= 40 && capped.reduce((n, x) => n + x.h, 0) === 900, 'a tall region at a low cap still covers every row');
  assert.ok(S.sceneWaterBands(0, 300, 2, 90).length < b.length, 'device scale 2: thicker bands, fewer of them');
  assert.ok(S.sceneWaterBands(0, 400, 1, 90).length <= 90, 'a taller region is capped by thickening its bands');
  assert.ok(S.sceneWaterRippleA(0.15, 1, 1) > S.sceneWaterRippleA(0.15, 1, 0), 'near ripples are larger');
  close(S.sceneWaterRippleA(0.15, 1, 0), 0.3, 1e-9, 'A(far) = ripple * wind * 2');
  close(S.sceneWaterRippleA(0.15, 1, 1), 1.8, 1e-9, 'A(near) = ripple * wind * 12');
  assert.equal(S.sceneWaterRippleA(0.15, 0, 1), 0, 'no wind, no ripple');
});

test('Fresnel: monotone from the near edge (mirror * .25) to the far edge (mirror * .8)', () => {
  let last = -1;
  for (let u = 0; u <= 1.0001; u += 0.1) { const a = S.sceneWaterFresnel(0.85, u); assert.ok(a > last, 'monotone at ' + u); last = a; }
  close(S.sceneWaterFresnel(0.85, 0), 0.85 * 0.25, 1e-9, 'near');
  close(S.sceneWaterFresnel(0.85, 1), 0.85 * 0.8, 1e-9, 'far');
  assert.ok(S.sceneWaterFresnel(0.35, 1) < S.sceneWaterFresnel(0.85, 1), 'a sea mirrors less than a still canal');
});

test('the glint column: the sun when it is low and in view, else a bright moon, else nothing (5.3)', () => {
  const cam = S.SCENE_V2B_CAM;
  const sun = (alt, rel, x, extra) => Object.assign({ alt, cover: 0.2, dark: alt < -6 ? 1 : 0, sun: { show: true, rel, x }, moon: { show: false }, lowSun: '#ffb070' }, extra || {});
  const g = S.sceneWaterGlintSource(sun(6, -5, 683), cam);
  assert.equal(g.kind, 'sun'); assert.equal(g.x, 683, 'the column of L.sun.x');
  assert.equal(S.sceneWaterGlintSource(sun(50, -5, 683), cam), null, 'a high sun makes no road');
  assert.equal(S.sceneWaterGlintSource(sun(6, -120, -3000), cam), null, 'the sun behind the camera makes no road');
  const night = { alt: -25, cover: 0.1, dark: 1, sun: { show: false, rel: 0, x: 800 }, moon: { show: true, illum: 0.8, rel: 10, x: 1040, alt: 20 } };
  const m = S.sceneWaterGlintSource(night, cam);
  assert.equal(m.kind, 'moon'); assert.equal(m.x, 1040); assert.equal(m.col, '#e8eef6', 'the pale moon road');
  close(m.k, 0.6 * 0.8 + 0.2, 1e-9, 'its strength 0.6 illum + 0.2');
  assert.equal(S.sceneWaterGlintSource(Object.assign({}, night, { moon: Object.assign({}, night.moon, { illum: 0.2 }) }), cam), null, 'a thin moon makes no road');
  const plan = S.sceneWaterGlintPlan({ y0: 480, y1: 900 }, g, 43);
  assert.ok(plan.length <= 30, 'at most 30 glints');
  const far = plan.filter(p => p.y < 600), near = plan.filter(p => p.y > 780);
  const spread = (a) => Math.max(...a.map(p => Math.abs(p.x - 683)));
  assert.ok(far.length && near.length && spread(far) < spread(near), 'the road narrows toward the far edge');
  assert.deepEqual(S.sceneWaterGlintPlan({ y0: 480, y1: 900 }, g, 43), plan, 'seeded');
});

test('a region plan: defaults by kind, the v2 record wins, a v1 region opted in mirrors about its far edge (5.1, 5.5)', () => {
  const C = S.sceneV2BCanal(), cam = S.sceneRenderCam(C), R = S.sceneWaterPlanOf(C.water[0], C, cam);
  assert.equal(R.legacy, false); assert.equal(R.kind, 'canal');
  assert.equal(R.mirror, 0.85); assert.equal(R.ripple, 0.15); assert.equal(R.level, -0.4);
  assert.ok(R.dNear < R.dFar && R.polyM && R.edges.length === 2);
  assert.equal(S.sceneWaterDefaults('sea').mirror, 0.35); assert.equal(S.sceneWaterDefaults('pond').clarity, 0.15);
  assert.equal(R.calm(1), false, 'a canal ripples in a breeze'); assert.equal(R.calm(0.2), true, 'and is calm in still air (ripple * wind < .05)');
  const v1 = { layer: 2, d: 'M0 600L1600 600L1600 900L0 900Z', y0: 600, y1: 900, base: ['#7fb0c0', '#3f7e96', '#1d4c64'], reflect: true, lightPath: true };
  const R1 = S.sceneWaterPlanOf(v1, { view: { fov: 80, horizon: 560 } }, S.sceneRenderCam({ view: { fov: 80, horizon: 560 } }));
  assert.equal(R1.legacy, true, 'no v2 record: legacy (mirrors about y0)');
  assert.equal(R1.y0, 600);
});

test('the bank edges: a far bank shows its face down to the water; a near bank only its coping (5.3 step 2)', () => {
  const C = S.sceneV2BCanal(), cam = S.sceneRenderCam(C), e = S.sceneWaterEdgeQuads(C.water[0].v2, C.water[0].d, cam);
  const top = e.filter(x => x.col === '#b8b2a2'), face = e.filter(x => x.col === '#5e5a50');
  assert.ok(top.length === 2, 'both banks have their coping');
  assert.ok(face.length >= 1, 'a far bank face is seen');
  for (const g of e) for (const q of g.quads) assert.ok(Math.abs(q[2][1] - q[1][1]) >= 1, 'nothing under 1 unit is drawn');
  // farther segments are thinner (projected widths)
  const all = top.flatMap(g => g.quads).sort((a, b) => b[0][1] - a[0][1]);
  assert.ok(Math.abs(all[0][3][1] - all[0][0][1]) > Math.abs(all[all.length - 1][3][1] - all[all.length - 1][0][1]), 'near coping wider than far coping');
});
