// The ghost pass (20 Oct; src/app/79-world-2life.js _wlfGhostPass, docs/dev/WORLD_ENGINE.md, SCENE_LESSONS section AD). The user:
// "we should let people walk into each other, it's super weird watching them try to avoid each other in tight areas; there must be a
// smooth way to do this, phase in and out, transparencies". In a tight place two walkers walk THROUGH each other, each fading to a
// translucent ghost (alpha 1 - 0.55 x ghost, never under 0.45) as the bodies overlap and back to solid as they part; on open ground they
// pass side by side as before. Each test fails on the engine as it was (the pinch yield made one wait at the mouth of a gap, the steering
// queued and shuffled, nothing was ever translucent).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import { loadEngine } from '../tools/lib/world/convert.mjs';

const src = name => readFileSync(new URL('../src/app/' + name, import.meta.url), 'utf8');
const FILES = ['79-world-1nav.js', '79-world-2brains.js', '79-world-2traffic.js', '79-world-2life.js'];
function load() {
  const body = FILES.map(src).join('\n;\n'), names = new Set();
  for (const m of body.matchAll(/^(?:async\s+)?function\s+([A-Za-z_]\w*)\s*\(/gm)) names.add(m[1]);
  for (const m of body.matchAll(/^(?:const|let|var)\s+([A-Za-z_]\w*)\s*=/gm)) names.add(m[1]);
  const tail = '\nreturn { ' + [...names].map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ') + ' };';
  return new vm.Script('(function () {\n' + body + tail + '\n})', { filename: 'ghost-bundle.js' }).runInThisContext()();
}
const C = load();
const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
const cam = { fov: 64, eye: 1.65, horizon: 470, water: -0.4 };

/** A boardwalk one body wide (1.3 m over a pond: about 0.8 m for the centres) across the view at z = 12. */
const boardwalk = (seed, life) => ({ seed, cam, waterY: -0.4,
  surfaces: [{ id: 'pond', kind: 'water', water: 'pond', poly: rect(-60, 1, 60, 40), shallow: 1 }, { id: 'bw', kind: 'boardwalk', path: [[-40, 12], [40, 12]], width: 1.3 }],
  entities: [], life: life || [{ who: 'walkers', on: 'bw', rate: '0.0001/min', mix: { stroll: 1 }, edges: ['W', 'E'] }] });
/** An open plaza 30 m deep: room for anybody to pass anybody. */
const plaza = (seed) => ({ seed, cam, surfaces: [{ id: 'sq', kind: 'plaza', poly: rect(-40, 4, 40, 34) }], entities: [],
  life: [{ who: 'walkers', on: 'sq', rate: '0.0001/min', mix: { stroll: 1 }, edges: ['W', 'E'] }] });
/** The Whitby gap of SCENE_LESSONS J (tests/world-crowd.test.mjs gapWorld): a bollard and a bench 1.6 m apart on a 6 m quay. */
const slot = (seed) => ({ seed, cam, surfaces: [{ id: 'quay', kind: 'plaza', poly: rect(-40, 8, 40, 14) }],
  entities: [
    { id: 'post', obj: 'street.bollard', cls: 'post', x: 0, z: 10 - 0.8 - 0.25, solidity: 'solid', size: { w: 0.5, d: 0.5, h: 1.1 }, height: 1.1, static: true },
    { id: 'bench', obj: 'street.bench', cls: 'bench', x: 0, z: 10 + 0.8 + 1.0, solidity: 'solid', size: { w: 2.2, d: 2.0, h: 0.9 }, height: 0.9, static: true },
  ],
  life: [{ who: 'walkers', on: 'quay', rate: '0.0001/min', mix: { stroll: 1 }, edges: ['W', 'E'] }] });

/** Two walkers sent head on along z = zA / zB from x = -9 and +9 to the far side; per tick: distance, speeds and their records' alpha. */
function headOn(make, seed, zA, zB, secs = 30, x0 = 9) {
  const W = make(seed), nav = C.worldNavBuild(W), life = C.worldLifeInit(make(seed), nav, 0, { warm: false }), pop = life.pops[0];
  const mk = (x, z) => { const a = C._wlfNewAgent(life, pop, pop.entries[0], x, z, 'p0-' + (pop.ord++)); C._wlfAdd(life, a); return a; };
  const A = mk(-x0, zA), B = mk(x0, zB);
  const put = (a, x, z, tx) => { a.x = a.px = x; a.z = a.pz = z; a.goals = [{ go: [tx, z] }]; a.gi = 0; a.route = null; a.leaving = false; a.heading = tx > x ? Math.PI / 2 : -Math.PI / 2; a.fadeIn = 0; a.v = 1.1; };
  put(A, -x0, zA, 12); put(B, x0, zB, -12);
  const rows = [];
  for (let i = 0; i < secs * 15; i++) {
    C.worldLifeTick(life, 1 / 15);
    const R = C.worldAgents(life), ra = R.find(q => q.id === A.id), rb = R.find(q => q.id === B.id);
    const dev = (q) => (q.dir ? Math.abs(Math.atan2(Math.sin(q.heading - Math.atan2(q.dir[0], q.dir[1])), Math.cos(q.heading - Math.atan2(q.dir[0], q.dir[1])))) * 180 / Math.PI : 0);
    rows.push({ t: life.t, d: Math.hypot(A.x - B.x, A.z - B.z), ax: A.x, bx: B.x, az: A.z, bz: B.z, ta: dev(A), tb: dev(B), va: A.speed || 0, vb: B.speed || 0, aa: ra ? ra.alpha : null, ab: rb ? rb.alpha : null,
      ga: ra ? ra.ghost : 0, gb: rb ? rb.ghost : 0, link: !!(ra && rb && C.worldLifeGhostLinked(ra, rb)) });
  }
  return { rows, life, A, B };
}
const passed = (r) => r.rows.some(q => q.ax > 4) && r.rows.some(q => q.bx < -4);
/** The longest run (s) with either walker under 0.3 m/s while they are within 4 m of each other: a stop, a wait or a shuffle. */
const stopS = (r) => { let n = 0, m = 0; for (const q of r.rows) { if (q.d < 4 && (q.va < 0.3 || q.vb < 0.3)) { n++; m = Math.max(m, n); } else n = 0; } return m / 15; };
const minAlpha = (r) => Math.min(...r.rows.map(q => Math.min(q.aa ?? 1, q.ab ?? 1)));
const maxJump = (r) => { let m = 0; for (let i = 1; i < r.rows.length; i++) for (const k of ['aa', 'ab']) if (r.rows[i][k] != null && r.rows[i - 1][k] != null) m = Math.max(m, Math.abs(r.rows[i][k] - r.rows[i - 1][k])); return m; };

test('(a) head on along a boardwalk one body wide: both walk through as ghosts, nobody stops, solid well before and after', () => {
  for (const [zA, zB] of [[12, 12], [12.15, 11.9]]) {
    const r = headOn(boardwalk, 3, zA, zB);
    assert.ok(passed(r), 'both got past each other');
    assert.ok(stopS(r) < 0.2, `a walker stood or crept for ${stopS(r).toFixed(2)} s near the other`);
    const cross = r.rows.reduce((m, q) => (q.d < m.d ? q : m), r.rows[0]);
    // inside the hard floor between strangers (1.2 x the radii, 0.6 m): the separation would never let solid bodies this close
    assert.ok(cross.d < 0.5, `they walked through each other (closest ${cross.d.toFixed(2)} m)`);
    const lo = minAlpha(r);
    assert.ok(lo >= 0.4 && lo <= 0.6, `the ghost at the crossing: min alpha ${lo.toFixed(3)} (0.4 to 0.6: soft, never invisible)`);
    assert.ok(Math.min(cross.aa, cross.ab) <= 0.6, `ghosted AT the crossing (alpha ${cross.aa.toFixed(2)}, ${cross.ab.toFixed(2)})`);
    for (const q of r.rows) if (q.d > 3 && q.aa != null && q.ab != null) { assert.equal(q.aa, 1, `solid at ${q.d.toFixed(1)} m apart (t ${q.t.toFixed(2)})`); assert.equal(q.ab, 1); }
    assert.equal(r.life.ghostLinks, 1, 'one ghost pass');
  }
});

test('(a) head on in a gap between a bollard and a bench: no wait at its mouth (the pinch yield waits for nobody it can pass as a ghost)', () => {
  const r = headOn(slot, 3, 10, 10);
  assert.ok(passed(r), 'both got through');
  assert.ok(stopS(r) < 0.2, `a walker waited ${stopS(r).toFixed(2)} s`);
  const lo = minAlpha(r);
  assert.ok(lo >= 0.4 && lo <= 0.6, `min alpha ${lo.toFixed(3)}`);
  assert.equal(r.life.ghostLinks, 1);
  for (const q of r.rows) if (q.d > 3 && q.aa != null && q.ab != null) assert.ok(q.aa === 1 && q.ab === 1, `solid at ${q.d.toFixed(1)} m`);
});

test('(b) the opacity is continuous: never more than 0.12 between two ticks (a frame on each would show the step whole)', () => {
  for (const [make, zA, zB] of [[boardwalk, 12, 12], [boardwalk, 12.15, 11.9], [slot, 10, 10], [slot, 10.2, 9.8]]) {
    const r = headOn(make, 3, zA, zB);
    assert.ok(maxJump(r) <= 0.12, `alpha jumped ${maxJump(r).toFixed(3)} in one tick`);
    // and it eases (no step held flat then dropped): at least 4 ticks from solid to the deepest ghost
    const al = r.rows.filter(q => q.aa != null), lo = Math.min(...al.map(x => x.aa));
    const i0 = al.findIndex(q => q.aa < 1), i1 = al.findIndex(q => q.aa === lo);
    assert.ok(i0 >= 0 && i1 - i0 >= 4, `faded in over ${i1 - i0} ticks`);
  }
});

// (c) rewritten 20 Oct (the second round): the first ghost pass was for tight places only and this test said an open plaza never
// ghosts. The user found the avoiding itself weird anywhere, so now: strangers whose paths would bring them inside a comfortable
// distance (0.9 m between centres) pass through each other as ghosts on open ground too, and strangers who would walk by at a
// comfortable distance do not ghost at all. Neither swerves nor stops. The only steering left between strangers is the lane habit
// (_wlfGhostDrift): long before they meet, each drifts a few degrees to keep to its side, so most pairs walk by solid; it is held here
// to a quarter of a metre off its own line for a comfortable pair and never more than 17 degrees off the planned direction (the
// steering's dodges were 25 degrees and more).
// how far a walker strays, while the two are within 5 m, from the line it walks when the other is far away (the route itself drifts
// a little toward the grid's cell centres: the same with or without the other)
const sway = (r, k, zA, zB, x0 = 9) => {
  const solo = k === 'az' ? headOn(plaza, 3, zA, 30, 30, x0) : headOn(plaza, 3, 30, zB, 30, x0);
  return Math.max(0, ...r.rows.map((q, i) => (q.d < 5 && solo.rows[i] ? Math.abs(q[k] - solo.rows[i][k]) : 0)));
};
test('(c) in an open plaza: walkers who would walk by stay solid; walkers whose paths meet ghost; nobody swerves or stops', () => {
  for (const [zA, zB] of [[18, 19.1], [18.6, 17.4], [18, 19.4]]) {
    const r = headOn(plaza, 3, zA, zB);
    assert.ok(passed(r), 'they passed');
    assert.equal(r.life.ghostLinks, 0, `a comfortable miss (${Math.abs(zA - zB).toFixed(1)} m apart) is no ghost pass`);
    assert.equal(minAlpha(r), 1, 'solid all the way');
    const sa = sway(r, 'az', zA, zB), sb = sway(r, 'bz', zA, zB), tm = Math.max(...r.rows.filter(q => q.d < 8).map(q => Math.max(q.ta, q.tb)));
    assert.ok(sa < 0.25 && sb < 0.25, `they walk by without swerving (${sa.toFixed(2)}, ${sb.toFixed(2)} m off their own lines)`);
    assert.ok(tm <= 17, `never more than a lane drift off their way (${tm.toFixed(1)} degrees)`);
  }
  // dead on from far away: the lane habit lets them walk by solid, or they ghost through; never a dodge
  for (const [zA, zB] of [[18, 18], [18.2, 17.9], [18, 18.4]]) {
    const r = headOn(plaza, 3, zA, zB);
    assert.ok(passed(r), 'they passed');
    assert.ok(r.life.ghostLinks <= 1, 'at most one ghost pass');
    const md = Math.min(...r.rows.map(q => q.d));
    if (md < 0.6) { const lo = minAlpha(r); assert.ok(lo >= 0.4 && lo <= 0.6, `through each other as ghosts (min alpha ${lo.toFixed(3)})`); }
    else assert.ok(md >= 0.6, `walked by (${md.toFixed(2)} m)`);
    assert.ok(stopS(r) < 0.2, `nobody slowed or stopped (${stopS(r).toFixed(2)} s)`);
    const tm = Math.max(...r.rows.filter(q => q.d < 8).map(q => Math.max(q.ta, q.tb)));
    assert.ok(tm <= 17, `never more than a lane drift off their way (${tm.toFixed(1)} degrees)`);
  }
  // met late (5 m apart, no time to keep to their sides): they walk through each other, as ghosts, without swerving
  for (const [zA, zB] of [[18, 18], [18.2, 17.9], [18, 18.4]]) {
    const r = headOn(plaza, 3, zA, zB, 20, 2.5);
    assert.ok(passed(r), 'they passed');
    assert.equal(r.life.ghostLinks, 1, 'paths that meet: one ghost pass');
    const lo = minAlpha(r);
    assert.ok(lo >= 0.4 && lo <= 0.6, `min alpha ${lo.toFixed(3)}`);
    assert.ok(stopS(r) < 0.2, `nobody slowed or stopped (${stopS(r).toFixed(2)} s)`);
    const sa = sway(r, 'az', zA, zB, 2.5), sb = sway(r, 'bz', zA, zB, 2.5), tm = Math.max(...r.rows.filter(q => q.d < 8).map(q => Math.max(q.ta, q.tb)));
    assert.ok(sa < 0.5 && sb < 0.5, `nobody swerved (${sa.toFixed(2)}, ${sb.toFixed(2)} m off their own lines)`);
    assert.ok(tm <= 17, `never more than a lane drift off their way (${tm.toFixed(1)} degrees)`);
  }
});

test('(d) group mates never ghost: couples, families and a dog on its own lead keep their floor, even on a one-body boardwalk', () => {
  const W = boardwalk(4, [{ who: 'walkers', on: 'bw', rate: '10/min', mix: { couple: 0.4, 'dog-walker': 0.3, stroll: 0.3 }, edges: ['W', 'E'] }]);
  const nav = C.worldNavBuild(W), life = C.worldLifeInit(W, nav, 0);
  let linkedPairs = 0, groups = 0;
  for (let s = 0; s < 300 * 15; s++) {
    C.worldLifeTick(life, 1 / 15);
    for (const L of life.ghosts) {
      linkedPairs++;
      assert.ok(!C._wlfRelated(L.a, L.o) && !(L.a.group && L.a.group === L.o.group), `group mates ${L.a.id} and ${L.o.id} were ghost-linked`);
    }
    if (s % 15 === 0) groups += life.agents.filter(a => a.leader && !a.dead).length;
  }
  assert.ok(groups > 50, 'there were groups on the boardwalk: ' + groups);
  assert.ok(linkedPairs > 0, 'strangers did ghost past each other there');
  // the decision itself: a leader and its member, met head on in the gap, are never a ghost pair
  const lead = life.agents.find(a => a.members && a.members.length && !a.dead);
  if (lead) { const m = lead.members[0]; assert.equal(C._wlfGhostable(life, lead, m), false); assert.equal(C._wlfGhostable(life, m, lead), false); }
});

test('(e) deterministic: the same seed gives the same alpha trace, tick for tick', () => {
  const trace = () => {
    const W = boardwalk(7, [{ who: 'walkers', on: 'bw', rate: '8/min', mix: { stroll: 0.6, brisk: 0.4 }, edges: ['W', 'E'] }]);
    const nav = C.worldNavBuild(W), life = C.worldLifeInit(W, nav, 0), out = [];
    for (let s = 0; s < 120 * 15; s++) { C.worldLifeTick(life, 1 / 15); for (const a of C.worldAgents(life)) if (a.alpha < 1 || a.ghost > 0) out.push(`${s}:${a.id}:${a.alpha.toFixed(6)}:${(a.ghost || 0).toFixed(6)}`); }
    return { out, links: life.ghostLinks };
  };
  const r1 = trace(), r2 = trace();
  assert.ok(r1.links > 0, 'ghost passes happened: ' + r1.links);
  assert.equal(r1.out.length, r2.out.length);
  assert.deepEqual(r1.out, r2.out);
});

test('a busy boardwalk one body wide: no jam, no stand-off, every unrelated pair drawn through each other is a linked ghost pair', () => {
  const W = boardwalk(2, [{ who: 'walkers', on: 'bw', rate: '6/min', mix: { stroll: 0.5, brisk: 0.3, jogger: 0.2 }, edges: ['W', 'E'] }]);
  const nav = C.worldNavBuild(W), life = C.worldLifeInit(W, nav, 0), mem = {};
  const bad = [];
  for (let s = 0; s < 400 * 15; s++) {
    C.worldLifeTick(life, 1 / 15);
    const R = C.worldAgents(life);
    for (const v of C.worldLifeCrowdCheck(R, mem, life.t)) bad.push(v.rule + ': ' + v.msg);
  }
  assert.deepEqual(bad.slice(0, 5), [], 'crowd check (overlap, standoff) on solid pairs');
  assert.ok(life.ghostLinks > 5, 'ghost passes: ' + life.ghostLinks);
  assert.equal(life.problems.filter(p => p.rule === 'stuckRetired').length, 0, 'nobody retired by the watchdog');
});

test('a pass that is over while they still overlap is released: parted softly (no shove), solid again once clear', () => {
  // two strangers walking the same way 0.15 m apart along an open plaza, linked as a pass that has just ended (one turned to go the
  // same way as the other: York, 20 Oct, they walked on inside each other as ghosts for seconds)
  const W = plaza(5), nav = C.worldNavBuild(W), life = C.worldLifeInit(plaza(5), nav, 0, { warm: false }), pop = life.pops[0];
  const mk = (x, z) => { const a = C._wlfNewAgent(life, pop, pop.entries[0], x, z, 'p0-' + (pop.ord++)); C._wlfAdd(life, a); a.fadeIn = 0; a.goals = [{ go: [30, z] }]; a.gi = 0; a.heading = Math.PI / 2; a.v = 1; return a; };
  const A = mk(-6, 18), B = mk(-6, 18.15);
  A.gl = [B]; B.gl = [A]; A.ghost = B.ghost = 1;
  life.ghosts.push({ a: A, o: B, t0: 0, until: 0 });
  let maxJump = 0, apartT = null, solidT = null, prevA = { x: A.x, z: A.z };
  const rows = [];
  for (let i = 0; i < 8 * 15; i++) {
    C.worldLifeTick(life, 1 / 15);
    const R = C.worldAgents(life), ra = R.find(q => q.id === A.id), rb = R.find(q => q.id === B.id);
    const lat = Math.abs(A.z - B.z);
    maxJump = Math.max(maxJump, Math.abs(A.z - prevA.z)); prevA = { x: A.x, z: A.z };
    if (apartT == null && Math.hypot(A.x - B.x, A.z - B.z) >= 0.55) apartT = life.t;
    if (solidT == null && ra.alpha === 1 && rb.alpha === 1) solidT = life.t;
    rows.push(ra.alpha);
  }
  assert.ok(apartT != null && apartT < 3, `parted within 3 s (at ${apartT})`);
  // (the release parts them at 2.5 cm a tick, 0.4 m/s sideways, so a walker never lurches off its line: solid in about 5 s)
  assert.ok(solidT != null && solidT < 6, `solid again within 6 s (at ${solidT})`);
  assert.ok(maxJump < 0.2, `no shove sideways: the largest sideways step in a tick ${maxJump.toFixed(3)} m`);
  for (let i = 1; i < rows.length; i++) assert.ok(Math.abs(rows[i] - rows[i - 1]) <= 0.12, 'alpha continuous');
  assert.equal(life.ghosts.length, 0, 'the link ended');
});

/* ---------- the checkers: a ghost pair is no violation, two solid people (or a ghost and a third) still are ---------- */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const E = loadEngine({ root: ROOT });
const ecam = E.sceneCamera({ camera: { eye: 1.65, fov: 64, horizon: 460, heading: 0 } });
const eworld = { v: 3, cam: ecam, surfaces: [{ id: 'land', kind: 'grass', poly: [[-200, 0.5], [200, 0.5], [200, 400], [-200, 400]] }], entities: [], seed: 1, place: { lat: 51.29, lon: -0.82 } };
function frame(ents, extra = {}) {
  for (const e of ents) {
    if (e.box === undefined && Number.isFinite(e.x) && Number.isFinite(e.z) && e.z > 0.3) {
      const h = e.height || 1, a = E.sceneProject(ecam, e.x, e.z, e.y || 0), b = E.sceneProject(ecam, e.x, e.z, (e.y || 0) + h), k = ecam.f / e.z, w = (e.w || h * 0.5) * k;
      e.box = [a.X - w / 2, b.Y, a.X + w / 2, a.Y];
    }
  }
  return Object.assign({ t: 0, cam: ecam, W: 1600, H: 900, ents, surfaces: eworld.surfaces }, extra);
}
const run = (rule, fr, o = {}) => E.worldInvariants(fr, Object.assign({ world: eworld, rules: [rule] }, o)).filter(v => v.rule === rule);
const P = (o) => Object.assign({ id: 'p1', cls: 'person', obj: 'person.walker', static: false, x: 3, y: 0, z: 20, height: 1.75, layer: 'walk', speed: 1.2, vx: 1.2, vz: 0, state: 'walk', view: 'side', mirror: false, r: 0.25 }, o);
const G = (id, w, g = 0.9) => ({ id, ghost: g, ghostWith: [w], alpha: 1 - 0.55 * g });

test('personalSpace and crowd: a linked ghost pair passes; solid people, a half-hearted ghost and a ghost with a third are flagged', () => {
  const two = (rule, a, b) => run(rule, frame([P(Object.assign({ id: 'a', x: 3 }, a)), P(Object.assign({ id: 'b', x: 3.1, z: 20.05 }, b))]));
  assert.equal(two('personalSpace', {}, {}).length, 1, 'two solid people 0.1 m apart');
  assert.equal(two('personalSpace', G('a', 'b'), G('b', 'a')).length, 0, 'a ghost pass');
  assert.equal(two('personalSpace', G('a', 'b'), {}).length, 1, 'one solid: flagged');
  assert.equal(two('personalSpace', G('a', 'b', 0.1), G('b', 'a', 0.1)).length, 1, 'ghost 0.1 (nearly solid): flagged');
  assert.equal(two('personalSpace', G('a', 'c'), G('b', 'd')).length, 1, 'ghosts of OTHER pairs: flagged');
  // the crowd rule holds its streak 0.5 s
  const crowd = (a, b) => { const track = E.worldInvariantTracker(); let n = 0; for (let t = 0; t <= 1; t += 0.2) n += run('crowd', frame([P(Object.assign({ id: 'a', x: 3 }, a)), P(Object.assign({ id: 'b', x: 3.05, z: 20.1 }, b))], { t }), { track }).length; return n; };
  assert.ok(crowd({}, {}) > 0, 'solid people drawn through each other');
  assert.equal(crowd(G('a', 'b'), G('b', 'a')), 0, 'a ghost pass');
  assert.ok(crowd(G('a', 'c'), {}) > 0, 'a ghost and a solid third');
  // the life check over records: the same rule
  const recs = (a, b) => [Object.assign({ id: 'a', layer: 'walk', obj: 'person.walker', kind: 'walker', x: 3, z: 20, alpha: 1, speed: 1 }, a), Object.assign({ id: 'b', layer: 'walk', obj: 'person.walker', kind: 'walker', x: 3.05, z: 20.02, alpha: 1, speed: 1 }, b)];
  assert.equal(C.worldLifeCrowdCheck(recs({}, {}), {}, 0).filter(v => v.rule === 'overlap').length, 1);
  assert.equal(C.worldLifeCrowdCheck(recs(G('a', 'b'), G('b', 'a')), {}, 0).filter(v => v.rule === 'overlap').length, 0);
  assert.equal(C.worldLifeCrowdCheck(recs(G('a', 'x'), {}), {}, 0).filter(v => v.rule === 'overlap').length, 1, 'a ghost is judged against a third, not skipped as fading');
});

test('ghostFlicker: an alpha step of over 0.12 between frames 1/30 s apart fails; a smooth fade passes', () => {
  const seq = (alphas, dt = 1 / 30) => { const track = E.worldInvariantTracker(); let n = 0; alphas.forEach((al, i) => { n += run('ghostFlicker', frame([P({ id: 'a', alpha: al })], { t: i * dt }), { track }).length; }); return n; };
  assert.equal(seq([1, 0.95, 0.88, 0.8, 0.72, 0.64, 0.56, 0.48, 0.45, 0.5, 0.6, 0.7, 0.8, 0.9, 1]), 0, 'a fade');
  assert.equal(seq([1, 1, 0.45, 0.45]), 1, 'a pop to the ghost');
  assert.equal(seq([0.45, 1]), 1, 'a pop back');
  assert.equal(seq([1, 0.6], 0.2), 0, 'at 5 Hz 0.4 in 0.2 s is 2 a second: smooth');
});
