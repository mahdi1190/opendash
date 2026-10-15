// World engine v3.1, package `systems`: the runtime (docs/dev/WORLD_ENGINE.md 11; WORLD_ENGINE_REQUIREMENTS.md G1-G5, G7, G12,
// Y1, Y2, Y7, M8). The bundle here is the scene sources + 79-world-0core.js + the three systems files, so these tests do not
// depend on the other packages' work in progress; one test loads the whole world bundle (tools/lib/world/load.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { sceneSourceFiles } from '../tools/lib/scene-page.mjs';
import { loadWorld } from '../tools/lib/world/load.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MINE = ['79-world-0core.js', '79-world-0sys.js', '79-world-6particles.js', '79-world-6wind.js'];
function bundle(extra = '') {
  const files = [...sceneSourceFiles(ROOT).filter(f => !/79-world-/.test(f)), ...MINE.map(f => join(ROOT, 'src', 'app', f)).filter(existsSync)];
  const names = new Set(['sceneCamera', 'sceneLightV2', 'sceneSeason']);
  for (const f of files) {
    if (!/79-world-/.test(f)) continue;
    const s = readFileSync(f, 'utf8');
    for (const m of s.matchAll(/^function\s+(world[A-Za-z0-9_]*)\s*\(/gm)) names.add(m[1]);
    for (const m of s.matchAll(/^(?:const|let|var)\s+(WORLD_[A-Z0-9_]+)\s*=/gm)) names.add(m[1]);
  }
  const body = files.map(f => readFileSync(f, 'utf8')).join('\n;\n') + '\n;\n' + extra;
  const tail = `\nreturn { ${[...names].map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ')} };`;
  return new vm.Script('(function () {\n' + body + tail + '\n})', { filename: 'world-sys-bundle.js' }).runInThisContext()();
}
const W = bundle();
const TICK = 1 / 30;

const SPEC = () => ({ v: 3, place: { lat: 51.279, lon: -0.836, region: 'hampshire' }, camera: { eye: 1.65, fov: 62, horizon: 455, heading: 70 },
  surfaces: [
    { id: 'cut', kind: 'water', water: 'canal', poly: [[-30, 8], [6, 8], [40, 140], [10, 160]], shallow: 0.6 },
    { id: 'tow', kind: 'towpath', path: [[8, 5], [14, 60], [30, 160]], width: 2.4 },
    { id: 'verge', kind: 'grass', poly: [[10, 5], [40, 5], [60, 160], [32, 160]] } ],
  entities: [
    { obj: 'boat.narrowboat', at: [-2, 20], facing: 20, attach: 'water', id: 'nb1' },
    { obj: 'tree.canal-willow', at: [25, 30], id: 't1' }, { obj: 'tree.birch', at: [30, 50], id: 't2' },
    { obj: 'street.bench', at: [17, 22], facing: 250, id: 'bench-1' },
    { cluster: 'plant.reed', on: 'cut', edge: true, n: 30, seed: 3 } ],
  backdrop: { style: 'canal-wooded' }, seed: 2 });
const OCT = Date.UTC(2026, 9, 20, 14, 0);
const defsOf = (...ids) => ids.map(id => ({ id, phase: 'move', update() {} }));

/* ---------- order (G1, Y1) ---------- */
test('the order is total and stable: phases first, then after / before, then id', () => {
  const defs = [
    { id: 'c', phase: 'move', after: ['a'] }, { id: 'a', phase: 'move' }, { id: 'b', phase: 'move', before: ['a'] }, { id: 'z', phase: 'time' },
    { id: 'r', phase: 'render', after: ['q'] }, { id: 'q', phase: 'render' }, { id: 'x', phase: 'brain', after: ['r'] }, { id: 'm', phase: 'anim', after: ['missing-optional'] },
    { id: 'k', phase: 'fx', after: ['wind-ish'] }, { id: 'wind-ish', phase: 'fx', before: ['j'] }, { id: 'j', phase: 'fx' } ];
  const r = W.worldSystemOrder(defs);
  assert.deepEqual(r.order.map(d => d.id), ['z', 'x', 'b', 'a', 'c', 'm', 'wind-ish', 'j', 'k', 'q', 'r']);
  assert.ok(r.problems.some(p => p.rule === 'orderImpossible' && p.id === 'x'), 'a brain system cannot run after a render one');
  assert.ok(!r.problems.some(p => p.id === 'm'), 'an optional dependency that is not loaded is silent');
  // the same set registered in any order gives the same order
  let s = 12345;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 25; i++) {
    const sh = defs.slice().sort(() => rnd() - 0.5);
    assert.deepEqual(W.worldSystemOrder(sh).order.map(d => d.id), r.order.map(d => d.id));
  }
  // every after / before between systems of one phase is honoured
  const pos = new Map(r.order.map((d, i) => [d.id, i])), byId = new Map(r.order.map(d => [d.id, d]));
  const same = (d, o) => byId.has(o) && byId.get(o).phase === d.phase;
  for (const d of r.order) {
    for (const a of d.after) if (same(d, a)) assert.ok(pos.get(a) < pos.get(d.id), `${d.id} after ${a}`);
    for (const b of d.before) if (same(d, b)) assert.ok(pos.get(d.id) < pos.get(b), `${d.id} before ${b}`);
  }
});

test('a cycle is broken deterministically at the smallest id; every system runs exactly once', () => {
  const r = W.worldSystemOrder([{ id: 'q', phase: 'fx', after: ['p'] }, { id: 'p', phase: 'fx', after: ['q'] }, { id: 'o', phase: 'fx', after: ['q'] }]);
  assert.deepEqual(r.order.map(d => d.id), ['p', 'q', 'o']);
  assert.ok(r.problems.some(p => p.rule === 'cycle'));
});

test('bad defs are refused or repaired, never half-registered (the engine knows what is weird)', () => {
  assert.equal(W.worldSystem({ id: 'test-bad-phase', phase: 'physics', update() {} }), null);
  assert.equal(W.worldSystem({ phase: 'fx', update() {} }), null);
  assert.equal(W.worldSystem(null), null);
  const pr = W.worldSystemProblems();
  assert.ok(pr.some(p => p.rule === 'badPhase' && p.id === 'test-bad-phase'));
  assert.ok(!W.worldSystemList().some(s => s.id === 'test-bad-phase'));
  const r = W.worldSystemOrder([{ id: 'odd', phase: 'fx', rate: 7, update() {} }, { id: 'neg', phase: 'fx', rate: -2 }, { id: 'f', phase: 'render', rate: 'frame' },
    { id: 'comp', phase: 'fx', components: { read: ['transfrom'] } }, { id: 'ev', phase: 'fx', onEvent: { lightson() {} } },
    { id: 'w1', phase: 'anim', components: { write: ['anim'] } }, { id: 'w2', phase: 'anim', components: { write: ['anim'] } }]);
  const by = Object.fromEntries(r.order.map(d => [d.id, d]));
  assert.equal(by.odd.rate, 6); assert.equal(by.neg.rate, 30); assert.equal(by.f.rate, 'frame');
  for (const rule of ['badRate', 'unknownComponent', 'unknownEvent', 'writeRace']) assert.ok(r.problems.some(p => p.rule === rule), rule);
});

test('Y2: the built-in systems are registered through the same interface, in phase order', () => {
  const list = W.worldSystemList(), ids = list.map(s => s.id);
  for (const id of ['time', 'attach', 'wind', 'particles', 'lod']) assert.ok(ids.includes(id), id);
  const ph = W.WORLD_PHASES, at = id => ph.indexOf(list.find(s => s.id === id).phase);
  for (let i = 1; i < list.length; i++) assert.ok(ph.indexOf(list[i - 1].phase) <= ph.indexOf(list[i].phase), 'phase order');
  assert.ok(at('time') < at('attach') && at('attach') < at('wind') && at('wind') <= at('lod'));
  assert.ok(ids.indexOf('wind') < ids.indexOf('particles'), 'particles after wind');
  assert.deepEqual([...W.WORLD_PHASES], ['time', 'brain', 'nav', 'move', 'anim', 'attach', 'fx', 'light', 'render']);
  assert.equal(W.WORLD_TICK_HZ, 30); assert.equal(W.WORLD_LOOP_S, 360);
  for (const s of list) { assert.ok(s.budgetMs > 0, s.id); assert.ok(s.rate === 'frame' || 30 % s.rate === 0, s.id); }
});

test('the whole world bundle loads with the systems registered (integration)', () => {
  const F = loadWorld(ROOT);
  assert.equal(typeof F.worldRun, 'function');
  const ids = F.worldSystemList().map(s => s.id);
  for (const id of ['time', 'attach', 'wind', 'particles', 'lod']) assert.ok(ids.includes(id), id);
  assert.deepEqual(F.worldSystemProblems().filter(p => p.rule === 'badPhase' || p.rule === 'cycle'), []);
  // with look's sky loaded the weather is still resolved once from the real inputs (an override, the live sky)
  const world = { place: { lat: 51.279, lon: -0.836 }, cam: { heading: 70 }, seed: 2 }, ms = Date.UTC(2026, 3, 14, 12, 0);
  const snow = F.worldTimeCtx(world, Date.UTC(2026, 0, 14, 12, 0), { wx: 'snow' });
  assert.equal(snow.snowing, true); assert.equal(snow.weather, 'snow');
  const live = F.worldTimeCtx(world, ms, { sky: { ms, lat: 51.279, lon: -0.836, wx: { cond: 'rain', wind: 30, temp: 11, dir: 270 } } });
  assert.deepEqual([live.weather, live.wind.kmh, live.wind.from, live.temp, live.src], ['rain', 30, 270, 11, 'live']);
  assert.ok(F.worldTimeCtx(world, Date.UTC(2026, 6, 15, 12, 0)).sun.alt > 45 && F.worldTimeCtx(world, Date.UTC(2026, 0, 14, 22, 0)).lamps === true);
});

/* ---------- the runner: real time, fixed tick (M8, Y1) ---------- */
function determinismWorld() {
  const world = W.worldBuild(SPEC(), { validate: false });
  world.agents = [{ id: 'w', x: 12, z: 14, y: 0, facing: 10, h: 1.7 }, { id: 'd', x: 12.6, z: 14.5, y: 0, facing: 10, h: 0.5 }];
  const lead = { id: 'lead', obj: 'prop.lead', cls: 'lead', x: 12, z: 14, y: 0.6 };
  world.entities.push(lead);
  W.worldAttach(world, lead, 'w', { dx: 0.3, dy: 0.9 }, { to: 'd', toLocal: { dy: 0.4 } });
  return world;
}
const mover = { id: 'test-move', phase: 'move', components: { write: ['transform'] }, update(world, dt) {
  for (const a of world.agents || []) {
    const r = W.worldRng(world, 'test-move', a);
    a.facing += (r() - 0.5) * 30;
    const f = a.facing * Math.PI / 180, sp = a.id === 'd' ? 1.6 : 1.2;
    a.x += Math.sin(f) * sp * dt; a.z += Math.cos(f) * sp * dt;
  }
} };
function snapState(world) {
  const P = W.worldParticles(world);
  return JSON.stringify({ t: world.t, agents: world.agents.map(a => [a.x, a.z, a.facing]), lead: world.entities.find(e => e.id === 'lead').ends,
    sway: world.entities.filter(e => e.sway).slice(0, 8).map(e => [e.sway.deg, e.sway.dir]), wind: world.wind && [world.wind.dir, world.wind.s],
    parts: P.list.map(p => [p.kind, p.x, p.y, p.z]), lod: world.entities.map(e => e.lod) });
}
function runAt(fps, ticks) {
  const world = determinismWorld(), snaps = new Map();
  const probe = { id: 'test-probe', phase: 'render', after: ['lod'], update(w) { snaps.set(w.tick, snapState(w)); } };
  const r = W.worldRun(world, { ms: OCT, extra: [mover, probe], deterministic: true });
  let frames = 0;
  while (r.tick < ticks) { r.step(1 / fps); frames++; }
  return { snaps, frames, r };
}

test('a 60 fps and a 23 fps driver give identical state at equal scene time', () => {
  const a = runAt(60, 300), b = runAt(23, 300);
  assert.ok(a.frames > b.frames * 2, 'the drivers really ran at different frame rates');
  let n = 0;
  for (let k = 1; k <= 300; k++) {
    assert.ok(a.snaps.has(k) && b.snaps.has(k), 'every tick ran once in both: ' + k);
    assert.equal(a.snaps.get(k), b.snaps.get(k), 'state differs at tick ' + k);
    n++;
  }
  assert.equal(n, 300);
  assert.ok(JSON.parse(a.snaps.get(300)).parts.length > 0, 'the comparison included live particles (autumn, wind)');
  assert.ok(Math.abs(a.r.t - 300 / 30) < 1e-9 && a.r.alpha >= 0 && a.r.alpha < 1);
});

test('pause 10 s then resume: no jump (step and frame drivers); a long gap is absorbed, never replayed', () => {
  const world = { seed: 3, agents: [{ id: 'm', x: 0, z: 10, y: 0, facing: 90 }] };
  const steady = { id: 'test-steady', phase: 'move', update(w, dt) { w.agents[0].x += 1.5 * dt; } };
  const r = W.worldRun(world, { ms: OCT, systems: ['time', steady] });
  for (let i = 0; i < 120; i++) r.step(1 / 60);
  const t0 = r.tick, x0 = world.agents[0].x;
  r.pause();
  for (let i = 0; i < 600; i++) assert.equal(r.step(1 / 60), 0);
  assert.equal(r.tick, t0); assert.equal(world.agents[0].x, x0);
  r.resume();
  assert.ok(r.step(10) <= 1, 'the first step after resume advances at most one tick');
  assert.ok(world.agents[0].x - x0 <= 1.5 * TICK + 1e-9, 'no jump in position');
  // the timestamp driver: the hidden time is never counted
  const r2 = W.worldRun({ seed: 1 }, { ms: OCT, systems: ['time'] });
  let ms = 1000;
  for (let i = 0; i < 60; i++) { ms += 1000 / 60; r2.frame(ms); }
  const k0 = r2.tick;
  r2.pause(); ms += 10000; r2.frame(ms); r2.resume();
  assert.equal(r2.frame(ms + 10000), 0, 'the first frame after resume advances nothing');
  assert.ok(r2.frame(ms + 10000 + 1000 / 60) <= 1);
  assert.ok(r2.tick - k0 <= 1);
  // a 10 s hitch without a pause: at most 8 sub-steps, the rest absorbed
  const r3 = W.worldRun({ seed: 1 }, { ms: OCT, systems: ['time'] });
  assert.equal(r3.step(10), 8);
  assert.ok(r3.stats().dropped > 9.5);
});

test('advance(sec) carries the remainder: sub-tick steps never drift', () => {
  const r = W.worldRun({ seed: 1 }, { ms: OCT, systems: ['time'] });
  for (let i = 0; i < 40; i++) r.advance(0.25);
  assert.equal(r.tick, 300);
  for (let i = 0; i < 70; i++) r.advance(1 / 7);
  assert.equal(r.tick, 600);
});

test('real time, not frames: equal real time gives equal scene time at any frame rate', () => {
  for (const fps of [24, 30, 60, 144]) {
    const r = W.worldRun({ seed: 1 }, { ms: OCT, systems: ['time'] });
    for (let i = 0; i < fps * 4; i++) r.step(1 / fps);
    assert.ok(Math.abs(r.t + r.alpha * TICK - 4) < 1.5 * TICK, fps + ' fps: scene time ' + r.t);
  }
});

/* ---------- error isolation (G8) ---------- */
test('a throwing system is disabled and logged; the rest keep running', () => {
  const runs = { before: 0, bad: 0, after: 0, ev: 0 };
  const sys = [
    { id: 'test-before', phase: 'brain', update() { runs.before++; } },
    { id: 'test-bad', phase: 'move', update() { if (++runs.bad === 5) throw new Error('boom'); } },
    { id: 'test-after', phase: 'move', after: ['test-bad'], update() { runs.after++; } },
    { id: 'test-badinit', phase: 'fx', init() { throw new Error('no init'); }, update() { throw new Error('never runs'); } },
    { id: 'test-badev', phase: 'fx', onEvent: { scare() { runs.ev++; throw new Error('bad handler'); } }, update() {} },
  ];
  const world = { seed: 1 };
  const r = W.worldRun(world, { ms: OCT, systems: ['time', ...sys] });
  r.advance(1);
  world.bus.emit('scare', { id: 'dog' });
  world.bus.emit('scare', { id: 'dog' });
  r.advance(1);
  assert.equal(runs.before, 60); assert.equal(runs.after, 60); assert.equal(runs.bad, 5); assert.equal(runs.ev, 1);
  const st = Object.fromEntries(r.stats().systems.map(s => [s.id, s]));
  assert.equal(st['test-bad'].enabled, false); assert.match(st['test-bad'].error, /boom/);
  assert.equal(st['test-badinit'].enabled, false); assert.match(st['test-badinit'].error, /init/);
  assert.equal(st['test-badev'].enabled, false); assert.match(st['test-badev'].error, /onEvent\.scare/);
  assert.equal(st.time.enabled, true); assert.equal(st['test-after'].enabled, true);
  assert.equal(r.log.filter(l => l.kind === 'error').length, 3);
});

/* ---------- budgets (Y7) and profiling (G12) ---------- */
test('an over-budget system halves its rate, then degrades, then recovers', () => {
  let clock = 0, base = 3, level = 0;
  const levels = [];
  const heavy = { id: 'test-heavy', phase: 'fx', budgetMs: 1, update() { clock += base * [1, 0.5, 0.35, 0.25][level]; }, degrade(l) { level = l; levels.push(l); } };
  const light = { id: 'test-light', phase: 'fx', budgetMs: 1, update() { clock += 0.01; } };
  const r = W.worldRun({ seed: 1 }, { systems: [heavy, light], now: () => clock });
  for (let i = 0; i < 120; i++) r.step(TICK);
  let s = r.stats().systems.find(x => x.id === 'test-heavy');
  assert.equal(s.rate, 15, 'the rate was halved'); assert.equal(s.level, 1); assert.deepEqual(levels, [1]);
  assert.ok(s.p50 > 1 && s.p95 >= s.p50, 'p50 / p95 per system (G12)');
  assert.equal(r.stats().systems.find(x => x.id === 'test-light').rate, 30, 'a cheap system is untouched');
  assert.ok(r.log.some(l => l.kind === 'degrade' && l.sys === 'test-heavy'));
  base = 0.1;   // the load goes away
  for (let i = 0; i < 400; i++) r.step(TICK);
  s = r.stats().systems.find(x => x.id === 'test-heavy');
  assert.equal(s.rate, 30, 'recovered to the full rate'); assert.equal(s.level, 0); assert.deepEqual(levels, [1, 0]);
  assert.ok(r.log.some(l => l.kind === 'recover' && l.sys === 'test-heavy'));
  // deterministic mode (stills, captures): measured, never acted on
  clock = 0; base = 3; level = 0;
  const r2 = W.worldRun({ seed: 1 }, { systems: [heavy], now: () => clock, deterministic: true });
  for (let i = 0; i < 200; i++) r2.step(TICK);
  assert.equal(r2.stats().systems[0].rate, 30);
});

test('per-system profile of the built-ins on a real world stays inside the budgets (G12, 1.2x, median of 3)', () => {
  const p50s = {};
  for (let k = 0; k < 3; k++) {
    const world = W.worldBuild(SPEC(), { validate: false });
    const r = W.worldRun(world, { ms: OCT });
    for (let i = 0; i < 240; i++) r.step(1 / 60);
    for (const s of r.stats().systems) (p50s[s.id] = p50s[s.id] || []).push(s.p50 / s.budgetMs);
  }
  for (const [id, v] of Object.entries(p50s)) { v.sort((a, b) => a - b); assert.ok(v[1] < 1.2, `${id}: median p50 at ${Math.round(v[1] * 100)} % of its budget`); }
});

/* ---------- random streams (G4) ---------- */
test('adding one entity leaves the other entities\' random sequences unchanged', () => {
  const seq = (w, sys, id, n = 12) => { const r = W.worldRng(w, sys, id, { fresh: true }); return Array.from({ length: n }, () => r()); };
  const A = W.worldBuild(SPEC(), { validate: false });
  const s2 = SPEC();
  s2.entities.unshift({ obj: 'street.bench', at: [35, 60], facing: 90 });           // an unnamed entity, first in the list
  s2.entities.splice(2, 0, { obj: 'tree.birch', at: [36, 80], id: 'new-tree' });   // a named one in the middle
  const B = W.worldBuild(s2, { validate: false });
  // (cluster members are left out: their ids and scatter come from the core's list index, a gap reported to the sense package)
  for (const e of A.entities.filter(x => x.id != null && !/-plant\.reed-/.test(x.id))) {
    const f = B.entities.find(x => x.id === e.id);
    for (const sys of ['anim', 'life', 'particles']) assert.deepEqual(seq(B, sys, f), seq(A, sys, e), `${e.id} / ${sys}`);
  }
  // unnamed entities are keyed by object and position, so they keep their streams too
  const a2 = { seed: 5, entities: [{ obj: 'bird.mallard', x: 1, z: 9 }, { obj: 'bird.mallard', x: 3, z: 12 }] };
  const b2 = { seed: 5, entities: [{ obj: 'bird.coot', x: 2, z: 10 }, ...a2.entities.map(e => Object.assign({}, e))] };
  assert.deepEqual(seq(b2, 'anim', b2.entities[1]), seq(a2, 'anim', a2.entities[0]));
  assert.notDeepEqual(seq(a2, 'anim', a2.entities[0]), seq(a2, 'anim', a2.entities[1]), 'two ducks never share a stream');
  assert.notDeepEqual(seq(a2, 'anim', 'x'), seq(a2, 'life', 'x'), 'systems have independent streams');
  assert.notDeepEqual(seq(a2, 'anim', 'x'), seq({ seed: 6 }, 'anim', 'x'), 'the world seed matters');
  // the cached stream continues; a fresh one restarts
  const w = { seed: 9 }, r1 = W.worldRng(w, 'anim', 'q'), v1 = r1(), v2 = W.worldRng(w, 'anim', 'q')();
  assert.notEqual(v1, v2); assert.equal(W.worldRng(w, 'anim', 'q', { fresh: true })(), v1);
  let m = 0; const rr = W.worldRng(w, 'stat', 1, { fresh: true }); for (let i = 0; i < 20000; i++) m += rr();
  assert.ok(Math.abs(m / 20000 - 0.5) < 0.01);
});

/* ---------- spatial index (G3) ---------- */
test('grid queries equal a brute-force scan (adds, moves, removes, big items, any cell size)', () => {
  for (const cell of [0.5, 2, 10]) {
    const r = W.worldRng({ seed: 11 }, 'test', 'grid' + cell, { fresh: true }), G = W.worldGrid(cell), items = new Map();
    for (let i = 0; i < 600; i++) { const it = { x: r.range(-100, 100), z: r.range(-20, 180), r: r() < 0.1 ? 0 : r.range(0, 3) }; items.set('i' + i, it); G.add('i' + i, it.x, it.z, it.r); }
    for (let i = 0; i < 4; i++) { const it = { x: r.range(-50, 50), z: r.range(0, 100), r: r.range(200, 400) }; items.set('big' + i, it); G.add('big' + i, it.x, it.z, it.r); }
    for (let i = 0; i < 300; i++) { const id = 'i' + r.int(600); if (!items.has(id)) continue; const it = items.get(id); it.x += r.range(-8, 8); it.z += r.range(-8, 8); if (r() < 0.3) it.r = r.range(0, 5); G.move(id, it.x, it.z, it.r); }
    for (let i = 0; i < 60; i++) { const id = 'i' + r.int(600); items.delete(id); G.remove(id); }
    assert.equal(G.size(), items.size);
    for (let q = 0; q < 300; q++) {
      const x = r.range(-120, 120), z = r.range(-40, 200), rad = q % 50 === 0 ? 900 : r.range(0, 30);
      const want = [...items].filter(([, it]) => Math.hypot(it.x - x, it.z - z) <= rad + it.r).map(([id]) => id).sort();
      const got = G.list(x, z, rad).sort();
      assert.deepEqual(got, want, `cell ${cell}, query ${q}`);
      assert.equal(G.query(x, z, rad), want.length);
    }
    let seen = 0;
    G.query(0, 80, 1000, () => { seen++; return false; });
    assert.equal(seen, 1, 'fn returning false stops the query');
  }
});

/* ---------- scene graph (G2) ---------- */
test('moving a parent moves its children: a person on a moving boat deck, a lead between walker and dog, a lamp on a bridge', () => {
  const boat = { id: 'boat', obj: 'boat.narrowboat', cls: 'boat', x: 0, z: 20, y: -0.3, facing: 90 };
  const bridge = { id: 'bridge', obj: 'structure.footbridge', cls: 'walkway', x: 5, z: 40, y: 0, facing: 0 };
  const lamp = { id: 'lamp', obj: 'street.lamp', cls: 'lamp', x: 6, z: 40, y: 1.2, facing: 0 };
  const person = { id: 'p', obj: 'person.walker', cls: 'person', x: 0, z: 20, y: 0 };
  const cap = { id: 'cap', obj: 'prop.cap', cls: 'prop', x: 0, z: 20, y: 0 };
  const lead = { id: 'lead', obj: 'prop.lead', cls: 'lead', x: 0, z: 0, y: 0 };
  const world = { seed: 1, entities: [boat, bridge, lamp, cap, person, lead], agents: [{ id: 'w', x: 2, z: 10, y: 0, heading: 0 }, { id: 'd', x: 3, z: 11, y: 0, heading: 0 }] };
  // child before parent on purpose: the attach system resolves parents first anyway
  assert.ok(W.worldAttach(world, cap, 'p', { dy: 1.7 }));
  assert.ok(W.worldAttach(world, person, 'boat', { dz: 3, dx: -0.4, dy: 1.1 }));
  assert.ok(W.worldAttach(world, lead, 'w', { dx: 0.3, dy: 0.9 }, { to: 'd', toLocal: { dy: 0.4 } }));
  assert.ok(W.worldAttach(world, lamp, 'bridge'));   // keeps its place on the bridge
  const lampAt = [lamp.x, lamp.y, lamp.z];
  const drive = { id: 'test-drive', phase: 'move', update(w, dt) {
    boat.x += 0.8 * dt; boat.facing += 4 * dt;                // the boat moves and turns
    w.agents[1].x += 1.4 * dt; w.agents[1].z += 0.6 * dt;     // the dog runs off
  } };
  const r = W.worldRun(world, { ms: OCT, systems: ['time', drive, 'attach'] });
  r.advance(3);
  const f = boat.facing * Math.PI / 180, ex = boat.x + 3 * Math.sin(f) - 0.4 * Math.cos(f), ez = boat.z + 3 * Math.cos(f) + 0.4 * Math.sin(f);
  assert.ok(Math.abs(person.x - ex) < 1e-9 && Math.abs(person.z - ez) < 1e-9, 'the person rides the deck');
  assert.ok(Math.abs(person.y - (boat.y + 1.1)) < 1e-9 && Math.abs(person.facing - boat.facing) < 1e-9);
  assert.ok(Math.abs(cap.x - person.x) < 1e-9 && Math.abs(cap.y - (person.y + 1.7)) < 1e-9, 'nested children follow in the same tick');
  const d = world.agents[1];
  assert.ok(Math.hypot(lead.ends[1][0] - d.x, lead.ends[1][2] - d.z) < 1e-9 && Math.abs(lead.ends[1][1] - 0.4) < 1e-9, 'the lead ends at the dog');
  assert.ok(Math.abs(lead.len - Math.hypot(lead.ends[1][0] - lead.ends[0][0], lead.ends[1][1] - lead.ends[0][1], lead.ends[1][2] - lead.ends[0][2])) < 1e-9);
  assert.deepEqual([lamp.x, lamp.y, lamp.z], lampAt, 'a lamp on a still bridge stays put');
  const R = W.worldResolve(world, cap);
  assert.ok(Math.abs(R.x - cap.x) < 1e-9 && Math.abs(R.y - cap.y) < 1e-9);
  // the bridge moves (a swing bridge): its lamp moves with it
  bridge.x += 2; r.advance(TICK);
  assert.ok(Math.abs(lamp.x - (lampAt[0] + 2)) < 1e-9);
  // a cycle is refused; a gone parent detaches its child (two-anchor things hide), logged
  assert.equal(W.worldAttach(world, boat, 'cap'), null);
  world.agents.splice(1, 1);
  r.advance(0.2);
  assert.equal(lead.hidden, true); assert.equal(lead.parent, null);
  assert.ok(r.log.some(l => l.rule === 'orphan') && r.log.some(l => l.rule === 'cycle'));
});

/* ---------- event bus (G5) ---------- */
test('the bus: standard kinds, isolation of a bad listener, unknown kinds flagged, storms cut, systems subscribe', () => {
  const world = { seed: 1 }, bus = W.worldBus(world);
  assert.equal(world.bus, bus); assert.equal(W.worldBus(world), bus);
  for (const k of ['spawn', 'leave', 'arrive', 'depart', 'board', 'alight', 'sit', 'stand', 'stop', 'go', 'scare', 'strike', 'lightsOn', 'lightsOff', 'weather', 'snowStart', 'snowStop', 'schedule', 'wake'])
    assert.ok(bus.kinds().includes(k), k);
  const got = [];
  bus.on('board', () => { throw new Error('bad'); });
  const off = bus.on('board', e => got.push(e.id));
  bus.once('board', e => got.push('once:' + e.id));
  assert.equal(bus.emit('board', { id: 'a1' }), 2);
  bus.emit('board', { id: 'a2' });
  off(); bus.emit('board', { id: 'a3' });
  assert.deepEqual(got, ['a1', 'once:a1', 'a2']);
  assert.ok(bus.problems.some(p => p.rule === 'listenerError'));
  bus.emit('boarded', {});
  assert.ok(bus.problems.some(p => p.rule === 'unknownEvent' && p.kind === 'boarded'));
  W.worldBusKind('test-custom'); bus.emit('test-custom', {});
  assert.ok(!bus.problems.some(p => p.kind === 'test-custom'));
  bus.on('wake', () => bus.emit('wake', {}));
  bus.emit('wake', {});
  assert.ok(bus.problems.some(p => p.rule === 'busStorm'));
});

test('the time system emits lightsOn at dusk and a subscribed system receives it', () => {
  let on = 0, off = 0;
  const watcher = { id: 'test-lamps', phase: 'light', onEvent: { lightsOn() { on++; }, lightsOff() { off++; } } };
  const world = W.worldBuild(SPEC(), { validate: false });
  const ms0 = Date.UTC(2026, 9, 20, 16, 30);
  const r = W.worldRun(world, { clock: () => ms0 + world.t * 60000, systems: ['time', watcher] });   // one scene second = one minute of sky
  assert.equal(world.time.lamps, false);
  r.advance(60);
  assert.equal(world.time.lamps, true); assert.equal(on, 1); assert.equal(off, 0);
  // when a light system runs, it owns lightsOn / lightsOff: the time system never doubles them
  let on2 = 0;
  const light = { id: 'light', phase: 'light', update() {} }, watch2 = { id: 'test-lamps2', phase: 'light', after: ['light'], onEvent: { lightsOn() { on2++; } } };
  const w2 = W.worldBuild(SPEC(), { validate: false });
  W.worldRun(w2, { clock: () => ms0 + w2.t * 60000, systems: ['time', light, watch2] }).advance(60);
  assert.equal(w2.time.lamps, true); assert.equal(on2, 0);
});

/* ---------- LOD and culling (G7) ---------- */
test('LOD: off-screen and occluded entities are culled, levels by projected size, with hysteresis', () => {
  const cam = W.sceneCamera({ camera: { eye: 1.65, fov: 62, horizon: 455, heading: 0 } });
  const P = (x, z, h = 1.7) => ({ id: 'e' + x + ',' + z, cls: 'person', x, z, y: 0, height: h });
  assert.equal(W.worldLod(P(0, 6), cam).lod, 0);
  assert.equal(W.worldLod(P(0, 60), cam).lod, 1);
  assert.equal(W.worldLod(P(0, 300), cam).lod, 2);
  assert.deepEqual([W.worldLod(P(500, 20), cam).culled, W.worldLod(P(500, 20), cam).reason], [true, 'offscreen']);
  assert.equal(W.worldLod(P(0, -5), cam).reason, 'behind');
  const hz = cam.f * 1.7 / 60;   // the depth where a person is 60 units tall
  const e = P(0, hz);
  let flips = 0, last = W.worldLod(e, cam).lod;
  for (let i = 0; i < 200; i++) { e.z = hz * (1 + 0.05 * Math.sin(i)); const l = W.worldLod(e, cam).lod; if (l !== last) flips++; last = l; }
  assert.ok(flips <= 1, 'no LOD flicker at the boundary: ' + flips);
  // the cull boundary: out at 80 units beyond the frame, back in at 40; a thing jittering between them never flickers
  const b0 = W.worldLod(P(0, 20), cam).box, hw = (b0[2] - b0[0]) / 2, k20 = cam.f / 20;
  const xAt = out => (1600 + out + hw - cam.x0) / k20;   // the x where the box's left edge is `out` units past the right edge
  for (const startOut of [100, 20]) {
    const c = P(xAt(startOut), 20);
    let lc = W.worldLod(c, cam).culled, cf = 0;
    assert.equal(lc, startOut > 80);
    for (let i = 0; i < 200; i++) { c.x = xAt(60 + 18 * Math.sin(i)); const k = W.worldLod(c, cam).culled; if (k !== lc) cf++; lc = k; }
    assert.equal(cf, 0, 'no cull flicker inside the hysteresis band');
  }
  const cw = P(xAt(30), 20);
  W.worldLod(Object.assign(cw, { culled: true, cullReason: 'offscreen' }), cam);
  assert.equal(cw.culled, false, 'back in within 40 units of the frame');
  // occlusion: a building hides a walker fully behind it, not one beside it or in front
  const bld = { id: 'mill', cls: 'building', obj: 'building.mill-red-brick', x: 0, z: 35, y: 0, height: 14, size: { w: 24, d: 10, h: 14 },
    foot: [[-12, 30], [12, 30], [12, 40], [-12, 40]], solidity: 'solid' };
  const occ = W.worldLodOccluders({ entities: [bld] }, cam);
  assert.equal(occ.length, 1);
  assert.deepEqual([W.worldLod(P(0, 50), cam, { occluders: occ }).reason], ['occluded']);
  assert.equal(W.worldLod(P(25, 50), cam, { occluders: occ }).culled, false);
  assert.equal(W.worldLod(P(0, 20), cam, { occluders: occ }).culled, false);
  // update rates: lod 0 every tick, 1 every 2nd, 2 every 4th, culled never
  const due = (lod, culled) => { const x = { id: 'r' + lod, lod, culled }; let n = 0; for (let t = 0; t < 400; t++) if (W.worldLodDue(x, t)) n++; return n; };
  assert.deepEqual([due(0, false), due(1, false), due(2, false), due(0, true)], [400, 200, 100, 0]);
});

test('the lod system culls the statics once and the agents as they move', () => {
  const world = W.worldBuild(SPEC(), { validate: false });
  world.agents = [{ id: 'a', x: 0, z: 30, y: 0, h: 1.7 }, { id: 'b', x: 2000, z: 30, y: 0, h: 1.7 }];
  const r = W.worldRun(world, { ms: OCT, systems: ['time', 'lod'] });
  r.advance(0.2);
  assert.equal(world.agents[0].culled, false); assert.equal(world.agents[1].culled, true);
  assert.ok(world.entities.every(e => Number.isInteger(e.lod) && typeof e.culled === 'boolean'));
  world.agents[1].x = 0; r.advance(0.2);
  assert.equal(world.agents[1].culled, false);
});

/* ---------- the time context (11.11) ---------- */
test('worldTimeCtx: season, sun, lamps, weather, snow and the ONE wind from the place and the date; deterministic', () => {
  const world = W.worldBuild(SPEC(), { validate: false });
  const jul = W.worldTimeCtx(world, Date.UTC(2026, 6, 15, 12, 0));
  assert.equal(jul.season, 'summer'); assert.ok(jul.sun.alt > 45); assert.equal(jul.lamps, false); assert.equal(jul.band, 'day');
  assert.equal(jul.snowing, false); assert.equal(jul.snowDay, false); assert.equal(jul.weather, 'clear'); assert.ok(jul.temp > 15 && jul.temp < 30);
  assert.ok(jul.wind.s >= 0 && jul.wind.dir >= 0 && jul.wind.dir < 360);
  assert.equal(JSON.stringify(W.worldTimeCtx(world, Date.UTC(2026, 6, 15, 12, 0))), JSON.stringify(jul), 'deterministic');
  const jan = W.worldTimeCtx(world, Date.UTC(2026, 0, 14, 22, 0));
  assert.equal(jan.season, 'winter'); assert.equal(jan.lamps, true); assert.equal(jan.band, 'night'); assert.ok(jan.dark > 0.5);
  const snow = W.worldTimeCtx(world, Date.UTC(2026, 0, 14, 12, 0), { wx: 'snow' });
  assert.equal(snow.snowing, true); assert.equal(snow.weather, 'snow'); assert.ok(snow.snowDepth > 0);
  const rain = W.worldTimeCtx(world, Date.UTC(2026, 3, 14, 12, 0), { wx: 'rain' });
  assert.equal(rain.weather, 'rain'); assert.equal(rain.snowing, false);
  // live wind: 30 km/h from the west, camera heading 70: it blows to bearing 90, i.e. 20 degrees right of the view axis
  const live = W.worldTimeCtx(world, Date.UTC(2026, 3, 14, 12, 0), { sky: { ms: Date.UTC(2026, 3, 14, 12, 0), lat: 51.279, lon: -0.836, wx: { cond: 'cloudy', wind: 30, temp: 11, dir: 270 } } });
  assert.equal(live.wind.kmh, 30); assert.equal(live.wind.s, 1.5); assert.equal(live.wind.from, 270); assert.equal(live.wind.dir, 20); assert.equal(live.tempSrc, 'live');
  assert.equal(W.worldTimeCtx(world, Date.UTC(2026, 9, 17, 12, 0)).weekend, true, 'a Saturday');
  assert.equal(W.worldTimeCtx(world, Date.UTC(2026, 9, 19, 12, 0)).weekend, false);
  // the seeded wind: calm days exist, it varies by day, nearby scenes agree
  const days = Array.from({ length: 120 }, (_, i) => W.worldTimeCtx(world, Date.UTC(2026, 0, 1 + i, 13, 0)).wind);
  assert.ok(days.some(w => w.s < 0.15) && days.some(w => w.s > 0.8), 'calm and windy days');
  const near = Object.assign({}, world, { place: { lat: 51.3, lon: -0.8 } });
  assert.ok(Math.abs(W.worldTimeCtx(near, Date.UTC(2026, 0, 5, 13, 0)).wind.from - W.worldTimeCtx(world, Date.UTC(2026, 0, 5, 13, 0)).wind.from) < 1, 'nearby scenes share the wind');
  // no place, no time: plain and never wrong (a midsummer noon in central England)
  const bare = W.worldTimeCtx({}, undefined);
  assert.equal(bare.season, 'summer'); assert.equal(bare.lamps, false);
});

test('worldTimeCtx reads look\'s worldSkyOf when it is loaded (and never recurses through it)', () => {
  const W2 = bundle('function worldSkyOf(c) { var inner = worldTimeCtx({ place: { lat: c.lat, lon: c.lon } }, c.ms); return { alt: 7.5, az: 250, moon: { alt: 3, az: 90, illum: 0.5 }, dark: 0.1, cover: 0.6, lamps: false, localHour: 18, weekday: 3, morning: false, innerAlt: inner.sun.alt }; }');
  const c = W2.worldTimeCtx({ place: { lat: 51.3, lon: -0.8 }, cam: { heading: 200 } }, Date.UTC(2026, 9, 20, 17, 0));
  assert.equal(c.sun.alt, 7.5); assert.equal(c.sun.az, 250); assert.equal(c.sun.rel, 50); assert.equal(c.band, 'golden'); assert.equal(c.cover, 0.6);
  assert.equal(c.moon.illum, 0.5); assert.equal(c.dow, 3);
});
