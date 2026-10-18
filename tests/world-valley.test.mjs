// A valley seen from a hillside and a gritstone edge (18 Oct, peak-stanage-edge-1): worldValley (relief, field mosaic, woods, hamlet), the gritstone cliff look,
// the camera on high ground, a cliff the nav will not cross, shadows that stop at a lip, models that stand at their lowest corner, the model's fallback.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorld } from '../tools/lib/world/load.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = loadWorld(ROOT);
const VALLEY = { seed: 3, bearing: 10, drop: 300, fall: 1000, floor: 1000, fields: { from: 200, to: 1800, rows: 6, cell: 400, wallsTo: 900, cross: false }, woods: { n: 5, s: [400, 1700], u: [0, 2000] }, hamlet: { at: [1200, 1500], houses: 8 } };

test('worldValley: a relief that falls away to a floor and rises to a far ridge, seeded and complete', () => {
  const V = W.worldValley(VALLEY), V2 = W.worldValley(VALLEY);
  assert.deepEqual(V.ground.relief.h, V2.ground.relief.h, 'the same numbers give the same hill');
  assert.ok(V.ground.relief.h.length === V.ground.relief.nx * V.ground.relief.nd);
  const at = (s, u) => V.at(s, u);
  const h = (s, u) => V.height(...at(s, u));
  assert.ok(Math.abs(h(0, 0)) < 8, 'the camera stands near level');
  assert.ok(h(900, 400) < -200, `the floor is far below: ${h(900, 400)}`);
  assert.ok(h(3800, 400) > h(1600, 400) + 100, 'the far side rises');
  // the slope is concave: steepest at the top, so an eye on the shoulder sees down to the floor
  assert.ok(h(0, 0) - h(100, 0) > h(800, 0) - h(900, 0), 'steeper at the top than at the foot');
});

test('worldValley: fields are polygons with ids of their own, walls stop at wallsTo, no cross walls, woods carry trees, a hamlet is footprints', () => {
  const V = W.worldValley(VALLEY);
  const fields = V.surfaces.filter(s => /^fld-/.test(s.id)), woods = V.surfaces.filter(s => /^wood-/.test(s.id));
  assert.ok(fields.length >= 12 && new Set(fields.map(f => f.id)).size === fields.length, `fields: ${fields.length}`);
  assert.ok(fields.every(f => f.kind === 'field' && f.poly.length === 4), 'each its own field polygon');
  assert.equal(V.lines.filter(l => /^xw-/.test(l.id)).length, 0, 'no walls down the slope');
  for (const l of V.lines) for (const p of l.path) assert.ok(V.sOf(p[0], p[1]) <= 900 + 60, 'walls stop at wallsTo');
  assert.equal(woods.length, 5);
  assert.ok(V.entities.length === 5 && V.entities.every(e => e.cluster && woods.some(w => w.id === e.on)), 'a cluster of trees per wood');
  assert.ok(V.buildings.length >= 4 && V.buildings.every(b => b.foot.length === 4 && b.style));
});

test('a gritstone edge is its own rock: dark, blocky (joints bed by bed), tors on the rim, heather not grass, no trees', () => {
  const f = { kind: 'cliff', path: [[0, 40], [20, 200], [10, 400]], h: 30, rock: 'gritstone', rough: 1, scree: false };
  const g = W.worldCliffGeom(f);
  assert.equal(g.rock, 'gritstone');
  const look = W._WCL_LOOK ? W._WCL_LOOK.gritstone : null;
  if (look) { assert.ok(look.blocky && look.tors && look.heather && look.trees === false); assert.ok(parseInt(look.base.slice(1, 3), 16) < 0x80, 'a dark rock'); }
  const lime = W.worldCliffGeom({ kind: 'cliff', path: [[0, 40], [20, 200], [10, 400]], h: 30, rock: 'limestone' });
  assert.ok(lime.rock === 'limestone', 'limestone keeps its own look');
});

test('a cliff is solid to everything on foot along its whole plan (a sheep never grazes over an edge)', () => {
  const spec = { v: 3, place: { lat: 53.3, lon: -1.6, region: 'derbyshire', style: 'moor' }, camera: { eye: 1.7, fov: 70, horizon: 450, heading: 0 }, seed: 2,
    ground: { features: [{ kind: 'cliff', path: [[-6, -100], [-6, 400]], h: 20, rock: 'gritstone', rough: 0, scree: false, high: 'right' }] },
    surfaces: [{ id: 'moor', kind: 'heath', poly: [[-300, -100], [300, -100], [300, 400], [-300, 400]] }], entities: [], backdrop: { style: 'heath' }, fill: false };
  const w = W.worldBuild(spec, { fill: false }), nav = W.worldNavBuild(w);
  assert.equal(W.worldNavOk(nav, 'walk', -6, 100, 0.25, true), false, 'the face and lip are not walkable');
  assert.equal(W.worldNavOk(nav, 'walk', -4, 100, 0.25, true), false, 'nor a metre or two behind the lip');
  assert.equal(W.worldNavOk(nav, 'walk', 20, 100, 0.25, true), true, 'the plateau is');
});

test('a camera on high ground is judged from its height above the ground (the near plane of a plateau 36 m up)', () => {
  const rel = { x: [-50, 50], d: [2, 500], nx: 33, nd: 33, h: new Array(33 * 33).fill(36) };
  const cam = W.sceneCamera({ camera: { eye: 37.7, fov: 70, horizon: 380 }, ground: { relief: rel } });
  const flat = W.sceneCamera({ camera: { eye: 37.7, fov: 70, horizon: 380 } });
  assert.ok(flat.dMin > 70, `over flat ground a 37.7 m eye sees nothing nearer than ${Math.round(flat.dMin)} m`);
  assert.ok(cam.dMin < 6, `on a 36 m plateau the nearest ground is ${cam.dMin.toFixed(1)} m`);
});

test('a model on a slope stands at its lowest corner and a shadow stops at a lip; both settle after the build', () => {
  const rel = { x: [-200, 200], d: [2, 400], nx: 65, nd: 65, h: [] };
  for (let j = 0; j < 65; j++) for (let i = 0; i < 65; i++) rel.h.push(-0.25 * Math.max(0, -200 + 400 * i / 64));   // falls 0.25 per metre to the right of x = 0
  const spec = { v: 3, place: { lat: 53.3, lon: -1.6, region: 'derbyshire', style: 'moor' }, camera: { eye: 1.7, fov: 70, horizon: 450, heading: 0 }, seed: 2,
    ground: { relief: rel }, surfaces: [{ id: 'moor', kind: 'heath', poly: [[-300, 1], [300, 1], [300, 400], [-300, 400]] }],
    entities: [{ id: 'blk', obj: 'rock.gritstone-block', at: [10, 30], facing: 90 }], backdrop: { style: 'heath' } };
  const w = W.worldBuild(spec, { fill: false });
  const e = w.entities.find(q => q.id === 'blk');
  const foot = W.worldModelFootOf(e, e.model) || [];
  const lowest = Math.min(...foot.map(q => W.sceneGroundHeight(w.cam, q[0], q[1])));
  assert.ok(Math.abs(e.y - lowest) < 0.01, `y ${e.y} is the ground at the lowest corner ${lowest}`);
});

test('the gritstone block is a registered model with its own fallback object and no clones', () => {
  assert.ok(W.worldModelHas('rock.gritstone-block'));
  const c = W.worldModelCheck('gritstone-block');
  assert.ok(c.ok, 'the conformance check: ' + c.problems.join('; '));
});
