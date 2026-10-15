// A railway reads as a railway (SCENE_LESSONS U): a timetable shows a train when the scene is shown and every loop, a main line has a
// bed of ballast and rails its trains ride on, a railway bank is lineside ground (mottled, scrub on the slope the camera sees) and a
// train of a main line is pale. The Fleet Pond scene is the worked example; the rest are small hand-made worlds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadEngine } from '../tools/lib/world/convert.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const E = loadEngine({ root: ROOT });
const item = (E.packs['world-test'] || []).find(it => it.id === 'fleet-pond-2-w3');
const railZ = x => 196 + 0.06 * x;
const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
const CAM = { eye: 2.4, fov: 66, horizon: 400, heading: 8, water: -0.1 };

/** A small world: a lawn, a pond to the line's foot, a double main line along the far shore on a 2 m embankment. */
function lineWorld(o = {}) {
  return {
    v: 3, seed: o.seed || 3, camera: CAM, place: { lat: 51.2853, lon: -0.8266, region: 'hampshire' },
    surfaces: [
      { id: 'land', kind: 'grass', poly: rect(-300, 0.5, 300, 260) },
      { id: 'pond', kind: 'water', water: 'pond', poly: rect(-300, 20, 300, railZ(0) - 16) },
      { id: 'railway', kind: o.tram ? 'tram' : 'rail', path: [[-320, railZ(-320)], [320, railZ(320)]], width: 9 },
    ],
    ground: o.noBank ? undefined : { features: [{ id: 'emb', kind: 'embankment', path: [[-420, railZ(-420)], [420, railZ(420)]], width: 30, h: 2.0 }] },
    entities: [],
    life: [{ who: 'train', on: 'railway', every: '2min', mix: { 'rail.train-mainline': 1 } }],
    fill: false,
  };
}

test('a timetable shows a train when the scene is shown: the first of the first track is on the frame, whatever the seed', () => {
  for (const seed of [1, 2, 3, 5, 8, 13, 21, 34]) {
    const world = E.worldBuild(lineWorld({ seed }), {});
    const nav = E.worldNavBuild(world), life = E.worldLifeInit(world, nav, 0, { warm: false });
    const e = life.pops[0].entries[0].tt;
    assert.ok(e, 'a timetable entry');
    assert.equal(life.show0, 0, 'no warm-up: the scene is shown at the clock of its start');
    const tan = 800 / world.cam.f;
    const on = E.worldTrafficRailAt(life.traffic, e, life.show0).filter(r => r.track.id.endsWith(':f') && r.z > 1 && r.x > -r.z * tan && r.x < r.z * tan);
    assert.equal(on.length, 1, `seed ${seed}: one train of the first track on the frame at the first moment`);
    // it runs left to right (the line is drawn left to right and its first track is the one in that direction)
    const later = E.worldTrafficRailAt(life.traffic, e, life.show0 + 1).find(r => r.k === on[0].k);
    assert.ok(later.x > on[0].x + 20, `seed ${seed}: left to right at a main line's speed (${(later.x - on[0].x).toFixed(1)} m in a second)`);
    assert.ok(later.x - on[0].x < 45, 'and not faster than 160 km/h');
  }
});

test('the same crossing comes round every loop, and the next train runs the other way', () => {
  const world = E.worldBuild(lineWorld(), {});
  const nav = E.worldNavBuild(world), life = E.worldLifeInit(world, nav, 0, { warm: false });
  const e = life.pops[0].entries[0].tt, tan = 800 / world.cam.f;
  const seenAt = (t) => E.worldTrafficRailAt(life.traffic, e, t).filter(r => r.z > 1 && r.x > -r.z * tan && r.x < r.z * tan);
  const L = E.WORLD_LOOP_S;
  for (const dt of [0, 1, 2, 3]) {
    assert.deepEqual(seenAt(dt).map(r => [((r.k % 2) + 2) % 2, +r.x.toFixed(4)]), seenAt(dt + L).map(r => [((r.k % 2) + 2) % 2, +r.x.toFixed(4)]), `t ${dt} and t ${dt} + loop`);
  }
  // the following train is on the other track (right to left) and in view a period later
  const next = seenAt(e.period + 1.5);
  assert.ok(next.length >= 1 && next.every(r => r.track.id.endsWith(':b')), 'the next one runs on the other track');
  assert.ok(next[0].dir < 0, 'right to left');
});

test('the warm-up is counted: with the default warm-up the first frame is at the clock after it (life.show0)', () => {
  const world = E.worldBuild(lineWorld(), {});
  const nav = E.worldNavBuild(world), life = E.worldLifeInit(world, nav, 0, {});
  assert.equal(life.show0, 90);
  assert.ok(life.t >= 89.9, 'the sim has run its warm-up');
  const e = life.pops[0].entries[0].tt, tan = 800 / world.cam.f;
  const on = E.worldTrafficRailAt(life.traffic, e, life.show0).filter(r => r.z > 1 && r.x > -r.z * tan && r.x < r.z * tan);
  assert.equal(on.length, 1, 'a train on the frame at the moment the scene is shown');
});

test('a free phase keeps the seeded random offset (o.phase)', () => {
  const world = E.worldBuild(lineWorld(), {});
  const nav = E.worldNavBuild(world), T = E.worldTraffic(world, nav);
  const mk = (rnd, extra) => E.worldTrafficSchedule(T, Object.assign({ id: 'x', cls: 'train', obj: 'rail.train-mainline', every: 120, line: 'railway', rng: rnd }, extra));
  const a = mk(() => 0.1, { phase: 'free' }), b = mk(() => 0.7, { phase: 'free' });
  assert.notEqual(a.offset, b.offset);
  const c = mk(() => 0.1, { show0: 90 }), d = mk(() => 0.7, { show0: 90 });
  assert.equal(c.offset, d.offset, 'a framed phase does not depend on the seed');
});

test('a main line is laid on a bed: ballast, two tracks of rails and a cable trough each side; a tram line gets none', () => {
  // the bed is an edge of the fill, and edges run even when the author's fill is off (fill: false)
  const w = E.worldBuild(lineWorld(), {});
  assert.ok((w.lines || []).some(l => l.kind === 'ballast'), 'laid with the fill off');
  const w2 = E.worldBuild(Object.assign(lineWorld(), { fill: undefined }), {});
  const lines = (w2.lines || []).filter(l => l.auto === 'rail');
  const bed = lines.find(l => l.kind === 'ballast');
  assert.ok(bed, 'a ballast line under the railway');
  assert.deepEqual(bed.tracks.slice().sort((a, b) => a - b), [-2, 2], 'two tracks 4 m apart, as the timetable has them');
  assert.ok(bed.width > 6 && bed.width < 9, 'a bed about 7 m wide: ' + bed.width);
  assert.equal(lines.filter(l => l.kind === 'trough').length, 2);
  const prims = E.worldExtrude(w2, w2.cam, { hulls: false }).filter(p => p.sub === 'ballast');
  assert.ok(prims.length >= 4, 'drawn in pieces: ' + prims.length);
  const strokes = prims.reduce((n, p) => n + (p.details || []).filter(d => d.type === 'stroke').length, 0);
  assert.ok(strokes >= prims.length * 4, 'four rails in every piece: ' + strokes);
  const tram = E.worldBuild(Object.assign(lineWorld({ tram: true }), { fill: undefined }), {});
  assert.deepEqual((tram.lines || []).filter(l => l.kind === 'ballast'), [], 'a tram runs flush in its street');
});

test('a train rides on its bed: its wheels are WORLD_RAIL_BED.h over the ground, a tram is flush', () => {
  const world = E.worldBuild(lineWorld(), {});
  const nav = E.worldNavBuild(world), life = E.worldLifeInit(world, nav, 0, { warm: false });
  for (let s = 0; s < 15 * 4; s++) E.worldLifeTick(life, 1 / 15);
  const train = life.agents.find(a => a.cls === 'train');
  assert.ok(train, 'a train');
  const g = E.sceneGroundHeight(world.cam, train.x, train.z);
  assert.ok(Math.abs(train.y - (g + E.WORLD_RAIL_BED.h)) < 0.12, `train y ${train.y} over ground ${g}`);
  assert.ok(g > 1.8, 'on the embankment');
});

test('the invariant floating: a train at the bed is quiet, a train a metre above it is not', () => {
  const cam = E.sceneCamera({ camera: CAM });
  const surf = [{ id: 'land', kind: 'grass', poly: rect(-200, 0.5, 200, 400) }, { id: 'railway', kind: 'rail', path: [[-300, 100], [300, 100]], width: 9 }];
  const world = { v: 3, cam, surfaces: surf, entities: [], seed: 1, place: { lat: 51.29, lon: -0.82 } };
  const train = (y) => ({ id: 't1', cls: 'train', obj: 'rail.train-mainline', static: false, x: 0, z: 100, y, height: 3.8, w: 18, layer: 'rail', speed: 20, vx: 20, vz: 0, state: 'drive', view: 'side', mirror: false });
  const frame = (y) => {
    const e = train(y), a = E.sceneProject(cam, 0, 100, y), b = E.sceneProject(cam, 0, 100, y + 3.8), w = 18 * cam.f / 100;
    e.box = [a.X - w / 2, b.Y, a.X + w / 2, a.Y];
    return { t: 0, cam, W: 1600, H: 900, ents: [e], surfaces: surf };
  };
  const run = (y) => E.worldInvariants(frame(y), { world, rules: ['floating'] }).filter(v => v.rule === 'floating');
  assert.deepEqual(run(0), [], 'on the ground');
  assert.deepEqual(run(E.WORLD_RAIL_BED.h), [], 'on its bed');
  assert.equal(run(1.2).length, 1, 'a train 1.2 m above the ground floats');
});

test('a railway bank is lineside ground: scrub on the slope the camera sees, none on the far side, nothing on a hill without a line', () => {
  const w = E.worldBuild(lineWorld(), {});
  const prims = E.worldTerrainPrims(w, w.cam, { season: 'summer' });
  const scrub = prims.flatMap(p => (p.ops || []).filter(o => o.t === 'scrub'));
  assert.ok(scrub.length > 120, 'thickets on the bank: ' + scrub.length);
  for (const o of scrub) {
    assert.ok(o.z < railZ(o.wx) - 5.2, `a bush at x ${o.wx}, z ${o.z} stands on the camera side of the bed (line at ${railZ(o.wx).toFixed(1)})`);
    assert.ok(o.z > railZ(o.wx) - 15, 'and above the foot');
  }
  // a hill of the same shape with no rail on it carries none, and its ground stays one smooth grass
  const hill = E.worldBuild(lineWorld({ tram: false }), {});
  hill.surfaces = hill.surfaces.filter(s => s.kind !== 'rail');
  hill.life = [];
  const plain = E.worldTerrainPrims(hill, hill.cam, { season: 'summer' });
  assert.equal(plain.flatMap(p => (p.ops || []).filter(o => o.t === 'scrub')).length, 0);
  // the bank's quads are mottled (many tones), the hill's are not
  const tones = (ps) => new Set(ps.flatMap(p => p.faces.map(f => f.hex))).size;
  assert.ok(tones(prims) > tones(plain) * 1.5, `mottled: ${tones(prims)} tones against ${tones(plain)}`);
});

test('a main-line unit is a pale one: the light bodies of the line colours, never a dark unit that reads as a hole in the trees', () => {
  const kb = E.worldKb('rail.train-mainline');
  assert.ok(kb && kb.liveries, 'the descriptor lists liveries');
  const got = new Set();
  for (let i = 0; i < 48; i++) got.add(E.worldKbVariant(kb, { lat: 51.28, lon: -0.82, region: 'hampshire' }, () => (i + 0.5) / 48));
  assert.deepEqual([...got].filter(v => v % 3 !== 0), [], 'only variants with the light body (v % 3 == 0)');
  assert.ok(got.size >= 3, 'and a choice of them: ' + [...got]);
});

test('Fleet Pond: a train is on the first frame, a second runs the other way, and nothing of the near scene is a train\'s doing', () => {
  assert.ok(item, 'the scene is registered');
  const spec = E.worldHostSpec(item);
  const world = E.worldHostWorld(spec, { id: item.id, season: 'summer' });
  const d = E.worldHostDriver(world, { ms: Date.parse('2026-07-16T13:00:00Z'), deterministic: true });
  const tan = 800 / world.cam.f, ids = new Map();
  for (let t = 0; t <= 100; t += 1) {
    for (const a of d.at(t)) if (a.cls === 'train') {
      if (!ids.has(a.id)) ids.set(a.id, { first: t, dir: [], vis: 0, y: [] });
      const r = ids.get(a.id);
      if (a.z > 1 && a.x > -a.z * tan && a.x < a.z * tan) r.vis++;
      r.y.push(Math.abs(a.y - (E.sceneGroundHeight(world.cam, a.x, a.z) + E.WORLD_RAIL_BED.h)));
      r.dir.push(a.x);
    }
  }
  const trains = [...ids.values()];
  assert.ok(trains.length >= 2, 'two trains in the first 100 s: ' + trains.length);
  assert.equal(trains[0].first, 0, 'the first is on the scene at the first moment');
  assert.ok(trains[0].vis >= 3, 'and in view for seconds: ' + trains[0].vis);
  assert.ok(trains[0].dir[trains[0].dir.length - 1] > trains[0].dir[0], 'left to right');
  assert.ok(trains[1].dir[trains[1].dir.length - 1] < trains[1].dir[0], 'the second runs right to left');
  assert.ok(trains[1].first > 70 && trains[1].first < 100, 'the second a period later: ' + trains[1].first);
  for (const r of trains) assert.ok(Math.max(...r.y) < 0.12, 'riding on the bed all the way: ' + Math.max(...r.y).toFixed(3));
  // the far shore is a railway: a bed under the line and scrub on its bank
  assert.ok((world.lines || []).some(l => l.kind === 'ballast' && l.auto === 'rail'), 'the bed is laid');
  const scrub = E.worldTerrainPrims(world, world.cam, { season: 'summer' }).flatMap(p => (p.ops || []).filter(o => o.t === 'scrub'));
  assert.ok(scrub.length > 120, 'scrub on the bank');
});
