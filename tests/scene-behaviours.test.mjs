// Motion behaviours (src/app/70-scene-lib-behaviours.js): movers built from ground metres stay on their medium, round
// obstacles, at their real size, in a layer that is not painted over, with phase-locked arm swing and eased, timed paths.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry } from '../tools/lib/anim-render.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const g = loadRegistry(ROOT).R.get;
const B = g('sceneBehave');
const scene = () => ({
  v: 2, id: 'behave-test', view: { lat: 51.3, lon: -0.8 }, camera: { eye: 1.7, fov: 60, horizon: 450, heading: 180, water: -0.4 },
  surfaces: [{ id: 'land', kind: 'grass', rest: true }, { id: 'path', kind: 'path', path: [[-6, 3], [-6, 80]], width: 2.5 }],
  water: [{ id: 'pond', kind: 'lake', poly: [[0, 8], [30, 8], [30, 60], [0, 60]] }],
  place: [{ obj: 'boat.rowing', at: [12, 24] }],
});

test('the presets and the object hooks exist and use only engine kinds', () => {
  const kinds = g('SCENE_ANIM_KINDS');
  for (const n of ['stroll', 'brisk', 'jogger', 'child', 'elderly', 'dog-walker', 'duck', 'swan', 'heron-stalk', 'cattle-graze', 'pony-graze']) assert.ok(B.preset(n), n);
  for (const h of ['person-walk', 'swimmer', 'swan', 'dabble', 'heron', 'kingfisher', 'songbird', 'graze', 'dog']) for (const k of B.hooks(h, { neck: [0, 0], tail: [0, 0] })) assert.ok(kinds.includes(k.kind), h + ' ' + k.kind);
  assert.equal(B.stride('stroll', 1.15), 1.15);
});

test('a duck stays on the water, off the banks and round the boat; it is sized from its real height', () => {
  const d = scene();
  const [a] = B.actors(d, { obj: 'bird.mallard', route: [[-3, 20], [12, 24], [34, 30]], seed: 3 });
  const cam = g('sceneCamera')(d);
  const r = B.route(d, [[-3, 20], [12, 24], [34, 30]], { floats: true, obj: 'bird.mallard' });
  for (const p of r.pts) { assert.ok(p[0] > 0 && p[0] < 30, 'on the pond ' + p); assert.ok(Math.hypot(p[0] - 12, p[1] - 24) > 1, 'clear of the boat ' + p); }
  assert.ok(a.path.every(p => p.length === 5 || p.length === 2) && a.path.length > 3);
  const p = a.path.find(q => q[1] < 2000), dd = cam.f * (cam.eye - cam.water) / (p[1] - cam.horizon), want = cam.f / dd * 0.35 / g('sceneObj')('bird.mallard').size[1];
  const s = a.sByY.find(t => Math.abs(t[0] - p[1]) < 1.5) || a.sByY[0];
  assert.ok(Math.abs(s[1] / want - 1) < 0.15, 'real size ' + s[1] + ' vs ' + want);
  assert.deepEqual(B.lint(Object.assign(d, { actors: [a] })).filter(q => q.rule === 'offWater' || q.rule === 'blocked'), []);
});

test('the lint finds a swan on the bank and a walker that walks on the spot', () => {
  const d = Object.assign(scene(), { actors: [{ obj: 'bird.swan', ground: [[-10, 20], [-12, 40]] }], place: [{ obj: 'person.walker', at: [-6, 12] }] });
  const rules = B.lint(d).map(q => q.rule);
  assert.ok(rules.includes('offWater')); assert.ok(rules.includes('walkOnSpot'));
});

test('a walker swings its near arm in phase with its legs, eases into stops and never teleports', () => {
  const d = scene();
  const [w] = B.actors(d, { obj: 'person.walker', preset: 'stroll', route: [[-6, 10], [-6, 50]], seed: 7 });
  const sh = g('sceneObjShapes')('person.walker', 0, 'summer');
  assert.deepEqual(sh.anim.map(h => h.kind), ['walk', 'walk']);
  const r = g('sceneRnd')(w.seed * 7 + 3), p0 = r(), p1 = r();
  assert.ok(Math.min(Math.abs(p0 - p1), 1 - Math.abs(p0 - p1)) < 0.012, 'phase locked');
  assert.equal(w.loop, 'loop');
  const first = w.path[0], last = w.path[w.path.length - 1];
  assert.ok(Math.hypot(first[0] - last[0], first[1] - last[1]) < 1, 'out and back: ends where it started');
  assert.ok(w.path.some(p => p[2] > 0), 'it pauses');
  assert.ok(w.anim.walk.period > 0.9 && w.anim.walk.period < 1.4);
});

test('the swimmers keep their wake still; the mallard dabbles; layers are not under the ground', () => {
  for (const v of [0, 1]) assert.deepEqual(g('sceneObjShapes')('bird.mallard', v, 'summer').order, ['wake', 'body', 'head']);
  assert.deepEqual(g('sceneObjShapes')('bird.mallard', 2, 'summer').order, ['wake', 'body']);
  const d = scene(), L = B.layerFor(d, [[-6, 20], [-6, 30]], { obj: 'person.walker' });
  const cam = g('sceneCamera')(d);
  assert.ok(cam.bands.findIndex(b => b.id === L.layer) >= g('sceneDepthBand')(cam, 20));
});
