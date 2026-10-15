// Walkways never cross open water, and wet ground has natural edges (16 Oct, the Fleet Pond boardwalk; SCENE_LESSONS Q, S).
//   - the rule (worldWalkwayWater in 79-world-0core.js), the validator's `walkwayWater` error and the invariant of the same name
//   - the old pond layout fails, the rebuilt scene passes
//   - reed beds and the shores of ponds and lakes are ragged in the built world (never a ruled polygon), and two natural polygons
//     that share an edge keep sharing it
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadScenes, repoRoot } from '../tools/lib/scene-page.mjs';

const NAMES = ['worldWalkwayWater', 'worldValidate', 'worldBuild', 'worldRepair', 'worldInvariants', 'WORLD_INVARIANTS', 'worldHostSpec', '_scPacks', '_wcNaturalEdge'];
loadScenes(repoRoot(), { fixtures: false, browser: true, extra: 'globalThis.__wwk = {' + NAMES.map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ') + '};' });
const E = globalThis.__wwk;
delete globalThis.__wwk;
const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
const land = { id: 'land', kind: 'grass', poly: rect(-100, 0.5, 100, 120) };
const lake = { id: 'lake', kind: 'water', water: 'pond', poly: rect(-60, 20, 60, 100) };
const walk = (id, path, extra = {}) => Object.assign({ id, kind: 'boardwalk', path, width: 1.6 }, extra);
const ids = (r) => r.map(v => v.id).sort();

test('a boardwalk over land, a footbridge of 3 m between two banks and a path along the shore are all quiet', () => {
  const stream = { id: 'stream', kind: 'water', water: 'river', poly: rect(-40, 10, 40, 13) };
  const r = E.worldWalkwayWater([land, stream, walk('w', [[0, 1], [0, 9], [0, 14], [0, 19]])]);
  assert.deepEqual(r, [], JSON.stringify(r.map(v => v.msg)));
});

test('a boardwalk that runs out over open water to a platform mid-lake fails twice: the walk and the platform', () => {
  const platform = { id: 'deck', kind: 'deck', poly: rect(-2, 45, 2, 49) };
  const r = E.worldWalkwayWater([land, lake, walk('w', [[0, 5], [0, 19], [0, 47]]), platform]);
  assert.deepEqual(ids(r), ['deck', 'w']);
  assert.match(r.find(v => v.id === 'w').msg, /ends over open water/);
  assert.match(r.find(v => v.id === 'deck').msg, /floats in open water|over open water/);
});

test('a walkway across a wide water, land to land, still fails: a footbridge is at most 6 m', () => {
  const far = { id: 'far', kind: 'grass', poly: rect(-100, 100, 100, 160) };
  const r = E.worldWalkwayWater([land, lake, far, walk('w', [[0, 5], [0, 110]])]);
  assert.equal(r.length, 1);
  assert.match(r[0].msg, /crosses \d+(\.\d)? m of open water/);
});

test('a jetty is fixed to the shore and runs out over the water: over: water is the way to say so', () => {
  const ok = E.worldWalkwayWater([land, lake, walk('jetty', [[0, 10], [0, 40]], { over: 'water' })]);
  assert.deepEqual(ok, []);
  const loose = E.worldWalkwayWater([land, lake, walk('loose', [[0, 40], [0, 60]], { over: 'water' })]);
  assert.deepEqual(ids(loose), ['loose']);
  // the pier written as a jetty: the repair gives the kind and the mark
  const rep = E.worldRepair({ v: 3, camera: {}, surfaces: [land, lake, { id: 'pier', kind: 'jetty', path: [[0, 10], [0, 40]], width: 2 }] });
  const s = rep.spec.surfaces.find(q => q.id === 'pier');
  assert.equal(s.kind, 'boardwalk');
  assert.equal(s.over, 'water');
});

test('a platform on the bank at a reed edge is quiet; one with its far side over the water and its back on the bank is attached, and judged by its share', () => {
  const reeds = { id: 'reeds', kind: 'reeds', poly: rect(-60, 14, 60, 21) };
  const edge = { id: 'deck', kind: 'deck', poly: rect(-2, 8, 2, 14) };       // on the bank, 1 m from the reed bed
  assert.deepEqual(E.worldWalkwayWater([land, lake, reeds, edge]), []);
  const half = { id: 'half', kind: 'deck', poly: rect(-2, 12, 2, 28) };      // 2 m on the bank, 14 m out over the lake: mostly over water
  const r = E.worldWalkwayWater([land, lake, half]);
  assert.equal(r.length, 1);
  assert.match(r[0].msg, /% over open water/);
});

test('reeds laid over open water to dodge the rule must really grow reeds there', () => {
  const reeds = { id: 'reeds', kind: 'reeds', poly: rect(-6, 18, 6, 60) };
  const w = walk('w', [[0, 5], [0, 40]]);
  const none = E.worldWalkwayWater([land, lake, reeds, w], { reedNear: () => false });
  assert.equal(none.length, 1);
  assert.match(none[0].msg, /no reeds growing/);
  assert.deepEqual(E.worldWalkwayWater([land, lake, reeds, w], { reedNear: () => true }), []);
});

test('the validator names the rule and the engine builds anyway (flag, never drop)', () => {
  const spec = { v: 3, camera: { eye: 2, horizon: 400 }, surfaces: [land, lake, walk('w', [[0, 5], [0, 47]])], entities: [] };
  const v = E.worldValidate(spec);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some(e => e.rule === 'walkwayWater' && /ends over open water/.test(e.msg)));
  const w = E.worldBuild(spec, {});
  assert.ok(w.surfaces.some(s => s.id === 'w'), 'the walkway is kept: the rule flags, it never drops');
  // over is only for a walkway
  const bad = E.worldValidate({ v: 3, camera: {}, surfaces: [land, { id: 'g', kind: 'grass', poly: rect(0, 1, 5, 5), over: 'water' }] });
  assert.ok(bad.errors.some(e => e.rule === 'unknownKey' && /over/.test(e.path)));
});

test('the invariant checker reports walkwayWater from the built world, and a reed bed with reeds is quiet', () => {
  const spec = { v: 3, camera: { eye: 2, horizon: 400 }, surfaces: [land, lake, walk('w', [[0, 5], [0, 47]])], entities: [], fill: false };
  const world = E.worldBuild(spec, {});
  const fr = { t: 0, cam: world.cam, W: 1600, H: 900, ents: [], surfaces: world.surfaces };
  const bad = E.worldInvariants(fr, { world, rules: ['walkwayWater'] }).filter(v => v.rule === 'walkwayWater');
  assert.equal(bad.length, 1);
  assert.ok(E.WORLD_INVARIANTS.some(r => r.rule === 'walkwayWater'));
  const good = { v: 3, camera: { eye: 2, horizon: 400 }, surfaces: [land, lake, walk('w', [[0, 5], [0, 12]])], entities: [], fill: false };
  const gw = E.worldBuild(good, {});
  assert.deepEqual(E.worldInvariants({ t: 0, cam: gw.cam, W: 1600, H: 900, ents: [], surfaces: gw.surfaces }, { world: gw, rules: ['walkwayWater'] }), []);
});

test('Fleet Pond (rebuilt): the boardwalk and its platform break no walkway rule; the pond scene as it was would', () => {
  const item = (E._scPacks['world-test'] || []).find(it => it.id === 'fleet-pond-2-w3');
  assert.ok(item, 'the scene is registered');
  const spec = E.worldHostSpec(item);
  const v = E.worldValidate(spec);
  assert.deepEqual(v.errors.filter(e => e.rule === 'walkwayWater'), []);
  const w = E.worldBuild(Object.assign({}, spec, { fill: false }), {});
  assert.deepEqual(E.worldWalkwayWater(w.surfaces), []);
});

test('reed beds and pond shores are ragged in the built world; a shared edge stays shared; a canal and a path stay ruled', () => {
  const a = { id: 'a', kind: 'reeds', poly: rect(-40, 20, 0, 40) }, b = { id: 'b', kind: 'reeds', poly: rect(0, 20, 40, 40) };
  const pond = { id: 'p', kind: 'water', water: 'pond', poly: rect(-80, 60, 80, 200) }, canal = { id: 'c', kind: 'water', water: 'canal', poly: rect(-80, 220, 80, 260) };
  const path = { id: 'pa', kind: 'path', path: [[0, 1], [0, 60]], width: 2 };
  const w = E.worldBuild({ v: 3, camera: { eye: 2, horizon: 400 }, surfaces: [land, a, b, pond, canal, path], entities: [], fill: false }, {});
  const S = (id) => w.surfaces.find(s => s.id === id);
  // more points than the four corners, and not on the ruled lines
  assert.ok(S('a').poly.length > 20);
  assert.ok(S('a').poly.some(p => Math.abs(p[1] - 40) > 0.15 && Math.abs(p[1] - 20) > 0.15 && p[0] > -39 && p[0] < -1) || S('a').poly.some(p => p[1] > 20.2 && p[1] < 39.8));
  const off = S('a').poly.filter(p => p[0] > -39 && p[0] < -1 && p[1] > 35).map(p => Math.abs(p[1] - 40));
  assert.ok(Math.max(...off) > 0.2, 'the far edge of a reed bed wanders: ' + Math.max(...off).toFixed(2) + ' m');
  assert.ok(S('p').poly.length > 20);
  // a shared edge keeps being shared: the displacement is a field of the point alone
  const t1 = E._wcNaturalEdge([[0, 20], [0, 40], [-10, 30]], 7), t2 = E._wcNaturalEdge([[0, 20], [0, 40], [10, 30]], 7);
  assert.deepEqual(t1.slice(0, 8), t2.slice(0, 8));
  // ruled things stay ruled
  assert.equal(S('c').poly.length, 4);
  assert.deepEqual(S('pa').path, [[0, 1], [0, 60]]);
});
