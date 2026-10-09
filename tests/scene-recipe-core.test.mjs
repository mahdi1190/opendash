// Scene engine v2, builder A (docs/dev/SCENE_ENGINE_V2.md 14.3, 16.1, 27.1): the runtime half of recipes. sceneAddRecipe makes an
// item that passes animValidatePack and compiles as v2; a recipe supersedes a v1 item of the same pack and id (in its place,
// listed by sceneItemDups); sceneFromRecipe fills the defaults (and freezes on request); sceneRecipeCheck catches bad ids, kinds
// and references; sceneValidate defers to the v2 checks for v2 data and is unchanged for v1 data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry } from '../tools/lib/anim-render.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const G = loadRegistry(ROOT).R.get;
const E = new Proxy({}, { get: (_, n) => G(n) });
const REC = () => ({ v: 2, pack: 'v2a-recipes', meta: { id: 'canal-walk', label: 'Canal walk', site: 'A canal', tags: ['canal', 'towpath', 'boats', 'test', 'water', 'walk'], mood: 'calm', colour: 'teal' },
  scene: { id: 'canal-walk', view: { lat: 52.2, lon: -1.5 }, camera: { eye: 1.7, fov: 64, horizon: 452, heading: 290, water: -0.45 },
    surfaces: [{ id: 'land', kind: 'grass', rest: true }, { id: 'lane', kind: 'path', path: [[6, 4], [8, 90]], width: 2 }],
    water: [{ id: 'canal', kind: 'canal', path: [[-3, 3], [-3, 90], [10, 260]], width: 9, banks: { right: { surface: 'towpath', width: 2.4, edge: 'coping' } } }],
    place: [{ obj: 'boat.narrowboat', on: 'canal', d: 28, u: 0.3 }, { obj: 'person.walker', on: 'canal-right', d: 16 }],
    atmos: 'auto', weather: 'live', cover: 'auto', season: 'auto', at: 'golden', setting: 'mixed' } });

test('sceneFromRecipe: defaults filled (v 2, camera, view, a rest, lists); freeze on request; the input is not touched', () => {
  const sc = { id: 'x', camera: { horizon: 480 }, view: {}, surfaces: [{ id: 'r', kind: 'road', path: [[0, 2], [0, 50]], width: 6 }] };
  const d = E.sceneFromRecipe(sc);
  assert.equal(d.v, 2); assert.equal(d.camera.eye, 1.65); assert.equal(d.camera.horizon, 480); assert.equal(d.camera.fov, 66);
  assert.ok(d.surfaces[0].rest, 'a rest surface first'); assert.deepEqual(d.place, []); assert.equal(d.cover, 'auto');
  assert.equal(sc.surfaces.length, 1, 'the recipe scene itself is unchanged');
  const f = E.sceneFromRecipe(REC().scene, { freeze: true });
  assert.ok(Object.isFrozen(f) && Object.isFrozen(f.place) && Object.isFrozen(f.place[0]), 'deep frozen');
  const C = E.sceneCompile(f, { season: 'autumn', lod: 1 });
  assert.equal(C.v, 2, 'a frozen recipe compiles');
});

test('sceneAddRecipe: an item of the pack that passes animValidatePack, compiles as v2, carries its live sky', () => {
  const it = E.sceneAddRecipe(REC());
  assert.ok(it && it.recipe === true && it.recipeV === 2 && it.composed);
  assert.deepEqual(it.liveSky, { lat: 52.2, lon: -1.5 });
  const items = E.sceneItems('v2a-recipes');
  assert.equal(items.length, 1);
  const v = E.animValidatePack({ id: 'v2a-recipes', name: 'Recipes', items });
  assert.equal(v.ok, true, JSON.stringify(v.errors || v.problems || v));
  const data = E.sceneData(it), C = E.sceneCompile(data, { season: 'summer', lod: 1 });
  assert.equal(C.v, 2); assert.equal(C.id, 'canal-walk');
  assert.ok(C.items.some(i => i.o.startsWith('boat.narrowboat') && i.g.surf === 'canal'));
  assert.ok(C.items.some(i => i.o === 'person.walker' && i.g.surf === 'canal-right'));
  assert.equal(C.problems.filter(p => p.sev === 'error').length, 0, JSON.stringify(C.problems.filter(p => p.sev === 'error')));
});

test('superseding (14.3): a recipe wins over the v1 item with its id, in its place; the pair is listed', () => {
  const v1 = { v: 1, id: 'old-a', view: { lat: 51, lon: -1 }, place: [] };
  E.sceneAdd('v2a-sup', { id: 'first', label: 'First', site: 's', tags: ['a', 'b', 'c', 'd', 'e', 'f'], mood: 'calm', colour: 'blue' }, Object.assign({}, v1, { id: 'first' }));
  E.sceneAdd('v2a-sup', { id: 'old-a', label: 'Old', site: 's', tags: ['a', 'b', 'c', 'd', 'e', 'f'], mood: 'calm', colour: 'blue' }, v1);
  E.sceneAdd('v2a-sup', { id: 'last', label: 'Last', site: 's', tags: ['a', 'b', 'c', 'd', 'e', 'f'], mood: 'calm', colour: 'blue' }, Object.assign({}, v1, { id: 'last' }));
  const before = E.sceneItems('v2a-sup').map(i => i.id);
  assert.deepEqual(before, ['first', 'old-a', 'last']);
  const r = REC(); r.pack = 'v2a-sup'; r.meta.id = 'old-a'; r.scene.id = 'old-a';
  E.sceneAddRecipe(r);
  const after = E.sceneItems('v2a-sup');
  assert.deepEqual(after.map(i => i.id), ['first', 'old-a', 'last'], 'the same ids, in the same order');
  assert.equal(after[1].recipe, true, 'the recipe took the v1 item\'s place');
  assert.ok(E.sceneItemDups().some(d => d.pack === 'v2a-sup' && d.id === 'old-a' && d.kind === 'superseded'));
  // a pack with no recipe is as v1 (two items of one id are both kept)
  E.sceneAdd('v2a-plain', { id: 'same', label: 'A', site: 's', tags: [], mood: 'calm', colour: 'blue' }, v1);
  E.sceneAdd('v2a-plain', { id: 'same', label: 'B', site: 's', tags: [], mood: 'calm', colour: 'blue' }, v1);
  assert.equal(E.sceneItems('v2a-plain').length, 2);
});

test('sceneRecipeCheck: bad ids, kinds, geometry and references; a clean recipe has no errors', () => {
  assert.deepEqual(E.sceneRecipeCheck(REC()).filter(p => p.sev === 'error'), []);
  const bad = REC();
  bad.v = 1; bad.pack = 'Bad Pack';
  bad.scene.surfaces.push({ id: 'Lane 2', kind: 'road', path: [[0, 2], [0, 9]], width: 6 }, { id: 'x1', kind: 'motorway', poly: [[0, 1], [1, 1], [1, 2]] }, { id: 'x2', kind: 'pavement', beside: 'nowhere', width: 2 }, { id: 'lane', kind: 'path', path: [[0, 2], [0, 3]], width: 1 });
  bad.scene.place.push({ obj: 'person.walker', on: 'nothere', d: 10 }, { obj: 'person.walker', at: [1, -3] }, { obj: 'person.walker', on: 'lane', x: 3, y: 600 }, { obj: 'nope.nope', at: [0, 10] });
  bad.scene.flows = [{ id: 'w', kind: 'walk', on: 'ghost' }];
  bad.scene.scatter = [{ obj: 'plant.heather', on: 'swamp', d: [10, 5] }];
  bad.scene.camera.fov = 400;
  const msgs = E.sceneRecipeCheck(bad).filter(p => p.sev === 'error').map(p => p.path + ' ' + p.msg).join('\n');
  for (const want of [/^v /m, /^pack /m, /Lane 2/, /motorway/, /beside: no surface or water nowhere/, /used twice/, /on: no surface or water nothere/, /at: \[x, d\]/, /either ground/, /unknown object nope\.nope/,
    /flows\[0\]\.on/, /swamp/, /d: \[d0, d1\]/, /camera\.fov/]) assert.match(msgs, want);
  // sceneValidate: v2 data goes to the v2 checks; v1 data is unchanged
  assert.deepEqual(E.sceneValidate(E.sceneFromRecipe(REC().scene)), []);
  assert.ok(E.sceneValidate(Object.assign(E.sceneFromRecipe(REC().scene), { place: [{ obj: 'person.walker', on: 'ghost' }] })).some(m => /ghost/.test(m)));
  assert.deepEqual(E.sceneValidate({ v: 1, id: 'v1', view: { lat: 1, lon: 1 }, camera: { pan: 0, period: 90 }, place: [] }), []);
  assert.ok(E.sceneValidate({ v: 1, id: 'v1', view: { lat: 1, lon: 1 }, place: [{ obj: 'nope.nope', x: 1, y: 1 }] }).some(m => /unknown object/.test(m)));
});
