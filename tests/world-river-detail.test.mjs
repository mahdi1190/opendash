// World engine: the Pier Head's river, polished in the engine (docs/dev/SCENE_LESSONS.md section X). Each test names a weakness of the
// render of 17 Oct and fails on the engine as it was: a tidal estuary with a lattice of identical cells, ferries and a landing stage
// that stood dead still in a swell, a second ferry hidden behind the terminal shed, no foam where the hulls meet the water, a bollard
// a quarter of the frame high beside the river rail.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorld } from '../tools/lib/world/load.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = loadWorld(ROOT, { extra: 'globalThis.__scPacks = _scPacks;' });
const cam = W.sceneCamera({ camera: { eye: 1.7, fov: 86, horizon: 500, heading: 358, water: -2.4 } });

/* ---------- the estuary's surface: no lattice ---------- */
/**
 * How peaked the pattern of the water is, in METRES: the surface is drawn by a camera 40 m up (one pixel is 10 to 30 cm of river), resampled
 * on a ground grid, and the share of its spectral power held by the four strongest bins of a 2D DFT is returned. Two sine trains laid
 * across each other (the old estuary: rows of identical diagonal cells) put 0.29 of the power in four bins; the sum of ten unrelated
 * trains, warped and gusted, spreads it (0.19), the long swell left out.
 */
function peakiness(id, n = 64, step = 0.45) {
  const hi = W.sceneCamera({ camera: { eye: 40, fov: 86, horizon: 500, heading: 0, water: 0 } });
  const w = 1000, h = 300, y0 = 740, x0 = 300, B = new Uint8ClampedArray(w * h * 4).fill(128), wet = new Uint8Array(w * h).fill(1);
  W.worldWaterChop(B, wet, w, h, x0, y0, { R: { id, level: 0, cam: hi }, look: W.worldWaterLook('estuary'), vs: 1, ox: 0, oy: 0, cam: hi });
  const f = hi.f, eyeH = hi.eye, hz = hi.horizon, x0s = hi.x0 || 800, G = [];
  for (let j = 0; j < n; j++) {
    const d = 70 + j * step, Y = hz + f * eyeH / d, r = Math.round(Y - y0 - 0.5), row = new Float64Array(n);
    if (r >= 0 && r < h) for (let i = 0; i < n; i++) { const x = Math.round(x0s + (i - n / 2) * step * f / d - x0 - 0.5); if (x >= 0 && x < w) row[i] = B[(r * w + x) * 4]; }
    G.push(row);
  }
  const win = (i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * (i + 0.5) / n);
  let mean = 0; for (const r of G) for (const v of r) mean += v; mean /= n * n;
  const A = G.map((r, j) => Array.from(r, (v, i) => (v - mean) * win(i) * win(j)));
  const cosT = new Float64Array(n), sinT = new Float64Array(n);
  for (let k = 0; k < n; k++) { cosT[k] = Math.cos(2 * Math.PI * k / n); sinT[k] = Math.sin(2 * Math.PI * k / n); }
  const P = []; let tot = 0;
  for (let ky = 0; ky <= n / 2; ky++) for (let kx = -n / 2; kx < n / 2; kx++) {
    if (ky === 0 && kx <= 0) continue;
    if (Math.hypot(kx, ky) < 3) continue;   // (the long swell, a wave of 40 m, is one strong bin by nature: the chop is what must not tile)
    let re = 0, im = 0;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const t = ((kx * i + ky * j) % n + n) % n; re += A[j][i] * cosT[t]; im -= A[j][i] * sinT[t]; }
    const p = re * re + im * im; P.push(p); tot += p;
  }
  P.sort((a, b) => b - a);
  return (P[0] + P[1] + P[2] + P[3]) / tot;
}
test('X1: the estuary has no lattice: its pattern, read in metres, is spread over many wave trains, and every river has its own sea', () => {
  const ids = ['mersey', 'humber', 'thames', 'severn', 'tay', 'clyde', 'forth', 'tyne'], v = ids.map(id => peakiness(id));
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  assert.ok(mean < 0.235 && Math.max(...v) < 0.3, 'the spectral peakiness of the estuary pattern (old: 0.29 on average, up to 0.37): ' + v.map(x => x.toFixed(2)).join(' '));
  // the wave trains are seeded by the region: another river is another sea (the old trains had the same phases everywhere)
  const w = 400, h = 160, y0 = 640, mk = (id) => { const B = new Uint8ClampedArray(w * h * 4).fill(128); W.worldWaterChop(B, new Uint8Array(w * h).fill(1), w, h, 600, y0, { R: { id, level: -2.4, cam }, look: W.worldWaterLook('estuary'), vs: 1, ox: 0, oy: 0, cam }); return B; };
  const a = mk('mersey'), b = mk('humber'), a2 = mk('mersey');
  assert.deepEqual(Array.from(a), Array.from(a2), 'deterministic');
  let diff = 0; for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i]) diff++;
  assert.ok(diff > w * h * 0.4, 'another region id, another sea: ' + diff);
});

test('X2: the chop still has real crests and troughs and nothing over-bright (the water reads as water, not as a mask)', () => {
  const w = 500, h = 260, y0 = 560, B = new Uint8ClampedArray(w * h * 4).fill(120), wet = new Uint8Array(w * h).fill(1);
  W.worldWaterChop(B, wet, w, h, 550, y0, { R: { id: 'mersey', level: -2.4, cam }, look: W.worldWaterLook('estuary'), vs: 1, ox: 0, oy: 0, cam });
  let lit = 0, dark = 0, n = 0, mx = 0;
  for (let i = 0; i < B.length; i += 4) { n++; if (B[i] > 135) lit++; if (B[i] < 105) dark++; mx = Math.max(mx, B[i]); }
  assert.ok(lit / n > 0.04 && lit / n < 0.5, 'crests: ' + (lit / n).toFixed(2));
  assert.ok(dark / n > 0.04 && dark / n < 0.6, 'troughs: ' + (dark / n).toFixed(2));
  assert.ok(mx < 235, 'no white-out: ' + mx);
});

/* ---------- the swell: moored floaters rock, in proportion to the sea ---------- */
const OPTS = { gap: 14, gangway: 5, shed: 36, shedSide: 1, berthA: -30, berthB: 40 };
const stage = () => ({ id: 'stage', obj: 'boat.landing-stage', x: -30, z: 100, y: -2.45, waterline: -2.4, facing: 342, static: true, model: { opts: Object.assign({}, OPTS) } });
const ferry = () => ({ id: 'ferry-1', obj: 'boat.river-ferry', x: -30, z: 100, y: -2.45, waterline: -2.4, facing: 342, static: true });
/** The largest pose (metres of heave, radians of roll and pitch) of a model over a minute of a given sea. */
function posed(ent, sea) {
  let heave = 0, roll = 0, pitch = 0;
  for (let t = 0; t < 60; t += 0.5) {
    const p = W.worldModelBuild(ent, cam, { season: 'summer', t, sea });
    if (!p.pose) continue;
    heave = Math.max(heave, Math.abs(p.pose.heave)); roll = Math.max(roll, Math.abs(p.pose.roll)); pitch = Math.max(pitch, Math.abs(p.pose.pitch));
  }
  return { heave, roll, pitch };
}
test('X3: ferries and the landing stage rock in a swell; ferries more than the stage; a calm day is nearly still; no sea, no rocking', () => {
  assert.ok(W.worldModelRocks('boat.river-ferry') && W.worldModelRocks('boat.landing-stage'), 'floaters with a bob rock');
  assert.ok(!W.worldModelRocks('street.bench'), 'a bench does not');
  const f = posed(ferry(), 1), s = posed(stage(), 1), calm = posed(ferry(), 0.1);
  assert.ok(f.heave > 0.07 && f.heave < 0.2, 'a ferry heaves a hand: ' + f.heave.toFixed(3) + ' m');
  assert.ok(f.roll > 0.006 && f.roll < 0.03 && f.pitch > 0.003 && f.pitch < 0.02, `it rolls about a degree and pitches a little: ${f.roll.toFixed(4)} ${f.pitch.toFixed(4)} rad`);
  assert.ok(s.heave > 0.02 && s.heave < f.heave && s.roll < f.roll && s.pitch < f.pitch, 'the pontoon moves less than the ferries it serves: ' + s.heave.toFixed(3) + ' m');
  assert.ok(calm.heave < f.heave * 0.25 && calm.roll < f.roll * 0.25, 'flat calm: ' + calm.heave.toFixed(3) + ' m against ' + f.heave.toFixed(3));
  // no sea given (a baked static) and no time: the rest pose; the moving agents' idle bob (a time, no sea) is the old small one
  assert.equal(W.worldModelBuild(ferry(), cam, { season: 'summer' }).pose, null, 'a baked static never moves');
  const idle = posed(ferry(), undefined);
  assert.ok(idle.heave < 0.03, 'an agent\'s idle bob is unchanged: ' + idle.heave.toFixed(3));
  // the whole prim follows the pose: the faces differ between two moments of the swell
  const p0 = W.worldModelBuild(ferry(), cam, { season: 'summer', t: 0.4, sea: 1 }), p1 = W.worldModelBuild(ferry(), cam, { season: 'summer', t: 2.9, sea: 1 });
  assert.notDeepEqual(p0.faces.map(x => x.pts[0]), p1.faces.map(x => x.pts[0]));
});

/* ---------- the shed, and the ferries it hid ---------- */
const SCENE = () => {
  const item = (globalThis.__scPacks['world-test'] || []).find(i => i.id === 'liverpool-pier-head-1-w3');
  assert.ok(item, 'the Pier Head scene is registered');
  return JSON.parse(JSON.stringify(W.worldHostSpec(item)));
};
/** The screen box (scene units) of the faces of a built prim whose role is in `roles` (all of them when none is given). */
function screenBox(prim, roles) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const f of prim.faces) {
    if (roles && !roles.includes(f.role)) continue;
    for (const q of f.pts) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
  }
  return { x0, y0, x1, y1 };
}
/** The share of box b that box a covers. */
const covered = (a, b) => { const w = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)), h = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)); return w * h / Math.max(1, (b.x1 - b.x0) * (b.y1 - b.y0)); };
test('X4: the shed of the stage can stand on the inland edge, off the berth side where a ferry lies', () => {
  const wallX = (opts) => { const e = stage(); e.model = { opts: Object.assign({}, OPTS, { shed: 22 }, opts) }; const p = W.worldModelBuild(e, cam, { season: 'summer', strict: true }); const b = screenBox(p, ['wall']); assert.ok(b.x1 > b.x0, 'a shed wall'); return (b.x0 + b.x1) / 2; };
  const mid = wallX({ shedSide: 0 }), inland = wallX({ shedSide: 1 });
  assert.ok(inland > mid + 8, 'seen along the wall, an inland shed stands nearer the wall (to the right): ' + mid.toFixed(0) + ' -> ' + inland.toFixed(0));
});

test('X5: at the Pier Head the second ferry shows: the terminal shed does not stand in front of its hull (and the metric sees the old layout)', () => {
  const share = (spec) => {
    const world = W.worldBuild(spec, { season: 'summer' }), c = world.cam;
    const prim = (id) => W.worldExtrudeHull(world.entities.find(e => e.id === id), c, { season: 'summer' });
    const st = prim('stage'), f2 = prim('ferry-2');
    assert.ok(st && f2);
    return covered(screenBox(st, ['wall', 'roof', 'canopy', 'plinth']), screenBox(f2, ['hull']));
  };
  const now = share(SCENE());
  const old = SCENE(); const o = old.entities.find(e => e.id === 'stage').model.opts; delete o.shedSide; o.shed = 5;
  const before = share(old);
  assert.ok(before > 0.4, 'the old layout hid half the hull of the second ferry: ' + before.toFixed(2));
  assert.ok(now < 0.15, 'now the shed covers almost none of it: ' + now.toFixed(2));
});

/* ---------- foam at the waterline ---------- */
test('X6: the hulls carry a standing wash: a broken skirt of foam at the waterline and a bow wave at each end, upright so a low eye sees it', () => {
  for (const e of [ferry(), stage()]) {
    const p = W.worldModelBuild(e, cam, { season: 'summer', strict: true });
    const foam = p.faces.filter(f => f.role === 'foam');
    const upright = foam.filter(f => Math.max(...f.pts.map(q => q[1])) - Math.min(...f.pts.map(q => q[1])) > 0.08);
    assert.ok(foam.length > 12, e.obj + ' foam faces: ' + foam.length);
    assert.ok(upright.length >= 8, e.obj + ' standing pieces: ' + upright.length);
  }
});

/* ---------- a prop at the lens ---------- */
test('X7: the fill keeps a bollard to where it is at most a fifth of the frame (a 1 m post no nearer than f / 180), on every seed', () => {
  const spec0 = SCENE();
  for (const seed of [1, 2, 4, 5, 8]) {
    const spec = JSON.parse(JSON.stringify(spec0)); spec.seed = seed;
    const world = W.worldBuild(spec, { season: 'summer' }), band = world.cam.f * 1 / 180;
    for (const e of world.entities) if (e.obj === 'street.bollard') assert.ok(e.z >= band - 0.05, `seed ${seed}: a bollard at ${e.z.toFixed(1)} m (the band ends at ${band.toFixed(1)} m)`);
  }
});
