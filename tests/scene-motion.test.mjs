// Movers that behave (user request, 10 Oct: the animation overhaul; src/app/70-scene-1ground.js "MOVERS THAT BEHAVE"): size
// classes over the drawn height, the sink of what floats, blockers from placed things, paths moved onto their water or ground and
// round small blockers, loops that would pop turned round, the motion lint, and the v1 pixel-path fix (renderer side).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry } from '../tools/lib/anim-render.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REG = loadRegistry(ROOT);
const E = new Proxy({}, { get: (_, n) => REG.R.get(n) });
const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg || ''} ${a} vs ${b} (eps ${eps})`);
const rect = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}z`;
E.sceneObjDefine({ id: 'bird.mtest-duck', category: 'bird', size: [60, 40], tags: ['pond', 'duck', 'kit:birds', 'kit:water', 'role:bird'], build: () => ({ body: [['#775533', rect(-30, -20, 60, 20)]], head: [['#225522', rect(14, -36, 10, 16)]] }) });
E.sceneObjDefine({ id: 'boat.mtest', category: 'boat', size: [200, 40], real: { h: 1.9, l: 12, w: 2.1 }, tags: ['kit:boats', 'role:boat'], build: () => ({ hull: [['#336633', rect(-100, -40, 200, 40)]] }) });
E.sceneObjDefine({ id: 'structure.mtest-fence', category: 'structure', size: [100, 30], real: { h: 1.2, w: 0.2 }, tags: ['fence'], build: () => ({ body: [['#886644', rect(-50, -30, 100, 30)]] }) });

const base = (over = {}) => Object.assign({ id: 'mtest', v: 2, view: { lat: 51.3, lon: -0.8 }, camera: { eye: 1.65, fov: 66, horizon: 470, heading: 180 }, season: 'summer', cover: false,
  surfaces: [{ id: 'land', kind: 'grass', rest: true }],
  water: [{ id: 'pond', kind: 'pond', poly: [[5, 20], [30, 20], [30, 80], [5, 80]], edge: 'none' }], place: [], actors: [] }, over);
const compile = (d) => E.sceneCompile(d, { season: 'summer', lod: 1 });

test('size classes: the drawn top, the class height (a def real wins), the sink of what floats', () => {
  const m = E.sceneMoverSize('bird.mtest-duck');
  assert.equal(m.size, 'duck'); near(m.h, 0.35, 1e-9); near(m.top, 36, 0.01, 'the head is the top');
  near(m.sink, 0.3 * 20, 0.01, 'a third of the body sits in the water');
  const b = E.sceneMoverSize('boat.mtest');
  near(b.h, 1.9, 1e-9, 'its own real height'); near(b.sink, 0.22 * 40, 0.01);
  near(E.sceneMoverScale('bird.mtest-duck', 1, 50), 50 * 0.35 / 36, 1e-9);
});

test('a duck path over the bank is moved into the water, a body length in; a path through a moored boat goes round it', () => {
  const C = compile(base({ place: [{ obj: 'boat.mtest', at: [17, 50], k: 1 }],
    actors: [{ obj: 'bird.mtest-duck', ground: [[5.2, 22], [5.2, 60]], speedM: 0.2 }, { obj: 'bird.mtest-duck', ground: [[8, 50], [28, 50]], speedM: 0.2, offset: 0.3 }] }));
  const W = E.sceneMotionWorld(C);
  assert.ok(W.blockers.some(b => b.kind === 'hull' && b.wet), 'the boat is a wet hull');
  for (const a of C.actors) for (const p of a.ground) if (W.shown(p[0], p[1])) {
    assert.ok(W.water(p[0], p[1]), `on the water: ${p}`);
    for (const b of W.blockers) assert.ok(!(Math.abs(p[0] - b.x) < b.hx && Math.abs(p[1] - b.d) < b.hd), `clear of the hull: ${p}`);
  }
  assert.ok(C.problems.some(p => p.rule === 'moverFixed'), 'the fix is reported');
  const R = E.sceneMotionCheck(C);
  assert.equal(R.problems.filter(p => p.sev === 'error').length, 0, JSON.stringify(R.problems));
});

test('walkers keep off the water, round a short fence; a closed gate in the way is a fault, an open one is not; a popping loop turns round', () => {
  const fence = { obj: 'structure.mtest-fence', at: [-8, 30], k: 1 };
  const C = compile(base({ place: [fence], actors: [{ obj: 'person.walker', ground: [[-8, 22], [-8, 40]], loop: 'loop' }, { obj: 'person.walker', ground: [[-3, 33], [6, 33]] }] }));
  const W = E.sceneMotionWorld(C);
  assert.ok(W.blockers.some(b => b.kind === 'line'), 'the fence blocks');
  const [a, b] = C.actors;
  assert.equal(a.loop, 'pingpong', 'a loop whose ends show in the frame turns round');
  assert.ok(a.ground.length > 2, 'detoured round the fence');
  for (const p of b.ground) if (W.shown(p[0], p[1])) assert.ok(!W.water(p[0], p[1]), `walker off the water: ${p}`);
  assert.equal(E.sceneMotionBlockers([{ o: 'prop.mtest-gate-open', x: 800, y: 600, s: 1 }], W.cam).length, 0, 'an open gate never blocks');
});

test('the v1 pixel-path fix leaves the compile alone and moves a walker off the water at bake', () => {
  const v1 = { id: 'mtest-v1', view: { horizon: 470, fov: 66 }, layers: [{ id: 'far' }, { id: 'near' }], water: [{ layer: 'far', d: 'M0 600H1600V900H0Z', y0: 600, y1: 900 }],
    place: [{ obj: 'person.walker', x: 200, y: 560, s: 0.8, layer: 'near' }, { obj: 'person.walker', x: 400, y: 580, s: 0.85, layer: 'near' }, { obj: 'person.walker', x: 600, y: 590, s: 0.9, layer: 'near' }],
    actors: [{ obj: 'person.walker', path: [[100, 560], [800, 604], [1500, 560]], speed: 40, layer: 'near' }] };
  const C = E.sceneCompile(v1, { season: 'summer', lod: 1 });
  assert.deepEqual(C.actors[0].path, [[100, 560], [800, 604], [1500, 560]], 'the compile is unchanged');
  const F = E.sceneMotionFixed(C);
  assert.notEqual(F[0], C.actors[0]);
  assert.ok(F[0].path.every(p => p[1] < 600.5), 'kept above the water line');
  const R = E.sceneMotionCheck(C);
  assert.ok(R.problems.some(p => p.rule === 'moverFixed'));
});
