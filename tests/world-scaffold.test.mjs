// The fast-scene path (docs/dev/NEW_SCENE_GUIDE.md): `node tools/world.mjs new` scaffolds a short, valid spec from a kit's recipe;
// the two places made with it (a Cotswold village green, a Victorian seaside pier) load clean; the models they needed
// (pier, lighthouse, pub sign) and the honey-stone styles exist.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorld } from '../tools/lib/world/load.mjs';
import { scaffoldSource, scaffoldSpec, KIT_FAMILY, LANDMARKS, parseLandmarks, viewCamera } from '../tools/lib/world/scaffold.mjs';
import { newArgs } from '../tools/world.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = loadWorld(ROOT);
const base = { slug: 'test-place', place: 'A test place', lat: 51.5, lon: -1.2, view: 'looking north' };

test('newArgs reads --key value and --key=value (values with spaces)', () => {
  const { o, rest } = newArgs(['new', 'abc', '--setting', 'coast', '--place', 'A Place, Somewhere', '--lat=50.1', '--force']);
  assert.deepEqual(rest, ['new', 'abc']);
  assert.equal(o.setting, 'coast'); assert.equal(o.place, 'A Place, Somewhere'); assert.equal(o.lat, '50.1'); assert.equal(o.force, true);
});

test('every kit has a layout family and its scaffold is a short, valid spec the engine accepts', () => {
  for (const kit of Object.keys(KIT_FAMILY)) {
    assert.ok(W.worldKit(kit), 'a real kit: ' + kit);
    const r = scaffoldSource(Object.assign({}, base, { kit }));
    const n = r.text.split('\n').length;
    assert.ok(n >= 14 && n <= 46, `${kit}: ${n} lines`);
    const got = []; vm.runInNewContext(r.text, { worldAdd: (p, m, s) => got.push({ p, m, s }), Math });
    assert.equal(got.length, 1); assert.equal(got[0].p, 'world-test');
    const errs = W.worldValidate(got[0].s).errors;
    assert.deepEqual(errs.map(e => e.path + ': ' + e.msg), [], kit);
    assert.equal(got[0].m.ukView, 'world-engine'); assert.ok(got[0].m.ukPlace && got[0].m.county && got[0].m.ukTown);
  }
});

test('landmarks: known ones are placed, an unknown or misplaced one is reported, never silently dropped', () => {
  const r = scaffoldSpec(Object.assign({}, base, { kit: 'village-green', landmarks: 'church-tower:cotswold-church,pub,pond,pier,dragon' }));
  const ids = [...r.spec.buildings.map(b => b.id), ...r.spec.surfaces.map(s => s.id)];
  for (const id of ['church', 'pub', 'pond']) assert.ok(ids.includes(id), id);
  assert.equal(r.notes.length, 2);   // pier (not for a green) and dragon (unknown)
  assert.deepEqual(parseLandmarks('a:x,b'), [{ kind: 'a', style: 'x' }, { kind: 'b', style: null }]);
  assert.ok(Object.keys(LANDMARKS).length >= 8);
  assert.throws(() => scaffoldSpec(Object.assign({}, base, { kit: 'nonesuch' })), /unknown --setting/);
});

test('--view words choose the camera', () => {
  assert.equal(viewCamera('looking south over the water', 'green').heading, 180);
  assert.ok(viewCamera('from the hill, wide', 'green').eye > 5);
});

test('the places made with the scaffold load clean and build rich; their reusable models and styles are registered', () => {
  const app = join(ROOT, 'src', 'app');
  for (const f of ['79-world-zscene-cotswold-green-1.js', '79-world-zscene-seaside-pier-1.js']) {
    const got = []; vm.runInNewContext(readFileSync(join(app, f), 'utf8'), { worldAdd: (p, m, s) => got.push(s), Math });
    const s = got[0];
    assert.deepEqual(W.worldValidate(s).errors, [], f);
    const w = W.worldBuild(s);
    assert.ok(w.entities.length > 60, f + ': ' + w.entities.length);
    assert.ok(!w.log.some(l => l.rule === 'buildError'), f);
    assert.ok(!w.log.some(l => l.action === 'drop' && !l.auto && (s.entities || []).some(e => e.id && e.id === l.id)), `${f}: an authored entity was dropped`);
  }
  for (const id of ['structure.pier', 'structure.lighthouse', 'street.pub-sign']) {
    assert.ok(W.worldModelFor(id), 'a model for ' + id);
    const c = W.worldModelCheck(id); assert.deepEqual(c.problems, [], id);
  }
  const styles = readFileSync(join(app, '70-scene-gen-style-village-cotswold.js'), 'utf8');
  for (const st of ['cotswold-stone', 'cotswold-church']) assert.ok(styles.includes("sceneBuildingStyleDefine('" + st + "'"), st);
});
