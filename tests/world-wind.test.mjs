// World engine v3.1, package `systems`: the ONE wind, sway, particles and rigid bodies (WORLD_ENGINE_REQUIREMENTS.md S3, Y5, Y6,
// G6, M3; docs/dev/WORLD_ENGINE.md 11.8, 13). Bundle: the scene sources + 79-world-0core.js + the three systems files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { sceneSourceFiles } from '../tools/lib/scene-page.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MINE = ['79-world-0core.js', '79-world-0sys.js', '79-world-6particles.js', '79-world-6wind.js'];
function bundle(extra = '') {
  const files = [...sceneSourceFiles(ROOT).filter(f => !/79-world-/.test(f)), ...MINE.map(f => join(ROOT, 'src', 'app', f)).filter(existsSync)];
  const names = new Set(['sceneCamera']);
  for (const f of files) {
    if (!/79-world-/.test(f)) continue;
    const s = readFileSync(f, 'utf8');
    for (const m of s.matchAll(/^function\s+(world[A-Za-z0-9_]*)\s*\(/gm)) names.add(m[1]);
    for (const m of s.matchAll(/^(?:const|let|var)\s+(WORLD_[A-Z0-9_]+)\s*=/gm)) names.add(m[1]);
  }
  const body = files.map(f => readFileSync(f, 'utf8')).join('\n;\n') + '\n;\n' + extra;
  const tail = `\nreturn { ${[...names].map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ')} };`;
  return new vm.Script('(function () {\n' + body + tail + '\n})', { filename: 'world-wind-bundle.js' }).runInThisContext()();
}
const W = bundle();
const TICK = 1 / 30;
const angDiff = (a, b) => Math.abs((((a - b) % 360) + 540) % 360 - 180);

const SPEC = () => ({ v: 3, place: { lat: 51.279, lon: -0.836, region: 'hampshire' }, camera: { eye: 1.65, fov: 62, horizon: 455, heading: 70 },
  surfaces: [
    { id: 'cut', kind: 'water', water: 'canal', poly: [[-30, 8], [6, 8], [40, 140], [10, 160]], shallow: 0.6 },
    { id: 'tow', kind: 'towpath', path: [[8, 5], [14, 60], [30, 160]], width: 2.4 },
    { id: 'verge', kind: 'grass', poly: [[10, 5], [40, 5], [60, 160], [32, 160]] } ],
  entities: [
    { obj: 'boat.narrowboat', at: [-2, 20], facing: 20, attach: 'water', id: 'nb1' },
    { obj: 'tree.canal-willow', at: [25, 30], id: 't1' }, { obj: 'tree.birch', at: [30, 50], id: 't2' }, { obj: 'tree.birch', at: [22, 18], id: 't3' },
    { obj: 'street.bench', at: [17, 22], facing: 250, id: 'bench-1' },
    { cluster: 'plant.reed', on: 'cut', edge: true, n: 40, seed: 3 } ],
  backdrop: { style: 'canal-wooded' }, seed: 2 });
const OCT = Date.UTC(2026, 9, 20, 14, 0), JUL = Date.UTC(2026, 6, 15, 14, 0), JAN = Date.UTC(2026, 0, 14, 12, 0);
function world(extraEnts) {
  const w = W.worldBuild(SPEC(), { validate: false });
  for (const e of extraEnts || []) w.entities.push(e);
  return w;
}
const EXTRA = () => [
  { id: 'hedge-1', obj: 'plant.towpath-hedge', cls: 'hedge', x: 35, z: 40, y: 0, height: 1.6, static: true },
  { id: 'wash-1', obj: 'prop.washing-line', cls: 'washing', x: 38, z: 25, y: 1.6, height: 0.8, static: true },
  { id: 'grass-1', obj: 'plant.meadow-grass', cls: 'shrub', x: 30, z: 12, y: 0, height: 0.5, static: true },
  { id: 'mill', obj: 'building.mill-red-brick', cls: 'building', x: 50, z: 120, y: 0, height: 14, static: true },
];

/* ---------- the field (Y5, S3) ---------- */
test('one wind per scene: every sample blows within a few degrees of the scene wind; calm air is still', () => {
  const w = world();
  W.worldRun(w, { ms: OCT, systems: ['time', 'wind'] });
  const scene = w.wind;
  assert.ok(scene && scene.s > 0 && Math.abs(scene.dir - w.time.wind.dir) < 1e-9, 'world.wind follows the time context');
  const r = W.worldRng({ seed: 3 }, 'test', 'field', { fresh: true });
  for (let i = 0; i < 2000; i++) {
    const s = W.worldWind(w, r.range(-80, 80), r.range(1, 300), r.range(0, 360));
    assert.ok(s.s >= 0 && Math.abs(Math.hypot(s.dx, s.dz) - 1) < 1e-9);
    assert.ok(angDiff(Math.atan2(s.dx, s.dz) * 180 / Math.PI, scene.dir) < 8, 'a gust veers a few degrees at most');
  }
  const calm = world();
  W.worldRun(calm, { ms: OCT, systems: ['time', 'wind'], wind: { s: 0, dir: 90 } });
  assert.equal(calm.wind.s, 0);
  for (let i = 0; i < 50; i++) assert.equal(W.worldWind(calm, i * 3, 10 + i, i).s, 0);
  assert.ok(calm.entities.filter(e => e.sway).every(e => e.sway.deg === 0), 'nothing sways in calm air');
});

test('gusts travel downwind: the pattern at a point reaches the points downwind of it later', () => {
  for (const dir of [0, 90, 215, 330]) {
    const w = world();
    W.worldRun(w, { ms: OCT, systems: ['time', 'wind'], wind: { dir, s: 1.2 } });
    const { ux, uz, gust } = w.wind, c = gust.speed;
    const r = W.worldRng({ seed: 4 }, 'test', 'gust' + dir, { fresh: true });
    for (let i = 0; i < 300; i++) {
      const x = r.range(-60, 60), z = r.range(2, 200), t = r.range(0, 300), dt = r.range(0.2, 6);
      const a = W.worldWind(w, x, z, t), b = W.worldWind(w, x + ux * c * dt, z + uz * c * dt, t + dt);
      assert.ok(Math.abs(a.g - b.g) < 1e-9 && Math.abs(a.s - b.s) < 1e-9, 'the gust pattern translates downwind at the gust speed');
    }
    // and not upwind: the series 20 m downwind lags the upwind one by 20 / c seconds
    const series = (x, z) => Array.from({ length: 900 }, (_, k) => W.worldWind(w, x, z, k * 0.1).g);
    const A = series(0, 60), B = series(20 * ux, 60 + 20 * uz);
    let best = 0, bestLag = 0;
    for (let lag = -100; lag <= 100; lag++) {
      let s = 0, n = 0;
      for (let k = 100; k < 800; k++) { s += A[k] * B[k + lag]; n++; }
      if (s / n > best) { best = s / n; bestLag = lag; }
    }
    assert.ok(Math.abs(bestLag * 0.1 - 20 / c) < 0.25, `dir ${dir}: lag ${bestLag * 0.1} s, expected ${20 / c} s`);
  }
});

/* ---------- sway (M3, M2, M4) ---------- */
test('every sway direction is within 30 degrees of the wind, for every swaying thing, at every tick', () => {
  for (const wind of [{ dir: 0, s: 0.6 }, { dir: 95, s: 1.4 }, { dir: 200, s: 2.2 }, null]) {
    const w = world(EXTRA());
    let n = 0, worst = 0;
    const probe = { id: 'test-probe', phase: 'render', update(wd) {
      for (const e of wd.entities) {
        if (!e.sway) continue;
        n++;
        if (e.sway.deg > 0) worst = Math.max(worst, angDiff(e.sway.dir, wd.wind.dir));
      }
    } };
    W.worldRun(w, Object.assign({ ms: OCT, systems: ['time', 'wind', 'lod', probe] }, wind ? { wind } : {})).advance(12);
    assert.ok(n > 1000, 'sway samples: ' + n);
    assert.ok(worst <= 30, `worst sway ${worst} degrees off the wind`);
    const kinds = new Set(w.entities.filter(e => e.sway).map(e => e.cls));
    for (const k of ['tree', 'reed', 'hedge', 'washing', 'shrub']) assert.ok(kinds.has(k), 'sways: ' + k);
  }
});

test('sway by size and stiffness: reeds and washing more than trees, a stiff hedge little; statics and movers never', () => {
  const wind = { dx: 1, dz: 0, s: 1, dir: 90 };
  const mean = (e) => { let s = 0; for (let k = 0; k < 400; k++) s += W.worldSway(e, wind, k * 0.05).deg; return s / 400; };
  const reed = mean({ id: 'r', obj: 'plant.reed', cls: 'reed', x: 0, z: 10, height: 1.8, static: true });
  const small = mean({ id: 's', obj: 'tree.birch', cls: 'tree', x: 0, z: 10, height: 5, static: true });
  const big = mean({ id: 'b', obj: 'tree.birch', cls: 'tree', x: 0, z: 10, height: 20, static: true });
  const hedge = mean({ id: 'h', obj: 'plant.towpath-hedge', cls: 'hedge', x: 0, z: 10, height: 1.6, static: true });
  const wash = mean({ id: 'w', obj: 'prop.washing-line', cls: 'washing', x: 0, z: 10, height: 0.8, static: true });
  assert.ok(wash > reed && reed > small && small > big && reed > hedge, JSON.stringify({ wash, reed, small, big, hedge }));
  assert.ok(big > 0.3 && big < 3, 'a big tree leans a little: ' + big);
  for (const e of [{ obj: 'building.mill-red-brick', cls: 'building' }, { obj: 'street.bench', cls: 'bench' }, { obj: 'rock.boulder', cls: 'rock' },
    { obj: 'structure.footbridge', cls: 'walkway' }, { obj: 'boat.narrowboat', cls: 'boat' }, { obj: 'vehicle.car', cls: 'vehicle' }, { obj: 'street.sign', cls: 'post' }])
    assert.equal(W.worldSway(Object.assign({ x: 0, z: 10, static: true }, e), wind, 1), null, e.obj + ' never sways (M2)');
  assert.equal(W.worldSway({ id: 'a1', obj: 'person.walker', cls: 'person', x: 0, z: 10 }, wind, 1), null, 'movers animate by what they do (M1)');
  assert.equal(W.worldSway({ id: 'a2', obj: 'plant.reed', cls: 'reed', x: 0, z: 10, static: false }, wind, 1), null, 'only statics sway');
  // the screen rotation leans the top downwind: wind to the right turns the top to the right
  const s = W.worldSway({ id: 'r2', obj: 'plant.reed', cls: 'reed', x: 0, z: 10, height: 1.8, static: true }, wind, 2);
  assert.ok(s.rot > 0 && s.w > 0 && s.amp > 0);
  const sl = W.worldSway({ id: 'r2', obj: 'plant.reed', cls: 'reed', x: 0, z: 10, height: 1.8, static: true }, { dx: -1, dz: 0, s: 1 }, 2);
  assert.ok(sl.rot < 0 && sl.w < 0);
});

test('no synchronised clones: identical reeds side by side sway out of step (M4)', () => {
  const w = world();
  W.worldRun(w, { ms: OCT, systems: ['time', 'wind'], wind: { dir: 90, s: 1 } });
  const a = { id: 'ra', obj: 'plant.reed', cls: 'reed', x: 5, z: 20, height: 1.8, static: true }, b = Object.assign({}, a, { id: 'rb', x: 5.4 });
  let diff = 0, n = 0;
  for (let k = 0; k < 600; k++) { const t = k / 30, da = W.worldSway(a, w, t).deg, db = W.worldSway(b, w, t).deg; diff += Math.abs(da - db) / Math.max(1e-6, (da + db) / 2); n++; }
  assert.ok(diff / n > 0.08, 'mean relative difference ' + diff / n);
});

/* ---------- particles (G6, M3) ---------- */
function runParticles(ms, o, secs, ents) {
  const w = world(ents);
  let maxTotal = 0, maxKind = {};
  const probe = { id: 'test-pcount', phase: 'render', update(wd) {
    const P = W.worldParticles(wd);
    maxTotal = Math.max(maxTotal, P.total);
    for (const [k, v] of Object.entries(P.counts)) maxKind[k] = Math.max(maxKind[k] || 0, v);
  } };
  const r = W.worldRun(w, Object.assign({ ms, systems: ['time', 'attach', 'wind', 'particles', 'lod', probe] }, o));
  if (o && o.before) o.before(w);
  r.advance(secs);
  return { w, maxTotal, maxKind, P: W.worldParticles(w), r };
}

test('no leaves in July or in calm air; leaves in an autumn wind', () => {
  const jul = runParticles(JUL, { wind: { dir: 90, s: 1.4 } }, 20);
  assert.equal(jul.maxKind.leaf || 0, 0, 'no leaves in July');
  assert.equal(W.worldEmit(jul.w, 'leaf', { x: 20, z: 20, rate: 50 }), null);
  assert.ok(W.worldParticles(jul.w).log.some(l => l.kind === 'leaf' && /autumn/.test(l.reason)), 'the refusal is logged');
  const calm = runParticles(OCT, { wind: { dir: 90, s: 0.05 } }, 20);
  assert.equal(calm.maxKind.leaf || 0, 0, 'no leaves in calm air');
  assert.equal(W.worldEmit(calm.w, 'leaf', { x: 20, z: 20, n: 10 }), null);
  const oct = runParticles(OCT, { wind: { dir: 90, s: 1.2 } }, 20);
  assert.ok(oct.maxKind.leaf > 3, 'leaves fall in an autumn wind: ' + oct.maxKind.leaf);
  // when the wind drops, no new leaves start
  oct.w.time.wind = { dir: 90, s: 0 }; oct.r.advance(20);
  assert.equal(W.worldParticles(oct.w).counts.leaf, 0, 'the last leaves have landed and no more fell');
});

test('no snow particles on a dry day; snow only while it snows', () => {
  for (const [ms, wx] of [[JAN, 'clear'], [JUL, 'clear'], [JAN, 'cloudy'], [Date.UTC(2026, 1, 3, 9, 0), 'rain']]) {
    const dry = runParticles(ms, { wx, particles: { weather: true } }, 15);
    assert.equal(dry.maxKind.snow || 0, 0, `no snow on a ${wx} day`);
    assert.equal(W.worldEmit(dry.w, 'snow', { x: 0, z: 20, y: 10, n: 20 }), null);
  }
  const snowy = runParticles(JAN, { wx: 'snow', particles: { weather: true } }, 10);
  assert.ok(snowy.maxKind.snow > 20, 'it snows: ' + snowy.maxKind.snow);
  assert.equal(snowy.maxKind.rain || 0, 0, 'and does not rain');
  assert.ok(W.worldEmit(snowy.w, 'snow', { x: 0, z: 20, y: 10, n: 5 }));
  // without the weather option the view's rain and snow are left to the v2 weather overlay
  assert.equal(runParticles(JAN, { wx: 'snow' }, 5).maxKind.snow || 0, 0);
  const wet = runParticles(Date.UTC(2026, 3, 9, 12, 0), { wx: 'rain', particles: { weather: true } }, 6);
  assert.ok(wet.maxKind.rain > 20 && (wet.maxKind.snow || 0) === 0);
});

test('particles stay under their caps (per kind and in all), the oldest recycled', () => {
  const caps = W.WORLD_PARTICLE_KINDS;
  const spam = (w) => {
    for (const k of Object.keys(caps)) W.worldEmit(w, k, { x: 20, z: 30, y: 4, rate: 2000, spread: 3, id: 'spam-' + k });
    for (let i = 0; i < 40; i++) W.worldEmit(w, 'splash', { x: 21, z: 31, n: 200 });
  };
  const run = runParticles(OCT, { wx: 'sleet', wind: { dir: 90, s: 1.5 }, before: spam, particles: { weather: true } }, 8);
  assert.ok(run.maxTotal <= W.WORLD_PARTICLE_CAP, 'total ' + run.maxTotal);
  for (const [k, v] of Object.entries(run.maxKind)) assert.ok(v <= caps[k].cap, `${k}: ${v} > ${caps[k].cap}`);
  assert.ok(run.maxTotal >= W.WORLD_PARTICLE_CAP * 0.9, 'the spam really hit the global cap: ' + run.maxTotal);
  for (let i = 0; i < 100; i++) W.worldBody(run.w, { x: 20, z: 30, y: 2 });
  assert.ok(W.worldParticles(run.w).bodies.length <= W.WORLD_BODY_CAP);
  // a refused or unknown kind never makes particles
  assert.equal(W.worldEmit(run.w, 'confetti', { x: 0, z: 10 }), null);
});

test('smoke and steam drift downwind with the one wind', () => {
  for (const dir of [90, 250]) {
    const chim = { id: 'chimney-smoke', obj: 'fx.chimney-smoke', cls: 'smoke', x: 30, z: 60, y: 9, height: 0.5, static: true };
    const run = runParticles(OCT, { wind: { dir, s: 1 } }, 12, [chim]);
    const smoke = run.P.list.filter(p => p.kind === 'smoke');
    assert.ok(smoke.length > 10, 'smoke rises from the chimney: ' + smoke.length);
    const mx = smoke.reduce((a, p) => a + p.x, 0) / smoke.length - chim.x, mz = smoke.reduce((a, p) => a + p.z, 0) / smoke.length - chim.z;
    assert.ok(Math.hypot(mx, mz) > 1, 'it drifts');
    assert.ok(angDiff(Math.atan2(mx, mz) * 180 / Math.PI, run.w.wind.dir) < 30, `smoke drifts downwind (wind ${run.w.wind.dir})`);
    assert.ok(smoke.reduce((a, p) => a + p.y, 0) / smoke.length > chim.y, 'and rises');
  }
});

/* ---------- rigid bodies (Y6) ---------- */
test('a ball thrown for a dog arcs, bounces and comes to rest on the grass; one thrown into the canal splashes and floats', () => {
  const w = world();
  const r = W.worldRun(w, { ms: JUL, systems: ['time', 'wind', 'particles'], wind: { dir: 90, s: 0.5 } });
  const seen = { land: 0, rest: 0, water: 0 };
  const ball = W.worldBody(w, { x: 20, z: 12, y: 1.2, vx: 1.5, vy: 4, vz: 3, r: 0.035, onLand: () => seen.land++, onRest: () => seen.rest++ });
  let top = 0;
  for (let i = 0; i < 300; i++) { r.advance(TICK); top = Math.max(top, ball.y); }
  assert.ok(top > 1.8, 'an arc: ' + top);
  assert.equal(seen.land, 1); assert.equal(seen.rest, 1); assert.ok(ball.bounces >= 1, 'it bounced');
  assert.ok(Math.abs(ball.y - ball.r) < 1e-6, 'resting on the ground');
  assert.ok(ball.z > 14 && ball.x > 20, 'it travelled');
  const ball2 = W.worldBody(w, { x: 12, z: 12, y: 1.2, vx: -3, vy: 2, vz: 2, onWater: () => seen.water++ });
  let splashes = 0;
  for (let i = 0; i < 120; i++) { r.advance(TICK); splashes = Math.max(splashes, W.worldParticles(w).counts.splash); }
  assert.equal(seen.water, 1); assert.ok(splashes >= 3, 'a splash: ' + splashes);
  assert.ok(ball2.wet && Math.abs(ball2.y - (w.cam.water || 0)) < 0.05, 'floating at the water level: ' + ball2.y);
  const stone = W.worldBody(w, { x: 12, z: 12, y: 1, vx: -3, vy: 1, vz: 2, floats: false });
  r.advance(2);
  assert.ok(!W.worldParticles(w).bodies.includes(stone), 'a stone sinks');
  // a heron's strike: a splash and a ring, whatever the season
  assert.ok(W.worldEmit(w, 'splash', { x: 0, z: 30, n: 8 }) && W.worldEmit(w, 'ring', { x: 0, z: 30, n: 1 }));
  // spray at a weir thrown up (up is an alias of vy)
  const before = new Set(W.worldParticles(w).list);
  W.worldEmit(w, 'spray', { x: 0, z: 40, y: 0.2, n: 5, up: 2 });
  const fresh = W.worldParticles(w).list.filter(q => !before.has(q) && q.kind === 'spray');
  assert.ok(fresh.length === 5 && fresh.every(q => q.vy > 1.3));
});
