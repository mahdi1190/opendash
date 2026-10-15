// The invariant checker (docs/dev/WORLD_ENGINE.md 16.1, 16.2; src/app/79-world-9inv.js): every rule fires on a hand-made bad
// frame and stays quiet on a good one. The frames are built by hand (no other package decides what is in them), so each
// rule is tested on its own; where a rule leans on another package's knowledge (kb sizes, habitats), the bad case is wrong
// by any measure and the good case right by any.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadEngine } from '../tools/lib/world/convert.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const E = loadEngine({ root: ROOT });
const cam = E.sceneCamera({ camera: { eye: 1.65, fov: 64, horizon: 460, heading: 0 } });
const SURF = [
  { id: 'land', kind: 'grass', poly: [[-200, 0.5], [200, 0.5], [200, 400], [-200, 400]] },
  { id: 'pond', kind: 'water', water: 'canal', poly: [[-10, 1], [-2, 1], [-2, 300], [-10, 300]], shallow: 0.6 },
  { id: 'tow', kind: 'towpath', path: [[0.5, 1], [0.5, 300]], width: 2.6 },
  { id: 'road', kind: 'road', path: [[30, 1], [30, 300]], width: 7 },
];
const world = { v: 3, cam, surfaces: SURF, entities: [], seed: 1, place: { lat: 51.29, lon: -0.82 } };
const box = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
/** A frame record (16.1) from a list of entity records; boxes projected unless given. */
function frame(ents, extra = {}) {
  for (const e of ents) {
    if (e.box === undefined && Number.isFinite(e.x) && Number.isFinite(e.z) && e.z > 0.3) {
      const h = e.height || 1, a = E.sceneProject(cam, e.x, e.z, e.y || 0), b = E.sceneProject(cam, e.x, e.z, (e.y || 0) + h), k = cam.f / e.z, w = (e.w || h * 0.5) * k;
      e.box = [a.X - w / 2, b.Y, a.X + w / 2, a.Y];
    }
  }
  return Object.assign({ t: 0, cam, W: 1600, H: 900, ents, surfaces: SURF }, extra);
}
const run = (rule, fr, o = {}) => E.worldInvariants(fr, Object.assign({ world, rules: [rule] }, o)).filter(v => v.rule === rule);
const P = (o) => Object.assign({ id: 'p1', cls: 'person', obj: 'person.walker', static: false, x: 3, y: 0, z: 20, height: 1.75, layer: 'walk', speed: 0, vx: 0, vz: 0, state: 'idle', view: 'side', mirror: false }, o);
const S = (o) => Object.assign({ id: 's1', static: true, y: 0, height: 1 }, o);
const bench = (id, x, z, facing = 0) => S({ id, obj: 'street.bench', cls: 'bench', x, z, facing, solidity: 'solid', height: 0.85, foot: facing === 90 ? box(x - 0.95, z - 0.3, x + 0.95, z + 0.3) : box(x - 0.3, z - 0.95, x + 0.3, z + 0.95) });

test('WORLD_INVARIANTS lists every rule of 16.2 with its requirement ids', () => {
  const want = ['habitat', 'overlap', 'inSolid', 'personalSpace', 'onWater', 'floating', 'orphan', 'pathBlocked', 'reflectOutsideWater', 'shadowOnWater', 'shadowDir', 'waterGap',
    'edgeCut', 'nearBand', 'giant', 'popping', 'stuck', 'slidingFeet', 'facing', 'laneDir', 'animStill', 'stillMoving', 'staticAnim', 'clones', 'windDir', 'order', 'landmark', 'bare', 'season'];
  assert.deepEqual(E.WORLD_INVARIANTS.map(r => r.rule).sort(), want.slice().sort());
  for (const r of E.WORLD_INVARIANTS) { assert.match(r.req, /^[A-Z]\d/, r.rule); assert.ok(r.what.length > 10, r.rule); }
});

test('the checker never throws: no frame, an empty frame and garbage entities give a result', () => {
  assert.equal(E.worldInvariants(null)[0].rule, 'frame');
  assert.deepEqual(E.worldInvariants({ ents: [] }), []);
  const v = E.worldInvariants({ ents: [{ id: 'x' }, null, { id: 'y', box: 'no', foot: 7, anim: 3 }], cam: null });
  assert.ok(Array.isArray(v));
  for (const x of v) assert.ok(x.rule && x.req !== undefined && 'id' in x && x.msg, JSON.stringify(x));
});

test('habitat: a boat on the towpath (its footprint on land); a boat inside the canal is quiet', () => {
  const info = E.worldObjectInfo('boat.narrowboat'), L = info.size.w / 2, B = info.size.d / 2, lvl = 0, y = lvl - (info.sink || 0);
  const bad = S({ id: 'nb1', obj: 'boat.narrowboat', cls: 'boat', x: 0.5, z: 30, y, attach: 'water', waterline: lvl, solidity: 'solid', foot: box(0.5 - B, 30 - L, 0.5 + B, 30 + L) });
  const good = S({ id: 'nb2', obj: 'boat.narrowboat', cls: 'boat', x: -6, z: 60, y, attach: 'water', waterline: lvl, solidity: 'solid', foot: box(-6 - B, 60 - L, -6 + B, 60 + L) });
  assert.equal(run('habitat', frame([bad])).length, 1);
  assert.deepEqual(run('habitat', frame([good])), []);
  // a person inside a wall is a habitat fault too (nothing passable stands inside a solid)
  const wall = S({ id: 'w', obj: 'structure.stone-wall', cls: 'fence', x: 10, z: 40, solidity: 'solid', foot: box(7, 39.7, 13, 40.3), height: 1.2 });
  assert.equal(run('habitat', frame([wall, S({ id: 'pp', obj: 'person.walker', cls: 'person', x: 10, z: 40, height: 1.7 })])).filter(v => v.id === 'pp').length, 1);
  assert.deepEqual(run('habitat', frame([wall, S({ id: 'pp', obj: 'person.walker', cls: 'person', x: 10, z: 43, height: 1.7 })])).filter(v => v.id === 'pp'), []);
});

test('overlap: two solid footprints through each other; apart is quiet', () => {
  assert.equal(run('overlap', frame([bench('b1', 12, 20), bench('b2', 12.3, 20.5)])).length, 1);
  assert.deepEqual(run('overlap', frame([bench('b1', 12, 20), bench('b2', 14, 20)])), []);
});

test('inSolid: a walker inside a building footprint; beside it is quiet', () => {
  const house = S({ id: 'h', obj: 'building.cottage', cls: 'building', x: 15, z: 40, solidity: 'solid', foot: box(11.5, 36.5, 18.5, 43.5), height: 7 });
  assert.equal(run('inSolid', frame([house, P({ x: 15, z: 40 })])).length, 1);
  assert.deepEqual(run('inSolid', frame([house, P({ x: 15, z: 46 })])), []);
});

test('onWater: a walker in the canal; on the towpath is quiet', () => {
  assert.equal(run('onWater', frame([P({ x: -6, z: 20 })])).length, 1);
  assert.deepEqual(run('onWater', frame([P({ x: 0.5, z: 20 })])), []);
});

test('floating: a bench a metre above the ground and a duck above the water; standing and floating right is quiet', () => {
  assert.equal(run('floating', frame([S({ id: 'b', obj: 'street.bench', cls: 'bench', x: 12, z: 20, y: 1 })])).length, 1);
  assert.deepEqual(run('floating', frame([S({ id: 'b', obj: 'street.bench', cls: 'bench', x: 12, z: 20, y: 0 })])), []);
  const duck = { id: 'd', cls: 'duck', obj: 'bird.mallard', static: false, layer: 'swim', x: -6, z: 20, height: 0.35 };
  assert.equal(run('floating', frame([P(Object.assign({}, duck, { y: 1.2 }))])).length, 1);
  assert.deepEqual(run('floating', frame([P(Object.assign({}, duck, { y: 0 }))])), []);
});

test('orphan: a bough with no tree; with its tree in reach it is quiet', () => {
  const b = S({ id: 'bough', obj: 'plant.yg-oak-bough', cls: 'bough', x: 4, z: 7 });
  assert.equal(run('orphan', frame([b])).length, 1);
  const tree = S({ id: 'oak', obj: 'tree.bank-oak', cls: 'tree', x: 7, z: 9, height: 16 });
  assert.deepEqual(run('orphan', frame([tree, Object.assign({}, b, { parent: 'oak' })])), []);
  assert.equal(run('orphan', frame([tree, Object.assign({}, b, { parent: 'nowhere' })])).length, 1, 'a parent that is not in the frame');
});

test('pathBlocked: a bench across the towpath; beside it is quiet', () => {
  assert.equal(run('pathBlocked', frame([bench('b', 0.5, 20, 90)])).length, 1);
  assert.deepEqual(run('pathBlocked', frame([bench('b', 3.6, 20)])), []);
});

test('reflectOutsideWater: a reflection in the grass; in the canal it is quiet', () => {
  assert.equal(run('reflectOutsideWater', frame([S({ id: 't', obj: 'tree.bank-oak', cls: 'tree', x: 12, z: 30, reflect: { surface: 'land', rowY: 500 } })])).length, 1);
  assert.deepEqual(run('reflectOutsideWater', frame([S({ id: 't', obj: 'tree.bank-oak', cls: 'tree', x: -12, z: 30, reflect: { surface: 'pond', rowY: 500 } })])), []);
});

test('shadowOnWater: a cast shadow lying on the canal; on grass, or cut from the water, it is quiet', () => {
  const on = { kind: 'cast', poly: box(-9, 30, -4, 34), dir: [1, 0] }, off = { kind: 'cast', poly: box(12, 30, 16, 34), dir: [1, 0] };
  assert.equal(run('shadowOnWater', frame([S({ id: 't', obj: 'tree.bank-oak', cls: 'tree', x: -11, z: 32, shadow: on })])).length, 1);
  assert.deepEqual(run('shadowOnWater', frame([S({ id: 't', obj: 'tree.bank-oak', cls: 'tree', x: 11, z: 32, shadow: off })])), []);
  assert.deepEqual(run('shadowOnWater', frame([S({ id: 't', obj: 'tree.bank-oak', cls: 'tree', x: -11, z: 32, shadow: Object.assign({ cutWater: ['pond'] }, on) })])), []);
});

test('shadowDir: two shadows 40 degrees apart; one direction is quiet', () => {
  const sh = (a) => ({ kind: 'cast', poly: box(20, 30, 22, 32), dir: [Math.sin(a * Math.PI / 180) * 3, Math.cos(a * Math.PI / 180) * 3] });
  const ents = (b) => [S({ id: 'a', obj: 'tree.bank-oak', x: 20, z: 30, shadow: sh(60) }), S({ id: 'b', obj: 'tree.bank-oak', x: 25, z: 40, shadow: sh(60 + b) }), S({ id: 'c', obj: 'tree.bank-oak', x: 28, z: 50, shadow: sh(60) })];
  assert.equal(run('shadowDir', frame(ents(40))).length, 1);
  assert.deepEqual(run('shadowDir', frame(ents(0.5))), []);
});

test('waterGap: gap pixels reported by the renderer; none is quiet; nothing to read is n/a', () => {
  assert.equal(run('waterGap', frame([], { waterGaps: 12 })).length, 1);
  assert.deepEqual(run('waterGap', frame([], { waterGaps: 0 })), []);
  const st = {};
  E.worldInvariants(frame([]), { rules: ['waterGap'], stats: st });
  assert.deepEqual(st.na, ['waterGap']);
  assert.equal(run('waterGap', frame([]), { waterProbe: () => ({ gaps: 3, where: 'near the lens' }) }).length, 1);
});

test('edgeCut: a big boat cut by the left edge and a half walker at the bottom; framing elements and whole things are quiet', () => {
  const slab = S({ id: 'nb', obj: 'boat.narrowboat', cls: 'boat', x: -4, z: 6, box: [-300, 300, 700, 900] });
  assert.equal(run('edgeCut', frame([slab])).length, 1);
  assert.deepEqual(run('edgeCut', frame([Object.assign({}, slab, { framing: true })])), []);
  assert.deepEqual(run('edgeCut', frame([Object.assign({}, slab, { box: [300, 300, 1300, 880] })])), []);
  assert.equal(run('edgeCut', frame([P({ box: [700, 600, 780, 960] })])).length, 1, 'a half person below the frame');
  assert.deepEqual(run('edgeCut', frame([P({ box: [700, 500, 760, 640] })])), []);
});

test('nearBand: a walker 2 m from the lens; 10 m away is quiet', () => {
  assert.equal(run('nearBand', frame([P({ z: 2 })])).length, 1);
  assert.deepEqual(run('nearBand', frame([P({ z: 10 })])), []);
  assert.deepEqual(run('nearBand', frame([P({ z: 2, framed: true })])), [], 'a declared framed mover');
});

test('giant: a 3.4 m person and one drawn half the frame tall; a 1.75 m person is quiet', () => {
  assert.equal(run('giant', frame([P({ height: 3.4 })])).length, 1);
  assert.equal(run('giant', frame([P({ height: 1.75, box: [700, 300, 800, 860] })])).length, 1);
  assert.deepEqual(run('giant', frame([P({ height: 1.75 })])), []);
});

test('popping: a walker appearing mid-frame; one entering at the frame edge (or at a spawn cell) is quiet', () => {
  const prev = frame([]);
  assert.equal(run('popping', frame([P({ box: [790, 470, 806, 500] })]), { prev }).length, 1);
  assert.deepEqual(run('popping', frame([P({ box: [-10, 470, 6, 500] })]), { prev }), []);
  assert.deepEqual(run('popping', frame([P({ box: [790, 470, 806, 500] })]), { prev, isSpawn: () => true }), []);
  // vanishing mid-frame
  assert.equal(run('popping', frame([]), { prev: frame([P({ box: [790, 470, 806, 500] })]) }).length, 1);
});

test('stuck: a mover with somewhere to go has 20 s, whatever pose it is drawn in; one walking along or at rest by design is quiet', () => {
  const frames = (mk, secs, o) => { const track = E.worldInvariantTracker(); let n = 0; for (let t = 0; t <= secs; t += 0.5) n += run('stuck', frame([mk(t)], { t }), { track }).length; return n; };
  assert.equal(frames(() => P({ state: 'walk', speed: 1.3, vx: 1.3, intent: 'travel' }), 21), 1, 'on the move but going nowhere: reported once');
  assert.equal(frames(() => P({ state: 'idle', intent: 'travel' }), 21), 1, 'an idle pose is what being stuck looks like: it does not excuse a mover with somewhere to go');
  assert.equal(frames(() => P({ state: 'idle', intent: 'stay' }), 21), 0, 'an idle goal is not stuck');
  assert.equal(frames(() => P({ state: 'idle', intent: 'stay' }), 91), 1, '... but a statue for 90 s is');
  assert.equal(frames(() => P({ state: 'idle', cls: 'heron', obj: 'bird.heron', intent: 'stay' }), 91), 0, 'a heron stands for minutes');
  assert.equal(frames(t => P({ state: 'walk', speed: 1.3, x: 3 + t * 1.3, intent: 'travel' }), 21), 0, 'one walking along is quiet');
  assert.equal(frames(() => P({ state: 'sit', intent: 'travel' }), 91), 0, 'seated, queuing, fishing, grazing: at rest by design');
  // the 20 s run starts with the wish to travel: an idle goal before it is a legitimate pause
  const track = E.worldInvariantTracker(); let n = 0;
  for (let t = 0; t <= 30; t += 0.5) n += run('stuck', frame([P({ state: 'idle', intent: t < 15 ? 'stay' : 'travel' })], { t }), { track }).length;
  assert.equal(n, 0, '15 s of idling, then 15 s of wanting to go: 15 s of travel is not 20');
});

test('personalSpace: two movers on one layer never overlap or pass through each other; a walker and its dog may be close', () => {
  const two = (a, b, o) => run('personalSpace', frame([P(Object.assign({ id: 'a', x: 3, z: 20, r: 0.25 }, a)), P(Object.assign({ id: 'b', x: 3.2, z: 20, r: 0.25 }, b))]), o || {});
  assert.equal(two({}, {}).length, 1, 'two people 0.2 m apart (their bodies need 0.43 m)');
  assert.equal(two({}, { x: 3.9 }).length, 0, '0.9 m apart is room');
  assert.equal(two({}, { layer: 'swim' }).length, 0, 'another layer (a duck under a walker) is another place');
  assert.equal(two({ group: 'b' }, { x: 3.4 }).length, 0, 'a group (a walker and its dog) keeps a closer floor');
  assert.equal(two({ group: 'b' }, { x: 3.01 }).length, 1, '... but never the same spot');
  assert.equal(two({ squeeze: true }, { x: 3.05 }).length, 0, 'passing in a lane a body wide: they turn sideways and pass through each other for a step');
  // through each other between two frames: the tracks cross, both ends are clear
  const track = E.worldInvariantTracker();
  run('personalSpace', frame([P({ id: 'a', x: 2, z: 20, r: 0.25 }), P({ id: 'b', x: 4, z: 20.05, r: 0.25 })], { t: 0 }), { track });
  const v = run('personalSpace', frame([P({ id: 'a', x: 4, z: 20, r: 0.25 }), P({ id: 'b', x: 2, z: 20.05, r: 0.25 })], { t: 0.2 }), { track });
  assert.equal(v.length, 1, 'two walkers swapped places through each other in one 5 Hz step');
  assert.match(v[0].msg, /walked through/);
  // frames half a second apart (the real-frame run) cannot say how two bodies passed: the sweep is left to the 5 Hz run
  const track2 = E.worldInvariantTracker();
  run('personalSpace', frame([P({ id: 'a', x: 2, z: 20, r: 0.25 }), P({ id: 'b', x: 4, z: 20.05, r: 0.25 })], { t: 0 }), { track: track2 });
  assert.equal(run('personalSpace', frame([P({ id: 'a', x: 4, z: 20, r: 0.25 }), P({ id: 'b', x: 2, z: 20.05, r: 0.25 })], { t: 0.5 }), { track: track2 }).length, 0, 'not judged at 2 Hz');
});

test('slidingFeet: steps at twice the rate the speed needs; matching steps are quiet', () => {
  assert.equal(run('slidingFeet', frame([P({ speed: 1.4, vx: 1.4, state: 'walk', anim: { state: 'move', rate: 4, stride: 0.75, phase: 0.1, period: 0.25 } })])).length, 1);
  assert.deepEqual(run('slidingFeet', frame([P({ speed: 1.4, vx: 1.4, state: 'walk', anim: { state: 'move', rate: 1.9, stride: 0.75, phase: 0.1, period: 0.53 } })])), []);
});

test('facing: a walker crossing to the right drawn from the front or facing left; the side view facing right is quiet', () => {
  const m = { x: 0, z: 20, vx: 1.4, vz: 0, speed: 1.4, state: 'walk' };
  assert.equal(run('facing', frame([P(Object.assign({ view: 'front', mirror: false }, m))])).length, 1);
  assert.equal(run('facing', frame([P(Object.assign({ view: 'side', mirror: true }, m))])).length, 1);
  assert.deepEqual(run('facing', frame([P(Object.assign({ view: 'side', mirror: false }, m))])), []);
});

test('laneDir: a car driving on the right of the road; on the left it is quiet (UK)', () => {
  const car = (x, vz) => P({ id: 'car', cls: 'vehicle', obj: 'vehicle.car', layer: 'drive', x, z: 40, vx: 0, vz, speed: Math.abs(vz), height: 1.5, state: 'drive' });
  assert.equal(run('laneDir', frame([car(31.8, 8)])).length, 1);
  assert.deepEqual(run('laneDir', frame([car(28.2, 8)])), []);
  assert.deepEqual(run('laneDir', frame([car(31.8, -8)])), [], 'coming towards the camera on the other side');
  assert.equal(run('laneDir', frame([S({ id: 'parked', obj: 'vehicle.car', cls: 'vehicle', x: 31.8, z: 60, facing: 0 })])).length, 1, 'a static car facing the traffic');
});

test('animStill and stillMoving: a walk cycle while still, an idle pose while moving; matching states are quiet', () => {
  assert.equal(run('animStill', frame([P({ speed: 0, anim: { state: 'move', rate: 1.8, phase: 0, period: 0.55 } })])).length, 1);
  assert.deepEqual(run('animStill', frame([P({ speed: 0, anim: { state: 'idle', rate: 0.2, phase: 0, period: 4 } })])), []);
  assert.equal(run('stillMoving', frame([P({ speed: 1.4, vx: 1.4, anim: { state: 'idle', rate: 0, phase: 0, period: 4 } })])).length, 1);
  assert.deepEqual(run('stillMoving', frame([P({ speed: 1.4, vx: 1.4, anim: { state: 'move', rate: 1.9, phase: 0, period: 0.53 } })])), []);
  // M7: a walker easing to a stop keeps its cycle for a moment (grace with a tracker)
  const track = E.worldInvariantTracker();
  run('animStill', frame([P({ speed: 1.4, anim: { state: 'move', rate: 1.9 } })], { t: 0 }), { track });
  assert.deepEqual(run('animStill', frame([P({ speed: 0, anim: { state: 'move', rate: 0.6 } })], { t: 0.3 }), { track }), []);
});

test('staticAnim: a bench walking and a bench swaying; a swaying tree is quiet', () => {
  assert.equal(run('staticAnim', frame([S({ id: 'b', obj: 'street.bench', cls: 'bench', x: 5, z: 20, anim: { state: 'move', rate: 1 } })])).length, 1);
  assert.equal(run('staticAnim', frame([S({ id: 'b', obj: 'street.bench', cls: 'bench', x: 5, z: 20, sway: { dir: 90, amp: 0.1 } })])).length, 1);
  assert.deepEqual(run('staticAnim', frame([S({ id: 't', obj: 'tree.bank-oak', cls: 'tree', x: 5, z: 20, sway: { dir: 90, amp: 0.1 } })])), []);
});

test('clones: two ducks side by side bobbing in step; different phases are quiet', () => {
  const duck = (id, x, phase) => P({ id, cls: 'duck', obj: 'bird.mallard', layer: 'swim', x, z: 20, height: 0.35, anim: { state: 'idle', rate: 0.8, phase, period: 1.25 } });
  assert.equal(run('clones', frame([duck('d1', -6, 0.3), duck('d2', -5, 0.305)])).length, 1);
  assert.deepEqual(run('clones', frame([duck('d1', -6, 0.3), duck('d2', -5, 0.7)])), []);
  assert.deepEqual(run('clones', frame([duck('d1', -6, 0.3), duck('d2', 40, 0.3)])), [], 'far apart: not seen together');
});

test('windDir: a tree swaying against the wind, or in calm air; swaying with the wind is quiet', () => {
  const tree = (dir) => S({ id: 't', obj: 'tree.bank-oak', cls: 'tree', x: 10, z: 30, sway: { dir, amp: 0.2 } });
  assert.equal(run('windDir', frame([tree(270)], { wind: { dir: 90, s: 4 } })).length, 1);
  assert.equal(run('windDir', frame([tree(90)], { wind: { dir: 90, s: 0 } })).length, 1);
  assert.deepEqual(run('windDir', frame([tree(100)], { wind: { dir: 90, s: 4 } })), []);
});

test('order: a nearer walker drawn before the wall behind it; drawn after it is quiet', () => {
  const wall = S({ id: 'wall', obj: 'structure.stone-wall', cls: 'fence', x: 5, z: 40, foot: box(2, 39.7, 8, 40.3), box: [700, 400, 1000, 520], order: 5 });
  assert.equal(run('order', frame([wall, P({ x: 5, z: 20, box: [790, 420, 820, 560], order: 3 })])).length, 1);
  assert.deepEqual(run('order', frame([wall, P({ x: 5, z: 20, box: [790, 420, 820, 560], order: 9 })])), []);
  assert.equal(run('order', frame([], { orderViolations: [{ a: 'x', b: 'y', why: 'x is nearer but drawn first' }] })).length, 1, 'the order module\'s own check');
});

test('landmark: a church behind a wall of trees; in clear view it is quiet', () => {
  const church = S({ id: 'church', obj: 'landmark.st-peters-yateley', cls: 'landmark', landmark: true, x: 0, z: 95, box: [600, 300, 1000, 470], order: 1 });
  const trees = [0, 1, 2, 3].map(i => S({ id: 'oak' + i, obj: 'tree.bank-oak', cls: 'tree', x: -6 + i * 4, z: 32, box: [560 + i * 120, 250, 720 + i * 120, 500], order: 10 + i }));
  assert.equal(run('landmark', frame([church, ...trees])).length, 1);
  assert.deepEqual(run('landmark', frame([church])), []);
  assert.equal(run('landmark', frame([Object.assign({}, church, { box: [-300, 300, 100, 470] })])).length, 1, 'cropped by the frame');
});

test('bare: a world of bare grass with no backdrop; water to the horizon with a backdrop is quiet', (t) => {
  if (typeof E.worldCoverage !== 'function') return t.skip('look\'s worldCoverage is not loaded');
  const bare = { v: 3, cam, seed: 1, surfaces: [{ id: 'g', kind: 'grass', poly: [[-400, 0.5], [400, 0.5], [400, 3000], [-400, 3000]] }], entities: [], backdrop: null };
  assert.equal(E.worldInvariants(frame([]), { world: bare, rules: ['bare'] }).length, 1);
  const trees = []; for (let x = -160; x <= 160; x += 5) trees.push({ id: 'oak' + x, obj: 'tree.bank-oak', x, z: 120, y: 0 });
  const full = { v: 3, cam, seed: 1, surfaces: [{ id: 'w', kind: 'water', water: 'lake', poly: [[-4000, 0.5], [4000, 0.5], [4000, 3000], [-4000, 3000]] }], entities: trees, backdrop: { style: 'woodland' } };
  const st = {};
  const v = E.worldInvariants(frame([]), { world: full, rules: ['bare'], stats: st });
  assert.deepEqual(v.map(x => x.msg), [], 'the lake and a far wood across the horizon dress the frame');
});

test('season: summer drawn in January, lit windows at noon, sun shadows at night, snow in July; a matching date is quiet', () => {
  const jan = { month: 0, hour: 12, sun: { az: 180, alt: 15 } }, jul = { month: 6, hour: 13, sun: { az: 180, alt: 60 } }, night = { month: 6, hour: 23, sun: { az: 330, alt: -20 } };
  assert.equal(run('season', frame([], { ctx: jan, season: 'summer' })).length, 1);
  assert.deepEqual(run('season', frame([], { ctx: jan, season: 'winter' })), []);
  assert.equal(run('season', frame([], { ctx: jul, season: 'summer', lights: [{ kind: 'window', on: true, ref: 'house' }] })).length, 1);
  assert.deepEqual(run('season', frame([], { ctx: jul, season: 'summer', lights: [{ kind: 'window', on: false, ref: 'house' }] })), []);
  assert.equal(run('season', frame([S({ id: 't', obj: 'tree.bank-oak', cls: 'tree', x: 9, z: 30, shadow: { kind: 'cast', sun: 'sun', poly: box(9, 30, 12, 33), dir: [3, 0], op: 0.4 } })], { ctx: night, season: 'summer' })).length, 1);
  assert.equal(run('season', frame([], { ctx: Object.assign({ snowing: true }, jul), season: 'summer' })).length, 1);
  assert.equal(run('season', frame([S({ id: 't', obj: 'tree.bank-oak', cls: 'tree', x: 9, z: 30, look: { snow: true } })], { ctx: jul, season: 'summer' })).length, 1);
});

test('the checker runs on the spatial index: 4x the entities costs well under 16x the time (never all-pairs)', () => {
  const make = (n) => {
    const ents = [];
    for (let i = 0; i < n; i++) { const x = (i % 50) * 3 - 75, z = 5 + Math.floor(i / 50) * 3; ents.push(bench('b' + i, x, z)); }
    for (let i = 0; i < 60; i++) ents.push(P({ id: 'a' + i, x: (i % 10) * 4 - 20, z: 8 + Math.floor(i / 10) * 5 }));
    return frame(ents);
  };
  const time = (fr) => { const ms = []; for (let k = 0; k < 5; k++) { const a = performance.now(); E.worldInvariants(fr, { world, skip: ['bare'] }); ms.push(performance.now() - a); } ms.sort((p, q) => p - q); return ms[2]; };
  const small = make(500), big = make(2000);
  time(small); time(big);   // warm the code
  const a = time(small), b = time(big);
  assert.ok(b < Math.max(16 * a, 20) * 1.2, `500 statics ${a.toFixed(1)} ms, 2000 statics ${b.toFixed(1)} ms`);
});

test('worldInvariantFrame builds a full frame record from a world and agents (16.1)', () => {
  const spec = { v: 3, camera: { eye: 1.65, fov: 64, horizon: 460, heading: 0 }, surfaces: SURF,
    entities: [{ obj: 'street.bench', at: [4, 15], id: 'bench-1', facing: 0 }, { obj: 'tree.bank-oak', at: [-14, 30] }], life: [], backdrop: { style: 'farmland' }, seed: 3 };
  const w = E.worldBuild(spec, { season: 'summer' });
  const fr = E.worldInvariantFrame(w, [{ id: 'a1', cls: 'person', obj: 'person.walker', x: 0.5, y: 0, z: 20, vx: 0, vz: 1.3, state: 'walk', view: 'back', mirror: false, layer: 'walk', h: 1.7 }],
    { t: 1, ctx: { month: 6, hour: 13, sun: { az: 200, alt: 55 } }, cache: {}, born: new Map() });
  for (const k of ['t', 'ctx', 'cam', 'W', 'H', 'ents', 'wind', 'sun', 'lights', 'log']) assert.ok(k in fr, k);
  const b = fr.ents.find(e => e.id === 'bench-1'), a = fr.ents.find(e => e.id === 'a1');
  assert.ok(b && a);
  for (const k of ['id', 'cls', 'obj', 'static', 'x', 'y', 'z', 'foot', 'height', 'box', 'order', 'speed', 'vx', 'vz', 'state', 'born', 'anim', 'sway', 'shadow', 'reflect']) assert.ok(k in a, 'agent ' + k);
  assert.equal(b.static, true); assert.equal(a.static, false);
  assert.equal(a.box.length, 4); assert.ok(a.box[3] > a.box[1]);
  assert.ok(Number.isFinite(a.order) && Number.isFinite(b.order));
  assert.equal(a.born, 1);
});
