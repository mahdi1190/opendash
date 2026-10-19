// World engine, package appearance: the LANDING STAGE model (src/app/79-world-4models-landing.js) and the seated figures of the
// boats. A floating pontoon with a hinged gangway to the river wall, a shed, fenders; a crew that sits in the boat (legs bent).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorld } from '../tools/lib/world/load.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = loadWorld(ROOT);
const cam = W.sceneCamera({ camera: { eye: 1.7, fov: 86, horizon: 500, heading: 0, water: -2.4 } });
const ent = (o, x) => Object.assign({ id: 'ls1', obj: 'boat.landing-stage', x: -30, z: 60, y: -2.45, waterline: -2.4, facing: 342, static: true }, o, x || {});
const count = (p, role) => p.faces.filter(f => f.role === role).length;

test('the landing stage is a registered floating model with a library object and a real size', () => {
  assert.ok(W.worldModelGet('landing-stage'), 'registered');
  assert.equal(W.worldModelFor('boat.landing-stage').id, 'landing-stage');
  assert.equal(W.worldModelGet('landing-stage').float, true);
  const s = W.worldModelSizeOf('boat.landing-stage');
  assert.ok(s.w >= 60 && s.d >= 8 && s.h >= 4, JSON.stringify(s));
  assert.equal(W.sceneObj('boat.landing-stage').weight, 0, 'named by a scene, never picked by a fill');
});

test('conformance: the stage builds from every angle, finite, within budget, deterministic, not a clone, and grows with its size', () => {
  const r = W.worldModelCheck('landing-stage', { seasons: ['summer', 'winter'] });
  assert.deepEqual(r.problems, [], r.problems.join('; '));
  assert.ok(r.stats.maxFaces > 100 && r.stats.maxFaces <= 1600, 'faces ' + r.stats.maxFaces);
});

test('the stage has a hull, deck, shed, fenders, a hinged gangway with rails, lamps, life rings, brows and people', () => {
  const p = W.worldModelBuild(ent({ model: { opts: { gap: 14, gangway: 5, shed: 5, berthA: -30, berthB: 40, people: 1 } } }), cam, { season: 'summer', strict: true });
  assert.ok(p && p.model && p.modelId === 'landing-stage');
  for (const role of ['hull', 'antifoul', 'strake', 'edge-line', 'wall', 'roof', 'window', 'fender', 'bollard', 'girder', 'hinge', 'plate', 'rail', 'post', 'lamp', 'ring', 'foam', 'torso', 'head']) assert.ok(count(p, role) > 0, 'a ' + role);
  assert.ok(count(p, 'deck') >= 3, 'the deck of the gangway and one brow each: ' + count(p, 'deck'));
  assert.ok(p.waterline != null, 'it floats');
  assert.ok(p.lights.length >= 6, 'lamps are world lights: ' + p.lights.length);
});

test('the gangway reaches the wall: its top end meets the quay top (ground level) whatever the quay, and its low end follows the stage', () => {
  const ends = (wl) => {
    const p = W.worldModelBuild(ent({ y: wl - 0.05, waterline: wl, model: { opts: { gap: 14, gangway: 5 } } }), cam, { season: 'summer' });
    const g = p.faces.filter(f => f.role === 'girder'); assert.ok(g.length);
    const pts = g.flatMap(f => f.pts), hi = pts.reduce((a, q) => q[0] > a[0] ? q : a, pts[0]), lo = pts.reduce((a, q) => q[0] < a[0] ? q : a, pts[0]);
    return { wall: hi[1], stage: lo[1] };
  };
  const a = ends(-4.5), b = ends(-1.8);
  // the quay top is the ground (world y 0) at any waterline: the wall end stays where the wall's top is on the screen ...
  assert.ok(Math.abs(a.wall - b.wall) < 1, 'the top end stays at the quay top: ' + a.wall + ' ' + b.wall);
  // ... and the stage end sits at the water, so a deeper river puts it lower on the screen (a larger Y)
  assert.ok(a.stage > b.stage + 5, 'the low end follows the water: ' + a.stage + ' ' + b.stage);
});

test('the dinghy crew SITS in the boat: thighs, shins, arms and a head, not a column at the gunwale', () => {
  let seen = 0;
  for (let k = 0; k < 24 && !seen; k++) {
    const p = W.worldModelBuild({ id: 'din' + k, obj: 'boat.dinghy', x: 0, z: 18, y: -2.45, waterline: -2.4, facing: 70, static: true, model: { opts: { state: 'sailing' } } }, cam, { season: 'summer', strict: true });
    if (p && count(p, 'head') > 0) { seen = k + 1; assert.ok(count(p, 'thigh') >= 2 && count(p, 'shin') >= 2, 'legs: ' + count(p, 'thigh') + ' ' + count(p, 'shin')); assert.ok(count(p, 'arm') >= 2, 'arms'); assert.equal(count(p, 'leg'), 0, 'no stand-up legs'); }
  }
  assert.ok(seen, 'a dinghy under way carries a crew');
});
