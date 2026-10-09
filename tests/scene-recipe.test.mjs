// Scene recipes, the Node half (docs/dev/SCENE_ENGINE_V2.md 16.1 and 27.4; builder D): the canonical format is byte-stable, a stale
// version is refused, only the block changes, other files are ignored; plus the `scene` subcommand delegation (16.2) and
// `scene new --preset street` (16.3) in a temp copy of the app.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, readdirSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { formatRecipe, parseRecipeBlock, findRecipes, readRecipe, writeRecipe, newRecipeFile, recipeFileText, recipeVersion, recipeProblems, recipeFileName, RECIPE_START, RECIPE_END } from '../tools/lib/scene-recipe.mjs';
import sceneCommand, { loadSceneCommands, recipeStub } from '../tools/lib/anim-cmd/scene.mjs';
import { main } from '../tools/anim-pack.mjs';
import { loadRegistry } from '../tools/lib/anim-render.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const temps = [];
after(() => { for (const d of temps) rmSync(d, { recursive: true, force: true }); });
const tmp = (name) => { const d = mkdtempSync(join(tmpdir(), name)); temps.push(d); mkdirSync(join(d, 'src', 'app'), { recursive: true }); return d; };
const REC = () => ({ v: 2, pack: 'zz-test', meta: { id: 'canal-view', label: 'Canal view', site: 'Test', tags: ['canal', 'test', 'a', 'b', 'c', 'd'], mood: 'calm', colour: 'teal' },
  scene: { id: 'canal-view', view: { lat: 53.4746123, lon: -2.25561 }, camera: { eye: 1.7, fov: 64, horizon: 452.4, heading: 290, water: -0.45 },
    surfaces: [{ id: 'land', kind: 'grass', rest: true }, { id: 'towpath', kind: 'towpath', path: [[-4.04, 5], [-5, 80.123]], width: 2.6 }],
    water: [{ id: 'canal', kind: 'canal', path: [[2, 5], [3, 90], [18, 260]], width: 11 }, { id: 'sea', kind: 'sea', band: [180, Infinity] }],
    place: [{ obj: 'boat.narrowboat', on: 'canal', d: 28.04, u: 0.254, face: 'right' }, { obj: 'bird.gull', x: 300.04, y: 140, s: 0.4217, layer: 'far', pin: true }, { obj: 'tree.oak', at: [-14.03, 38.07], k: 0.1234 }],
    flows: [{ id: 'walkers', kind: 'walk', on: 'towpath', density: 0.81234, max: 6 }], atmos: 'auto', weather: 'live', cover: 'auto', season: 'auto', at: 'golden', setting: 'mixed' } });

test('recipes: the canonical format is byte-stable, strict JSON, rounded by unit, one line per list element', () => {
  const t = formatRecipe(REC());
  assert.equal(formatRecipe(JSON.parse(t)), t, 'format(parse(format)) is the same bytes');
  const back = JSON.parse(t);
  assert.deepEqual(back.scene.water[1].band, [180, null], 'Infinity is written null (strict JSON)');
  assert.equal(back.scene.view.lat, 53.47461); assert.equal(back.scene.camera.horizon, 452); assert.equal(back.scene.camera.eye, 1.7);
  assert.deepEqual(back.scene.surfaces[1].path, [[-4, 5], [-5, 80.1]], 'metres to 0.1');
  assert.equal(back.scene.place[0].d, 28.04); assert.equal(back.scene.place[0].u, 0.25, 'factors to 0.01'); assert.equal(back.scene.place[2].k, 0.123, 'size factors to 0.001');
  assert.equal(back.scene.place[1].x, 300, 'a pixel placement keeps its units'); assert.equal(back.scene.place[1].s, 0.422);
  assert.equal(back.scene.flows[0].density, 0.81);
  assert.deepEqual(Object.keys(back), ['v', 'pack', 'meta', 'scene']);
  assert.deepEqual(Object.keys(back.scene).slice(0, 4), ['id', 'view', 'camera', 'surfaces'], 'the scene keys in the runtime order');
  const lines = t.split('\n');
  assert.ok(lines.includes('  {"id":"land","kind":"grass","rest":true},'), 'one element per line');
  assert.ok(lines.some(l => /^ "atmos":"auto","weather":"live"/.test(l)), 'plain values share a line');
  // a moved placement changes ONE line
  const r2 = REC(); r2.scene.place[0].d = 31;
  const diff = formatRecipe(r2).split('\n').filter((l, i) => l !== lines[i]);
  assert.equal(diff.length, 1); assert.match(diff[0], /"d":31/);
});

test('recipes: a file round trip; the version is the sha1 of the block; a stale version is refused (409); only the block changes', () => {
  const root = tmp('recipe-');
  const made = newRecipeFile(root, REC());
  assert.equal(made.rel, 'src/app/71-scene-zz-test-r-canal-view.js'); assert.equal(recipeFileName('zz-test', 'canal-view'), made.rel);
  const text = readFileSync(made.file, 'utf8');
  assert.match(text, /^\/\* Scene recipe v2: zz-test\/canal-view/); assert.ok(!/OpenStreetMap/.test(text), 'no OSM line without OSM data');
  assert.match(text, /typeof sceneAddRecipe === 'function' && sceneAddRecipe\(\/\*@recipe\*\/\n\{/);
  assert.throws(() => newRecipeFile(root, REC()), (e) => e.status === 409 && e.code === 'EXISTS');
  // a hand edit outside the block survives a write
  writeFileSync(made.file, text.replace('/* Scene recipe v2', '/* A note the author added.\n   Scene recipe v2'));
  const r = readRecipe(root, 'zz-test/canal-view');
  assert.equal(r.version, recipeVersion(parseRecipeBlock(readFileSync(made.file, 'utf8')).block)); assert.equal(r.version, made.version);
  assert.equal(writeRecipe(root, r.rec, { version: r.version }).changed, false, 'a save that changes nothing changes no bytes');
  const edited = r.rec; edited.scene.place[0].d = 40;
  const w = writeRecipe(root, edited, { version: r.version });
  assert.equal(w.changed, true); assert.notEqual(w.version, r.version);
  const after = readFileSync(made.file, 'utf8');
  assert.match(after, /A note the author added/); assert.match(after, /"d":40/);
  assert.equal(after.slice(after.indexOf(RECIPE_END)), text.slice(text.indexOf(RECIPE_END)), 'the tail is untouched');
  assert.throws(() => writeRecipe(root, edited, { version: r.version }), (e) => e.status === 409 && e.code === 'STALE', 'the old version is stale now');
  assert.equal(writeRecipe(root, edited, { version: null, force: true }).changed, false);
  // a custom writer (the editor route passes lib/fsutil.mjs's)
  const calls = []; edited.scene.place[0].d = 41;
  writeRecipe(root, edited, { version: w.version, write: (f, t) => { calls.push(f); writeFileSync(f, t); } });
  assert.equal(calls.length, 1);
  // OSM data: the ODbL line in the header
  const osm = REC(); osm.meta.id = osm.scene.id = 'osm-view'; osm.scene.source = { osm: { fetched: '2026-10-09', hash: 'abc' } };
  assert.match(recipeFileText(osm), /Contains OpenStreetMap data, \(c\) OpenStreetMap contributors, ODbL 1\.0/);
});

test('recipes: findRecipes reads only 71-scene-*-r-*.js; shape problems are named', () => {
  const root = tmp('recipe-find-');
  newRecipeFile(root, REC());
  writeFileSync(join(root, 'src', 'app', '70-scene-1recipe.js'), `/* docs: ${RECIPE_START}{"v":2}${RECIPE_END} */`);
  writeFileSync(join(root, 'src', 'app', '71-scene-zz-test-1.js'), `sceneAdd('zz-test', {}, ${RECIPE_START}{"v":2,"pack":"zz-test","meta":{"id":"x"},"scene":{}}${RECIPE_END});`);
  writeFileSync(join(root, 'src', 'app', '71-scene-zz-test-r-broken.js'), `x(${RECIPE_START}{not json}${RECIPE_END})`);
  const all = findRecipes(root);
  assert.deepEqual(all.filter(r => r.ref).map(r => r.ref), ['zz-test/canal-view']);
  assert.ok(all.some(r => r.error && /not strict JSON/.test(r.error)), 'a broken block is listed with its error');
  assert.throws(() => readRecipe(root, 'zz-test/none'), (e) => e.status === 404);
  const bad = REC(); bad.pack = 'Bad Pack'; bad.scene.place[0].d = NaN; bad.v = 1;
  const p = recipeProblems(bad);
  assert.ok(p.some(x => /pack must match/.test(x)) && p.some(x => /not strict JSON/.test(x)) && p.some(x => /v must be 2/.test(x)));
  assert.throws(() => newRecipeFile(root, bad), (e) => e.status === 422);
});

test('scene delegation: a scene-cmd module in a folder runs as `scene <sub>` with the lib; a broken one reports itself', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'scene-cmd-')); temps.push(dir);
  writeFileSync(join(dir, 'hello.mjs'), `export default { summary: 'say hello', usage: 'scene hello <who>', options: { loud: { type: 'boolean', help: 'shout' } },
    run(args, ctx, lib) { ctx.out('hello ' + ctx.positionals.join(' ') + (args.loud ? '!' : '') + ' ' + (typeof lib.recipes.formatRecipe) + ' ' + (typeof lib.lintScene)); return 0; } };`);
  writeFileSync(join(dir, 'broken.mjs'), 'export default {};');
  writeFileSync(join(dir, 'lint.mjs'), `export default { summary: 'x', run() { return 0; } };`);
  const subs = await loadSceneCommands(dir);
  assert.equal(typeof subs.hello.run, 'function'); assert.match(subs.broken.error, /export default/); assert.match(subs.lint.error, /built-in/);
  const out = [], err = [];
  const code = await sceneCommand.run({ loud: true }, { root: ROOT, out: (s) => out.push(s), err: (s) => err.push(s), positionals: ['hello', 'world'], sceneCmdDir: dir });
  assert.equal(code, 0); assert.deepEqual(out, ['hello world! function function']);
  await assert.rejects(() => sceneCommand.run({}, { root: ROOT, out() {}, err() {}, positionals: ['broken'], sceneCmdDir: dir }), /export default/);
  // the real folder: migrate is there, and its options joined the scene command's
  assert.ok(sceneCommand.options.report && sceneCommand.options['keep-pixels'], 'migrate\'s options merged');
  assert.ok(sceneCommand.options['strict-placement'] && sceneCommand.options.weather && sceneCommand.options.fx && sceneCommand.options.flows);
  assert.match(sceneCommand.usage, /scene migrate/);
});

test('scene new --preset street: a v2 recipe (and its pack file) in a temp copy, which compiles and lints', { skip: typeof loadRegistry(ROOT).R.get('sceneAddRecipe') === 'function' ? false : 'the recipe runtime (70-scene-1recipe.js, A) is not in this build', timeout: 240000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'scene-new-v2-')); temps.push(dir);
  mkdirSync(join(dir, 'src'), { recursive: true });
  cpSync(join(ROOT, 'src', 'app'), join(dir, 'src', 'app'), { recursive: true });
  cpSync(join(ROOT, 'src', 'styles'), join(dir, 'src', 'styles'), { recursive: true });
  for (const f of readdirSync(join(dir, 'src', 'app'))) if (/^71-scene-zz-v2/.test(f)) rmSync(join(dir, 'src', 'app', f));
  const run = async (argv) => { const out = [], err = []; const code = await main(argv, { out: (s) => out.push(s), err: (s) => err.push(s) }); return { code, out: out.join('\n'), err: err.join('\n') }; };
  const w = await run(['scene', 'new', 'zz-v2', 'riverside', '--preset', 'street', '--lat', '51.33', '--lon=-0.85', '--heading', '200', '--root', dir]);
  assert.equal(w.code, 0, w.err);
  assert.match(w.out, /src\/app\/71-scene-zz-v2-r-riverside\.js/); assert.match(w.out, /src\/app\/72-anim-pack-zz-v2\.js/);
  const rec = readRecipe(dir, 'zz-v2/riverside').rec;
  assert.equal(rec.v, 2); assert.equal(rec.scene.camera.heading, 200); assert.ok(rec.scene.camera.horizon > 0 && rec.scene.camera.fov > 0);
  assert.equal(rec.scene.surfaces[0].rest, true); assert.equal(rec.scene.atmos, 'auto'); assert.equal(rec.scene.weather, 'live'); assert.equal(rec.scene.cover, 'auto');
  const l = await run(['scene', 'lint', 'zz-v2/riverside', '--json', '--strict-placement', '--root', dir]);
  const j = JSON.parse(l.out);
  assert.equal(j.scenes.length, 1); assert.equal(j.strict, true); assert.equal(j.scenes[0].v, 2);
  assert.ok(j.scenes[0].rules.some(r => r.group === 'sanity'), 'the sanity group ran');
  assert.ok(!j.scenes[0].failures.some(f => f.group === 'sanity' && f.rule === 'refused'), 'nothing refused in an empty scene');
  const again = await run(['scene', 'new', 'zz-v2', 'riverside', '--preset', 'street', '--lat', '51.33', '--lon=-0.85', '--root', dir]);
  assert.equal(again.code, 1);
  // the stub on its own: the street camera when the presets are not given a function
  const st = recipeStub(null, null, { pack: 'p', id: 'i', label: 'L', lat: 51, lon: 0, heading: 90, preset: 'raised' });
  assert.equal(st.rec.scene.camera.horizon, 470); assert.match(st.note, /street camera/);
});
