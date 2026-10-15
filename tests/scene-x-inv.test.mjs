// The per-frame mover invariants ported from the world engine into v2 (merge package "checks", 15 Oct; src/app/78-scene-x-inv.js):
// a fixture that must fail and one that must pass for every rule, the full loop advancing t, and the registry load of 78-scene-x-*.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry } from '../tools/lib/anim-render.mjs';
import { SCENE_FILE_RE } from '../tools/lib/anim-sources.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REG = loadRegistry(ROOT);
const E = new Proxy({}, { get: (_, n) => REG.R.get(n) });
const rect = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}z`;
E.sceneObjDefine({ id: 'boat.itest', category: 'boat', size: [200, 40], real: { h: 1.9, l: 12, w: 2.1 }, tags: ['kit:boats', 'role:boat'], build: () => ({ hull: [['#336633', rect(-100, -40, 200, 40)]] }) });
E.sceneObjDefine({ id: 'structure.itest-fence', category: 'structure', size: [100, 30], real: { h: 1.2, w: 0.2 }, tags: ['fence'], build: () => ({ body: [['#886644', rect(-50, -30, 100, 30)]] }) });
E.sceneObjDefine({ id: 'bird.itest-duck', category: 'bird', size: [60, 40], tags: ['pond', 'duck', 'kit:birds', 'kit:water', 'role:bird'], build: () => ({ body: [['#775533', rect(-30, -20, 60, 20)]], head: [['#225522', rect(14, -36, 10, 16)]] }) });

// a pond (x 5..30 m, d 20..80 m) on grass, a moored boat in it at (17, 50), a fence on the grass at (-8, 30)
const scene = (over = {}) => Object.assign({ id: 'itest', v: 2, view: { lat: 51.3, lon: -0.8 }, camera: { eye: 1.65, fov: 66, horizon: 470, heading: 180 }, season: 'summer', cover: false,
  surfaces: [{ id: 'land', kind: 'grass', rest: true }], water: [{ id: 'pond', kind: 'pond', poly: [[5, 20], [30, 20], [30, 80], [5, 80]], edge: 'none' }],
  place: [{ obj: 'boat.itest', at: [17, 50], k: 1 }, { obj: 'structure.itest-fence', at: [-8, 30], k: 1 }], actors: [] }, over);
const C = E.sceneCompile(scene(), { season: 'summer', lod: 1 });
const cam = C.cam;
/** A mover record at ground (x, d) as sceneXFrameAt gives it. */
let nid = 0;
const mk = (obj, x, d, o = {}) => {
  const cls = o.cls || E.sceneMoverSize(obj).cls, layer = o.layer || (cls === 'bird-water' || cls === 'boat' ? 'swim' : 'walk'), P = E.sceneProject(cam, x, d, 0);
  return Object.assign({ id: o.id || 'm' + (++nid), kind: 'actor', obj, cls, x, d, h: 0, X: P.X, Y: P.Y, s: 0.02 * P.k, alpha: 1, dir: 1, r: 0.25, layer, moving: true, vx: 0, vd: 0, group: null, framed: false, vmax: 3, maxWait: 0 }, o.set || {});
};
const rules = (frame, track, rule, o = {}) => E.sceneXInvariants(C, frame, track || null, Object.assign({ rules: [rule] }, o));
const one = (rule, movers, o) => rules({ t: 0, movers }, null, rule, o);

test('the pure 78-scene-x-* files are part of the Node registry load', () => {
  assert.ok(SCENE_FILE_RE.test('78-scene-x-inv.js') && SCENE_FILE_RE.test('78-scene-x-crowd.js'));
  assert.ok(!SCENE_FILE_RE.test('78-scene-canvas.js'), 'the browser-only 78-scene files stay out');
  assert.equal(typeof E.sceneXInvariants, 'function');
  assert.deepEqual(E.SCENE_X_INV_RULES.map(r => r.rule), ['bodiesOverlap', 'offLayer', 'throughSolid', 'floaterLevel', 'nearBand', 'pop', 'teleport', 'faceSlide', 'stuck']);
});

test('bodiesOverlap: two people 30 cm apart fail (an error once held 1 s); 1 m apart or group mates pass', () => {
  assert.equal(one('bodiesOverlap', [mk('person.walker', -2, 12), mk('person.walker', -2.3, 12)]).length, 1);
  assert.equal(one('bodiesOverlap', [mk('person.walker', -2, 12), mk('person.walker', -3, 12)]).length, 0);
  assert.equal(one('bodiesOverlap', [mk('person.walker', -2, 12, { set: { group: 'g1' } }), mk('person.walker', -2.3, 12, { set: { group: 'g1' } })]).length, 0);
  const tr = E.sceneXInvariantTracker(), A = mk('person.walker', -2, 12, { id: 'pa' }), B = mk('person.walker', -2.2, 12, { id: 'pb' });
  let last = [];
  for (let k = 0; k <= 4; k++) last = rules({ t: k * 0.25, movers: [A, B] }, tr, 'bodiesOverlap');
  assert.equal(last[0].sev, 'error', 'held for 1 s: walking through each other');
});

test('offLayer: a walker in the pond or a swimmer on the grass fails; on their own ground (or a body width from it) they pass', () => {
  assert.equal(one('offLayer', [mk('person.walker', 17, 30)]).length, 1, 'walker in the pond');
  assert.equal(one('offLayer', [mk('bird.itest-duck', -3, 30, { layer: 'swim' })]).length, 1, 'duck on the grass');
  assert.equal(one('offLayer', [mk('person.walker', -3, 30), mk('bird.itest-duck', 12, 40, { layer: 'swim' })]).length, 0);
  assert.equal(one('offLayer', [mk('person.walker', 5.2, 40)]).length, 0, 'feet within 0.3 m of the bank');
});

test('throughSolid: a walker inside the fence or a duck inside the moored hull fails; beside them passes', () => {
  assert.equal(one('throughSolid', [mk('person.walker', -8, 30)]).length, 1);
  assert.equal(one('throughSolid', [mk('bird.itest-duck', 17, 50, { layer: 'swim' })]).length, 1);
  assert.equal(one('throughSolid', [mk('person.walker', -8, 32), mk('bird.itest-duck', 17, 55, { layer: 'swim' })]).length, 0);
  assert.equal(one('throughSolid', [mk('person.walker', 17, 50)]).length, 0, 'a wet hull blocks only what floats');
});

test('floaterLevel: a duck whose waterline is drawn above the water in its column fails; one on the water passes', () => {
  const ok = mk('bird.itest-duck', 17, 60, { layer: 'swim' }), up = Object.assign({}, ok, { Y: 480 });
  assert.equal(one('floaterLevel', [ok]).length, 0);
  assert.equal(one('floaterLevel', [up]).length, 1);
  assert.equal(one('floaterLevel', [Object.assign({}, ok, { X: 200 })]).length, 1, 'a column with no water drawn');
});

test('nearBand: a person at 2 m fails; at 10 m, or framed, passes', () => {
  assert.equal(one('nearBand', [mk('person.walker', 0, 2)]).length, 1);
  assert.equal(one('nearBand', [mk('person.walker', 0, 10)]).length, 0);
  assert.equal(one('nearBand', [mk('person.walker', 0, 2, { set: { framed: true } })]).length, 0);
});

test('pop: a mover appearing or vanishing mid-frame fails; at the edge, fading, a pose swap or a diving grebe passes', () => {
  const run = (a, b) => { const tr = E.sceneXInvariantTracker(); let out = []; [a, b, b, b].forEach((movers, k) => { out = out.concat(rules({ t: k * 0.25, movers }, tr, 'pop')); }); return out; };
  const W1 = mk('person.walker', -2, 20, { id: 'w' });
  assert.equal(run([], [W1]).length, 1, 'appears mid-frame');
  assert.equal(run([W1], []).length, 1, 'vanishes mid-frame (reported after its 0.5 s grace)');
  assert.equal(run([], [Object.assign({}, W1, { X: 20 })]).length, 0, 'at the frame edge');
  assert.equal(run([Object.assign({}, W1, { alpha: 0.6 })], [Object.assign({}, W1, { alpha: 0.9 })]).length, 0, 'a fade');
  const A = mk('bird.itest-duck', 12, 40, { id: 'p1', layer: 'swim' }), B = Object.assign({}, A, { id: 'p2' });
  assert.equal(run([A], [B]).length, 0, 'one animal shown in another pose');
  assert.equal(run([A, Object.assign({}, B, { s: 0 })], [Object.assign({}, A, { s: 0 }), B]).length, 0, 'a pose swap through a hidden row');
  const G = mk('bird.grebe', 12, 40, { id: 'g', layer: 'swim' });
  assert.equal(run([G], []).length, 0, 'a grebe dives');
});

test('teleport: a 500 px jump in 0.25 s fails; a walking step passes', () => {
  const tr = E.sceneXInvariantTracker(), A = mk('person.walker', -2, 10, { id: 'tp' });
  rules({ t: 0, movers: [A] }, tr, 'teleport');
  assert.equal(rules({ t: 0.25, movers: [Object.assign({}, A, { X: A.X + 500 })] }, tr, 'teleport').length, 1);
  const tr2 = E.sceneXInvariantTracker();
  rules({ t: 0, movers: [A] }, tr2, 'teleport');
  assert.equal(rules({ t: 0.25, movers: [Object.assign({}, A, { X: A.X + 40 })] }, tr2, 'teleport').length, 0);
});

test('faceSlide: a side-only duck swimming straight at the eye, or a mover mirrored against its motion, fails; across the view passes', () => {
  const D = mk('bird.itest-duck', 0.2, 30, { id: 'fd', layer: 'swim', set: { vx: 0, vd: -0.6 } });
  assert.equal(one('faceSlide', [D]).length, 1, 'no front view: it slides toward the eye side-on');
  assert.equal(one('faceSlide', [Object.assign({}, D, { vx: 0.6, vd: 0 })]).length, 0);
  // moonwalking: faces right (dir 1) while moving left on screen, two frames running
  const tr = E.sceneXInvariantTracker(), M = mk('bird.itest-duck', 12, 30, { id: 'mw', layer: 'swim', set: { vx: -0.6, vd: 0, dir: 1 } });
  let out = [];
  for (let k = 0; k < 3; k++) out = out.concat(rules({ t: k * 0.25, movers: [Object.assign({}, M, { X: M.X - 6 * k })] }, tr, 'faceSlide'));
  assert.equal(out.length, 1);
  const tr2 = E.sceneXInvariantTracker();
  out = [];
  for (let k = 0; k < 3; k++) out = out.concat(rules({ t: k * 0.25, movers: [Object.assign({}, M, { dir: -1, X: M.X - 6 * k })] }, tr2, 'faceSlide'));
  assert.equal(out.length, 0);
});

test('stuck: a walker standing 11 s on its way fails; one that moves, or a resting swan, passes', () => {
  const run = (list) => { const tr = E.sceneXInvariantTracker(); let out = []; for (let k = 0; k <= 48; k++) out = out.concat(rules({ t: k * 0.25, movers: list(k) }, tr, 'stuck')); return out; };
  assert.equal(run(() => [mk('person.walker', -2, 20, { id: 's1' })]).length, 1);
  assert.equal(run((k) => [mk('person.walker', -2 + k * 0.1, 20, { id: 's2' })]).length, 0);
  assert.equal(run(() => [mk('bird.swan', 12, 40, { id: 's3', layer: 'swim' })]).length, 0);
  assert.equal(run(() => [mk('person.walker', -2, 20, { id: 's4', set: { maxWait: 15 } })]).length, 0, 'a scripted stand');
});

test('the full loop really advances t: walkers move, the counts come per rule, the base places are used with crowd off', () => {
  const D = E.sceneCompile(scene({ actors: [{ obj: 'person.walker', ground: [[-4, 12], [-4, 40]], speedM: 1.3 }, { obj: 'person.walker', ground: [[-4, 40], [-4, 12]], speedM: 1.3 }] }), { season: 'summer', lod: 1 });
  const F0 = E.sceneXFrameAt(D, 0, null, { crowd: false }), F1 = E.sceneXFrameAt(D, 2, null, { crowd: false });
  assert.equal(F0.movers.length, 2);
  assert.ok(F0.movers.every(m => m.src === 'base'));
  assert.ok(Math.abs(F1.movers[0].d - F0.movers[0].d) > 2, 'frame k is drawn at its own t');
  const r = E.sceneXInvariantLoop(D, { seconds: 60, hz: 4, crowd: false });
  assert.equal(r.frames, 241);
  assert.equal(r.movers, 2);
  assert.ok(r.counts.bodiesOverlap > 0, 'two walkers on one line head-on pass through each other');
  assert.equal(r.counts.offLayer + r.counts.throughSolid + r.counts.teleport, 0);
  const box = E.sceneXMoverBox(F0.movers[0], 'summer');
  assert.ok(box && box[0] < F0.movers[0].X && box[2] > F0.movers[0].X && box[1] < F0.movers[0].Y, 'the sprite box stands on the foot');
});
