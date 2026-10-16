// World engine, package appearance: the VESSEL models (src/app/79-world-4models-vessels.js; docs/dev/WORLD_MODELS.md).
// Registered ids and their library objects, the conformance run of every vessel model, a hull that stands on the waterline (also
// when it heels), real form (sails with a belly, windows lit by a crew at dusk, funnels), a scene's `model` key (livery, size, opts),
// a scene that places them, and the sheet of one of them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorld } from '../tools/lib/world/load.mjs';
import { modelSheet } from '../tools/lib/world/models.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = loadWorld(ROOT);
const camOf = (o) => W.sceneCamera(Object.assign({ camera: { eye: 1.65, fov: 64, horizon: 468, heading: 0 } }, o || {}));

/** model id -> the object ids it draws (the vessels of 79-world-4models-vessels.js). */
const MODELS = {
  'ferry-river': ['boat.river-ferry'], 'ferry-trip': ['boat.ferry', 'boat.trip-boat'], 'ferry-car': ['boat.island-ferry'],
  dinghy: ['boat.dinghy', 'boat.fpv-dinghy-moored'], yacht: ['boat.yacht'], fishing: ['boat.fishing-boat', 'boat.coble'],
  tug: ['boat.tug'], lifeboat: ['boat.lifeboat'], steamer: ['boat.paddle-steamer'], barge: ['boat.canal-barge'],
  rowing: ['boat.rowing-boat'], paddle: ['boat.kayak', 'boat.canoe'], launch: ['boat.water-taxi', 'boat.bumboat'],
};
const ent = (o, x) => Object.assign({ id: 'v1', obj: o, x: 0, z: 30, y: -0.5, waterline: -0.45, facing: 70, static: true }, x || {});
const count = (p, role) => p.faces.filter(f => f.role === role).length;

test('the vessels are registered, claim their object ids, and every id is a library object with a real size', () => {
  for (const [id, objs] of Object.entries(MODELS)) {
    assert.ok(W.worldModelGet(id), 'model ' + id);
    assert.equal(W.worldModelGet(id).float, true, id + ' floats');
    for (const o of objs) {
      assert.equal(W.worldModelFor(o).id, id, o + ' is drawn by ' + id);
      const info = W.worldObjectInfo(o);
      assert.ok(info && info.size.w > 0.5 && info.size.h > 0.3, o + ' has a world descriptor: ' + JSON.stringify(info && info.size));
      assert.equal(info.cls, 'boat', o);
    }
  }
  // the narrowboat and the widebeam are the canal model
  assert.equal(W.worldModelFor('boat.widebeam').id, 'narrowboat');
  const wb = W.worldModelSizeOf('boat.widebeam');
  assert.ok(wb.d > 3 && wb.d <= 3.6 && wb.w < 18, 'a widebeam is wide and short: ' + JSON.stringify(wb));
});

test('the new library objects are never picked by a kit or an archetype fill (weight 0), only named by a scene', () => {
  const kinds = ['boat.yacht', 'boat.coble', 'boat.lifeboat', 'boat.trip-boat', 'boat.paddle-steamer', 'boat.canal-barge', 'boat.widebeam', 'boat.rowing-boat', 'boat.kayak', 'boat.canoe'];
  // sceneKitPick takes only objects of weight > 0: weight 0 is never picked (70-scene-0core.js)
  for (const o of kinds) { assert.equal(W.sceneObj(o).weight, 0, o); assert.ok(W.sceneObj(o).real.l > 0, o + ' has a real size'); }
});

test('conformance: every vessel builds from every angle, finite, within budget, deterministic, not a clone, and grows with its size', () => {
  for (const id of Object.keys(MODELS)) {
    const r = W.worldModelCheck(id, { seasons: ['summer', 'winter'] });
    assert.deepEqual(r.problems, [], id + ': ' + r.problems.join('; '));
    assert.ok(r.stats.maxFaces > 20 && r.stats.maxFaces <= 1600, id + ' faces ' + r.stats.maxFaces);
  }
});

test('afloat: a hull stands on the waterline (also heeled and in the water), a bob only with a time, every model draws from 16 angles and 3 eyes', () => {
  for (const id of Object.keys(MODELS)) {
    const obj = W.worldModelGet(id).sampleObj || MODELS[id][0];
    for (const eye of [0.5, 1.65, 6]) {
      const cam = camOf({ camera: { eye, fov: 64, horizon: 468, heading: 0 } });
      for (let k = 0; k < 16; k++) {
        const p = W.worldModelBuildWith(id, ent(obj, { id: 'a' + k, facing: k * 22.5, opts: undefined }), cam, { strict: true, season: 'summer' });
        assert.ok(p && p.faces.length > 10, `${id} at ${k * 22.5} deg, eye ${eye} draws`);
        assert.equal(p.noCut, true);
        assert.equal(p.waterline, -0.45);
      }
    }
  }
  const cam = camOf();
  // nothing of the hull below the waterline row, heeled or not (the sails of a heeling dinghy included in the box only)
  const row = (y, z) => cam.horizon + cam.f * (cam.eye - y) / z;
  for (const [id, obj, model] of [['dinghy', 'boat.dinghy', { opts: { state: 'sailing', heel: 1.6 } }], ['yacht', 'boat.yacht', { opts: { state: 'sailing' } }], ['fishing', 'boat.fishing-boat', null], ['ferry-river', 'boat.river-ferry', null]]) {
    const z = 40;
    const p = W.worldModelBuildWith(id, Object.assign(ent(obj, { z, facing: 90 }), { model }), cam, { strict: true });
    const low = Math.max(...p.faces.filter(f => ['hull', 'antifoul', 'boot', 'strake', 'stripe'].includes(f.role)).flatMap(f => f.pts.map(q => q[1])));
    assert.ok(low <= row(-0.45, z) + cam.f * 0.9 / z * 0.6, `${id}: the hull stands on the waterline (${low.toFixed(1)} vs ${row(-0.45, z).toFixed(1)})`);
  }
  const E = (t) => ent('boat.dinghy', { z: 14 });
  const still = W.worldModelBuild(E(), cam, {}), bobs = new Set();
  for (let t = 0; t < 8; t += 0.7) bobs.add(W.worldModelBuild(E(), cam, { t }).box.join(','));
  assert.equal(still.box.join(), W.worldModelBuild(E(), cam, {}).box.join());
  assert.ok(bobs.size >= 3, 'it bobs with time');
});

test('real form: sails are cloth with a belly and panels, a heeled boat leans, a moored one is furled, windows are lit by a crew at dusk', () => {
  const cam = camOf({ camera: { eye: 1.65, fov: 64, horizon: 468, heading: 0 } });
  const sail = (o, opts, facing) => W.worldModelBuildWith('dinghy', ent('boat.dinghy', { id: o, z: 16, facing, model: { opts } }), cam, { strict: true });
  const up = sail('d-up', { state: 'sailing' }, 70), furled = sail('d-furled', { state: 'moored' }, 70);
  assert.ok(count(up, 'mainsail') >= 4 && count(up, 'jib') >= 4, 'two sails of several cloth cells: ' + count(up, 'mainsail') + ', ' + count(up, 'jib'));
  assert.equal(count(furled, 'mainsail'), 0, 'a moored dinghy has its sail furled');
  assert.ok(count(furled, 'cover') > 0, 'the furled mainsail is a bundle on the boom');
  // cloth cells are not flat: the shading normals differ (a belly), not one paper triangle
  const ns = new Set(up.faces.filter(f => f.role === 'mainsail').map(f => (f.n || []).join(',')));
  assert.ok(ns.size >= 2, 'the sail is shaded as a curved surface');
  // the heel: the masthead is off the vertical (the top of the box leans out of the hull's centre)
  const flat = W.worldModelBuildWith('dinghy', ent('boat.dinghy', { id: 'd-flat', z: 16, facing: 180, model: { opts: { state: 'sailing', heel: 0.001 } } }), cam, { strict: true });
  const heeled = W.worldModelBuildWith('dinghy', ent('boat.dinghy', { id: 'd-flat', z: 16, facing: 180, model: { opts: { state: 'sailing', heel: 2 } } }), cam, { strict: true });
  const cx = (p) => { const b = p.box; return (b[0] + b[2]) / 2; };
  assert.ok(Math.abs(cx(heeled) - cx(flat)) > 0.5, 'seen end-on, a heeled boat leans: ' + cx(flat).toFixed(1) + ' vs ' + cx(heeled).toFixed(1));
  // a ferry's windows are lit by its crew in any dusk (theta below the smallest window share), a share of them dark
  const f = W.worldModelBuildWith('ferry-river', ent('boat.river-ferry', { id: 'fr', z: 70, facing: 90 }), cam, { strict: true });
  const win = f.faces.filter(x => x.role === 'window');
  assert.ok(win.length > 30, 'a row of windows: ' + win.length);
  assert.ok(win.filter(x => x.theta < 0.45).length > 0.6 * win.length, 'most panes light after dusk');
  assert.ok(win.some(x => x.theta >= 0.45), 'a few stay dark');
  // two funnels by default, one on request
  const fun = (opts) => W.worldModelBuildWith('ferry-river', ent('boat.river-ferry', { id: 'fr', z: 70, facing: 90, model: opts ? { opts } : null }), cam, { strict: true });
  assert.ok(count(fun(null), 'funnel') > 1.6 * count(fun({ funnels: 1 }), 'funnel'), 'two funnels, or one');
});

test('a scene says what it wants: livery, size, age, seed and opts change the vessel, its size and footprint follow', () => {
  const cam = camOf();
  const sig = (id, e) => { const p = W.worldModelBuildWith(id, e, cam, { strict: true }); return JSON.stringify(p.faces.map(f => [f.hex, f.pts.length])); };
  assert.notEqual(sig('tug', ent('boat.tug', { model: { livery: 'blue' } })), sig('tug', ent('boat.tug', { model: { livery: 'orange' } })));
  assert.notEqual(sig('tug', ent('boat.tug', { model: { age: 0.0 } })), sig('tug', ent('boat.tug', { model: { age: 1 } })));
  assert.notEqual(sig('fishing', ent('boat.fishing-boat', { model: { opts: { kind: 'coble' } } })), sig('fishing', ent('boat.fishing-boat', { model: { opts: { kind: 'trawler' } } })));
  // the three fishing boats are different sizes: a coble is not a trawler
  const sz = (opts) => W.worldModelSizeOf('boat.fishing-boat', { opts });
  assert.ok(sz({ kind: 'trawler' }).w > sz({ kind: 'potter' }).w && sz({ kind: 'potter' }).w > sz({ kind: 'coble' }).w, JSON.stringify([sz({ kind: 'trawler' }), sz({ kind: 'potter' }), sz({ kind: 'coble' })]));
  assert.equal(W.worldModelSizeOf('boat.coble', null).w, sz({ kind: 'coble' }).w, 'boat.coble is a coble');
  assert.ok(Math.abs(W.worldModelSizeOf('boat.tug', { size: 1.5 }).w / W.worldModelSizeOf('boat.tug', null).w - 1.5) < 1e-6, 'size is a scale');
  // a barge in two loads, a kayak and a canoe
  assert.notEqual(sig('barge', ent('boat.canal-barge', { model: { opts: { load: 0 } } })), sig('barge', ent('boat.canal-barge', { model: { opts: { load: 1 } } })));
  assert.ok(W.worldModelSizeOf('boat.canoe', null).w > W.worldModelSizeOf('boat.kayak', null).w);
  assert.ok(W.worldModelBuildWith('paddle', ent('boat.kayak', { model: { opts: { paddler: false } } }), cam, { strict: true }).faces.length < W.worldModelBuildWith('paddle', ent('boat.kayak', { model: { opts: { paddler: true } } }), cam, { strict: true }).faces.length);
});

test('a scene with vessels in the water: validated, sized by its model keys, drawn by the models with their liveries', () => {
  const spec = { v: 3, place: { lat: 53.4, lon: -2.99, region: 'liverpool' }, camera: { eye: 1.65, fov: 62, horizon: 455, heading: 0 },
    surfaces: [{ id: 'river', kind: 'water', water: 'river', poly: [[-200, 12], [200, 12], [200, 240], [-200, 240]] }, { id: 'quay', kind: 'pavement', path: [[-200, 6], [200, 6]], width: 10 }],
    entities: [
      { id: 'ferry-a', obj: 'boat.river-ferry', at: [-40, 120], facing: 260, model: { livery: 'heritage', size: 1.2, age: 0.5, seed: 4 } },
      { id: 'ferry-b', obj: 'boat.river-ferry', at: [60, 150], facing: 80 },
      { id: 'tug-a', obj: 'boat.tug', at: [20, 70], facing: 200, model: { livery: 'green' } },
      { id: 'yacht-a', obj: 'boat.yacht', at: [-10, 50], facing: 120, model: { opts: { state: 'sailing' } } },
      { id: 'coble-a', obj: 'boat.coble', at: [-70, 60], facing: 300 },
      { id: 'row-a', obj: 'boat.rowing-boat', at: [30, 40], facing: 15 },
    ], backdrop: { style: 'canal-wooded' }, seed: 9 };
  const v = W.worldValidate(spec);
  assert.deepEqual(v.errors.filter(e => /model|obj/.test(e.path)), [], JSON.stringify(v.errors.slice(0, 3)));
  const w = W.worldBuild(JSON.parse(JSON.stringify(spec)), { fill: false });
  const A = w.entities.find(e => e.id === 'ferry-a'), B = w.entities.find(e => e.id === 'ferry-b');
  assert.ok(A && B, 'both ferries stay in the world');
  assert.ok(A.size.w > 1.15 * B.size.w, 'the 1.2 x ferry is larger: ' + A.size.w + ' vs ' + B.size.w);
  const plan = W.worldFramePlan(w, { season: 'summer', backdrop: false });
  for (const id of ['ferry-a', 'ferry-b', 'tug-a', 'yacht-a', 'coble-a', 'row-a']) {
    const r = plan.recs.find(q => q.ent.id === id);
    assert.ok(r && r.prim && r.prim.model, id + ' is drawn by a model');
  }
  assert.equal(plan.recs.find(q => q.ent.id === 'ferry-a').prim.liveryName, 'heritage');
});

test('the sheet of a vessel draws without an error and shows it afloat', () => {
  const s = modelSheet(W, 'yacht', { angles: 4, night: true, water: true });
  assert.deepEqual(s.errors, []);
  assert.ok(s.png.length > 20000 && s.cells.length >= 10);
});
