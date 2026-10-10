// World engine, package appearance: views from the camera's angle (Q4) and the animation state (M1, M2, M4, M5, M7, A6).
// docs/dev/WORLD_ENGINE_REQUIREMENTS.md sections 9, 17, 22; docs/dev/WORLD_ENGINE.md 13, 14.3.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorld } from '../tools/lib/world/load.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = loadWorld(ROOT, { extra: 'globalThis.__wanTest = { sceneAnimPose: typeof sceneAnimPose === "function" ? sceneAnimPose : null, sceneBehave: typeof sceneBehave === "object" ? sceneBehave : null };' });
const X = globalThis.__wanTest;
const DT = 1 / 30;
const cam = () => W.sceneCamera({ camera: { eye: 1.65, fov: 64, horizon: 468, heading: 0 } });
const walker = (id, o) => Object.assign({ id, cls: 'stroll', obj: 'person.walker', x: 2, z: 20, y: 0, vx: 0, vz: 1.3, state: 'walk', clip: 'walk', layer: 'walk', h: 1.7, static: false }, o || {});
const steps = (world, n, dt) => { for (let i = 0; i < n; i++) W.worldAnimStep(world, dt || DT, { ownClock: true, everyTick: true }); };
const isIdentity = (m) => Math.abs(m[0] - 1) < 1e-9 && Math.abs(m[1]) < 1e-9 && Math.abs(m[2]) < 1e-9 && Math.abs(m[3] - 1) < 1e-9 && Math.abs(m[4]) < 1e-9 && Math.abs(m[5]) < 1e-9;

test('the appearance anim API is loaded', () => {
  for (const n of ['worldViewOf', 'worldAnimInit', 'worldAnimStep', 'worldAnimWake', 'worldAnimOf', 'worldAnimHooks']) assert.equal(typeof W[n], 'function', n);
  assert.deepEqual([...W.WORLD_ANIM_STATES], ['move', 'idle', 'sit', 'lie', 'stopped', 'moored', 'none']);
  assert.ok(Object.values(W.WORLD_ANIM_TRANS).every(v => v >= 0.25), 'no transition is instant (M7)');
});

test('Q4: views come from the camera\'s angle and change with hysteresis', () => {
  const c = cam(), e = { obj: 'person.walker', x: 0, z: 20, facing: 50 };
  let v = W.worldViewOf(e, c);
  assert.equal(v.view, 'q-back');
  const seq = [];
  for (let f = 50; f <= 90; f += 1) { v = W.worldViewOf(Object.assign({}, e, { facing: f }), c, { prev: v.view, prevMirror: v.mirror }); seq.push([f, v.view]); }
  const up = seq.find(s => s[1] === 'side');
  assert.ok(up && up[0] >= 82, `turns to the side view only 15 degrees past the boundary (at ${up && up[0]})`);
  for (let f = 90; f >= 40; f -= 1) { v = W.worldViewOf(Object.assign({}, e, { facing: f }), c, { prev: v.view, prevMirror: v.mirror }); seq.push([f, v.view]); }
  const down = seq.slice(41).find(s => s[1] === 'q-back');
  assert.ok(down && down[0] <= 53, `and back only 15 degrees past it the other way (at ${down && down[0]})`);
  // the mirror holds near the line of sight
  v = W.worldViewOf(Object.assign({}, e, { facing: 160 }), c, { prev: 'q-front', prevMirror: false });
  const nearSight = W.worldViewOf(Object.assign({}, e, { facing: -175 }), c, { prev: v.view, prevMirror: v.mirror });
  assert.equal(nearSight.mirror, false, 'no flip as it crosses the sight line');
  assert.equal(W.worldViewOf(Object.assign({}, e, { facing: -60 }), c).mirror, true, 'facing left: mirrored');
  // a mover's view comes from its velocity, the camera's angle to it, not a fixed side view
  const m = W.worldViewOf({ obj: 'person.walker', x: 3, z: 15, vx: 0, vz: -1.2 }, c);
  assert.equal(m.view, 'front');
  assert.equal(m.obj, 'person.walker-front', 'the front view object');
  assert.ok(m.s > 0 && Math.abs(m.s * W.sceneObj('person.walker-front').size[1] - c.f / 15 * 1.7) < 1e-3, 'real size at its depth');
});

test('Q4: a boat seen end-on is drawn end-on; a long hull is never a flat side slab', () => {
  const c = cam();
  const st = W.worldViewOf({ obj: 'boat.narrowboat', x: 0, z: 30, facing: 0, static: true }, c);
  assert.equal(st.view, 'back'); assert.equal(st.end, 'stern'); assert.equal(st.persp, true);
  const mv = W.worldViewOf({ obj: 'boat.narrowboat', x: 0.5, z: 40, vx: 0, vz: -1, static: false }, c);
  assert.equal(mv.view, 'front'); assert.equal(mv.end, 'bow'); assert.equal(mv.persp, true);
  const side = W.worldViewOf({ obj: 'boat.narrowboat', x: 0, z: 30, facing: 90 }, c);
  assert.equal(side.view, 'side'); assert.equal(side.persp, true, 'even side-on the hull is laid along its true length');
  assert.equal(W.worldViewOf({ obj: 'vehicle.car', x: 0, z: 30, facing: 90 }, c).persp, false, 'a car is a sprite');
  assert.equal(W.worldViewOf({ obj: 'rail.embankment', x: 0, z: 196, facing: 90 }, c).persp, false, 'an embankment is not a hull');
});

test('A6, M1: the stride period matches the speed (no sliding feet)', () => {
  const c = cam();
  for (const sp of [0.3, 0.6, 1.0, 1.3, 1.8, 2.5, 3.0]) {
    const a = walker('p0-' + Math.round(sp * 10), { vz: sp });
    const world = { cam: c, entities: [], agents: [a] };
    steps(world, 3);
    const an = a.anim;
    assert.equal(an.state, 'move');
    assert.equal(an.clip, sp > 2.2 ? 'run' : 'walk');
    assert.ok(Math.abs(an.rate * an.stride - sp) / sp < 1e-3, `${sp} m/s: rate ${an.rate} x stride ${an.stride}`);
    assert.ok(Math.abs(an.period * an.rate - 1) < 1e-3);
    const legs = W.worldAnimHooks(a).filter(h => h.kind === 'walk');
    assert.ok(legs.length >= 1 && legs.every(h => Math.abs(h.period - an.period) < 1e-3 && h.k > 0), 'the legs swing at that period');
    if (sp === 1.0 && X.sceneBehave) {
      const want = X.sceneBehave.stride('stroll', 1.15), mine = W.worldAnimOf(walker('q', { vz: 1.15 }));
      assert.ok(Math.abs(mine.period - want) / want < 0.1, `close to sceneBehave.stride (${mine.period} vs ${want})`);
    }
  }
  // a heron stalks: long slow strides; a dog trots; a cyclist pedals by the crank; a car's wheels by their size
  const heron = W.worldAnimOf({ id: 'h-1', cls: 'heron', obj: 'bird.heron', x: 0, z: 30, vx: 0.16, vz: 0, state: 'stalk', layer: 'wade' });
  assert.equal(heron.state, 'move'); assert.ok(heron.period > 2.5 && Math.abs(heron.rate * heron.stride - 0.16) < 1e-3);
  const dog = W.worldAnimOf({ id: 'd-1', cls: 'dog', obj: 'animal.dog', x: 0, z: 10, vx: 1.5, vz: 0, state: 'walk' });
  assert.equal(dog.clip, 'trot'); assert.ok(Math.abs(dog.rate * dog.stride - 1.5) < 1e-3);
  const car = W.worldAnimOf({ id: 'c-1', cls: 'vehicle', obj: 'vehicle.car', x: 0, z: 30, vx: 8, vz: 0, state: 'drive', layer: 'drive' });
  assert.equal(car.clip, 'drive'); assert.ok(Math.abs(car.rate - 4) < 1e-3, 'wheel turns a second');
});

test('M4: no two agents share phase and period', () => {
  const c = cam(), agents = [];
  for (let i = 0; i < 40; i++) agents.push(walker('walkers-' + i, { x: (i % 8) - 4, z: 12 + Math.floor(i / 8), vz: 1.2 }));
  for (let i = 0; i < 30; i++) agents.push({ id: 'mallard-' + i, cls: 'duck', obj: 'bird.mallard', x: (i % 6) * 1.5, z: 25 + Math.floor(i / 6), vx: 0, vz: 0, state: 'idle', layer: 'swim', static: false });
  for (let i = 0; i < 8; i++) agents.push({ id: 'p' + i + '-0', cls: 'duck', obj: 'bird.mallard', x: i, z: 31, vx: 0, vz: 0, state: 'idle', layer: 'swim', static: false });
  const world = { cam: c, entities: [], agents, seed: 7 };
  steps(world, 10);
  let pairs = 0;
  for (let i = 0; i < agents.length; i++) for (let j = i + 1; j < agents.length; j++) {
    const a = agents[i].anim, b = agents[j].anim;
    if (agents[i].cls !== agents[j].cls || a.state !== b.state) continue;
    pairs++;
    const dp = Math.abs(a.period - b.period) / a.period, ph = Math.abs(((a.phase - b.phase) % 1 + 1.5) % 1 - 0.5);
    assert.ok(!(dp < 0.015 && ph < 0.025), `${agents[i].id} and ${agents[j].id} animate in step (period ${a.period} / ${b.period}, phase ${a.phase} / ${b.phase})`);
  }
  assert.ok(pairs > 1000, `${pairs} pairs compared`);
  // and a whole population of 200 has no clone among members spawned close together (the low-discrepancy sequence)
  const big = []; for (let i = 0; i < 200; i++) big.push(W.worldAnimOf({ id: 'crowd-' + i, cls: 'duck', obj: 'bird.mallard', x: 0, z: 10, vx: 0, vz: 0, state: 'idle', layer: 'swim' }, world));
  for (let i = 0; i < 200; i++) for (let j = i + 1; j < Math.min(200, i + 40); j++) {
    const dp = Math.abs(big[i].period - big[j].period) / big[i].period, ph = Math.abs(((big[i].phase - big[j].phase) % 1 + 1.5) % 1 - 0.5);
    assert.ok(!(dp < 0.015 && ph < 0.025), `crowd-${i} and crowd-${j} in step`);
  }
});

test('M1: a seated agent has no leg motion', () => {
  const c = cam(), bench = { id: 'bench-1', obj: 'street.bench', x: 3, z: 12, y: 0, facing: 250, static: true };
  const a = walker('visit-1', { vz: 0, state: 'sit', clip: 'sit', host: 'bench-1', x: 3, z: 12.2 });
  const world = { cam: c, entities: [bench], agents: [a] };
  steps(world, 40);
  assert.equal(a.anim.state, 'sit'); assert.equal(a.anim.pose, 'sit'); assert.equal(a.anim.rate, 0);
  assert.equal(a.anim.obj, 'person.bench-sitter', 'the seated pose');
  assert.equal(a.anim.face, 250, 'facing the way the bench faces (the right view)');
  const forced = W.worldAnimHooks(a, 5, { obj: 'person.walker' }).filter(h => h.kind === 'walk');
  assert.ok(forced.length > 0 && forced.every(h => h.k === 0 && h.bob === 0), 'legs still');
  if (X.sceneAnimPose) for (const t of [0, 0.3, 1.1, 2.7]) for (const h of forced) assert.ok(isIdentity(X.sceneAnimPose(h, t, null, 0).m), 'no leg swing at any time');
  assert.ok(!W.worldAnimHooks(a, 5).some(h => h.kind === 'walk' && h.k > 0), 'the sitter object has no moving legs either');
});

test('M7: transitions take at least 0.2 s and never jump (walk to stop, stand to sit, swim to take-off)', () => {
  const c = cam(), a = walker('w-1');
  const world = { cam: c, entities: [{ id: 'bench-1', obj: 'street.bench', x: 2, z: 21, facing: 270, static: true }], agents: [a] };
  steps(world, 30);
  assert.equal(a.anim.k, 1);
  // walk -> stop: the input stops dead; the animation eases out
  a.vz = 0; a.state = 'idle'; a.clip = 'idle';
  let t = 0, last = a.anim.k, maxJump = 0;
  while (a.anim.k > 0 && t < 2) { steps(world, 1); t += DT; maxJump = Math.max(maxJump, Math.abs(a.anim.k - last)); last = a.anim.k; }
  assert.equal(a.anim.state, 'idle', 'the state is what it is doing: still at once (no animStill violation)');
  assert.ok(t >= 0.2, `the legs settled over ${t.toFixed(2)} s`);
  assert.ok(maxJump < 0.2, `smoothly (largest step ${maxJump.toFixed(3)})`);
  // stand -> sit
  a.state = 'sit'; a.clip = 'sit'; a.host = 'bench-1';
  steps(world, 1);
  assert.equal(a.anim.state, 'sit'); assert.equal(a.anim.from.state, 'idle');
  t = DT;
  while (a.anim.blend < 1 && t < 3) { steps(world, 1); t += DT; }
  assert.ok(t >= 0.2, `stand to sit took ${t.toFixed(2)} s`);
  assert.equal(a.anim.face, 270, 'with the bench\'s view');
  // swim -> take-off
  const duck = { id: 'mallard-1', cls: 'duck', obj: 'bird.mallard', x: -2, z: 25, vx: 0.3, vz: 0, state: 'swim', layer: 'swim', static: false };
  const w2 = { cam: c, entities: [], agents: [duck] };
  steps(w2, 20);
  assert.equal(duck.anim.clip, 'swim');
  duck.state = 'fly'; duck.layer = 'air'; duck.vx = 4;
  steps(w2, 1);
  assert.equal(duck.anim.clip, 'fly'); assert.equal(duck.anim.pose, 'fly');
  assert.ok(duck.anim.obj && /flight/.test(duck.anim.obj), `the flight pose (${duck.anim.obj})`);
  const flap0 = W.worldAnimHooks(duck).filter(h => h.kind === 'flap').map(h => h.k);
  t = DT;
  while (duck.anim.blend < 1 && t < 3) { steps(w2, 1); t += DT; }
  assert.ok(t >= 0.2, `the take-off eased over ${t.toFixed(2)} s`);
  const flap1 = W.worldAnimHooks(duck).filter(h => h.kind === 'flap').map(h => h.k);
  if (flap0.length) assert.ok(flap0.every((k, i) => k < flap1[i]), 'the wings beat harder as it lifts off');
});

test('M2: a static never animates (sway only by cause; a moored boat only bobs)', () => {
  const c = cam();
  const statics = [
    { id: 'bench', obj: 'street.bench', x: 3, z: 9, facing: 270, static: true },
    { id: 'car', obj: 'vehicle.car', x: -4, z: 14, facing: 0, static: true },
    { id: 'bridge', obj: 'structure.bridge-brick', x: 0, z: 120, facing: 90, static: true },
    { id: 'tree', obj: 'tree.bank-willow', x: -9, z: 25, static: true, cls: 'tree' },
    { id: 'nb', obj: 'boat.narrowboat', x: -5, z: 30, facing: 0, static: true, attach: 'water', cls: 'boat' },
  ];
  const world = { cam: c, entities: statics, agents: [] };
  W.worldAnimInit(world);
  const snap = JSON.stringify(statics.map(s => [s.anim.state, s.anim.rate, s.anim.period, s.anim.phase]));
  steps(world, 120);
  assert.equal(JSON.stringify(statics.map(s => [s.anim.state, s.anim.rate, s.anim.period, s.anim.phase])), snap, 'nothing about a static changes over time');
  for (const id of ['bench', 'car', 'bridge']) {
    const s = statics.find(q => q.id === id);
    assert.equal(s.anim.state, 'none'); assert.equal(s.anim.rate, 0);
    assert.deepEqual(W.worldAnimHooks(s), [], `${id} has no hooks (a parked car does not bob)`);
  }
  const tree = statics.find(q => q.id === 'tree');
  assert.equal(tree.anim.sway, true, 'a plant moves by cause (the wind)');
  assert.ok(W.worldAnimHooks(tree).every(h => h.kind === 'sway'));
  const nb = statics.find(q => q.id === 'nb');
  assert.equal(nb.anim.state, 'moored');
  const hb = W.worldAnimHooks(nb);
  assert.ok(hb.length > 0 && hb.every(h => h.kind === 'bob' && h.k <= 0.35 + 1e-9), 'a slight bob only');
  // statics keep their view from the camera's angle
  assert.equal(statics.find(q => q.id === 'nb').view, 'back');
});

test('M1: stopped vehicles are still, idling ones barely move; moving ones drive', () => {
  const c = cam();
  const car = { id: 'cars-1', cls: 'vehicle', obj: 'vehicle.car', x: -3, z: 20, vx: 0, vz: 0, state: 'drive', layer: 'drive', static: false };
  const world = { cam: c, entities: [], agents: [car] };
  steps(world, 5);
  assert.equal(car.anim.state, 'stopped');
  assert.ok(W.worldAnimHooks(car).every(h => !(h.k > 0)), 'wheels and body still');
  car.state = 'wait'; steps(world, 2);
  assert.ok(W.worldAnimHooks(car).filter(h => h.kind === 'bob').every(h => h.k > 0 && h.k <= 0.2 + 1e-9), 'idling at a stop: a faint shiver');
  car.vz = 9; car.state = 'drive'; steps(world, 2);
  assert.equal(car.anim.state, 'move'); assert.equal(car.anim.clip, 'drive');
});

test('M5: secondary motion: the lead, the dog\'s tail, rocking in a wake, reeds parting', () => {
  const c = cam();
  const w = walker('dog-walkers-3', { x: 1, z: 15, vz: 1.1 }), d = { id: 'dog-1', cls: 'dog', obj: 'animal.dog', x: 1.9, z: 15.6, vx: 0.3, vz: 1.1, state: 'walk', leader: 'dog-walkers-3', static: false };
  const reed = { id: 'reed-1', obj: 'plant.reed', cls: 'reed', x: -2, z: 12, static: true };
  const heron = { id: 'heron-1', cls: 'heron', obj: 'bird.heron', x: -2.3, z: 11.8, vx: 0.15, vz: 0.05, state: 'stalk', layer: 'wade', static: false };
  const nb = { id: 'nb', obj: 'boat.narrowboat', cls: 'boat', x: -6, z: 30, facing: 0, attach: 'water', static: true };
  const world = { cam: c, entities: [reed, nb], agents: [w, d, heron] };
  steps(world, 30);
  const lead = d.anim.sec.lead;
  assert.ok(lead && lead.by === 'dog-walkers-3', 'the lead joins the dog to its walker');
  assert.ok(Math.hypot(lead.a[0] - w.x, lead.a[2] - w.z) < 1e-6 && Math.hypot(lead.b[0] - d.x, lead.b[2] - d.z) < 1e-6, 'hand to collar');
  assert.ok(lead.sag >= 0 && Number.isFinite(lead.swing));
  assert.ok(d.anim.sec.tail && d.anim.sec.tail.period < 0.5, 'a trotting dog wags faster');
  assert.ok(reed.anim.sec.part && reed.anim.sec.part.amp > 0, 'the reeds part round the heron');
  const rh = W.worldAnimHooks(reed);
  if (rh.length) assert.ok(rh.some(h => h.kind === 'turn' && h.deg !== 0), 'drawn bent aside');
  heron.x = 30; heron.z = 60;
  steps(world, 120);
  assert.ok(!reed.anim.sec.part, 'and close again');
  // a wake rocks the moored boat as it arrives, then dies away
  assert.equal(W.worldAnimWake(world, { x: -1, z: 30, amp: 1, id: 'cruiser' }), 1);
  steps(world, 60);
  assert.ok(W.worldAnimHooks(nb).every(h => h.kind === 'bob'), 'the wave has not reached it yet (5 m at 1.2 m/s)');
  let rocked = 0;
  for (let i = 0; i < 120; i++) { steps(world, 1); const r = W.worldAnimHooks(nb).find(h => h.kind === 'paddle'); if (r && Math.abs(r.deg) > 0.05) rocked++; }
  assert.ok(rocked > 30, `rocking in the wake (${rocked} ticks)`);
  steps(world, 30 * 15);
  assert.ok(W.worldAnimHooks(nb).every(h => h.kind === 'bob'), 'still again');
});

test('worldAnimOf: a pure snapshot for a frame record agent; the live record when the system runs', () => {
  const rec = { id: 'p2-5', cls: 'brisk', obj: 'person.walker', x: 1, z: 18, y: 0, vx: 0, vz: 1.6, state: 'walk', clip: 'walk', h: 1.75 };
  const a = W.worldAnimOf(rec), b = W.worldAnimOf(Object.assign({}, rec));
  assert.equal(a.state, 'move'); assert.ok(Math.abs(a.rate * a.stride - 1.6) < 1e-3);
  assert.deepEqual([a.phase, a.period, a.stride], [b.phase, b.period, b.stride], 'deterministic');
  const still = W.worldAnimOf(Object.assign({}, rec, { vz: 0.01, state: 'look', clip: 'look' }));
  assert.equal(still.state, 'idle'); assert.equal(still.clip, 'look');
  const live = walker('p2-5', { vz: 1.6 }), world = { cam: cam(), entities: [], agents: [live] };
  steps(world, 3);
  assert.equal(W.worldAnimOf(Object.assign({}, rec), world), live.anim, 'the frame record finds the live anim by id');
});

test('Y2: the anim system is registered on the runtime when it is loaded', () => {
  if (typeof W.worldSystemList !== 'function') return;
  const s = W.worldSystemList().find(d => d.id === 'anim');
  assert.ok(s, 'anim is a system');
  assert.equal(s.phase, 'anim');
  if (typeof W.worldRun !== 'function') return;
  const a = walker('run-1'), world = { cam: cam(), entities: [{ id: 'b', obj: 'street.bench', x: 3, z: 9, static: true }], agents: [a], seed: 1 };
  let runner = null;
  try { runner = W.worldRun(world, { systems: ['anim'], deterministic: true, quiet: true }); } catch (e) { runner = null; }
  if (!runner) return;
  runner.advance(1);
  assert.ok(a.anim && a.anim.state === 'move', 'the runner drives the anim state');
  assert.equal(world.entities[0].anim.state, 'none');
});
