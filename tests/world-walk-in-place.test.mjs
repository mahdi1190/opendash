// Walking in place (18 Oct 2026; the user: "so many people just walking in place"). docs/dev/SCENE_LESSONS.md section AA. Every test
// here FAILS on the engine as it was before the fix (commit 2d91bdb): the legs of a walker seen end-on scissored in the picture plane,
// a walker pushed back by the separation pass kept the velocity of the step it never made, queues crept at a tenth of a pace with the
// legs striding, a family member surged and stopped round its leader, and no check could see any of it (they compared the legs with
// the shown velocity, the number the legs are made from). Deterministic: the Node simulation only, never the wall clock.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { loadEngine, resolveRef } from '../tools/lib/world/convert.mjs';
import { worldInPlaceRun } from '../tools/lib/world/inplace.mjs';

const src = name => readFileSync(new URL('../src/app/' + name, import.meta.url), 'utf8');
function bundle(files) {
  const body = files.map(src).join('\n;\n'), names = new Set();
  for (const m of body.matchAll(/^(?:async\s+)?function\s+([A-Za-z_]\w*)\s*\(/gm)) names.add(m[1]);
  for (const m of body.matchAll(/^(?:const|let|var)\s+([A-Za-z_]\w*)\s*=/gm)) names.add(m[1]);
  const tail = '\nreturn { ' + [...names].map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ') + ' };';
  return new vm.Script('(function () {\n' + body + tail + '\n})', { filename: 'wip-bundle.js' }).runInThisContext()();
}
const L = bundle(['79-world-1nav.js', '79-world-2brains.js', '79-world-2traffic.js', '79-world-2life.js']);
const E = loadEngine();
const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
const cam = { fov: 64, eye: 1.65, horizon: 470, water: -0.4 };
function lane({ width = 2.6, life, seed = 2 }) {
  return { seed, cam, waterY: -0.4, surfaces: [{ id: 'grass', kind: 'grass', poly: rect(-60, 1, 60, 300) }, { id: 'tow', kind: 'towpath', path: [[2.5, 1], [2.5, 299]], width }], entities: [], life };
}

/* ---------- the gait: how the legs are drawn for the angle to the eye ---------- */
test('a walker seen end-on lifts its feet in turn and sways; seen side-on it swings its legs (worldAnimGait)', () => {
  assert.equal(typeof E.worldAnimGait, 'function', 'worldAnimGait exists');
  const toward = E.worldAnimGait({ obj: 'person.walker', x: 0.5, z: 20, vx: 0, vz: -1.2 }, { view: 'front' }, { view: 'front' });
  assert.ok(toward.lift > 0.9 && toward.sway > 0.9 && toward.bob > 1.5, 'end-on: lift, sway and a stronger bob ' + JSON.stringify(toward));
  assert.ok(toward.plane <= 0.2, 'end-on: almost no swing in the picture plane');
  const across = E.worldAnimGait({ obj: 'person.walker', x: 0, z: 20, vx: 1.2, vz: 0 }, { view: 'side' }, { view: 'side' });
  assert.ok(across.lift < 0.05 && across.swing > 0.95, 'side-on: a full swing, no lift ' + JSON.stringify(across));
  // a figure that has ONLY a side view (the elderly walker, the shopper ...) walking down the line of sight: no side-on stride on the spot
  const side = E.worldAnimGait({ obj: 'person.elderly-walker', x: 0, z: 20, vx: 0.05, vz: 1.0 }, { view: 'side' }, { view: 'side' });
  assert.ok(side.swing <= 0.2 && side.lift > 0.9, 'side-only art end-on: the swing is foreshortened ' + JSON.stringify(side));
});

test('worldAnimHooks hands the drawer a foreshortened walk (lift, sway, a scaled swing) for an end-on walker', () => {
  const w = E.worldBuild(lane({ life: [] }), { season: 'summer' });
  const ent = { id: 'w1', obj: 'person.elderly-walker', cls: 'stroll', static: false, x: 0, z: 20, vx: 0.02, vz: -1.1, svx: 0.02, svz: -1.1, state: 'walk', h: 1.7 };
  w.agents = [ent];
  for (let i = 0; i < 10; i++) E.worldAnimStep(w, 1 / 30);
  const legs = E.worldAnimHooks(ent, 1, { world: w, obj: 'person.elderly-walker', view: 'side' }).filter(h => h.kind === 'walk');
  assert.ok(legs.length > 0, 'a walk hook');
  for (const h of legs) {
    assert.ok(h.lift > 1, `the feet lift (${h.lift} art units)`);
    assert.ok(h.deg <= 13 * 0.25, `the side art's 13 degree swing is foreshortened (${h.deg})`);
  }
  assert.ok(ent.anim.gait && ent.anim.gait.lift > 0.9, 'the anim record carries the gait the legs are drawn with');
});

test('sceneAnimPose: a lifted walk raises each leg in turn (never both), and returns the body sway', () => {
  const h = { kind: 'walk', parts: ['legB', 'legA'], pivot: [0, -31.5], deg: 3.5, period: 1, lift: 4, sway: 1, k: 1 };
  let upA = 0, upB = 0, both = 0, swayMax = 0;
  for (let i = 0; i < 40; i++) {
    const p = E.sceneAnimPose(h, i / 40, null, 0), a = -p.m[5] > 0.5, b = -p.m2[5] > 0.5;
    if (a) upA++; if (b) upB++; if (a && b) both++;
    swayMax = Math.max(swayMax, Math.abs(p.sway || 0));
  }
  assert.ok(upA > 5 && upB > 5, `each leg lifts (${upA}, ${upB} of 40)`);
  assert.equal(both, 0, 'never both feet off the ground');
  assert.ok(swayMax > 0.9, 'the body sways from foot to foot');
  // without lift (every v2 hook) the pose is exactly the rotation about the hip it always was
  const w = 2 * Math.PI * 0.3 / 0.9, r = 22 * Math.sin(w) * Math.PI / 180, c = Math.cos(r), sn = Math.sin(r);
  const p0 = E.sceneAnimPose({ kind: 'walk', pivot: [0, -31.5], deg: 22, period: 0.9 }, 0.3, null, 0);
  const want = [c, sn, -sn, c, 0 - c * 0 + sn * -31.5, -31.5 - sn * 0 - c * -31.5];
  p0.m.forEach((v, i) => assert.ok(Math.abs(v - want[i]) < 1e-9, `m[${i}] ${v} vs ${want[i]}`));
  assert.equal(p0.sway, 0);
});

/* ---------- the checker: walkInPlace reads positions, never the shown velocity ---------- */
function frames(make, n, dt) { const out = []; for (let i = 0; i < n; i++) out.push(make(i * dt, i)); return out; }
function runRule(list) {
  const track = E.worldInvariantTracker(); let v = [];
  for (const fr of list) v = v.concat(E.worldInvariants(fr, { track, rules: ['walkInPlace'] }).filter(x => x.rule === 'walkInPlace'));
  return v;
}
const walker = (t, x, z, o = {}) => ({ id: 'p1', obj: o.obj || 'person.walker', cls: 'stroll', static: false, layer: 'walk', x, z, y: 0, speed: o.speed != null ? o.speed : 1.2, vx: o.vx || 0, vz: o.vz != null ? o.vz : 1.2, view: o.view || 'side',
  box: o.box ? o.box(x, z) : [800 + x * 50 - 15, 500, 800 + x * 50 + 15, 600], anim: Object.assign({ state: 'move', clip: 'walk', rate: 0.85, stride: 1.4, k: 1 }, o.anim || {}) });
const frameOf = (t, ents) => ({ t, W: 1600, H: 900, cam: { f: 900, horizon: 450, eye: 1.65 }, ents, ctx: {} });

test('walkInPlace: legs striding while the drawn body stays put (held, whatever the shown velocity says) is a violation', () => {
  assert.ok(E.WORLD_INVARIANTS.some(r => r.rule === 'walkInPlace'), 'the rule is listed');
  const v = runRule(frames((t) => frameOf(t, [walker(t, 0, 10)]), 20, 0.1));
  assert.ok(v.length > 0 && /held/.test(v[0].msg), 'held walker flagged: ' + (v[0] && v[0].msg));
});

test('walkInPlace: a stride drawn side-on while the figure barely moves on screen is a violation; the end-on gait is not', () => {
  // walking straight toward the eye at 1.2 m/s from 20 m: the box grows a little, its foot moves a few px
  const box = (x, z) => { const H = 900 * 1.7 / z, Y = 450 + 900 * 1.65 / z; return [800 - H * 0.2, Y - H, 800 + H * 0.2, Y]; };
  const scissor = runRule(frames((t) => frameOf(t, [walker(t, 0, 20 - 1.2 * t, { vz: -1.2, view: 'front', box })]), 20, 0.1));
  assert.ok(scissor.some(x => /side-on/.test(x.msg)), 'no gait: flagged');
  const lifted = runRule(frames((t) => frameOf(t, [walker(t, 0, 20 - 1.2 * t, { vz: -1.2, view: 'front', box, anim: { gait: { fs: 0.02, swing: 1, plane: 0.16, lift: 0.98 } } })]), 20, 0.1));
  assert.deepEqual(lifted, [], 'the end-on gait passes');
  const across = runRule(frames((t) => frameOf(t, [walker(t, 1.2 * t, 10, { vx: 1.2, vz: 0 })]), 20, 0.1));
  assert.deepEqual(across, [], 'a side-on walker crossing the frame passes');
});

/* ---------- life: the body's real motion ---------- */
test('the velocity a walker shows is what its body did: after the separation pass, never the step it was pushed back from', () => {
  const world = lane({ width: 2.6, life: [{ who: 'walkers', on: 'tow', rate: '14/min', mix: { stroll: 0.5, brisk: 0.3, family: 0.2 }, edges: ['S', 'N'] }] });
  const nav = L.worldNavBuild(world), life = L.worldLifeInit(world, nav, 0);
  let worst = 0, n = 0;
  for (let s = 0; s < 240 * 15; s++) {
    L.worldLifeTick(life, 1 / 15);
    for (const a of life.agents) {
      if (a.dead || a.kind !== 'walker' || a.layer !== 'walk' || a.step || a.hop || a.fadeOut || a.px == null) continue;
      const e = Math.hypot(a.vx * life.step - (a.x - a.px), a.vz * life.step - (a.z - a.pz));
      worst = Math.max(worst, e); n++;
    }
  }
  assert.ok(n > 1000, 'walkers ticked: ' + n);
  assert.ok(worst < 1e-6, `velocity x dt and the real displacement differ by up to ${worst.toFixed(3)} m a tick`);
});

test('a held walker stands: nobody creeps with striding legs (0.05 to 0.22 m/s for a second or more)', () => {
  // a busy towpath with families (queues behind slower walkers, members, taut leads)
  const world = lane({ width: 2.2, life: [{ who: 'walkers', on: 'tow', rate: '16/min', mix: { stroll: 0.4, elderly: 0.2, family: 0.2, 'dog-walker': 0.2 }, edges: ['S', 'N'] }] });
  const nav = L.worldNavBuild(world), life = L.worldLifeInit(world, nav, 0);
  const since = new Map(), creepers = new Set();
  for (let s = 0; s < 300 * 15; s++) {
    L.worldLifeTick(life, 1 / 15);
    for (const a of life.agents) {
      if (a.dead || a.kind !== 'walker' || !/^person\./.test(String(a.obj)) || a.step || a.fadeOut) { since.delete(a.id); continue; }
      const sp = Math.hypot(a.svx || 0, a.svz || 0), creeping = sp > 0.05 && sp < 0.22 && a.state === 'walk';
      if (!creeping) { since.delete(a.id); continue; }
      if (!since.has(a.id)) since.set(a.id, life.t);
      if (life.t - since.get(a.id) >= 1) creepers.add(a.id);
    }
  }
  assert.deepEqual([...creepers], [], 'walkers that crept with walking legs for a second: ' + [...creepers].join(', '));
});

test('a family member walks WITH its moving leader: no surge-and-stop (its speed stays near the leader\'s)', () => {
  const world = lane({ width: 3.5, life: [{ who: 'walkers', on: 'tow', rate: '4/min', mix: { family: 1 }, edges: ['S', 'N'] }] });
  const nav = L.worldNavBuild(world), life = L.worldLifeInit(world, nav, 0);
  let ticks = 0, off = 0;
  for (let s = 0; s < 240 * 15; s++) {
    L.worldLifeTick(life, 1 / 15);
    for (const a of life.agents) {
      const Ld = a.leader;
      if (a.dead || !Ld || Ld.dead || a.lead || a.fadeOut || Ld.fadeOut || !(Ld.speed > 0.6) || Math.abs((Ld.v || 0) - Ld.speed) > 0.1) continue;
      if (Math.hypot(a.x - Ld.x, a.z - Ld.z) > 2.5) continue;
      ticks++;
      if (Math.abs(a.speed - Ld.speed) > 0.45 * Ld.speed) off++;
    }
  }
  assert.ok(ticks > 500, 'member ticks beside a walking leader: ' + ticks);
  assert.ok(off / ticks < 0.1, `a member was off its leader's pace by over 45 % in ${(100 * off / ticks).toFixed(1)} % of the ticks`);
});

/* ---------- the real scene: measured on the frame record ---------- */
test('Whitby harbour over a minute: under 2 % of person-time striding on the spot, at most 3 frames past the grace (13 and 2.9 % before)', () => {
  const hit = resolveRef(E, 'whitby-harbour-1-w3') || resolveRef(E, 'world-test/whitby-harbour-1-w3');
  const r = worldInPlaceRun(E, E.worldHostSpec(hit.item), { ms: Date.parse('2026-07-15T12:00:00Z'), seconds: 60, hz: 10 });
  assert.ok(r.samples > 3000, 'person-frames measured: ' + r.samples);
  // (what is left: a queued walker's sidestep for 0.6 s, its shown velocity sideways while it gains ground in depth)
  assert.ok(r.sustained <= 3, `${r.sustained} frames walking in place past the grace: ` + JSON.stringify(r.byCause));
  assert.ok(r.share < 0.02, `walking in place ${(r.share * 100).toFixed(1)} % of person-time: ${JSON.stringify(r.byCause)}`);
});
