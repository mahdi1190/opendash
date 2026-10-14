// The STRICT critic (look's worldDetailCoverage + worldDetailProblems; tools/lib/world/critic.mjs; requirements C3, C6, N2, N4,
// P7, QP1, QP4). The old critic judged by entity boxes and counted lived surfaces as dressed: it passed a sunken river with flat
// slab walls, flat towpaths and paving, empty lawns and an empty foreground. Each rule below FAILS on the baseline engine (the
// ground detail switched off, or the fill off) and passes once the engine's defaults dress the world.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorld } from '../tools/lib/world/load.mjs';
import { worldCritic } from '../tools/lib/world/critic.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = loadWorld(ROOT);
// the baseline look: no ground detail (every surface and channel wall drawn as flat colour, as before 14 Oct)
const W0 = loadWorld(ROOT, { extra: ';worldGroundDetail = undefined; worldChannelWalls = undefined; worldGroundTextured = undefined;' });
const SHEF = { lat: 53.39, lon: -1.47, region: 'south-yorkshire' }, HANTS = { lat: 51.29, lon: -0.82, region: 'hampshire' };
const quay = () => ({ v: 3, place: Object.assign({ style: 'river-city' }, SHEF), camera: { eye: 1.7, fov: 62, horizon: 420, heading: 100, water: -2.2 },
  surfaces: [{ id: 'quay-l', kind: 'pavement', poly: [[-60, 1], [-7, 1], [-7, 300], [-60, 300]] }, { id: 'river', kind: 'water', water: 'river', poly: [[-7, 1], [8, 1], [8, 300], [-7, 300]] },
    { id: 'quay-r', kind: 'pavement', poly: [[8, 1], [60, 1], [60, 300], [8, 300]] }], seed: 6 });
const canal = () => ({ v: 3, place: Object.assign({ style: 'canal' }, HANTS), camera: { eye: 1.65, fov: 62, horizon: 470, heading: 200, water: -0.4 },
  surfaces: [{ id: 'land', kind: 'grass', poly: [[-300, 1], [300, 1], [300, 400], [-300, 400]] }, { id: 'cut', kind: 'water', water: 'canal', poly: [[-12, 1], [-3, 1], [-1, 400], [-10, 400]] },
    { id: 'tow', kind: 'towpath', path: [[0.5, 1], [2, 200], [3, 400]], width: 2.6 }], life: [{ who: 'walkers', on: 'tow', rate: '5/min', edges: ['S', 'N'] }], seed: 5 });
const rules = (E, spec, o = {}) => {
  const world = E.worldBuild(spec, Object.assign({ validate: false }, o));
  const rec = E.worldDetailCoverage(world, world.cam), kit = (world.fillState && world.fillState.style) || E.worldFillStyle(world);
  return { rec, world, rules: E.worldDetailProblems(rec, { kit }).filter(p => p.severity !== 'warn').map(p => p.rule) };
};

test('the strict measure looks at silhouettes, not boxes: a tree crown has sky gaps, a lone tree covers less than its box', () => {
  for (const n of ['worldArtMask', 'worldDetailCoverage', 'worldDetailProblems']) assert.equal(typeof W[n], 'function', n);
  const share = (m) => m.grid.reduce((a, v) => a + v, 0) / m.grid.length;
  const oak = W.worldArtMask('tree.canal-oak', 0, 'summer'), mill = W.worldArtMask('building.mill-red-brick', 0, 'summer');
  assert.ok(oak && share(oak) < 0.8, 'an oak with limbs and sky gaps: ' + (oak && share(oak)));
  assert.ok(mill && share(mill) > 0.65, 'a mill is solid: ' + (mill && share(mill)));
  const spec = { v: 3, place: Object.assign({ style: 'park' }, HANTS), camera: { eye: 1.65, fov: 62, horizon: 470, heading: 0 }, surfaces: [], entities: [{ obj: 'tree.canal-oak', at: [0, 25], id: 'oak' }], fill: false, backdrop: { style: 'woodland' }, seed: 1 };
  const world = W.worldBuild(spec, { validate: false, fill: false }), cam = world.cam, oakE = world.entities.find(e => e.id === 'oak');
  const b = W.worldEntityBox(cam, oakE), boxArea = (Math.min(1600, b[2]) - Math.max(0, b[0])) * (Math.min(900, b[3]) - Math.max(0, b[1])) / (1600 * 900);
  const rec = W.worldDetailCoverage(Object.assign({}, world, { backdrop: null }), cam, { debug: true });
  const objShare = [...rec.grid.cells].filter(c => c === 'o').length / rec.grid.cells.length;
  assert.ok(objShare < boxArea * 0.85, `silhouette ${objShare} under the box ${boxArea}`);
});

test('bareChannel and flatSurface: a sunken city river FAILS with flat walls and paving (the baseline) and passes dressed', () => {
  const base = rules(W0, quay());
  for (const r of ['bareChannel', 'flatSurface']) assert.ok(base.rules.includes(r), r + ' on the baseline: ' + base.rules.join(' '));
  assert.ok(base.rec.channel.flat > 0.05, 'flat wall share ' + base.rec.channel.flat);
  const now = rules(W, quay());
  for (const r of ['bareChannel', 'flatSurface']) assert.ok(!now.rules.includes(r), r + ' after the engine dresses it: ' + now.rules.join(' '));
  assert.equal(now.rec.channel.flat, 0);
  assert.ok(now.rec.channel.area > 0.05, 'the walls are seen: ' + now.rec.channel.area);
});

test('flatSurface: a lived towpath drawn as one flat band FAILS (people do not texture it) and passes textured', () => {
  const base = rules(W0, canal());
  assert.ok(base.rules.includes('flatSurface'), base.rules.join(' '));
  assert.ok(base.rec.surfaces.tow && base.rec.surfaces.tow.flat > 0.9, 'the towpath is flat colour');
  const now = rules(W, canal());
  assert.ok(!now.rules.includes('flatSurface'), now.rules.join(' '));
  assert.equal(now.rec.surfaces.tow.flat, 0);
});

test('bareGround, emptyForeground, noFraming, lowVariety and noLife: an unfilled world FAILS each; the filled one passes', () => {
  const spec = { v: 3, place: Object.assign({ style: 'park' }, HANTS), camera: { eye: 1.65, fov: 62, horizon: 470, heading: 0 },
    surfaces: [{ id: 'lawn', kind: 'grass', poly: [[-300, 1], [300, 1], [300, 400], [-300, 400]] }, { id: 'walk', kind: 'path', path: [[2, 1], [6, 120], [-10, 400]], width: 2.4 }], seed: 7 };
  const off = rules(W, spec, { fill: false });
  for (const r of ['bareGround', 'emptyForeground', 'noFraming', 'lowVariety', 'noLife']) assert.ok(off.rules.includes(r), r + ' unfilled: ' + off.rules.join(' '));
  const on = rules(W, spec);
  assert.deepEqual(on.rules, [], 'the engine defaults pass the strict critic: ' + on.rules.join(' '));
  assert.ok(on.world.life.length >= 1, 'the kit life defaults (N3)');
});

test('noBough: a natural view without a bough from a top corner FAILS; the engine frames it with the kit bough and its trunk', () => {
  const spec = { v: 3, place: Object.assign({ style: 'pond' }, HANTS), camera: { eye: 1.65, fov: 62, horizon: 455, heading: 70 },
    surfaces: [{ id: 'pond', kind: 'water', water: 'pond', poly: [[-30, 14], [25, 12], [40, 60], [-35, 70]] }], seed: 3 };
  const off = rules(W, spec, { fill: false });
  assert.ok(off.rules.includes('noBough'), off.rules.join(' '));
  const on = rules(W, spec);
  assert.ok(!on.rules.includes('noBough') && on.rec.frame.hang, 'framed by ' + on.rec.frame.hang);
  const bough = on.world.entities.find(e => e.obj === on.rec.frame.hang), trunk = on.world.entities.find(e => e.id === bough.parent);
  assert.ok(trunk, 'the bough has its trunk');
  const tX = W.sceneProject(on.world.cam, trunk.x, trunk.z, 0).X;
  assert.ok(tX < 0 || tX > 1600, 'its trunk stands outside the frame: ' + tX);
});

test('fewLayers: a camera looking straight into a wall FAILS (one layer); the canal view carries five or more', () => {
  const wall = { v: 3, place: Object.assign({ style: 'terraced-street' }, SHEF), camera: { eye: 1.65, fov: 62, horizon: 470, heading: 0 },
    surfaces: [{ id: 'pave', kind: 'pavement', poly: [[-60, 1], [60, 1], [60, 3], [-60, 3]] }], buildings: [{ id: 'wall', foot: [[-80, 3.2], [80, 3.2], [80, 5], [-80, 5]], h: 30 }], seed: 2 };
  const r = rules(W, wall, { fill: false, frame: false });
  assert.ok(r.rules.includes('fewLayers'), r.rules.join(' ') + ' ' + JSON.stringify(r.rec.layers));
  const c = rules(W, canal());
  assert.ok(c.rec.layerCount >= 5, 'layers ' + JSON.stringify(c.rec.layers));
});

test('the in-engine coverage has a strict mode with the same verdict; the plain mode is unchanged', () => {
  const world = W.worldBuild(quay(), { validate: false }), world0 = W0.worldBuild(quay(), { validate: false });
  const s = W.worldCoverage(world, world.cam, { strict: true }), s0 = W0.worldCoverage(world0, world0.cam, { strict: true });
  assert.equal(s.strict, true);
  assert.equal(s0.ok, false); assert.ok(/channel wall/.test(s0.msg), s0.msg);
  assert.ok(!s.problems.some(p => p.rule === 'bareChannel'));
  const plain = W.worldCoverage(world, world.cam);
  assert.ok(!plain.strict && 'bare' in plain && 'sky' in plain, 'the plain mode keeps its shape (the invariant checker reads it)');
});

test('the three test scenes PASS the strict critic purely through the engine defaults (no scene was edited)', () => {
  const items = typeof W.sceneItems === 'function' ? (W.sceneItems('world-test') || []) : [];
  for (const id of ['fleet-canal-2-w3', 'fleet-pond-2-w3', 'sheffield-kelham-1-w3']) {
    const it = items.find(i => i.id === id);
    assert.ok(it, id + ' registered');
    const c = worldCritic(W, W.worldHostSpec(it), {});
    assert.ok(c.strict, id + ': the strict measure ran');
    assert.deepEqual(c.strict.problems.filter(p => p.severity !== 'warn').map(p => p.rule + ': ' + p.msg), [], id);
    assert.ok(c.strict.rec.layerCount >= 5 && (c.strict.rec.frame.top || c.strict.rec.frame.left || c.strict.rec.frame.right), id + ' layered and framed');
  }
});
