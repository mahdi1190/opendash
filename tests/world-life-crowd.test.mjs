// The crowd (requirements Y4, A2, A7, A11): people never walk through each other, never stand nose to nose for good, and no
// two look-alikes walk together. Audit of 15 Oct (bug 8): on the canal an elderly walker and a woman were drawn on one spot,
// clones walked side by side and four walked abreast. Causes, all in 79-world-2life.js:
//   - a second top-level _wlfNear(life, x, z, R, fn) replaced the push-apart's _wlfNear(life, a, fn) in the concatenated
//     build, so the push-apart and the following cap never ran (NaN hash cells);
//   - group mates and a dog and its walker were exempt from the push-apart, and a member that found no slot was put on its
//     leader's own spot (and a dog whose lead found no room, on its walker);
//   - a still mover's turn to its point of interest fought its turn to set off, holding it facing away at no speed;
//   - variants avoided only the last three arrivals of the same population.
// worldLifeCrowdCheck is the check (also for the motion tool and the invariants).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';

const APP = new URL('../src/app/', import.meta.url);
const src = name => readFileSync(new URL(name, APP), 'utf8');

test('the build has no two top-level functions of one name (the later one silently replaces the earlier)', () => {
  const seen = new Map(), dup = [];
  for (const f of readdirSync(APP).filter(n => n.endsWith('.js')).sort()) {
    for (const m of src(f).matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)) {
      if (seen.has(m[1])) dup.push(`${m[1]}: ${seen.get(m[1])} and ${f}`); else seen.set(m[1], f);
    }
  }
  assert.deepEqual(dup, []);
});

const LIFE_FILES = ['79-world-1nav.js', '79-world-2brains.js', '79-world-2traffic.js', '79-world-2life.js'];
function load() {
  const body = LIFE_FILES.map(src).join('\n;\n');
  const names = new Set();
  for (const m of body.matchAll(/^(?:async\s+)?function\s+([A-Za-z_]\w*)\s*\(/gm)) names.add(m[1]);
  for (const m of body.matchAll(/^(?:const|let|var)\s+([A-Za-z_]\w*)\s*=/gm)) names.add(m[1]);
  const tail = '\nreturn { ' + [...names].map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ') + ' };';
  return new vm.Script('(function () {\n' + body + tail + '\n})', { filename: 'life-crowd-bundle.js' }).runInThisContext()();
}
const cam = { fov: 64, eye: 1.65, horizon: 470, water: -0.4 };
function run(C, world, seconds) {
  const nav = C.worldNavBuild(world), life = C.worldLifeInit(world, nav, 0, { warm: false }), mem = {}, by = {}, ex = {};
  for (let i = 1; i <= seconds * 15; i++) {
    C.worldLifeTick(life, 1 / 15);
    if (i % 3) continue;
    for (const v of C.worldLifeCrowdCheck(C.worldAgents(life), mem, i / 15)) { by[v.rule] = (by[v.rule] || 0) + 1; (ex[v.rule] = ex[v.rule] || []).length < 5 && ex[v.rule].push(`t ${(i / 15).toFixed(1)} ${v.msg}`); }
  }
  return { by, ex, life };
}

test('the push-apart and the following cap really run: two-way traffic on a 3 m path, nobody through anybody', () => {
  const C = load();
  const world = { seed: 3, cam, surfaces: [{ id: 'p', kind: 'path', path: [[0, 4], [0, 200]], width: 3 }], entities: [],
    life: [{ who: 'walkers', on: 'p', rate: '14/min', mix: { stroll: 0.4, brisk: 0.3, 'dog-walker': 0.2, couple: 0.1 }, edges: ['S', 'N'] }] };
  const r = run(C, world, 240);
  assert.ok(r.life.agents.length > 6, `a crowd (${r.life.agents.length})`);
  // (the life files alone have no object library: one look for everybody, so clones are not judged here)
  assert.equal(r.by.overlap || 0, 0, 'overlaps: ' + (r.ex.overlap || []).join('; '));
  assert.equal(r.by.standoff || 0, 0, 'standoffs: ' + (r.ex.standoff || []).join('; '));
});

test('a mover that wants to move is never held by its look turn (it sets off away from what it looked at)', () => {
  const C = load();
  const world = { seed: 1, cam, surfaces: [{ id: 'p', kind: 'path', path: [[0, 4], [0, 100]], width: 3 }], entities: [], life: [] };
  const nav = C.worldNavBuild(world), life = C.worldLifeInit(world, nav, 0, { warm: false });
  const a = { id: 'x', layer: 'walk', speed: 0, step: null, dir: [0, 1], spd: 1.2, lookAt: [10, 40], x: 0, z: 40, heading: Math.PI, brain: { turn: 0.5 } };
  C._wlfLookTurn(life, a, 1 / 15);
  assert.equal(a.heading, Math.PI, 'the look turn left the heading alone');
  a.dir = null;
  C._wlfLookTurn(life, a, 1 / 15);
  assert.notEqual(a.heading, Math.PI, 'a still mover with nowhere to go does turn to look');
});

test('A11: a newcomer takes the look least worn round it (8 variants, 7 worn nearby: the 8th)', () => {
  const C = load();
  const world = { seed: 5, cam, surfaces: [{ id: 'p', kind: 'path', path: [[0, 4], [0, 100]], width: 3 }], entities: [], life: [] };
  const nav = C.worldNavBuild(world), life = C.worldLifeInit(world, nav, 0, { warm: false });
  for (let v = 0; v < 7; v++) life.agents.push({ id: 'w' + v, obj: 'person.walker', variant: v, x: v * 0.8, z: 20, dead: false });
  for (let k = 0; k < 6; k++) {
    let s = 77 + k;
    const a = { id: 'n' + k, obj: 'person.walker', info: { variants: 8 }, kb: null, kind: 'walker', cls: 'stroll', brain: {}, leader: null, x: 1, z: 21, gait: 1,
      rng: () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296) };
    C._wlfVariant(life, a, null);
    assert.equal(a.variant, 7, `newcomer ${k} took variant ${a.variant}`);
  }
});

test('A11: the outfit is the least worn among the same object and variant alive (no two alike while combos are free)', () => {
  const C = load();
  const world = { seed: 9, cam, surfaces: [{ id: 'p', kind: 'path', path: [[0, 4], [0, 100]], width: 3 }], entities: [], life: [] };
  const nav = C.worldNavBuild(world), life = C.worldLifeInit(world, nav, 0, { warm: false });
  const looks = new Set();
  for (let k = 0; k < 40; k++) {
    let s = 300 + k;
    const a = { id: 'n' + k, obj: 'person.walker', info: { variants: 8 }, kb: null, kind: 'walker', cls: 'stroll', brain: {}, leader: null, x: (k % 3), z: 10 + k, gait: 1, dead: false,
      rng: () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296) };
    C._wlfVariant(life, a, null);
    const key = a.variant + '/' + a.outfit;
    assert.ok(!looks.has(key), `walker ${k} repeats look ${key}`);
    looks.add(key); life.agents.push(a);
  }
});

test('worldLifeCrowdCheck flags bodies through each other, a standoff over 6 s and look-alikes together over 8 s', () => {
  const C = load();
  const P = (id, x, z, o = {}) => Object.assign({ id, obj: 'person.walker', variant: 1, layer: 'walk', kind: 'walker', cls: 'stroll', x, z, vx: 0, vz: 1, speed: 1, alpha: 1 }, o);
  assert.equal(C.worldLifeCrowdCheck([P('a', 0, 10), P('b', 0.2, 10, { variant: 2 })], {}, 0)[0].rule, 'overlap');
  assert.equal(C.worldLifeCrowdCheck([P('a', 0, 10, { alpha: 0.5 }), P('b', 0.2, 10, { variant: 2 })], {}, 0).length, 0, 'fading in: not yet a body');
  const mem = {}; let got = [];
  for (let t = 0; t <= 9; t += 0.5) got = got.concat(C.worldLifeCrowdCheck([P('a', 0, 10 + t), P('b', 1, 10 + t)], mem, t));
  assert.deepEqual(got.map(v => v.rule), ['clone']);
  const m2 = {}; let g2 = [];
  for (let t = 0; t <= 7; t += 0.5) g2 = g2.concat(C.worldLifeCrowdCheck([P('a', 0, 10, { wants: true, speed: 0, vz: 0 }), P('b', 0, 10.9, { variant: 3, wants: true, speed: 0, vz: 0 })], m2, t));
  assert.deepEqual(g2.map(v => v.rule), ['standoff']);
});

/* ---------- the three test scenes, as the page runs them (the host sim: warm-up, then whole ticks) ---------- */
let ENGINE = null;
async function engine() {
  if (ENGINE) return ENGINE;
  const { loadWorld } = await import(new URL('../tools/lib/world/load.mjs', import.meta.url).href);
  const E = loadWorld();
  const E2 = loadWorld(undefined, { extra: 'return { packs: typeof _scPacks === "undefined" ? {} : _scPacks };' });
  ENGINE = { E, packs: E2.packs };
  return ENGINE;
}
// measured over 370 s on 15 Oct before the fix: overlap frames canal 177, pond 215, Kelham 889; after: 4, 3, 1.
// Clones: the outfit is drawn since 15 Oct (verify round 1), so a look is (object, variant, outfit) and life picks the least
// worn outfit; no clone pair is allowed any more.
const LIMIT = { overlap: 10, standoff: 2, clone: 0 };
for (const id of ['fleet-canal-2-w3', 'fleet-pond-2-w3', 'sheffield-kelham-1-w3']) {
  test(`${id}: 300 s of the page's life with no crowd faults over the limits ${JSON.stringify(LIMIT)}`, async () => {
    const { E, packs } = await engine();
    const it = (packs['world-test'] || []).find(x => x.id === id);
    const spec = E.worldHostSpec ? E.worldHostSpec(it) || it.worldSpec : it.worldSpec;
    const world = E.worldBuild(spec, { season: 'autumn' });
    const sim = E.worldHostSim(world, { ms: Date.UTC(2026, 9, 15, 12, 0, 0) }), life = sim.life;
    const mem = {}, by = {}, ex = [];
    for (let i = 1; i <= 300 * 15; i++) {
      E.worldLifeTick(life, 1 / 15);
      if (i % 3) continue;
      for (const v of E.worldLifeCrowdCheck(E.worldAgents(life), mem, i / 15)) { by[v.rule] = (by[v.rule] || 0) + 1; if (ex.length < 6) ex.push(`t ${(i / 15).toFixed(1)} ${v.rule}: ${v.msg}`); }
    }
    for (const [k, n] of Object.entries(LIMIT)) assert.ok((by[k] || 0) <= n, `${id}: ${by[k]} ${k} (limit ${n}): ${ex.join('; ')}`);
  });
}
