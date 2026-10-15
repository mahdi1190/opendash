// The crowd pass ported from the v3 life sim into v2 as a PURE function of t (merge package "crowd", 15 Oct;
// src/app/78-scene-x-crowd.js): people that would walk through each other pass side by side instead, never onto the water or into
// a wall, smoothly (no jumps between frames), the same on every replay; group mates keep together; the off switch; a moving boat
// never gives way; the phase de-conflict on a single-file path; and the behaviour states (view, sit, meet) in sceneBehave.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry } from '../tools/lib/anim-render.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REG = loadRegistry(ROOT);
const E = new Proxy({}, { get: (_, n) => REG.R.get(n) });
const rect = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}z`;
E.sceneObjDefine({ id: 'boat.xcrowd', category: 'boat', size: [200, 40], real: { h: 1.9, l: 12, w: 2.1 }, tags: ['kit:boats', 'role:boat'], build: () => ({ hull: [['#336633', rect(-100, -40, 200, 40)]] }) });

const base = (over = {}) => Object.assign({ id: 'xcrowd', v: 2, view: { lat: 51.3, lon: -0.8 }, camera: { eye: 1.65, fov: 66, horizon: 470, heading: 180 }, season: 'summer', cover: false,
  surfaces: [{ id: 'land', kind: 'grass', rest: true }],
  water: [{ id: 'pond', kind: 'pond', poly: [[3, 6], [40, 6], [40, 90], [3, 90]], edge: 'none' }], place: [], actors: [] }, over);
const compile = (d) => E.sceneCompile(d, { season: 'summer', lod: 1 });
const walker = (ground, o = {}) => Object.assign({ obj: 'person.walker', ground, loop: 'pingpong', speedM: 1.2 }, o);
const dist = (a, b) => Math.hypot(a.x - b.x, a.d - b.d);

/** Over a loop at hz: the closest any two of ids came (base and resolved), the largest step beyond the base's (m per frame). */
function sweep(C, seconds = 60, hz = 4) {
  let minBase = Infinity, minRes = Infinity, maxExtra = 0, prev = null;
  for (let k = 0; k <= seconds * hz; k++) {
    const recs = E.sceneXCrowdAt(C, k / hz, null, {}), ppl = recs.filter(r => r.layer === 'walk');
    for (let i = 0; i < ppl.length; i++) for (let j = i + 1; j < ppl.length; j++) {
      if (ppl[i].group && ppl[i].group === ppl[j].group) continue;
      minBase = Math.min(minBase, Math.hypot(ppl[i].bx - ppl[j].bx, ppl[i].bd - ppl[j].bd));
      minRes = Math.min(minRes, dist(ppl[i], ppl[j]));
    }
    if (prev) for (const r of recs) { const p = prev.get(r.id); if (p) maxExtra = Math.max(maxExtra, Math.hypot(r.x - p.x, r.d - p.d) - Math.hypot(r.bx - p.bx, r.bd - p.bd)); }
    prev = new Map(recs.map(r => [r.id, r]));
  }
  return { minBase, minRes, maxExtra };
}

test('two walkers head-on on one line pass side by side, not through each other; smoothly; the same on every replay', () => {
  const C = compile(base({ actors: [walker([[-4, 10], [-4, 40]]), walker([[-4, 40], [-4, 10]])] }));
  const s = sweep(C, 50);
  assert.ok(s.minBase < 0.35, `the base paths meet (${s.minBase})`);
  assert.ok(s.minRes >= 0.5, `resolved: never closer than 0.5 m (${s.minRes})`);
  assert.ok(s.maxExtra < 0.3, `no jump: at most ${s.maxExtra} m a frame beyond the base step`);
  const a = JSON.stringify(E.sceneXCrowdAt(C, 12.3, null, {}).map(r => [r.id, r.x, r.d, r.X, r.Y, r.s]));
  const b = JSON.stringify(E.sceneXCrowdAt(C, 12.3, null, {}).map(r => [r.id, r.x, r.d, r.X, r.Y, r.s]));
  assert.equal(a, b, 'a pure function of t');
  // the screen place follows the ground place (scale as 1 / depth)
  for (const r of E.sceneXCrowdAt(C, 12.3, null, {})) {
    const P = E.sceneProject(C.cam, r.x, r.d, null);
    assert.ok(Math.abs(P.X - r.X) < 0.5 && Math.abs(P.Y - r.Y) < 0.5, `projected: ${r.X},${r.Y} vs ${P.X},${P.Y}`);
  }
});

test('an overtake: a jogger behind a walker on one line passes beside it', () => {
  const C = compile(base({ actors: [walker([[-4, 10], [-4, 60]], { speedM: 0.9, loop: 'loop' }), walker([[-4, 10], [-4, 60]], { obj: 'person.jogger', speedM: 2.8, loop: 'loop', offset: 0.5 })] }));
  const s = sweep(C, 60);
  assert.ok(s.minBase < 0.3, `the base paths run through each other (${s.minBase})`);
  assert.ok(s.minRes >= 0.5, `resolved ${s.minRes}`);
});

test('a correction never puts a walker on the water: two walkers meeting at the water edge step to the land side', () => {
  // both routes along the bank (x 2.6, the pond from x 3): the only room is away from the water
  const C = compile(base({ actors: [walker([[2.6, 10], [2.6, 40]]), walker([[2.6, 40], [2.6, 10]])] }));
  const W = E.sceneMotionWorld(C);
  for (let k = 0; k <= 200; k++) for (const r of E.sceneXCrowdAt(C, k / 4, null, {})) if (r.layer === 'walk') assert.ok(!W.water(r.x, r.d) || W.water(r.bx, r.bd), `t ${k / 4}: ${r.id} pushed onto the water at ${r.x},${r.d}`);
  const s = sweep(C, 50);
  assert.ok(s.minRes >= 0.45, `still passing apart (${s.minRes})`);
});

test('group mates (a walker and its dog on one clock) are not passed apart; the switch turns the pass off', () => {
  const data = base();
  data.actors = E.sceneBehave.walkWithDog(data, { route: [[-6, 10], [-6, 40]], walker: 'person.walker', dog: 'animal.dog', seed: 7 });
  const C = compile(data), recs = E.sceneXCrowdAt(C, 3, null, {});
  const w = recs.find(r => r.obj === 'person.walker'), d = recs.find(r => r.obj === 'animal.dog');
  assert.ok(w && d && w.group && w.group === d.group, 'one group');
  const C2 = compile(Object.assign(base({ actors: [walker([[-4, 10], [-4, 40]]), walker([[-4, 40], [-4, 10]])] }), { x: { crowd: false } }));
  C2.x = { crowd: false };
  assert.equal(E.sceneXCrowdOn(C2), false);
  for (let k = 0; k <= 160; k++) for (const r of E.sceneXCrowdAt(C2, k / 4, null, {})) assert.ok(r.x === r.bx && r.d === r.bd, 'off: the base places');
});

test('a moving boat never gives way: a duck in its way is pushed clear of the hull', () => {
  const C = compile(base({ actors: [{ obj: 'boat.xcrowd', ground: [[20, 20], [20, 80]], loop: 'pingpong', speedM: 1.1 }, { obj: 'bird.mallard', ground: [[20, 50], [20.5, 50.5]], loop: 'pingpong', speedM: 0.05 }] }));
  let worst = Infinity;
  for (let k = 0; k <= 240; k++) {
    const recs = E.sceneXCrowdAt(C, k / 4, null, {}), b = recs.find(r => r.boat), d = recs.find(r => r.obj === 'bird.mallard');
    if (!b || !d) continue;
    const v = Math.hypot(b.vx, b.vd), hx = v > 0.05 ? b.vx / v : 0, hd = v > 0.05 ? b.vd / v : 1, half = b.len / 2 - b.beam / 2;
    const u = Math.max(-half, Math.min(half, (d.x - b.x) * hx + (d.d - b.d) * hd)), gap = Math.hypot(d.x - (b.x + hx * u), d.d - (b.d + hd * u));
    assert.ok(b.x === b.bx && b.d === b.bd, 'the boat keeps its course');
    worst = Math.min(worst, gap);
  }
  assert.ok(worst >= 2.1 / 2 + 0.15 - 0.05, `the duck stays clear of the keel line (${worst})`);
});

test('phase de-conflict: two walkers that would meet on a single-file path get their phases moved apart (logged moverPhase)', () => {
  // a 0.6 m path through a reedbed (not walkable): no room to pass
  const data = base({ water: [], surfaces: [{ id: 'reeds', kind: 'reedbed', rest: true }, { id: 'p', kind: 'path', path: [[-3, 8], [-3, 60]], width: 0.6 }],
    actors: [walker([[-3, 10], [-3, 50]], { offset: 0 }), walker([[-3, 50], [-3, 10]], { offset: 0 })] });
  const C = compile(data), fixed = E.sceneMotionFixed(C);
  const moved = fixed.filter(a => a.$motion && a.$motion.phase);
  assert.ok(moved.length >= 1, 'a phase moved');
  assert.ok(moved.every(a => a.$motion.phase.applied && a.$motion.phase.after < a.$motion.phase.before));
  const R = E.sceneMotionCheck(C);
  assert.ok(R.problems.some(p => p.rule === 'moverPhase' && p.sev === 'info'), 'reported (info)');
});

test('behaviour states: a look by the water becomes a view facing it (same seconds); a sit swaps in the seated figure; meet() makes two walkers stop together', () => {
  const data = base();
  const spec = { obj: 'person.walker', preset: 'stroll', route: [[1.5, 12], [1.5, 40]], seed: 11 };
  const A = E.sceneBehave.actor(data, spec), B = E.sceneBehave.actor(data, Object.assign({}, spec, { states: false }));
  assert.ok(A.$behave.views >= 1, 'a view stop by the water');
  assert.equal(A.$behave.cycle, B.$behave.cycle, 'the timeline keeps its seconds');
  // facing the water: the pond is to the right (x from 3) of a walker at x 1.5
  const cam = E.sceneCamera(data);
  const views = A.path.filter((p, i) => i && p[2] > 1 && p[0] === A.path[i - 1][0] && p[1] === A.path[i - 1][1]);
  assert.ok(views.some(p => p[3] === 1), 'faces the water');
  assert.ok(cam);
  // sit: the walker hides for the stop while the seated figure shows, on one clock
  const S = E.sceneBehave.actors(data, Object.assign({}, spec, { sit: { at: [0.5, 25], w: 15 } }));
  assert.equal(S.length, 2, 'the walker and the seated figure');
  assert.equal(S[1].obj, 'person.bench-sitter');
  assert.equal(S[1].offset, S[0].offset);
  assert.ok(S[0].$behave.sits === 1);
  // meet: one clock, both stopped together 0.7 m apart facing each other
  const [M1, M2] = E.sceneBehave.meet(data, { obj: 'person.walker', route: [[-8, 20], [0, 20]], seed: 3 }, { obj: 'person.walker', route: [[-4, 12], [-4, 30]], seed: 4 });
  assert.ok(Math.abs(M1.$behave.cycle - M2.$behave.cycle) < 0.05, `one cycle ${M1.$behave.cycle} vs ${M2.$behave.cycle}`);
  const t = M1.$behave.setT[0] - M1.offset * M1.$behave.cycle + 2;   // two seconds into the chat
  const q1 = E.sceneActorAt(M1, t), q2 = E.sceneActorAt(M2, t), q1b = E.sceneActorAt(M1, t + 0.5), q2b = E.sceneActorAt(M2, t + 0.5);
  assert.ok(Math.hypot(q1.x - q2.x, q1.y - q2.y) < 120, `together on screen (${Math.hypot(q1.x - q2.x, q1.y - q2.y)})`);
  assert.ok(q1.x === q1b.x && q2.x === q2b.x, 'both stopped');
  assert.ok(q1.dir !== q2.dir, 'facing each other');
});
