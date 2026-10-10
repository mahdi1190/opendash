// World engine v3, package render: the host and the compositor's pure part (docs/dev/WORLD_ENGINE.md 2.8, 11.3, 16.1;
// requirements R1, R4, R5, M8, F4, G10, T2). The canvas half is exercised in the browser by `node tools/world.mjs render`.
//
// Two engines are loaded: the real one (every package as it is in the tree) and the same with a small deterministic stub life
// (walkers crossing the view), so render's own mechanics (clock, determinism, continuity) are tested whatever state the life
// package is in.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadScenes, repoRoot } from '../tools/lib/scene-page.mjs';

const NAMES = ['worldHostData', 'worldHostLive', 'worldHostAt', 'worldHostClock', 'worldHostDriver', 'worldHostWorld', 'worldHostSpec', 'worldHostV2Data',
  'worldFrameScene', 'worldFrameAt', 'worldFramePlan', 'worldFramePassOn', 'worldFrameOrder', 'worldOrderNearer', 'worldOrderCheck', 'worldChunks',
  'sceneSvg', 'sceneCompile', 'sceneRenderPasses', '_scPacks', 'WORLD_HOST_MAX_DT', 'OffscreenCanvas'];
const STUB_LIFE = `
function worldNavBuild(world) { return { layers: {}, stub: true }; }
function worldLifeOf(world) { return null; }
function _stubIn(P, x, z) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
function _stubFree(life, x, z) { for (const P of life.solids) if (_stubIn(P, x, z)) return false; return true; }
function _stubSpawn(life, anywhere) {
  const r = life.rnd;
  for (let k = 0; k < 40; k++) {
    const dir = r() < 0.5 ? -1 : 1, z = 10 + r() * 40, x = anywhere ? (r() - 0.5) * 30 : -dir * (z * 0.9 + 5);
    const vx = dir * (0.9 + r() * 0.6), vz = (r() - 0.5) * 0.2, ph = r();
    if (!_stubFree(life, x, z)) continue;
    life.agents.push({ id: 's' + (life.next++), cls: 'person', obj: 'person.walker', variant: 0, x, y: 0, z, vx, vz, layer: 'walk', state: 'walk', phase: ph, born: life.t });
    return;
  }
}
function _stubStep(life, dt) {
  life.t += dt;
  for (const a of life.agents) {
    const nx = a.x + a.vx * dt, nz = Math.max(6, a.z + a.vz * dt);
    if (_stubFree(life, nx, nz)) { a.x = nx; a.z = nz; } else { a.vx = -a.vx; a.vz = -a.vz; }
    a.phase = (a.phase + dt) % 1;
  }
  life.agents = life.agents.filter(a => Math.abs(a.x) < a.z + 8);
  while (life.agents.length < 10) _stubSpawn(life, false);
}
function worldLifeInit(world, nav, t0, opts) {
  opts = opts || {};
  let s = ((((world && world.seed) | 0) * 7919 + 101) >>> 0) || 1;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  // the stub walks round solid footprints (as the real life does through its nav map); it walks through passable ones
  const solids = ((world && world.entities) || []).filter(e => e && e.solidity === 'solid' && Array.isArray(e.foot) && e.foot.length > 2).map(e => e.foot);
  const life = { t: 0, step: 1 / 15, acc: 0, agents: [], rnd, next: 0, solids };
  for (let i = 0; i < 10; i++) _stubSpawn(life, true);
  if (opts.warm !== false) for (let k = 0; k < 360; k++) _stubStep(life, 0.25);
  return life;
}
function worldLifeTick(life, dt) { life.acc += Math.min(dt, 0.5); let n = 0; while (life.acc >= life.step - 1e-12 && n < 8) { life.acc -= life.step; _stubStep(life, life.step); n++; } }
function worldAgents(life) { return life.agents.map(a => Object.assign({}, a)); }
`;
function load(extra = '') {
  const x = 'globalThis.__wh = {' + NAMES.map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ') + '};';
  loadScenes(repoRoot(), { fixtures: false, browser: true, extra: extra + '\n;\n' + x });
  const E = globalThis.__wh;
  delete globalThis.__wh;
  return E;
}
const E = load();            // the real engine
const S = load(STUB_LIFE);   // the same, with the stub life
const IDS = ['fleet-canal-2-w3', 'fleet-pond-2-w3', 'sheffield-kelham-1-w3'];
const specOf = (X, id) => X.worldHostSpec((X._scPacks['world-test'] || []).find(it => it.id === id));
const DATE = Date.UTC(2026, 6, 15, 13, 0, 0);
const FIELDS = ['id', 'cls', 'obj', 'static', 'auto', 'landmark', 'framing', 'x', 'y', 'z', 'facing', 'foot', 'height', 'layer', 'host', 'parent', 'view', 'mirror',
  'box', 'order', 'speed', 'vx', 'vz', 'state', 'born', 'anim', 'sway', 'shadow', 'reflect', 'waterline'];
const pos = (as) => as.map(a => [a.id, Math.round(a.x * 1e6) / 1e6, Math.round(a.z * 1e6) / 1e6]);

test('the compositor is registered and the three test scenes are loaded', () => {
  assert.equal(E.worldFramePassOn(), true, 'the world-frame pass is defined when the pass registry is loaded');
  for (const id of IDS) assert.ok(specOf(E, id), id);
});

test('F4: the live data carries no statics; the still keeps them and is not empty', () => {
  for (const id of IDS) {
    const spec = specOf(E, id);
    const live = E.worldHostData(spec, { id: 'f4-' + id, sim: 'none' });
    assert.equal(live.v, 2);
    assert.equal(live.place.length, 0, 'no static is a v2 placement on the live canvas (R1: no merged layers)');
    assert.equal(live.scatter.length, 0);
    // (the spec as registered: sense may have repaired it; whatever ground and water it keeps, the live data keeps)
    const wet = (spec.surfaces || []).filter(s => s && s.kind === 'water' && (s.poly || s.path)).length, dry = (spec.surfaces || []).filter(s => s && s.kind !== 'water' && (s.poly || s.path)).length;
    assert.equal(live.surfaces.filter(s => !s.rest).length, dry, 'ground surfaces kept');
    assert.ok(live.surfaces.some(s => s.rest), 'the rest of the ground');
    assert.equal(live.water.length, wet, 'base water kept');
    const rec = E.worldHostLive(live.id);
    assert.ok(rec && rec.compositor, 'the live record is drawn by the compositor');
    const still = E.worldHostData(spec, { id: 'f4-' + id, sim: false });
    assert.notEqual(still, live);
    assert.ok(still.place.length > 50, `${id}: the still keeps the statics (${still.place.length})`);
    assert.equal(E.worldHostData(spec, { id: 'f4-' + id, sim: false }), still, 'the still is memoised (tiles never recompile)');
    const svg = E.sceneSvg(still, { season: 'summer', renderer: 'svg' });
    assert.ok(svg.length > 20000 && (svg.match(/<use /g) || []).length > 50, `${id}: the still draws its statics (${svg.length} bytes)`);
    assert.equal(E.worldHostLive(live.id), rec, 'drawing the still never touches the live record (G10)');
  }
});

test('R5 and M8: the clock starts at the first visible frame, pauses without a jump, restarts at show', () => {
  let wall = 0;
  const c = E.worldHostClock({ now: () => wall });
  for (let t = 0; t < 3; t += 0.1) { wall += 100; assert.equal(c.frame('a', t, { warming: true }), 0); }
  for (let t = 3; t < 5; t += 0.1) { wall += 100; assert.equal(c.frame('a', t, { hidden: true }), 0); }
  assert.equal(c.started, false, 'hidden preparation never starts the clock');
  wall += 16;
  assert.equal(c.frame('a', 5.0, {}), 0, 'the first visible frame is scene time 0');
  let t = 5.0;
  for (let i = 0; i < 60; i++) { t += 1 / 60; wall += 16; c.frame('a', t, {}); }
  assert.ok(Math.abs(c.tau - 1) < 1e-9, 'one second of frames is one second of scene time');
  const before = c.tau;
  wall += 60000;
  c.frame('a', t + 60, {});
  assert.ok(c.tau - before < 0.02 + 1e-9, 'a minute offscreen resumes without a jump (one frame)');
  assert.equal(c.frame('a', 200, { still: true }), 0, 'a still is the base moment');
  wall += 16;
  assert.equal(c.frame('a', 0.01, {}), 0, 'the host restarted its clock (the scene is shown now): scene time 0');
  assert.equal(c.restarts, 1);
  // another renderer of the same world drawing at the same moment shows the moment, never moves it twice
  const tau0 = c.tau;
  wall += 5; c.frame('b', 900, {});
  assert.equal(c.tau, tau0);
  // the same renderer after a re-bake (a new bake key, its own time running on) takes over at once: no stall, no jump
  wall += 11; c.frame('a2', 0.01 + 1 / 60, {});
  assert.ok(Math.abs(c.tau - (tau0 + 1 / 60)) < 1e-9);
  assert.equal(c.owner, 'a2');
  c.pin(12.5);
  assert.equal(c.frame('a', 30, {}), 30, 'pinned (tools, captures): the frame time is the scene time');
});

test('R5: a renderer prepared hidden starts its life at show, from its base (deterministic)', () => {
  const spec = specOf(S, 'fleet-pond-2-w3');
  const data = S.worldHostData(spec, { id: 'r5', sync: true });
  const rec = S.worldHostLive(data.id);
  assert.ok(rec.driver, 'the life is built (sync)');
  const base = pos(rec.driver.base);
  assert.ok(base.length > 0, 'the stub life has walkers');
  for (let t = 0; t < 4; t += 0.05) S.worldHostAt(rec, t, { key: 'r', warming: true, hidden: false });
  for (let t = 4; t < 6; t += 0.05) S.worldHostAt(rec, t, { key: 'r', hidden: true });
  assert.equal(rec.clock.started, false);
  const first = S.worldHostAt(rec, 6, { key: 'r', hidden: false });
  assert.equal(first.tau, 0);
  assert.deepEqual(pos(first.agents), base, 'the first visible frame shows the base');
  let t = 6;
  for (let i = 0; i < 120; i++) { t += 1 / 60; S.worldHostAt(rec, t, { key: 'r', hidden: false }); }
  const moved = S.worldHostAt(rec, t + 1 / 60, { key: 'r', hidden: false });
  assert.ok(moved.tau > 2 && moved.tau < 2.1, 'two seconds played');
  assert.notDeepEqual(pos(moved.agents), base);
  // the opening shows a scene that played hidden: the host restarts its clock; the life starts again from its base
  const shown = S.worldHostAt(rec, 0.02, { key: 'r', hidden: false });
  assert.equal(shown.tau, 0);
  assert.deepEqual(pos(shown.agents), base, 'at show: the base again (never halfway through)');
  assert.equal(rec.stats.resets, 1);
});

test('G10: re-renders of the app never restart the scene or re-roll its life', () => {
  const spec = specOf(S, 'fleet-canal-2-w3');
  const d1 = S.worldHostData(spec, { id: 'g10', sync: true });
  const rec = S.worldHostLive(d1.id), drv = rec.driver;
  let t = 1;
  for (let i = 0; i < 90; i++) { t += 1 / 30; S.worldHostAt(rec, t, { key: 'g', hidden: false }); }
  const a = S.worldHostAt(rec, t, { key: 'g', hidden: false });
  // a task save, a live sync: the item's scene data again, a still for a tile, the spec as a fresh copy
  assert.equal(S.worldHostData(spec, { id: 'g10' }), d1, 'the same data object (the renderer keeps its bake)');
  S.worldHostData(spec, { id: 'g10', sim: false });
  assert.equal(S.worldHostData(JSON.parse(JSON.stringify(spec)), { id: 'g10' }), d1, 'an equal spec is the same scene');
  assert.equal(S.worldHostLive(d1.id), rec);
  assert.equal(rec.driver, drv, 'the same life');
  const b = S.worldHostAt(rec, t + 1 / 30, { key: 'g', hidden: false });
  assert.ok(b.tau > a.tau, 'the clock carries on');
  const ids = new Set(a.agents.map(x => x.id));
  assert.ok(b.agents.filter(x => ids.has(x.id)).length >= Math.min(a.agents.length, b.agents.length) - 1, 'the same agents');
  // a re-mounted host with a new renderer (another bake key) carries on too: same host time, no restart
  const c = S.worldHostAt(rec, t + 2 / 30, { key: 'g2', hidden: false });
  assert.ok(c.tau >= b.tau, 'no restart');
  assert.equal(rec.clock.restarts, 0);
});

test('R4: the same scene, date, seed and t give the same frame record; t moves it; T2: no wall clock', () => {
  const realNow = Date.now;
  for (const X of [S, E]) {
    for (const id of IDS) {
      const spec = specOf(X, id);
      const a = X.worldFrameAt(X.worldFrameScene(spec, { date: DATE, seed: 7 }), 12.5);
      let b;
      Date.now = () => 0;   // a different wall clock: a frame record never reads it
      try { b = X.worldFrameAt(X.worldFrameScene(spec, { date: DATE, seed: 7 }), 12.5); } finally { Date.now = realNow; }
      assert.deepEqual(b, a, `${id}: identical records`);
      // the same moment reached frame by frame (a live run) gives the same agents as a fresh one
      const sc = X.worldFrameScene(spec, { date: DATE, seed: 7 });
      for (let t = 0; t < 12.5; t += 0.7) X.worldFrameAt(sc, t);
      const c = X.worldFrameAt(sc, 12.5);
      assert.deepEqual(c.ents.filter(e => !e.static).map(e => [e.id, e.x, e.z]), a.ents.filter(e => !e.static).map(e => [e.id, e.x, e.z]), `${id}: history-free`);
      if (X === S) {
        const d = X.worldFrameAt(X.worldFrameScene(spec, { date: DATE, seed: 7 }), 14);
        assert.notDeepEqual(d.ents.filter(e => !e.static).map(e => [e.x, e.z]), a.ents.filter(e => !e.static).map(e => [e.x, e.z]), 'time moves the agents');
      }
    }
  }
});

test('16.1: the frame records of the three test scenes have every field', () => {
  for (const X of [E, S]) {
    for (const id of IDS) {
      const f = X.worldFrameAt(X.worldFrameScene(specOf(X, id), { date: DATE }), 3);
      for (const k of ['t', 'ctx', 'cam', 'W', 'H', 'ents', 'wind', 'sun', 'lights', 'log']) assert.ok(k in f, `${id}: frame.${k}`);
      assert.ok(f.ents.length > 50, `${id}: ${f.ents.length} entities`);
      for (const e of f.ents) for (const k of FIELDS) assert.ok(k in e, `${id}: ${e.id} lacks ${k}`);
      for (const e of f.ents) {
        assert.ok(Array.isArray(e.box) && e.box.length === 4 && e.box.every(Number.isFinite), `${id}: ${e.id} box`);
        assert.ok(Number.isInteger(e.order), `${id}: ${e.id} order`);
      }
      if (X === S) assert.ok(f.ents.some(e => !e.static), `${id}: agents in the record`);
    }
  }
});

test('R1, R2: zero order violations in the frame records of the test scenes over the loop', () => {
  for (const X of [S, E]) {
    for (const id of IDS) {
      const sc = X.worldFrameScene(specOf(X, id), { date: DATE });
      let frames = 0, pairs = 0;
      for (let i = 0; i < 150; i++) {
        const t = i * 0.2, f = X.worldFrameAt(sc, t);
        frames++;
        const movers = f.ents.filter(e => !e.static), all = f.ents;
        const ov = (a, b) => a.box[0] < b.box[2] && b.box[0] < a.box[2] && a.box[1] < b.box[3] && b.box[1] < a.box[3];
        // the record carries what the order reads: flat things (decals, walkable decks) lie under what stands on them
        const asEnt = (e) => ({ id: e.id, obj: e.obj, static: e.static, x: e.x, z: e.z, y: e.y, foot: e.foot, height: e.height, solidity: e.solidity, decal: e.decal, attach: e.host ? 'deck:' + e.host : null });
        for (const m of movers) for (const o of all) {
          if (o === m || !ov(m, o)) continue;
          pairs++;
          const mNear = X.worldOrderNearer(asEnt(m), asEnt(o));
          // a static redrawn over this mover (the occluder redraw, clipped to it) is drawn after it
          const oo = o.static && Array.isArray(o.redrawFor) && o.redrawFor.includes(m.id) ? Infinity : o.order;
          assert.ok(mNear ? m.order > oo : oo > m.order, `${id} t=${t.toFixed(1)}: ${mNear ? m.id : o.id} is nearer but drawn first`);
        }
      }
      assert.ok(frames === 150);
      if (X === S) assert.ok(pairs > 0, `${id}: movers overlapped statics (${pairs} pairs checked)`);
    }
  }
});

test('the driver: whole ticks, interpolated, statics only without the life package', () => {
  const spec = specOf(S, 'sheffield-kelham-1-w3');
  const w = S.worldHostWorld(spec, {});
  const d = S.worldHostDriver(w, { ms: DATE, deterministic: true });
  assert.ok(d && d.base.length > 0);
  const a = d.at(1.0), b = d.at(1.0 + 0.5 / d.hz), c = d.at(1.0 + 1 / d.hz);
  const x = (as) => as.find(q => q.id === a[0].id);
  assert.ok(x(b) && x(c));
  assert.ok(Math.abs(x(b).x - (x(a).x + x(c).x) / 2) < 1e-6, 'half a tick is half way');
});

// V5 and F3: the compositor's bake in Node, on a stub canvas (no pixels: the keys and the reuse are what is tested)
const CANVAS_STUB = `
const __grad = { addColorStop() {} };
class __Ctx { constructor(c) { this.canvas = c; this.globalAlpha = 1; this.globalCompositeOperation = 'source-over'; }
  save() {} restore() {} setTransform() {} transform() {} beginPath() {} closePath() {} moveTo() {} lineTo() {} rect() {} clip() {} fill() {} stroke() {}
  fillRect() {} clearRect() {} drawImage() { this.canvas.draws++; } ellipse() {} arc() {} putImageData() {} quadraticCurveTo() {} bezierCurveTo() {}
  createLinearGradient() { return __grad; } createRadialGradient() { return __grad; }
  getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h) * 4), width: w, height: h }; } }
class OffscreenCanvas { constructor(w, h) { this.width = w; this.height = h; this.draws = 0; this.ctx = new __Ctx(this); } getContext() { return this.ctx; } }
class Path2D { constructor(d) { this.d = d; } }
`;
const V = load(STUB_LIFE + CANVAS_STUB);
test('V5, F3: a change of time inside a light band reuses every chunk bitmap and sprite; a new band or season re-bakes', () => {
  const spec = specOf(V, 'fleet-pond-2-w3');
  const data = V.worldHostData(spec, { id: 'v5', sync: true });
  const C = V.sceneCompile(data, { season: 'summer' });
  const pass = V.sceneRenderPasses('prebake', C).find(p => p.id === 'world-frame');
  assert.ok(pass, 'the compositor applies to the live data');
  const at = (h) => Date.UTC(2026, 6, 15, h, 0, 0);
  const L = (ms, alt, az, dark) => ({ ms, alt, az, dark, cover: 0.2, top: '#3a80c4', mid: '#98c4e4', low: '#eaeee6', haze: '#d6e2e6', windows: dark > 0.5 });
  const envOf = (Lx, season) => ({ C: Object.assign(Object.create(C), { season: season || 'summer' }), L: Lx, Lnow: Lx, W: 1600, H: 900, vs: 1, ox: 0, oy: 0, still: true, groups: [{}], gov: { level: 0 },
    out: { lk: 'k' + (Lx.dark > 0.5 ? 'n' : 'd') }, keep() {}, sprite: () => ({ c: new V.OffscreenCanvas(8, 8), x0: -4, y0: -8, w: 8, h: 8, sc: 1, bytes: 256 }) });
  const bake = (env) => { pass.prebake(env); pass.frameGroup(env, env.groups[0], new V.OffscreenCanvas(1600, 900).getContext('2d'), 1); return pass.stats(env); };
  const a = bake(envOf(L(at(12), 58, 175, 0)));
  assert.equal(a.ready, true);
  assert.ok(a.chunksMade > 0 && a.chunksKept === 0, 'the first bake makes its chunks');
  const shadowA = V.worldHostLive(data.id).frame.last.shadow;
  const b = bake(envOf(L(at(13), 60, 200, 0)));
  assert.equal(b.chunksMade, 0, 'an hour later, the same band: no chunk is made again');
  assert.equal(b.chunksKept, a.chunksMade, 'every chunk bitmap is reused');
  const shadowB = V.worldHostLive(data.id).frame.last.shadow;
  assert.ok(!shadowA || shadowA !== shadowB, 'the shadows are planned again (the sun moved)');
  const n = bake(envOf(L(at(23), -20, 340, 0.9)));
  assert.equal(n.chunksKept, 0, 'night: the chunks are made again (light band)');
  const w = bake(envOf(L(at(12), 58, 175, 0), 'winter'));
  assert.equal(w.chunksKept, 0, 'another season: made again');
  assert.deepEqual(w.errors, []);
});

test('16.1: worldFrameAt also takes a world its caller drives (the systems render step, the tools, the debug overlay)', () => {
  const spec = specOf(S, 'fleet-canal-2-w3');
  const w = S.worldHostWorld(spec, {});
  const d = S.worldHostDriver(w, { ms: DATE, deterministic: true });
  const agents = d.at(4);
  const f = S.worldFrameAt(w, 4, { agents });
  const shown = f.ents.filter(e => !e.static);
  assert.ok(shown.length > 0 && shown.length <= agents.length, 'the caller\'s agents are in the record');
  for (const e of f.ents) for (const k of FIELDS) assert.ok(k in e, k);
  const plan = w.$wfr;
  assert.ok(plan && plan.plan.recs.length > 50, 'the plan is kept on the world');
  const g = S.worldFrameAt(w, 4.5);
  assert.equal(w.$wfr, plan, 'and reused');
  assert.ok(g.ents.some(e => !e.static), 'without o.agents: the agents the world has now (its life, world.agents)');
  assert.ok(!Object.keys(w).includes('$wfr'), 'not enumerable');
});
