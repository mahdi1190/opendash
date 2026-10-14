// World engine, package look: the GROUND DETAIL (79-world-4ground.js; requirements P5, P6, Q5, QP4, C6). Every visible surface is
// textured in perspective by default, and the channel walls of sunken water are dressed (stone courses or an earth bank), so no
// flat slab of colour is left: the baseline drew a sunken river's walls and every paving, towpath and lawn as flat colour.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorld } from '../tools/lib/world/load.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = loadWorld(ROOT);
const PLACE = { lat: 53.39, lon: -1.47, region: 'south-yorkshire' };
const quay = (camX = 0) => ({ v: 3, place: Object.assign({ style: 'river-city' }, PLACE), camera: { eye: 1.7, fov: 62, horizon: 420, heading: 100, water: -2.2 },
  surfaces: [{ id: 'quay-l', kind: 'pavement', poly: [[-60 - camX, 1], [-7 - camX, 1], [-7 - camX, 300], [-60 - camX, 300]] }, { id: 'river', kind: 'water', water: 'river', poly: [[-7 - camX, 1], [8 - camX, 1], [8 - camX, 300], [-7 - camX, 300]] },
    { id: 'quay-r', kind: 'pavement', poly: [[8 - camX, 1], [60 - camX, 1], [60 - camX, 300], [8 - camX, 300]] }], seed: 6 });
const mixed = () => ({ v: 3, place: Object.assign({ style: 'park' }, PLACE), camera: { eye: 1.65, fov: 62, horizon: 470, heading: 0 },
  surfaces: [{ id: 'lawn', kind: 'grass', poly: [[-200, 1], [200, 1], [200, 300], [-200, 300]] }, { id: 'plaza', kind: 'plaza', poly: [[-40, 10], [-8, 10], [-8, 60], [-40, 60]] },
    { id: 'walk', kind: 'pavement', path: [[4, 1], [4, 200]], width: 2.4 }, { id: 'tow', kind: 'towpath', path: [[-2, 1], [-3, 200]], width: 2.6 }], seed: 3 });

test('the ground detail interface; every surface kind has a look, self-dressed kinds none', () => {
  for (const n of ['worldGroundLookOf', 'worldGroundDetail', 'worldGroundTextured', 'worldChannelWalls', 'worldGroundDetailDraw']) assert.equal(typeof W[n], 'function', n);
  assert.ok(W.WORLD_GROUND_LOOKS.flags && W.WORLD_GROUND_LOOKS.stone && W.WORLD_GROUND_LOOKS.earth);
  const world = W.worldBuild(mixed(), { validate: false, fill: false });
  for (const kind of ['pavement', 'plaza', 'path', 'towpath', 'track', 'road', 'grass', 'lawn', 'heath', 'wood', 'field', 'sand', 'verge', 'meadow', 'platform'])
    assert.ok(W.worldGroundLookOf(world, { kind }), kind + ' has a look');
  for (const kind of ['water', 'reeds', 'hedge', 'weir', 'rail', 'boardwalk', 'bridge-deck']) assert.equal(W.worldGroundLookOf(world, { kind }), null, kind + ' dresses itself');
  // the kit's look map wins: a city kit paves its paths, a park mows its grass
  const city = W.worldBuild(quay(), { validate: false });
  assert.equal(W.worldGroundLookOf(city, { kind: 'path' }), 'flags');
  assert.equal(W.worldGroundLookOf(world, { kind: 'grass' }), 'mown');
});

test('every visible surface is textured: marks on each, determinism, and the ground no surface covers too', () => {
  const world = W.worldBuild(mixed(), { validate: false, fill: false });
  const a = W.worldGroundDetail(world, world.cam), b = W.worldGroundDetail(world, world.cam);
  assert.deepEqual(a, b, 'seeded: the same world gives the same marks');
  const by = new Map(a.groups.map(g => [g.surf, g]));
  for (const id of ['lawn', 'plaza', 'walk', 'tow']) assert.ok(by.get(id) && by.get(id).marks.length > 20, id + ' textured: ' + (by.get(id) || { marks: [] }).marks.length);
  assert.ok(by.get('world-rest'), 'the rest of the ground (no surface) is textured as the kit ground');
  for (const g of a.groups) for (const m of g.marks) {
    if (m.t === 'line' || m.t === 'poly') for (const p of m.pts) assert.ok(Number.isFinite(p[0]) && Number.isFinite(p[1]) && p[1] >= world.cam.horizon - 2, `${g.surf} mark below the horizon: ${p}`);
  }
  // later surfaces lie over earlier ones: the lawn's marks are clipped round the plaza, walk and towpath
  assert.ok(by.get('lawn').holes.length >= 3, 'the lawn has holes for what lies on it');
  for (const [x, z] of [[20, 10], [-20, 40], [4, 30], [-2.5, 40], [60, 200]]) assert.equal(W.worldGroundTextured(world, world.cam, x, z).textured, true, `textured at ${x}, ${z}`);
});

test('joints and courses foreshorten with depth and are never denser than a readable spacing (Q5)', () => {
  const world = W.worldBuild(mixed(), { validate: false, fill: false });
  const walk = W.worldGroundDetail(world, world.cam).groups.find(g => g.surf === 'walk');
  // the joints across the pavement: lines whose ends differ mostly in X; their rows (mean Y) from near to far
  const rows = walk.marks.filter(m => m.k === 'joint').map(m => m.pts.reduce((s, p) => s + p[1], 0) / m.pts.length).sort((p, q) => q - p);
  assert.ok(rows.length > 10, 'joints across the pavement: ' + rows.length);
  const gaps = rows.slice(1).map((y, i) => rows[i] - y).filter(g => g > 0.5);
  assert.ok(gaps[0] > gaps[gaps.length - 1] * 2, `near joints are farther apart on screen than far ones: ${gaps[0]} vs ${gaps[gaps.length - 1]}`);
  assert.ok(Math.min(...gaps) >= 2, 'never denser than the readable spacing: ' + Math.min(...gaps));
});

test('channel walls: a sunken river shows dressed walls (stone in town, earth in the country); level water and seams show none', () => {
  const city = W.worldBuild(quay(), { validate: false });
  const walls = W.worldChannelWalls(city, city.cam);
  assert.equal(walls.length, 1);
  assert.equal(walls[0].look, 'stone');
  const xs = [].concat(...walls[0].runs.map(r => r.scr.map(p => p[0])));
  assert.ok(xs.some(x => x < 400) && xs.some(x => x > 1200), 'the camera over the river sees both walls');
  for (const r of walls[0].runs) assert.ok(r.courses > 100, 'courses read far: ' + r.courses);
  const plan = W.worldGroundDetail(city, city.cam);
  const marks = plan.walls[0].runs.reduce((n, r) => n + r.marks.length, 0);
  assert.ok(marks > 200, 'a dressed quay: courses, joints, coping, stains, weeds, ladders: ' + marks);
  // a camera on the right quay sees only the far (left) wall
  const onBank = W.worldBuild(quay(14), { validate: false });
  const w2 = W.worldChannelWalls(onBank, onBank.cam)[0];
  assert.ok(w2 && w2.runs.every(r => r.scr.every(p => p[0] < 1700)) && w2.runs.length >= 1, 'only the far wall');
  // level water: no walls
  const flat = quay(); flat.camera.water = 0;
  assert.equal(W.worldChannelWalls(W.worldBuild(flat, { validate: false }), null).length, 0);
  // a country pond below its banks: an earth bank
  const pond = { v: 3, place: { lat: 51.29, lon: -0.82, region: 'hampshire', style: 'pond' }, camera: { eye: 1.65, fov: 62, horizon: 455, heading: 70, water: -0.4 },
    surfaces: [{ id: 'g', kind: 'grass', poly: [[-200, 1], [200, 1], [200, 300], [-200, 300]] }, { id: 'pond', kind: 'water', water: 'pond', poly: [[-30, 14], [25, 12], [40, 60], [-35, 70]] },
      { id: 'pond2', kind: 'water', water: 'pond', poly: [[25, 12], [60, 10], [70, 50], [40, 60]] }], seed: 3 };
  const pw = W.worldBuild(pond, { validate: false, fill: false }), pwalls = W.worldChannelWalls(pw, pw.cam);
  assert.ok(pwalls.length >= 1 && pwalls.every(w => w.look === 'earth'), 'earth banks');
  // the seam between the two ponds ([25, 12] to [40, 60]) has no wall
  for (const w of pwalls) for (const r of w.runs) {
    const P = W.sceneProject(pw.cam, 32.5, 36, 0), Q = W.sceneProject(pw.cam, 32.5, 36, -0.4);
    const inside = (X, Y) => { let c = false; const S = r.scr; for (let i = 0, j = S.length - 1; i < S.length; j = i++) if ((S[i][1] > Y) !== (S[j][1] > Y) && X < (S[j][0] - S[i][0]) * (Y - S[i][1]) / (S[j][1] - S[i][1]) + S[i][0]) c = !c; return c; };
    assert.ok(!inside((P.X + Q.X) / 2, (P.Y + Q.Y) / 2), 'no wall on the seam between two water regions');
  }
});

test('drawing: the plan draws on any 2D context (marks and walls), never throws', () => {
  const city = W.worldBuild(quay(), { validate: false }), plan = W.worldGroundDetail(city, city.cam);
  const calls = { fill: 0, stroke: 0, clip: 0 };
  const ctx = new Proxy({}, { get: (t, k) => k in t ? t[k] : (k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : (...args) => { if (k in calls) calls[k]++; }), set: (t, k, v) => { t[k] = v; return true; } });
  const n1 = W.worldGroundDetailDraw(ctx, plan, { part: 'marks', colour: (m, h) => h, light: 1 });
  const n2 = W.worldGroundDetailDraw(ctx, plan, { part: 'walls', colour: (m, h) => h, light: 0.2 });
  assert.ok(n1 > 100 && n2 > 100, `drew ${n1} marks and ${n2} wall marks`);
  assert.ok(calls.fill > 0 && calls.stroke > 0 && calls.clip > 0);
  assert.equal(W.worldGroundDetailDraw(null, plan), 0);
  assert.deepEqual(W.worldGroundDetail(null, null).groups, []);
});
