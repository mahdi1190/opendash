// The railway viaduct model and what came with the Castlefield basin (17 Oct, detail/castlefield): `structure.viaduct` (brick arcade and
// through-lattice girders, seen from below), its solid piers under an overhead body (`legs`), the canal-warehouse style, detached frontage
// rows (`party`, `spacing`) and the running-bond setts. The conformance of every model is world-models.test.mjs; this holds what is particular.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorld } from '../tools/lib/world/load.mjs';
import { loadEngine, resolveRef } from '../tools/lib/world/convert.mjs';
import { worldSimOf } from '../tools/lib/world/adversarial.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = loadWorld(ROOT, { extra: 'globalThis.__vd = { sceneBuildingProject, sceneBuildingStyle, WORLD_GROUND_LOOKS, _scbgBlockKinds };' });
const G = globalThis.__vd;
const cam = (eye = 3.4) => W.sceneCamera({ camera: { eye, fov: 76, horizon: 470, heading: 0 } });
const build = (extra, z = 50, c = cam()) => W.worldModelBuild(Object.assign({ id: 'v', obj: 'structure.viaduct', x: 0, z, y: 0, facing: 90, static: true }, extra || {}), c, { season: 'summer' });
const roles = (p) => { const r = {}; for (const f of p.faces) r[f.role] = (r[f.role] || 0) + 1; return r; };

test('the viaduct is registered, overhead (people and boats pass under it) and sized by its options', () => {
  assert.ok(W.worldModelGet('viaduct') && W.worldModelHas('structure.viaduct'));
  const kb = W.worldKb('structure.viaduct');
  assert.equal(kb.solidity, 'overhead');
  const sz = W.worldModelSizeOf('structure.viaduct', { opts: { len: 140, width: 10, h: 12, kind: 'girder' } });
  assert.equal(sz.w, 140);
  assert.equal(sz.d, 10);
  assert.ok(sz.h >= 16, 'a girder viaduct stands its lattice over the deck: ' + sz.h);
});

test('the arcade draws arches, voussoirs, spandrels, a string course, a parapet, pilasters and a keystone; the gap is a steel plate span', () => {
  const a = build({ model: { livery: 'red-cream', seed: 3, opts: { kind: 'arcade', len: 80 } } });
  assert.ok(a, 'drew');
  for (const k of ['spandrel', 'voussoir', 'soffit', 'string-course', 'parapet', 'coping', 'pilaster', 'plinth']) assert.ok(roles(a)[k] > 0, 'has ' + k);
  const g = build({ model: { livery: 'red-cream', seed: 3, opts: { kind: 'arcade', len: 120, gap: 26, gapAt: 0 } } });
  assert.ok(roles(g).plate > 0 && roles(g).flange > 0, 'a plate-girder span over the gap');
  assert.ok(!roles(a).plate, 'no steel span without a gap');
  assert.ok(g.faces.length <= 3000, 'in budget: ' + g.faces.length);
});

test('the girder viaduct draws a riveted plate band, posts, Warren diagonals, a cambered chord and stone-capped piers; masts add wires', () => {
  const p = build({ model: { livery: 'red-cream', seed: 5, opts: { kind: 'girder', len: 100, masts: true } } });
  for (const k of ['web', 'top-chord', 'post', 'diagonal', 'cornice', 'underside', 'mast', 'wire']) assert.ok(roles(p)[k] > 0, 'has ' + k);
  const q = build({ model: { livery: 'red-cream', seed: 5, opts: { kind: 'girder', len: 100 } } });
  assert.ok(!roles(q).mast && !roles(q).wire, 'no masts unless asked');
});

test('seeded variety: arches differ (open, bricked up with a door, barred), the livery and the age change the picture', () => {
  const sig = (m) => JSON.stringify(build({ id: 'x' + (m.seed || 0), model: m }).faces.map(f => [f.hex, f.role]));
  assert.notEqual(sig({ seed: 1, livery: 'red-cream' }), sig({ seed: 2, livery: 'red-cream' }));
  assert.notEqual(sig({ seed: 1, livery: 'red-cream' }), sig({ seed: 1, livery: 'blue-black' }));
  const r = {};
  for (let s = 1; s <= 6; s++) for (const f of build({ id: 'y' + s, model: { seed: s, opts: { len: 90 } } }).faces) r[f.role] = (r[f.role] || 0) + 1;
  assert.ok(r.infill > 0 && r.door > 0, 'some arches are bricked up with a unit door');
  assert.ok(r.void > 0 || r.bar > 0, 'some are gated');
});

test('the piers are solid legs under the overhead body: the entity carries them and scales with the model size', () => {
  const ent = { id: 'vd', obj: 'structure.viaduct', x: 0, z: 40, facing: 90 };
  W.worldModelFit(ent, null, { opts: { kind: 'arcade', len: 80, span: 11.5 } });
  assert.ok(Array.isArray(ent.legs) && ent.legs.length >= 6, 'a leg a pier: ' + (ent.legs || []).length);
  for (const q of ent.legs) assert.ok(q.length === 4 && q.flat().every(Number.isFinite));
  const area = (q) => Math.abs(q.reduce((s, p, i) => { const n = q[(i + 1) % q.length]; return s + p[0] * n[1] - n[0] * p[1]; }, 0)) / 2;
  const ent2 = { id: 'vd', obj: 'structure.viaduct', x: 0, z: 40, facing: 90 };
  W.worldModelFit(ent2, null, { size: 1.5, opts: { kind: 'arcade', len: 80 } });
  assert.ok(area(ent2.legs[1]) > area(ent.legs[1]) * 1.5, 'a larger viaduct has stouter piers');
});

test('nobody walks through a pier of the Castlefield viaducts (the nav cuts the legs out), and no house falls back to a prism', () => {
  const E = loadEngine({ root: ROOT, fresh: true });
  const item = resolveRef(E, 'world-test/manchester-castlefield-1-w3').item;
  const spec = E.worldHostSpec(item);
  const sim = worldSimOf(E, spec, {});
  const legs = [];
  for (const e of sim.world.entities) if (e.legs) for (const q of e.legs) legs.push(q);
  assert.ok(legs.length >= 12, 'the three viaducts have piers: ' + legs.length);
  const inPoly = (q, x, z) => { let c = false; for (let i = 0, j = q.length - 1; i < q.length; j = i++) if ((q[i][1] > z) !== (q[j][1] > z) && x < (q[j][0] - q[i][0]) * (z - q[i][1]) / (q[j][1] - q[i][1]) + q[i][0]) c = !c; return c; };
  let n = 0;
  for (let t = 0; t < 90; t += 1) { sim.step(1); for (const a of sim.agents()) { n++; assert.ok(!legs.some(q => inPoly(q, a.x, a.z)), `${a.obj || a.cls} at ${a.x.toFixed(1)}, ${a.z.toFixed(1)} is inside a pier`); } }
  assert.ok(n > 200, 'there was life: ' + n);
  const prims = E.worldExtrude(sim.world, sim.world.cam, { season: 'summer' });
  assert.deepEqual(prims.filter(q => q.kind === 'building' && q.fallback).map(q => q.id + ': ' + q.error), [], 'every warehouse comes from the generator');
});

test('a frontage rule may stand free: party none and spacing give detached warehouses with windows on their end walls', () => {
  const E = loadEngine({ root: ROOT, fresh: true });
  const spec = { v: 3, place: { lat: 53.47, lon: -2.25, region: 'greater-manchester', style: 'river-city' }, camera: { eye: 3.4, fov: 78, horizon: 470, heading: 95 },
    surfaces: [{ id: 'quay', kind: 'pavement', path: [[-10, 20], [10, 120]], width: 4 }],
    buildings: [{ id: 'a', along: 'quay', side: 'right', style: 'canal-warehouse', storeys: [4, 5], shops: false, depth: [14, 18], party: 'none', spacing: 3 },
      { id: 'b', along: 'quay', side: 'left', style: 'victorian-terrace', storeys: 2, from: 0, to: 40 }], seed: 3 };
  assert.deepEqual(W.worldValidate(JSON.parse(JSON.stringify(spec))).errors.filter(e => e.severity === 'fatal'), []);
  const world = E.worldBuild(JSON.parse(JSON.stringify(spec)), { fill: false }), w = world.world || world;
  const a = w.buildings.filter(b => b.part && b.part.of === 'a'), t = w.buildings.filter(b => b.part && b.part.of === 'b');
  assert.ok(a.length >= 1 && a.every(b => b.party === 'none'), 'detached');
  assert.ok(t.length >= 1 && t.every(b => b.party === 'both'), 'a terrace still shares its walls');
  if (a.length > 1) {
    const d = (p, q) => Math.hypot(p.foot[1][0] - q.foot[0][0], p.foot[1][1] - q.foot[0][1]);
    const gaps = []; for (let i = 1; i < a.length; i++) gaps.push(Math.min(d(a[i - 1], a[i]), d(a[i], a[i - 1])));
    assert.ok(Math.min(...gaps) > 1.5, 'a gap between warehouses: ' + gaps.join(', '));
  }
  // the end wall carries windows (a party wall is bare brick)
  const camV = w.cam, prim = E.worldExtrude(w, camV, { season: 'summer' }).find(q => q.id === a[0].id);
  assert.ok(prim && prim.direct, 'extruded');
  assert.ok(prim.direct.shapes.filter(s => s.glow === 'window' || s.glow).length > 4 || prim.direct.lit.length > 0, 'windows are drawn');
});

test('the canal-warehouse style has arched loading bays, a lucam over taking-in doors and its own gable ends', () => {
  const st = G.sceneBuildingStyle('canal-warehouse');
  assert.ok(st && typeof st.front === 'function' && typeof st.side === 'function', 'its own facade and end walls');
  assert.equal(st.party, 'none');
  const CAM = { eye: 3.4, fov: 78, horizon: 470, heading: 0, f: 988 };
  const b = { style: 'canal-warehouse', seed: 7, storeys: 5, foot: [[-30, 30], [10, 30], [10, 48], [-30, 48]], front: 0 };
  const d = G.sceneBuildingProject(b, CAM, { season: 'summer' });
  assert.ok(d && d.shapes.length > 60, 'a rich elevation: ' + (d && d.shapes.length));
  assert.equal(typeof G._scbgBlockKinds.lucam, 'function', 'the lucam block');
});

test('setts on a strip are laid in a running bond (a stagger), never a tile grid', () => {
  assert.equal(G.WORLD_GROUND_LOOKS.setts.stagger, true);
});
