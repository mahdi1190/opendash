// Crowd behaviour of the world engine's life (src/app/79-world-2life.js with 1nav, 2brains and 2traffic): the classes of
// movement bug the owner reported ("people walking into each other, through objects, stuck, sliding, popping") as automatic
// checks on hand-made worlds. Each test would FAIL on the engine as it was on 14 Oct 2026 (soft steering only, no floor under
// it): see docs/dev/SCENE_LESSONS.md section J.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = name => readFileSync(new URL('../src/app/' + name, import.meta.url), 'utf8');
const FILES = ['79-world-1nav.js', '79-world-2brains.js', '79-world-2traffic.js', '79-world-2life.js'];
function load() {
  const body = FILES.map(src).join('\n;\n'), names = new Set();
  for (const m of body.matchAll(/^(?:async\s+)?function\s+([A-Za-z_]\w*)\s*\(/gm)) names.add(m[1]);
  for (const m of body.matchAll(/^(?:const|let|var)\s+([A-Za-z_]\w*)\s*=/gm)) names.add(m[1]);
  const tail = '\nreturn { ' + [...names].map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ') + ' };';
  return new vm.Script('(function () {\n' + body + tail + '\n})', { filename: 'crowd-bundle.js' }).runInThisContext()();
}
const C = load();
const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
const cam = { fov: 64, eye: 1.65, horizon: 470, water: -0.4 };

/** A straight path 1 to 299 m deep with population(s) both ways: on grass (a towpath) or over water (a boardwalk). */
function lane({ width = 2.6, over = 'grass', life, seed = 2, entities = [] }) {
  const surfaces = over === 'water'
    ? [{ id: 'pond', kind: 'water', water: 'pond', poly: rect(-60, 1, 60, 300), shallow: 1 }, { id: 'tow', kind: 'boardwalk', path: [[2.5, 1], [2.5, 299]], width }]
    : [{ id: 'grass', kind: 'grass', poly: rect(-60, 1, 60, 300) }, { id: 'tow', kind: 'towpath', path: [[2.5, 1], [2.5, 299]], width }];
  return { seed, cam, waterY: -0.4, surfaces, entities, life };
}
const WALKERS = (rate) => [{ who: 'walkers', on: 'tow', rate, mix: { stroll: 0.5, brisk: 0.2, 'dog-walker': 0.2, jogger: 0.1 }, edges: ['S', 'N'] }];

/** Run a world and measure: the closest unrelated pair (m), frames under a body-and-a-bit, the worst stall, the fastest tick. */
function measure(world, secs) {
  const nav = C.worldNavBuild(world), life = C.worldLifeInit(world, nav, 0);
  let minSep = 9, under = 0, frames = 0, maxStep = 0, retired = 0;
  const stall = new Map(), stalled = [];
  for (let s = 0; s < secs * 15; s++) {
    C.worldLifeTick(life, 1 / 15);
    const ag = life.agents.filter(a => !a.dead && a.layer === 'walk' && a.kind === 'walker');
    for (const a of ag) {
      const h = stall.get(a.id) || { x: a.x, z: a.z, t: life.t };
      if (Math.hypot(a.x - h.x, a.z - h.z) > 0.5 || !a.dir) { h.x = a.x; h.z = a.z; h.t = life.t; } else if (life.t - h.t > 12 && !h.rep) { h.rep = true; stalled.push(a.id); }
      stall.set(a.id, h);
      maxStep = Math.max(maxStep, Math.hypot(a.x - a.px, a.z - a.pz));
    }
    for (let i = 0; i < ag.length; i++) for (let j = i + 1; j < ag.length; j++) {
      const a = ag[i], b = ag[j];
      // (20 Oct) a ghost pass is two translucent walkers walking through each other by design (tests/world-ghost-pass.test.mjs): left
      // out like a squeeze; two SOLID strangers inside each other still count
      if (C._wlfRelated(a, b) || a.squeeze > life.t || b.squeeze > life.t || (C._wlfGhostPartner(a, b) && a.ghost > 0.15 && b.ghost > 0.15)) continue;
      const d = Math.hypot(a.x - b.x, a.z - b.z);
      minSep = Math.min(minSep, d);
      if (d < (a.r + b.r) * 0.95) under++;
    }
    frames++;
  }
  retired = life.problems.filter(p => p.rule === 'stuckRetired').length;
  return { life, minSep, under, frames, maxStep, stalled, retired };
}

test('two-way walkers on a 2.6 m towpath pass side by side: never closer than a body, never stuck (Y4, A2, A4)', () => {
  const r = measure(lane({ width: 2.6, life: WALKERS('6/min') }), 600);
  assert.ok(r.minSep >= 0.55, `the closest pair of strangers was ${r.minSep.toFixed(2)} m apart`);
  assert.equal(r.under, 0, 'frames with two people inside each other: ' + r.under);
  assert.deepEqual(r.stalled, [], 'movers that stood in the lane for 12 s: ' + r.stalled.join(', '));
});

test('a busy towpath (12 a minute) holds: no overlap, no jam', () => {
  const r = measure(lane({ width: 2.6, life: WALKERS('12/min') }), 400);
  assert.equal(r.under, 0, 'overlapping frames: ' + r.under);
  assert.deepEqual(r.stalled, [], 'stalled: ' + r.stalled.join(', '));
});

test('a boardwalk one person wide: head-on walkers get past each other (as ghosts since 20 Oct), nothing stays jammed', () => {
  const r = measure(lane({ width: 1.6, over: 'water', life: WALKERS('6/min') }), 600);
  assert.ok(r.life.ghostLinks > 20, 'they pass as ghosts: ' + r.life.ghostLinks);
  assert.ok(r.stalled.length <= 1, 'jammed: ' + r.stalled.join(', '));
  assert.ok(r.under <= 12, 'strangers inside each other (brushing past in a one-body lane is allowed, briefly): ' + r.under);
});

test('every mover walks, never teleports: no dog or walker moves more than 0.45 m in one tick (a leash is not a snap)', () => {
  const r = measure(lane({ width: 2.6, life: [{ who: 'dog-walkers', on: 'tow', rate: '10/min', edges: ['S', 'N'] }] }), 300);
  assert.ok(r.maxStep < 0.45, `the largest step in one tick was ${r.maxStep.toFixed(2)} m`);
});

test('the lead is never longer than it is, and the walker waits when the dog cannot follow (A7)', () => {
  const world = lane({ width: 2.6, life: [{ who: 'dog-walkers', on: 'tow', rate: '10/min', edges: ['S', 'N'] }] });
  const nav = C.worldNavBuild(world), life = C.worldLifeInit(world, nav, 3);
  let n = 0;
  for (let s = 0; s < 240 * 15; s++) {
    C.worldLifeTick(life, 1 / 15);
    for (const d of life.agents) { if (!d.lead || d.dead || !d.leader) continue; n++; assert.ok(Math.hypot(d.x - d.leader.x, d.z - d.leader.z) <= d.lead.len + 1e-6, 'the lead stretched'); }
  }
  assert.ok(n > 500, 'dogs checked: ' + n);
});

test('a wanderer only picks places it can reach: a heron on the near margin of a canal never plans a walk across the water', () => {
  const world = {
    seed: 5, cam, waterY: -0.4,
    surfaces: [{ id: 'offside', kind: 'grass', poly: rect(-60, 1, -12, 300) }, { id: 'cut', kind: 'water', water: 'canal', poly: rect(-12, 1, -1, 300), shallow: 0.6 }, { id: 'bank', kind: 'grass', poly: rect(-1, 1, 1, 300) }],
    entities: [], life: [{ who: 'heron', count: 1, on: 'cut' }],
  };
  const nav = C.worldNavBuild(world), life = C.worldLifeInit(world, nav, 5, { warm: false });
  const h = life.agents.find(a => a.cls === 'heron');
  let reached = 0, none = 0;
  for (let i = 0; i < 60; i++) {
    const tp = C._wlfWanderTarget(life, h, 'cut', false);
    if (!tp) { none++; continue; }
    if (C.worldPath(nav, h.layer, [h.x, h.z], tp, C._wlfFlowR(h))) reached++; else assert.fail(`a target with no path: ${tp}`);
  }
  assert.ok(reached > 40, `targets with a path: ${reached}, none: ${none}`);
  let struck = 0; life.bus.on('strike', () => struck++);
  for (let s = 0; s < 400 * 15; s++) C.worldLifeTick(life, 1 / 15);
  assert.ok(struck > 0, 'the heron hunts (stalks, freezes, strikes) instead of standing for the whole loop');
});

test('a resident whose first goal is a named place starts near it (a boater beside its boat, never in a far field)', () => {
  const world = lane({ width: 2.6, life: [{ who: 'visit', count: 1, mix: { stroll: 1 }, goals: [{ go: 'post-1' }, { do: 'idle', for: [5, 10] }] }], entities: [{ id: 'post-1', obj: 'street.bollard', cls: 'post', x: 6, z: 40, solidity: 'solid', size: { w: 0.3, d: 0.3, h: 1.1 }, height: 1.1, static: true }] });
  const nav = C.worldNavBuild(world), life = C.worldLifeInit(world, nav, 1, { warm: false });
  const a = life.agents.find(q => q.pop === 0);
  assert.ok(a, 'the resident exists');
  assert.ok(Math.hypot(a.x - 6, a.z - 40) < 15, `placed ${Math.hypot(a.x - 6, a.z - 40).toFixed(0)} m from its first goal`);
});

test('a mover that stops looking turns to where it is going (no stale point of interest holds it facing the wrong way)', () => {
  const world = lane({ width: 2.6, life: WALKERS('4/min') });
  const nav = C.worldNavBuild(world), life = C.worldLifeInit(world, nav, 1, { warm: false });
  for (let s = 0; s < 30 * 15; s++) C.worldLifeTick(life, 1 / 15);
  const a = life.agents.find(q => !q.dead && q.kind === 'walker');
  assert.ok(a, 'a walker');
  a.lookAt = [a.x + 20 * Math.sin(a.heading + Math.PI), a.z + 20 * Math.cos(a.heading + Math.PI)];   // a point of interest behind it
  C._wlfLeave(life, a, 'any');
  assert.equal(a.lookAt, null, 'leaving forgets the point of interest');
  let moved = 0;
  const x0 = a.x, z0 = a.z;
  for (let s = 0; s < 8 * 15 && !a.dead; s++) { C.worldLifeTick(life, 1 / 15); moved = Math.hypot(a.x - x0, a.z - z0); }
  assert.ok(a.dead || moved > 3, `it walked ${moved.toFixed(1)} m in 8 s`);
});

test('the watchdog: a mover with somewhere to go that makes no headway for 10 s is retired, logged, never left standing', () => {
  const world = lane({ width: 2.6, life: WALKERS('4/min') });
  const nav = C.worldNavBuild(world), life = C.worldLifeInit(world, nav, 1, { warm: false });
  for (let s = 0; s < 40 * 15; s++) C.worldLifeTick(life, 1 / 15);
  const a = life.agents.find(q => !q.dead && q.kind === 'walker' && q.intent !== 'stay');
  assert.ok(a, 'a walker on its way');
  // wedge it: its way is blocked for ever (it is made unable to move while it wants to)
  a.route = null; a.goals = [{ go: [2.5, 150] }]; a.gi = 0; a.leaving = false;
  let gone = false;
  for (let s = 0; s < 40 * 15 && !gone; s++) { a.x = a.px = 2.5; a.z = a.pz = 100; C.worldLifeTick(life, 1 / 15); gone = a.dead || !!a.fadeOut; }
  assert.ok(gone, 'the wedged mover was retired');
  assert.ok(life.problems.some(p => p.rule === 'stuckRetired'), 'and logged');
});

// ---- 15 Oct (movement round): a gap two cannot pass in. Whitby's quay had a bollard 1.6 m from a bench: head-on walkers met in it, each
// took the other for a standing obstacle (oncoming was judged by the velocity a held-up mover no longer has), both stood nose to nose
// for 4 to 5 s and a squeeze then put them through each other. Now: oncoming is by intent, the one nearer the gap goes first and the
// other waits at its mouth.
function gapWorld(gap, seed) {
  const zc = 10;
  return { seed, cam, surfaces: [{ id: 'quay', kind: 'plaza', poly: rect(-40, 8, 40, 14) }],
    entities: [
      { id: 'post', obj: 'street.bollard', cls: 'post', x: 0, z: zc - gap / 2 - 0.25, solidity: 'solid', size: { w: 0.5, d: 0.5, h: 1.1 }, height: 1.1, static: true },
      { id: 'bench', obj: 'street.bench', cls: 'bench', x: 0, z: zc + gap / 2 + 1.0, solidity: 'solid', size: { w: 2.2, d: 2.0, h: 0.9 }, height: 0.9, static: true },
    ],
    life: [{ who: 'walkers', on: 'quay', rate: '0.0001/min', mix: { stroll: 1 }, edges: ['W', 'E'] }] };
}
function headOn(gap, dz, seed) {
  const nav = C.worldNavBuild(gapWorld(gap, seed)), life = C.worldLifeInit(gapWorld(gap, seed), nav, 0, { warm: false }), pop = life.pops[0];
  const A = C._wlfArrive(life, pop, pop.entries[0]), B = C._wlfArrive(life, pop, pop.entries[0]);
  assert.ok(A && B, 'two walkers arrived');
  const put = (a, x, z, tx) => { a.x = a.px = x; a.z = a.pz = z; a.goals = [{ go: [tx, z] }]; a.gi = 0; a.route = null; a.leaving = false; a.heading = tx > x ? Math.PI / 2 : -Math.PI / 2; a.fadeIn = 0; a.v = 1.2; };
  put(A, -9, 10 + dz, 9); put(B, 9, 10 - dz, -9);
  let stall = 0, maxStall = 0, minD = 9, minSolid = 9, sq = 0, pass = false;
  for (let i = 0; i < 40 * 15; i++) {
    C.worldLifeTick(life, 1 / 15);
    const d = Math.hypot(A.x - B.x, A.z - B.z);
    minD = Math.min(minD, d);
    if (!(C._wlfGhostPartner(A, B) && A.ghost > 0.15 && B.ghost > 0.15)) minSolid = Math.min(minSolid, d);
    if (A.squeeze > life.t || B.squeeze > life.t) sq++;
    if ((A.speed < 0.15 || B.speed < 0.15) && Math.abs(A.x) < 5) { stall++; maxStall = Math.max(maxStall, stall); } else stall = 0;
    if (A.x > 3 && B.x < -3) pass = true;
  }
  return { minD, minSolid, maxStallS: maxStall / 15, squeezeFrames: sq, pass, ghosts: life.ghostLinks };
}
// 20 Oct (the ghost pass, tests/world-ghost-pass.test.mjs): the user found the waiting and dodging in such gaps "super weird". The one
// nearer the gap no longer goes first while the other waits at its mouth: the two walk through each other as soft ghosts. The checks
// were 'stood still at most 1.5 s' and 'never closer than 0.3 m'; now: nobody stands (under 0.2 s), they ARE closer (a ghost pass),
// and two SOLID bodies are never closer than the old 0.3 m
test('two walkers meeting head on in a gap between a bollard and a bench pass: no standing nose to nose, no squeeze, a ghost pass', () => {
  for (const dz of [0, 0.2, -0.3]) {
    const r = headOn(1.6, dz, 3);
    assert.ok(r.pass, 'both got through (offset ' + dz + ')');
    assert.ok(r.maxStallS <= 0.2, 'stood still for ' + r.maxStallS.toFixed(1) + ' s (offset ' + dz + ')');
    assert.equal(r.squeezeFrames, 0, 'squeezed through each other for ' + r.squeezeFrames + ' frames (offset ' + dz + ')');
    assert.equal(r.ghosts, 1, 'one ghost pass (offset ' + dz + ')');
    assert.ok(r.minSolid >= 0.3, 'the closest they came while solid: ' + r.minSolid.toFixed(2) + ' m');
  }
});
// 2.4 m between the pieces leaves the centres 1.2 m (the nav keeps 0.6 m off a solid): the old engine slowed one walker to 0.04 m/s
// there for half a second (a shuffle), so this gap is now a ghost pass too; 3 m is open ground, passed side by side as it was
test('an open pass is as it was: head-on walkers 3 m between the pieces pass side by side without waiting; 2.4 m is a ghost pass', () => {
  const r = headOn(3, 0, 3);
  assert.ok(r.pass && r.maxStallS < 0.5 && r.squeezeFrames === 0 && r.ghosts === 0 && r.minD >= 0.55, JSON.stringify(r));
  const q = headOn(2.4, 0, 3);
  assert.ok(q.pass && q.maxStallS < 0.2 && q.squeezeFrames === 0 && q.minSolid >= 0.3, JSON.stringify(q));
});
