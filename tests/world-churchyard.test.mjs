// The English village set (17 Oct, detail/cotswold): a parish church, a coursed churchyard wall, a lychgate, headstones, a yew and a
// noticeboard as reusable parametric pieces (docs/dev/WORLD_MODELS.md), and the scaffold's `parish-church` landmark that places them.
// The conformance of every model is world-models.test.mjs; this file holds what is particular to these.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorld } from '../tools/lib/world/load.mjs';
import { scaffoldSpec } from '../tools/lib/world/scaffold.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = loadWorld(ROOT);
const cam = (eye = 8) => W.sceneCamera({ camera: { eye, fov: 64, horizon: 500, heading: 0 } });
const build = (obj, extra, z = 60) => W.worldModelBuild(Object.assign({ id: 'x', obj, x: 0, z, y: 0, facing: 90, static: true }, extra || {}), cam(), { season: 'summer' });

test('the set is registered: church, headstone, lychgate, yew, noticeboard', () => {
  for (const id of ['parish-church', 'headstone', 'lychgate', 'churchyard-yew', 'noticeboard']) assert.ok(W.worldModelGet(id), id);
  for (const o of ['structure.parish-church', 'structure.headstone', 'structure.lychgate', 'tree.churchyard-yew', 'street.noticeboard']) assert.ok(W.worldModelHas(o), o);
});

test('the church has buttresses, a porch, a parapet and windows, and its era, aisles and crown change the picture', () => {
  const roles = (extra) => { const p = build('structure.parish-church', extra); assert.ok(p, 'drew'); const r = {}; for (const f of p.faces) r[f.role] = (r[f.role] || 0) + 1; return { r, p }; };
  const a = roles({ model: { livery: 'honey', seed: 3, opts: { era: 'perpendicular', aisle: 'south', crown: 'parapet', porch: true } } });
  for (const k of ['buttress', 'porch', 'merlon', 'window', 'quoin', 'course', 'roof']) assert.ok(a.r[k] > 0, 'has ' + k);
  const b = roles({ model: { livery: 'grey-limestone', seed: 3, opts: { era: 'norman', aisle: 'none', crown: 'spire', porch: false } } });
  assert.ok(!b.r.merlon && b.r.spire > 0, 'a spire, no merlons');
  assert.ok(!b.r.porch, 'no porch');
  assert.ok(a.p.faces.length <= 2600 && b.p.faces.length <= 2600);
  assert.notEqual(JSON.stringify(a.p.faces.map(f => f.hex)), JSON.stringify(b.p.faces.map(f => f.hex)));
});

test('the church footprint follows the aisle and the porch; the model size scales the entity', () => {
  const sz = (m) => W.worldModelSizeOf('structure.parish-church', m);
  assert.ok(sz({ size: 1.5 }).w > sz({ size: 1 }).w * 1.4);
  const ent = { id: 'c', obj: 'structure.parish-church', x: 0, z: 90, facing: 90 };
  W.worldModelFit(ent, null, { size: 1, opts: { aisle: 'south', porch: true } });
  const zs = ent.foot.map(q => q[1]);
  assert.ok(Math.min(...zs) < 90 - 9 && Math.max(...zs) > 90 + 3, 'the south aisle and porch reach toward the lane (z less)');
});

test('a headstone leans, comes in several heads and does not look the same twice', () => {
  const shapes = new Set(), sigs = new Set();
  for (const s of ['round', 'pointed', 'square', 'shoulder', 'ogee', 'chest']) { const p = build('structure.headstone', { model: { opts: { shape: s }, seed: 4 } }, 12); assert.ok(p, s); shapes.add(JSON.stringify(p.box)); }
  assert.equal(shapes.size, 6, 'six distinct pictures');
  for (let i = 0; i < 12; i++) sigs.add(JSON.stringify(build('structure.headstone', { id: 's' + i }, 12).faces.map(f => f.hex)));
  assert.ok(sigs.size >= 4, 'varied by seed');
});

test('a lychgate is overhead (a path runs under it), a yew is evergreen', () => {
  assert.equal(W.worldKb('structure.lychgate').solidity, 'overhead');
  assert.equal(W.worldKb('structure.lychgate').cls, 'lychgate');
  const y = build('tree.churchyard-yew', null, 30);
  assert.ok(y.faces.some(f => f.mat === 'needle') && !y.faces.some(f => f.mat === 'leaf'), 'needle material: no autumn');
});

test('a wall laid coursed or rubble gets masonry details and a coping; drystone keeps its own', () => {
  const mk = (laid, cope) => W.worldExtrudeLine({ id: 'w' + laid + cope, kind: 'wall', path: [[0, 40], [30, 40]], laid, cope, h: 1.1, width: 0.5, stone: '#b99c68' }, cam(), {});
  const n = (laid, cope) => mk(laid, cope).reduce((s, p) => s + p.details.length, 0);
  const plain = W.worldExtrudeLine({ id: 'p', kind: 'wall', path: [[0, 40], [30, 40]], h: 1.1, width: 0.5 }, cam(), {}).reduce((s, p) => s + p.details.length, 0);
  assert.ok(n('coursed', 'saddle') > plain * 3, 'coursed: many stones, joints and a coping');
  assert.ok(n('rubble') > 20 && n('coursed', 'upright') > 20);
  assert.ok(n('drystone') > 20);
});

test('a wall that turns a corner is cut at the corner (a corner piece would be concave)', () => {
  const pcs = W.worldExtrudeLine({ id: 'c', kind: 'wall', path: [[0, 80], [0, 60], [30, 60]], h: 1.1, width: 0.5 }, cam(), {});
  for (const p of pcs) { const xs = p.foot.map(q => q[0]), zs = p.foot.map(q => q[1]); assert.ok(Math.max(...xs) - Math.min(...xs) < 1 || Math.max(...zs) - Math.min(...zs) < 1, 'a piece is straight'); }
});

test('the validator takes laid and cope on a wall and a model on a landmark', () => {
  const spec = { v: 3, place: { lat: 51.7, lon: -1.8, alt: 60, region: 'uk', style: 'village-green' }, camera: { eye: 8, fov: 64, horizon: 500, heading: 0 },
    surfaces: [{ id: 'g', kind: 'grass', poly: [[-50, 1], [50, 1], [50, 120], [-50, 120]] }],
    lines: [{ id: 'w', kind: 'wall', laid: 'coursed', cope: 'saddle', path: [[0, 50], [20, 50]] }, { id: 'bad', kind: 'wall', laid: 'marble', path: [[0, 55], [20, 55]] }],
    landmarks: [{ id: 'church', obj: 'structure.parish-church', at: [0, 90], facing: 90, src: 'a church', model: { livery: 'honey', size: 1 } }], life: [], seed: 1 };
  const r = W.worldValidate(spec);
  const rules = (r.errors || []).map(e => e.path + ':' + e.rule);
  assert.ok(rules.some(x => /lines\[1\]\.laid:badValue/.test(x)), 'laid marble is refused');
  assert.ok(!rules.some(x => /lines\[0\]/.test(x) || /landmarks/.test(x)), 'the rest is accepted: ' + rules.join(', '));
});

test('the scaffold places a whole churchyard from one landmark word', () => {
  const r = scaffoldSpec({ slug: 't', kit: 'village-green', place: 'T', lat: 51.7, lon: -1.8, view: 'looking north', landmarks: 'parish-church:ironstone,pub' });
  assert.equal(r.spec.landmarks[0].model.livery, 'ironstone');
  const objs = new Set((r.spec.entities || []).map(e => e.obj));
  for (const o of ['structure.lychgate', 'tree.churchyard-yew', 'structure.headstone']) assert.ok(objs.has(o), o);
  assert.ok(r.spec.lines.some(l => l.laid === 'coursed'));
  assert.ok(r.spec.surfaces.some(s => s.id === 'church-walk'));
});
