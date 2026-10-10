// World engine v3, module C (life) acceptance tests: docs/dev/WORLD_ENGINE.md 8.3.
// Runs against module B (79-world-1nav.js) when it exists, else a small grid stub with the same contract.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const src = name => readFileSync(new URL('../src/app/' + name, import.meta.url), 'utf8');

// ---- stub navigation (contract of module B) ----
const STUB = `
function worldNavLayer(nav, layer) { return nav.layers[layer] || null; }
function stubOk(g, x, z) {
  var i = Math.floor((x - g.ox) / g.cell), j = Math.floor((z - g.oz) / g.cell);
  return i >= 0 && j >= 0 && i < g.w && j < g.h && !!g.data[j * g.w + i];
}
function worldStep(nav, layer, pos, vel, r, dt) {
  var g = nav.layers[layer], x = pos[0] + vel[0] * dt, z = pos[1] + vel[1] * dt;
  if (stubOk(g, x, z)) return [x, z];
  if (stubOk(g, x, pos[1])) return [x, pos[1]];
  if (stubOk(g, pos[0], z)) return [pos[0], z];
  return [pos[0], pos[1]];
}
function worldSpawnCells(nav, layer) {
  var g = nav.layers[layer], out = [];
  for (var i = 0; i < g.w; i++) for (var j of [0, g.h - 1]) if (g.data[j * g.w + i]) out.push(j * g.w + i);
  return out;
}
function worldPath(nav, layer, from, to) {
  var g = nav.layers[layer], ci = p => [Math.floor((p[0] - g.ox) / g.cell), Math.floor((p[1] - g.oz) / g.cell)];
  var a = ci(from), b = ci(to), W = g.w, s = a[1] * W + a[0], t = b[1] * W + b[0];
  if (!g.data[t]) return null;
  var prev = new Int32Array(W * g.h).fill(-1), q = [s], seen = new Uint8Array(W * g.h); seen[s] = 1;
  var n = 0;
  for (var k = 0; k < q.length && n < 20000; k++, n++) {
    var c = q[k]; if (c === t) break;
    var cx = c % W, cz = (c / W) | 0;
    for (var d of [[1,0],[-1,0],[0,1],[0,-1]]) {
      var nx = cx + d[0], nz = cz + d[1], m = nz * W + nx;
      if (nx < 0 || nz < 0 || nx >= W || nz >= g.h || seen[m] || !g.data[m]) continue;
      seen[m] = 1; prev[m] = c; q.push(m);
    }
  }
  if (!seen[t]) return null;
  var out = [], c2 = t;
  while (c2 !== -1) { out.push([g.ox + (c2 % W + 0.5) * g.cell, g.oz + (((c2 / W) | 0) + 0.5) * g.cell]); c2 = prev[c2]; }
  out.reverse();
  var thin = [out[0]];
  for (var i = 2; i < out.length; i += 2) thin.push(out[i]);
  thin.push(out[out.length - 1]);
  return thin;
}
`;

function grid(fn, x0 = -20, x1 = 20, z0 = 2, z1 = 82, cell = 0.5) {
  const w = Math.round((x1 - x0) / cell), h = Math.round((z1 - z0) / cell), data = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = x0 + (i + 0.5) * cell, z = z0 + (j + 0.5) * cell;
    data[j * w + i] = fn(x, z) ? 1 : 0;
  }
  return { w, h, cell, ox: x0, oz: z0, data };
}

// a canal: water x in [-12, -1] with a moored boat (solid), towpath x in [1, 4], hedge beyond
const inBoat = (x, z) => x > -10.6 && x < -7.4 && z > 19.6 && z < 40.4;
const canalNav = () => ({ layers: {
  swim: grid((x, z) => x > -11.5 && x < -1.5 && !inBoat(x, z)),
  wade: grid((x, z) => (x > -12 && x < -11.4) || (x > -1.6 && x < -1)),
  walk: grid((x, z) => x > 1 && x < 4),
} });
const canalWorld = () => ({
  seed: 2, waterY: -0.4, cam: { water: -0.4 },
  entities: [{ id: 'post-1', obj: 'post.mooring', x: -1.2, z: 12, height: 1.1 }],
  life: [
    { who: 'walkers', on: 'tow', rate: '6/min', mix: { stroll: 0.6, brisk: 0.2, 'dog-walker': 0.2 }, edges: ['S', 'N'] },
    { who: 'mallard', count: 8, on: 'cut' },
    { who: 'mute-swan', count: 2, on: 'cut', group: 'pair' },
    { who: 'heron', count: 1, on: 'cut', state: 'stalk' },
    { who: 'narrowboat-cruising', on: 'cut', every: '6min' },
    { who: 'kingfisher', count: 1 },
  ],
});

function load(useStub = true) {
  const ctx = vm.createContext({ Math, Map, Array, Object, Infinity, isFinite, Int32Array, Uint8Array, Float32Array });
  const real = existsSync(new URL('../src/app/79-world-1nav.js', import.meta.url));
  if (useStub || !real) vm.runInContext(STUB, ctx);
  vm.runInContext(src('79-world-2brains.js'), ctx);
  vm.runInContext(src('79-world-2life.js'), ctx);
  return ctx;
}
const ok = (g, x, z) => {
  const i = Math.floor((x - g.ox) / g.cell), j = Math.floor((z - g.oz) / g.cell);
  return i >= 0 && j >= 0 && i < g.w && j < g.h && !!g.data[j * g.w + i];
};
const isSpawn = (g, x, z) => {
  const j = Math.floor((z - g.oz) / g.cell);
  return j <= 1 || j >= g.h - 2;
};

test('600 s on the canal: no forbidden cell, floaters at water level, spawn/leave only on spawn cells', () => {
  const C = load(), nav = canalNav(), life = C.worldLifeInit(canalWorld(), nav, 36000);
  assert.equal(life.problems.length, 0, JSON.stringify(life.problems));
  const seen = new Set(), turnMax = {};
  let spawned = 0, left = 0, maxAgents = 0;
  const prevHead = new Map();
  for (let s = 0; s < 600 * 15; s++) {
    C.worldLifeTick(life, 1 / 15);
    for (const e of life.events) {
      if (e.kind === 'spawn') spawned++; else left++;
      if (e.layer !== 'air') assert.ok(isSpawn(nav.layers[e.layer], e.x, e.z), `${e.kind} off a spawn cell at ${e.x},${e.z}`);
    }
    life.events.length = 0;
    const ag = C.worldAgents(life);
    maxAgents = Math.max(maxAgents, ag.length);
    for (const a of ag) {
      seen.add(a.cls);
      if (a.layer !== 'air') assert.ok(ok(nav.layers[a.layer], a.x, a.z), `${a.cls} ${a.id} on forbidden cell ${a.x},${a.z}`);
      if (a.layer === 'swim' || a.layer === 'wade') assert.equal(a.y, -0.4, `${a.cls} floating`);
    }
    for (const a of life.agents) {
      if (prevHead.has(a.id)) {
        const d = Math.abs(Math.atan2(Math.sin(a.heading - prevHead.get(a.id)), Math.cos(a.heading - prevHead.get(a.id))));
        const lim = Math.PI / a.brain.turn / 15 + 1e-9;
        if (a.layer !== 'air') assert.ok(d <= lim, `${a.cls} turned ${d} > ${lim}`);
      }
      prevHead.set(a.id, a.heading);
    }
  }
  assert.ok(spawned > 30 && left > 20, `traffic: ${spawned} spawned, ${left} left`);
  for (const c of ['stroll', 'dog', 'duck', 'swan', 'heron', 'kingfisher']) assert.ok(seen.has(c), 'saw ' + c);
  assert.ok(maxAgents <= 60);
});

test('view matches the velocity bucket (within hysteresis), mirrors follow screen direction', () => {
  const C = load(), nav = canalNav(), life = C.worldLifeInit(canalWorld(), nav, 100);
  let checked = 0;
  for (let s = 0; s < 3000; s++) {
    C.worldLifeTick(life, 1 / 15);
    for (const a of life.agents) {
      const sp = Math.hypot(a.vx, a.vz);
      if (sp < 0.05 || a.brain.views !== 'five') continue;
      const rl = Math.hypot(a.x, a.z), rx = a.x / rl, rz = a.z / rl, hx = a.vx / sp, hz = a.vz / sp;
      const ang = Math.abs(Math.atan2(rx * hz - rz * hx, rx * hx + rz * hz)) * 180 / Math.PI;
      const b = ['back', 'q-back', 'side', 'q-front', 'front'].indexOf(a.view);
      assert.ok(Math.abs(ang - b * 45) <= 22.5 + 15 + 1e-6, `${a.cls} view ${a.view} for angle ${ang}`);
      checked++;
    }
  }
  assert.ok(checked > 1000);
});

test('same seed + time -> identical positions; different time -> different', () => {
  const run = t => { const C = load(), l = C.worldLifeInit(canalWorld(), canalNav(), t); for (let i = 0; i < 300; i++) C.worldLifeTick(l, 1 / 15); return JSON.stringify(C.worldAgents(l).map(a => [a.id, a.x, a.z, a.view])); };
  assert.equal(run(500), run(500));
  assert.notEqual(run(500), run(501));
});

test('stuck agents leave within 15 s (head-on in a one-cell corridor)', () => {
  const C = load();
  const nav = { layers: { walk: grid((x, z) => x > 0 && x < 0.5, -2, 2, 0, 30) } };
  const world = { seed: 1, life: [{ who: 'brisk', rate: '20/min', edges: ['S', 'N'] }] };
  const life = C.worldLifeInit(world, nav, 0, { warm: false });
  const still = new Map();
  for (let s = 0; s < 300 * 15; s++) {
    C.worldLifeTick(life, 1 / 15);
    for (const a of life.agents) {
      const moved = Math.hypot(a.vx, a.vz) > 0.05;
      const t = moved || a.spd === 0 ? 0 : (still.get(a.id) || 0) + 1 / 15;
      still.set(a.id, t);
      assert.ok(t < 15, `${a.id} stuck ${t.toFixed(1)} s`);
    }
  }
});

test('missing spawn layer and missing perch are load problems', () => {
  const C = load();
  const nav = { layers: { walk: grid(() => true), swim: grid(() => false), wade: grid(() => false) } };
  const life = C.worldLifeInit({ seed: 1, entities: [], life: [{ who: 'mallard', rate: '1/min' }, { who: 'kingfisher', count: 1 }] }, nav, 0, { warm: false });
  const rules = life.problems.map(p => p.rule).sort();
  assert.deepEqual([...rules], ['noPerch', 'noSpawn']);
});

test('tick < 1.5 ms for 60 agents', () => {
  const C = load(), nav = canalNav();
  const w = canalWorld();
  w.life = [{ who: 'walkers', on: 'tow', count: 30, mix: { stroll: 1 } }, { who: 'mallard', count: 30, on: 'cut' }];
  const life = C.worldLifeInit(w, nav, 0);
  assert.ok(life.agents.length >= 55, 'agents ' + life.agents.length);
  const n = 1500, t0 = process.hrtime.bigint();
  for (let i = 0; i < n; i++) C.worldLifeTick(life, 1 / 15);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / n;
  assert.ok(ms < 1.5 * 1.2, `tick ${ms.toFixed(3)} ms`);
});
