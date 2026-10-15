// The walkable map ported from the v3 world engine into v2 (merge package "crowd", 15 Oct; src/app/78-scene-x-nav.js): the exact
// distance transform, the signed clearance grids of a mover kind (0.5 m cells), A* with string pulling as the fallback of
// sceneMoverFixPath when a blocker has no short way round, and the layer of each mover class.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry } from '../tools/lib/anim-render.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REG = loadRegistry(ROOT);
const E = new Proxy({}, { get: (_, n) => REG.R.get(n) });
const rect = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}z`;
E.sceneObjDefine({ id: 'structure.xnav-wall', category: 'structure', size: [450, 30], real: { h: 1.6, w: 0.3, l: 24 }, tags: ['wall'], build: () => ({ body: [['#886644', rect(-225, -30, 450, 30)]] }) });

const base = (over = {}) => Object.assign({ id: 'xnav', v: 2, view: { lat: 51.3, lon: -0.8 }, camera: { eye: 1.65, fov: 66, horizon: 470, heading: 180 }, season: 'summer', cover: false,
  surfaces: [{ id: 'land', kind: 'grass', rest: true }],
  water: [{ id: 'pond', kind: 'pond', poly: [[5, 20], [30, 20], [30, 80], [5, 80]], edge: 'none' }], place: [], actors: [] }, over);
const compile = (d) => E.sceneCompile(d, { season: 'summer', lod: 1 });

test('the distance transform is exact (squared cells to the nearest seed)', () => {
  const w = 7, h = 5, f = new Float64Array(w * h).fill(1e20);
  f[2 * w + 3] = 0;
  E._scxnEDT(f, w, h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) assert.equal(f[j * w + i], (i - 3) ** 2 + (j - 2) ** 2, `cell ${i},${j}`);
});

test('a walk grid: positive clearance on land, negative on the water, about zero at the bank; the swim grid is its opposite', () => {
  const C = compile(base());
  const walk = E.sceneXNavFor(C, 'walk', [-10, 10, 40, 60]), swim = E.sceneXNavFor(C, 'swim', [-10, 10, 40, 60]);
  assert.ok(walk && walk.near, 'a near grid');
  assert.equal(walk.near.cell, 0.5, '0.5 m cells to 60 m');
  assert.ok(E.sceneXNavSd(walk, -2, 30) > 2, 'land well clear');
  assert.ok(E.sceneXNavSd(walk, 15, 40) < -2, 'the middle of the pond');
  assert.ok(Math.abs(E.sceneXNavSd(walk, 5, 40)) < 0.6, 'the bank');
  assert.ok(E.sceneXNavOk(walk, -1, 30, 0.3) && !E.sceneXNavOk(walk, 12, 30, 0));
  assert.ok(E.sceneXNavSd(swim, 15, 40) > 2 && E.sceneXNavSd(swim, -3, 40) < 0, 'a swimmer keeps to the water');
  assert.equal(E.sceneXNavSd(walk, 300, 30), Infinity, 'outside the grids nothing is faulted');
  assert.equal(E.sceneXNavFor(C, 'walk', [-10, 10, 40, 60]), walk, 'memoised per world and box');
});

test('A* round a long wall: a path that crosses it is routed round by the walkable map (no fault), legal at every point', () => {
  // a 24 m wall across the walk (too long for the short detour, which only rounds blockers under 16 m)
  const C = compile(base({ water: [], place: [{ obj: 'structure.xnav-wall', at: [0, 30], k: 1 }] }));
  const W = E.sceneMotionWorld(C);
  const wall = W.blockers.find(b => b.o === 'structure.xnav-wall');
  assert.ok(wall && wall.hx >= 8, `a long blocker (${wall && wall.hx})`);
  const r = E.sceneMoverFixPath(W, 'person.walker', [[0, 22], [0, 38]], { insert: true });
  assert.equal(r.bad.length, 0, JSON.stringify(r.bad));
  assert.ok(r.nav >= 1, 'found by A*');
  const N = E._scgrMoverNeeds(W, 'person.walker', r.pts);
  for (const p of r.pts) assert.equal(E._scgrWhyNot(W, N, p[0], p[1]), '', `legal: ${p}`);
  for (let k = 1; k < r.pts.length; k++) assert.ok(!W.blockers.some(b => E._scgrSegHits(r.pts[k - 1], r.pts[k], b, N)), `leg ${k} clear`);
});

test('A* fails cleanly (null, memoised) when the goal is walled in; a timed path keeps its seconds over the new legs', () => {
  const C = compile(base({ water: [{ id: 'pond', kind: 'pond', poly: [[-60, 25], [60, 25], [60, 35], [-60, 35]], edge: 'none' }] }));
  const W = E.sceneMotionWorld(C), N = E._scgrMoverNeeds(W, 'person.walker', [[0, 20], [0, 40]]);
  assert.equal(E.sceneXNavPath(W, N, [0, 20], [0, 40], { pad: 6 }), null, 'no way across the water');
  assert.equal(E.sceneXNavPath(W, N, [0, 20], [0, 40], { pad: 6 }), null, 'memoised');
  // a timed leg (dur 12 s) routed round a long wall: the new legs share the 12 s by length
  const C2 = compile(base({ water: [], place: [{ obj: 'structure.xnav-wall', at: [0, 30], k: 1 }] }));
  const W2 = E.sceneMotionWorld(C2), r = E.sceneMoverFixPath(W2, 'person.walker', [[0, 22, 0, 0, null], [0, 38, 0, 0, 12]], { insert: false });
  assert.equal(r.bad.length, 0);
  const total = r.pts.slice(1).reduce((s, p) => s + (p[4] || 0), 0);
  assert.ok(Math.abs(total - 12) < 0.05, `the leg's seconds kept: ${total}`);
});

test('the layers: people and dogs walk, people afloat and water birds swim, herons wade, grazers graze', () => {
  assert.equal(E.sceneXNavLayerOf('person', 'person.walker'), 'walk');
  assert.equal(E.sceneXNavLayerOf('animal-dog', 'animal.dog'), 'walk');
  assert.equal(E.sceneXNavLayerOf('person', 'person.kayaker'), 'swim');
  assert.equal(E.sceneXNavLayerOf('bird-water', 'bird.mallard'), 'swim');
  assert.equal(E.sceneXNavLayerOf('bird-water', 'bird.heron'), 'wade');
  assert.equal(E.sceneXNavLayerOf('animal-graze', 'animal.cow'), 'graze');
  assert.equal(E.sceneXNavLayerOf('air', 'bird.swallow'), null);
});
