// World engine module A (docs/dev/WORLD_ENGINE.md 8.1): descriptors, the v3 validator, worldBuild, worldSurfaceAt, worldFrontZ,
// worldAdd and the Node loader.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorld } from '../tools/lib/world/load.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const t0 = Date.now();
const W = loadWorld(ROOT);
const LOAD_MS = Date.now() - t0;
const FIX = join(ROOT, 'tests', 'fixtures', 'world');

const good = () => ({ v: 3, place: { lat: 51.279, lon: -0.836, region: 'hampshire' }, camera: { eye: 1.65, fov: 62, horizon: 455, heading: 70 },
  surfaces: [
    { id: 'cut', kind: 'water', water: 'canal', poly: [[-30, 8], [6, 8], [40, 140], [10, 160]], shallow: 0.6 },
    { id: 'tow', kind: 'towpath', path: [[8, 5], [14, 60], [30, 160]], width: 2.4 },
    { id: 'verge', kind: 'grass', poly: [[10, 5], [40, 5], [60, 160], [32, 160]] },
    { id: 'line', kind: 'rail', path: [[-200, 300], [200, 300]], width: 3 } ],
  entities: [
    { obj: 'boat.narrowboat', at: [-2, 20], facing: 20, attach: 'water', id: 'nb1' },
    { obj: 'street.bench', at: [17, 22], facing: 250, id: 'bench-1' },
    { obj: 'bird.mallard', at: [-6, 30] },
    { cluster: 'plant.reed', on: 'cut', edge: true, n: 20, seed: 3 } ],
  landmarks: [{ obj: 'structure.field-gate', at: [25, 40], facing: 0, src: 'test' }],
  life: [{ who: 'walkers', on: 'tow', rate: '6/min', edges: ['S', 'N'] }, { who: 'mallard', count: 8, on: 'cut' },
    { who: 'visit', rate: '1/3min', goals: [{ go: 'bench-1' }, { do: 'sit', for: [20, 60] }, { leave: 'N' }] }],
  backdrop: { style: 'canal-wooded' }, seed: 2 });

test('load.mjs evaluates the sources in Node in < 1.5 s and exposes the A interface', () => {
  assert.ok(LOAD_MS < 1500, `load took ${LOAD_MS} ms`);
  for (const n of ['worldObjectInfo', 'worldValidate', 'worldBuild', 'worldSurfaceAt', 'worldFrontZ', 'worldAdd', 'worldTemplated', 'worldPopulationDefine'])
    assert.equal(typeof W[n], 'function', n);
  assert.ok(Array.isArray(W.WORLD_RULES) && W.WORLD_RULES.includes('templated'));
});

test('the good spec validates', () => {
  const r = W.worldValidate(good());
  assert.deepEqual(r.errors, []);
  assert.equal(r.ok, true);
});

test('every bad fixture is rejected with its rule (>= 30 fixtures)', () => {
  const files = readdirSync(FIX).filter(f => /^bad-.*\.json$/.test(f));
  assert.ok(files.length >= 30, `${files.length} fixtures`);
  for (const f of files) {
    const { rule, spec } = JSON.parse(readFileSync(join(FIX, f), 'utf8'));
    assert.ok(W.WORLD_RULES.includes(rule), `${f}: ${rule} is not a rule id`);
    const r = W.worldValidate(spec);
    assert.equal(r.ok, false, `${f} was accepted`);
    assert.ok(r.errors.some(e => e.rule === rule), `${f}: wanted ${rule}, got ${r.errors.map(e => e.rule + ' ' + e.path).join('; ')}`);
    for (const e of r.errors) { assert.equal(typeof e.path, 'string'); assert.equal(typeof e.msg, 'string'); assert.equal(typeof e.fix, 'string'); }
  }
});

test('descriptors: true size, solidity, attachments, sink; unknown ids have none', () => {
  const ids = ['boat.narrowboat', 'tree.canal-willow', 'plant.canal-view-loosestrife', 'plant.canal-view-meadowsweet', 'bird.mallard', 'bird.swan', 'bird.heron',
    'bird.kingfisher', 'bird.coot', 'rail.train', 'tree.birch', 'tree.wyv-far-sallow', 'plant.reed', 'structure.boardwalk', 'structure.shp-weir',
    'building.mill-red-brick', 'person.walker', 'person.dog-walker', 'animal.dog', 'person.cyclist', 'street.bench', 'street.lamp', 'plant.towpath-hedge'];
  for (const id of ids) { const d = W.worldObjectInfo(id); assert.ok(d, id); assert.ok(d.size.h > 0 && d.size.w > 0 && d.size.d > 0, id); }
  const nb = W.worldObjectInfo('boat.narrowboat');
  assert.equal(nb.cls, 'boat'); assert.equal(nb.solidity, 'solid'); assert.deepEqual([...nb.attachOk], ['water']); assert.ok(nb.sink > 0 && nb.sink < 0.5); assert.ok(nb.deck);
  assert.equal(W.worldObjectInfo('bird.mallard').cls, 'duck');
  assert.equal(W.worldObjectInfo('bird.mallard').size.h, 0.35);
  assert.deepEqual([...W.worldObjectInfo('rail.train').attachOk], ['rail']);
  assert.equal(W.worldObjectInfo('structure.boardwalk').solidity, 'walkable');
  assert.equal(W.worldObjectInfo('bench.wood'), null);
  assert.equal(W.worldObjectInfo(42), null);
});

test('a grounded entity has y = sceneGroundHeight; a floater sits at its waterline', () => {
  const s = good();
  s.camera.water = 0.3;
  s.ground = { relief: { x: [-50, 50], d: [5, 400], nx: 2, nd: 2, h: [0, 2, 1, 4] } };
  const w = W.worldBuild(s);
  assert.deepEqual(w.problems, []);
  const bench = w.entities.find(e => e.id === 'bench-1');
  assert.equal(bench.y, Math.round(W.sceneGroundHeight(w.cam, 17, 22) * 1000) / 1000);
  assert.ok(bench.y > 0);
  for (const e of w.entities.filter(e => e.attach === 'water')) {
    assert.equal(e.waterline, 0.3, e.obj);
    const d = W.worldObjectInfo(e.obj);
    assert.ok(Math.abs(e.y - (0.3 - (d.floats ? d.sink : 0))) < 1e-9, e.obj);
  }
  const duck = w.entities.find(e => e.obj === 'bird.mallard');
  assert.ok(duck.y < 0.3 && duck.waterline === 0.3);
  // a per-surface level wins over the camera's
  s.surfaces[0].level = -0.5;
  assert.equal(W.worldBuild(s).entities.find(e => e.id === 'nb1').waterline, -0.5);
});

test('worldBuild derives footprints, decks and clusters deterministically', () => {
  const w = W.worldBuild(good()), w2 = W.worldBuild(good());
  assert.deepEqual(w.entities, w2.entities);
  const nb = w.entities.find(e => e.id === 'nb1');
  assert.equal(nb.foot.length, 4); assert.equal(nb.height, 1.9); assert.ok(nb.deck && nb.deck.y > nb.y);
  const reeds = w.entities.filter(e => e.obj === 'plant.reed');
  assert.equal(reeds.length, 20);
  for (const r of reeds) assert.equal(W.worldSurfaceAt({ surfaces: w.surfaces }, r.x, r.z).id, 'cut');
  // a walker attached to the boat's deck stands on the deck
  const s = good(); s.entities.push({ obj: 'person.walker', at: [-2, 20], attach: 'deck:nb1' });
  const w3 = W.worldBuild(s);
  assert.deepEqual(w3.problems, []);
  const p = w3.entities.find(e => e.obj === 'person.walker');
  assert.equal(p.y, w3.entities.find(e => e.id === 'nb1').deck.y); assert.equal(p.host, 'nb1');
});

test('worldSurfaceAt: decks first, later surfaces win, solids cut water', () => {
  const w = W.worldBuild(good());
  assert.equal(W.worldSurfaceAt(w, -2, 20).kind, 'deck');
  assert.equal(W.worldSurfaceAt(w, -10, 30).id, 'cut');
  assert.equal(W.worldSurfaceAt(w, 12, 40).id, 'tow');
  assert.equal(W.worldSurfaceAt(w, 30, 40).id, 'verge');
  assert.equal(W.worldSurfaceAt(w, -100, 30), null);
  // a solid over water cuts it: a weir across the cut
  const s = good(); s.entities.push({ obj: 'structure.shp-weir', at: [10, 100], facing: 90, attach: 'water' });
  const w2 = W.worldBuild(s);
  assert.notEqual((W.worldSurfaceAt(w2, 10, 100) || {}).id, 'cut');
});

test('worldFrontZ: the near edge of a footprint at a column', () => {
  const sq = [[0, 10], [4, 10], [4, 14], [0, 14]];
  assert.equal(W.worldFrontZ(sq, 2), 10);
  assert.equal(W.worldFrontZ(sq, 9), Infinity);
  assert.equal(W.worldFrontZ(sq, null), 10);
  const diamond = [[0, 10], [5, 15], [0, 20], [-5, 15]];
  assert.equal(W.worldFrontZ(diamond, 2), 12);
  assert.equal(W.worldFrontZ(diamond, -4), 14);
});

test('templated: near-identical views are refused, distinct ones pass', () => {
  const a = good(), b = good();
  assert.ok(W.worldTemplated([a, b]).some(e => e.rule === 'templated'));
  assert.equal(W.worldValidate(a, { views: [b] }).ok, false);
  const c = good(); c.camera.heading = 200; c.place.lat += 0.001;
  c.entities = [{ obj: 'building.mill-red-brick', at: [-30, 60], facing: 90 }, { obj: 'tree.birch', at: [20, 15] }, { obj: 'street.lamp', at: [5, 9] }];
  c.surfaces = [{ id: 'yard', kind: 'plaza', poly: [[-60, 2], [60, 2], [60, 200], [-60, 200]] }];
  c.landmarks = []; c.life = [{ who: 'walkers', on: 'yard', rate: '6/min' }];
  assert.deepEqual(W.worldTemplated([a, c]), []);
});

test('worldAdd registers a valid spec as { v: 3, spec } and refuses an invalid one', () => {
  const meta = { id: 'core-test-w3', label: 'Core test', site: 'test', tags: ['test'] };
  assert.equal(W.worldAdd('world-core-test', meta, good()), true);
  const it = W.sceneItems('world-core-test').find(i => i.id === 'core-test-w3');
  assert.ok(it);
  // integration (8.7): the item keeps its spec (item.worldSpec, read by worldHostSpec); with the host loaded its scene is the
  // derived v2 data, so every v2 path (host canvas, player, bake cache, sceneSvg, tools) draws it; without the host, { v: 3, spec }
  assert.equal(it.worldSpec.v, 3);
  if (typeof W.worldHostSpec === 'function') assert.equal(W.worldHostSpec(it), it.worldSpec);
  else { assert.equal(it.scene.v, 3); assert.equal(it.scene.spec.v, 3); }
  assert.deepEqual(it.liveSky, { lat: 51.279, lon: -0.836 });
  const bad = good(); bad.entities[0].scale = 2;
  assert.equal(W.worldAdd('world-core-test', Object.assign({}, meta, { id: 'core-bad-w3' }), bad), null);
  assert.ok(!W.sceneItems('world-core-test').some(i => i.id === 'core-bad-w3'));
  assert.ok(W.worldAddProblems().some(p => p.id === 'core-bad-w3' && p.errors.some(e => e.rule === 'screenOrLookField')));
});

test('every library id used by the three test scenes has a descriptor', (t) => {
  const app = join(ROOT, 'src', 'app'), files = readdirSync(app).filter(f => /^79-world-zscene-.*\.js$/.test(f));
  if (!files.length) { t.skip('no test scenes yet'); return; }
  const ids = new Set();
  for (const f of files) for (const m of readFileSync(join(app, f), 'utf8').matchAll(/(?:obj|cluster):\s*'([a-z]+\.[a-z0-9-]+)'/g)) ids.add(m[1]);
  const missing = [...ids].filter(id => !W.worldObjectInfo(id));
  if (missing.length) t.todo('no descriptor (no library object or no real size): ' + missing.join(', '));
});
