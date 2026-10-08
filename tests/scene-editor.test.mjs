// Scene editor (docs/dev/SCENE_ENGINE_V2.md 23, 27.8; builder H): the dev routes and the editor's pure helpers.
//   - the routes are OFF (404 for every path and method) unless OPENDASH_SCENE_EDITOR=1 AND the root is a developer checkout
//   - the router's guards still apply: cross-origin 403, wrong content type 415, a body over 256 KB 413
//   - a ref with .. or a path is 400; the file comes only from the marker scan
//   - a stale version is 409; an unknown key, unsafe text or an unknown object id is 422; a v1 scene is 409 "run scene migrate"
//   - a good save changes only the block between the markers, atomically (no temp file left)
//   - the lint route answers rules; the rebuild route runs the build step once at a time
//   - the editor's pure helpers (78-scene-editor.js, loaded in a VM): projection, ground grid, undo stack, recipe edits
// A temp copy root and an in-process router, synthetic data only.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { createApp } from '../server/router.mjs';
import register, { setSceneEditorHooks, sceneEditorEnabled, recipeProblems, recipeObjectIds } from '../server/routes/scene-editor.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const KNOWN = new Set(['vehicle.car', 'person.walker', 'tree.oak', 'boat.narrowboat', 'street.bench']);
const REC = {
  v: 2, pack: 'v2h-test', meta: { id: 'canal', label: 'Test canal', site: 'Testville', tags: ['canal'], mood: 'calm', colour: 'teal' },
  scene: {
    id: 'canal', view: { lat: 53.47, lon: -2.25 }, camera: { eye: 1.7, fov: 64, horizon: 452, heading: 290, water: -0.45 },
    surfaces: [{ id: 'land', kind: 'grass', rest: true }, { id: 'road', kind: 'road', path: [[6, 5], [8, 120]], width: 7 }],
    water: [{ id: 'canal', kind: 'canal', path: [[-2, 5], [-3, 90]], width: 9 }],
    place: [{ obj: 'vehicle.car', on: 'road', d: 24 }, { obj: 'tree.oak', at: [-14, 38] }],
    flows: [], atmos: 'auto', weather: 'live', season: 'auto', at: 'golden', setting: 'mixed',
  },
};
const fileText = (rec) => `/* Scene recipe v2: ${rec.pack}/${rec.meta.id} (test). */\ntypeof sceneAddRecipe === 'function' && sceneAddRecipe(/*@recipe*/${JSON.stringify(rec)}/*@end*/);\n`;

let root, srv, port, enabled = true, runs = 0;
const fakeRegistry = {
  reg: { items: () => [{ ref: 'uk-old/lane', composed: true }] },
  E: { obj: (id) => (KNOWN.has(id) ? { id } : null) },
  get: () => undefined,
};
const slowRun = async () => { runs++; await new Promise(r => setTimeout(r, 30)); return { code: 0, tail: [] }; };
async function start(env, extra = {}) {
  setSceneEditorHooks(Object.assign({ root, env, registry: fakeRegistry, run: slowRun }, extra));
  const logs = [];
  const app = createApp({ port: 0, repoRoot: root, log: (lv, m) => logs.push(m), version: '9.9.9' });
  register(app);
  const server = createServer(async (req, res) => {
    if (await app.handle(req, res)) return;
    res.writeHead(req.method === 'GET' ? 404 : 405); res.end('not found');
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const p = server.address().port;
  app.ctx.port = p;
  return { server, port: p, logs, close: () => new Promise(r => server.close(r)) };
}
async function req(method, path, { body, headers = {}, raw } = {}) {
  const h = Object.assign({ origin: `http://127.0.0.1:${port}` }, headers);
  let data = raw;
  if (body !== undefined && raw === undefined) { data = JSON.stringify(body); h['content-type'] = h['content-type'] || 'application/json'; }
  const r = await fetch(`http://127.0.0.1:${port}${path}`, { method, headers: h, body: data });
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: r.status, json, text };
}

before(async () => {
  root = mkdtempSync(join(tmpdir(), 'v2h-editor-'));
  mkdirSync(join(root, '.git'));
  mkdirSync(join(root, 'src', 'app'), { recursive: true });
  writeFileSync(join(root, 'src', 'app', '71-scene-v2h-test-r-canal.js'), fileText(REC));
  writeFileSync(join(root, 'src', 'app', '71-scene-v2h-test-0.js'), '// a v1 scene file (not a recipe)\n');
  srv = await start({ OPENDASH_SCENE_EDITOR: '1' });
  port = srv.port;
});
after(async () => { await srv?.close(); setSceneEditorHooks(null); rmSync(root, { recursive: true, force: true }); });

test('enabled only with the flag AND a developer checkout', () => {
  assert.equal(sceneEditorEnabled({ env: {}, root }), false);
  assert.equal(sceneEditorEnabled({ env: { OPENDASH_SCENE_EDITOR: 'true' }, root }), false);
  assert.equal(sceneEditorEnabled({ env: { OPENDASH_SCENE_EDITOR: '1' }, root }), true);
  const bare = mkdtempSync(join(tmpdir(), 'v2h-bare-'));
  mkdirSync(join(bare, 'src', 'app'), { recursive: true });
  assert.equal(sceneEditorEnabled({ env: { OPENDASH_SCENE_EDITOR: '1' }, root: bare }), false, 'no .git: a packaged release');
  rmSync(bare, { recursive: true, force: true });
});

test('disabled: every path and method answers 404', async () => {
  for (const env of [{}, { OPENDASH_SCENE_EDITOR: '0' }]) {
    const off = await start(env);
    const save = port; port = off.port;
    try {
      for (const [m, p, body] of [['GET', '/api/scene-editor/status'], ['GET', '/api/scene-editor/recipe?ref=v2h-test/canal'], ['POST', '/api/scene-editor/recipe', { ref: 'v2h-test/canal', version: 'abcdef', rec: REC }],
        ['POST', '/api/scene-editor/lint', { rec: REC }], ['POST', '/api/scene-editor/rebuild', {}], ['DELETE', '/api/scene-editor/anything'], ['GET', '/api/scene-editor/']]) {
        const r = await req(m, p, { body });
        assert.equal(r.status, 404, `${m} ${p}`);
      }
    } finally { port = save; await off.close(); }
  }
  // enabled flag but no .git (a release folder): off as well
  const rel = mkdtempSync(join(tmpdir(), 'v2h-rel-'));
  mkdirSync(join(rel, 'src', 'app'), { recursive: true });
  const keep = root; root = rel;
  const off = await start({ OPENDASH_SCENE_EDITOR: '1' });
  root = keep;
  const save = port; port = off.port;
  try { assert.equal((await req('GET', '/api/scene-editor/status')).status, 404); }
  finally { port = save; await off.close(); rmSync(rel, { recursive: true, force: true }); setSceneEditorHooks({ root, env: { OPENDASH_SCENE_EDITOR: '1' }, registry: fakeRegistry, run: slowRun }); }
});

test('status and a recipe read (the file from the marker scan)', async () => {
  const s = await req('GET', '/api/scene-editor/status');
  assert.equal(s.status, 200);
  assert.equal(s.json.enabled, true); assert.equal(s.json.version, '9.9.9'); assert.equal(s.json.recipes, 1);
  const r = await req('GET', '/api/scene-editor/recipe?ref=v2h-test/canal');
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.rec, REC);
  assert.match(r.json.version, /^[0-9a-f]{40}$/);
  assert.equal(r.json.file, 'src/app/71-scene-v2h-test-r-canal.js');
});

test('bad refs: 400; unknown 404; a v1 scene 409 (run scene migrate first)', async () => {
  for (const ref of ['../etc/passwd', 'v2h-test/../../x', 'v2h-test\\canal', 'C:/x/y', '/abs/path', 'v2h-test', 'V2H/Canal', 'a/b/c', '']) {
    const r = await req('GET', '/api/scene-editor/recipe?ref=' + encodeURIComponent(ref));
    assert.equal(r.status, 400, ref);
    const p = await req('POST', '/api/scene-editor/recipe', { body: { ref, version: 'abcdef', rec: REC } });
    assert.equal(p.status, 400, 'POST ' + ref);
  }
  assert.equal((await req('GET', '/api/scene-editor/recipe?ref=v2h-test/nope')).status, 404);
  const v1 = await req('GET', '/api/scene-editor/recipe?ref=uk-old/lane');
  assert.equal(v1.status, 409); assert.match(v1.json.error, /not a recipe: run scene migrate uk-old\/lane first/);
  // a client-chosen file is never used
  const r = await req('POST', '/api/scene-editor/recipe', { body: { ref: 'v2h-test/canal', version: 'abcdef', rec: REC, file: '../../evil.js' } });
  assert.notEqual(r.status, 200);
});

test('the guards: cross-origin 403, wrong content type 415, too big 413, wrong method 405', async () => {
  const r = await req('GET', '/api/scene-editor/recipe?ref=v2h-test/canal');
  const good = { ref: 'v2h-test/canal', version: r.json.version, rec: REC };
  assert.equal((await req('POST', '/api/scene-editor/recipe', { body: good, headers: { origin: 'https://evil.example' } })).status, 403);
  assert.equal((await req('GET', '/api/scene-editor/status', { headers: { origin: 'https://evil.example' } })).status, 403);
  assert.equal((await req('POST', '/api/scene-editor/recipe', { body: good, headers: { 'sec-fetch-site': 'cross-site' } })).status, 403);
  assert.equal((await req('POST', '/api/scene-editor/recipe', { raw: JSON.stringify(good), headers: { 'content-type': 'text/plain' } })).status, 415);
  const big = JSON.parse(JSON.stringify(good)); big.rec.meta.label = 'x'.repeat(300 * 1024);
  assert.equal((await req('POST', '/api/scene-editor/recipe', { body: big })).status, 413);
  assert.equal((await req('PUT', '/api/scene-editor/recipe', { body: good })).status, 405);
  assert.equal((await req('GET', '/api/scene-editor/lint')).status, 405);
});

test('validation: unknown keys, unsafe text, unknown objects, the budget -> 422; a ref mismatch -> 400', async () => {
  const { json } = await req('GET', '/api/scene-editor/recipe?ref=v2h-test/canal');
  const post = (rec, ref = 'v2h-test/canal') => req('POST', '/api/scene-editor/recipe', { body: { ref, version: json.version, rec } });
  const clone = () => JSON.parse(JSON.stringify(REC));
  const cases = {
    'unknown top key': (r) => { r.extra = 1; },
    'unknown scene key': (r) => { r.scene.script = 'x'; },
    'unknown meta key': (r) => { r.meta.onload = 'x'; },
    'unknown object': (r) => { r.scene.place.push({ obj: 'vehicle.<img src=x onerror=alert(1)>', on: 'road', d: 30 }); },
    'missing object': (r) => { r.scene.place.push({ obj: 'vehicle.spaceship', on: 'road', d: 30 }); },
    'marker in text': (r) => { r.meta.label = 'x/*@end*/);alert(1);('; },
    'comment close': (r) => { r.meta.site = 'a */ b'; },
    'script close': (r) => { r.meta.label = '</script><script>alert(1)</script>'; },
    'control char': (r) => { r.meta.label = 'a\u2028b'; },
    'not v2': (r) => { r.v = 1; },
    'no camera': (r) => { delete r.scene.camera; },
    'scene id mismatch': (r) => { r.scene.id = 'other'; },
    'place not a list': (r) => { r.scene.place = { obj: 'tree.oak' }; },
    'over the budget': (r) => { for (let i = 0; i < 400; i++) r.scene.place.push({ obj: 'tree.oak', at: [i, 40 + i], seed: 100000 + i, variant: 1 }); },
  };
  for (const [why, mut] of Object.entries(cases)) {
    const rec = clone(); mut(rec);
    const r = await post(rec);
    assert.equal(r.status, 422, why + ': ' + r.text.slice(0, 200));
    assert.equal(r.json.code, 'INVALID', why);
    assert.ok(Array.isArray(r.json.problems) && r.json.problems.length, why);
  }
  const other = clone(); other.meta.id = 'other'; other.scene.id = 'other';
  assert.equal((await post(other)).status, 400, 'a rec of another id under this ref');
  const proto = '{"ref":"v2h-test/canal","version":"' + json.version + '","rec":{"v":2,"pack":"v2h-test","meta":{"id":"canal","__proto__":{"x":1}},"scene":{"id":"canal","camera":{}}}}';
  const pr = await req('POST', '/api/scene-editor/recipe', { raw: proto, headers: { 'content-type': 'application/json' } });
  assert.equal(pr.status, 422, 'a __proto__ key');
  assert.equal(readFileSync(join(root, 'src', 'app', '71-scene-v2h-test-r-canal.js'), 'utf8'), fileText(REC), 'nothing was written');
});

test('a good save changes only the block, atomically; a stale version is 409', async () => {
  const file = join(root, 'src', 'app', '71-scene-v2h-test-r-canal.js');
  const before = readFileSync(file, 'utf8');
  const { json } = await req('GET', '/api/scene-editor/recipe?ref=v2h-test/canal');
  const rec = JSON.parse(JSON.stringify(REC));
  rec.scene.place[0].d = 31;
  rec.scene.place.push({ obj: 'street.bench', on: 'road', d: 12, u: 0.9 });
  const r = await req('POST', '/api/scene-editor/recipe', { body: { ref: 'v2h-test/canal', version: json.version, rec } });
  assert.equal(r.status, 200, r.text);
  assert.notEqual(r.json.version, json.version);
  const text = readFileSync(file, 'utf8');
  const a = before.indexOf('/*@recipe*/') + 11, b = before.indexOf('/*@end*/');
  assert.equal(text.slice(0, a), before.slice(0, a), 'the header is untouched');
  assert.equal(text.slice(text.indexOf('/*@end*/')), before.slice(b), 'the tail is untouched');
  assert.deepEqual(JSON.parse(text.slice(a, text.indexOf('/*@end*/'))), rec);
  assert.deepEqual(readdirSync(join(root, 'src', 'app')).filter(f => /tmp/.test(f)), [], 'no temp file left');
  // the read gives the new version; the OLD version is now stale
  const again = await req('GET', '/api/scene-editor/recipe?ref=v2h-test/canal');
  assert.equal(again.json.version, r.json.version);
  const stale = await req('POST', '/api/scene-editor/recipe', { body: { ref: 'v2h-test/canal', version: json.version, rec: REC } });
  assert.equal(stale.status, 409); assert.equal(stale.json.code, 'STALE');
  // a save of the same recipe changes no bytes
  const same = await req('POST', '/api/scene-editor/recipe', { body: { ref: 'v2h-test/canal', version: r.json.version, rec } });
  assert.equal(same.status, 200); assert.equal(same.json.changed, false);
  assert.equal(readFileSync(file, 'utf8'), text);
  assert.ok(!srv.logs.some(l => /Test canal|Testville/.test(l)), 'logs carry codes and counts only');
});

test('rebuild: runs the build step, one at a time', async () => {
  const n = runs;
  const [a, b] = await Promise.all([req('POST', '/api/scene-editor/rebuild', { body: {} }), req('POST', '/api/scene-editor/rebuild', { body: {} })]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
  assert.equal(runs, n + 1);
});

test('the lint route returns rules (the real registry and lint)', async () => {
  // the real registry: lint a recipe built from library objects that exist in the repo
  const { loadRegistry } = await import('../tools/lib/anim-render.mjs');
  const { engineOf } = await import('../tools/lib/scene-lint.mjs');
  const reg = loadRegistry(REPO);
  const E = engineOf(reg);
  if (!E.ready) return;
  const one = await start({ OPENDASH_SCENE_EDITOR: '1' }, { registry: { reg, E, get: (n) => reg.R.get(n) } });
  const save = port; port = one.port;
  try {
    const ids = E.objs().map(d => d.id);
    const tree = ids.find(i => i.startsWith('tree.')), person = ids.find(i => i.startsWith('person.'));
    const rec = JSON.parse(JSON.stringify(REC));
    rec.scene.place = [{ obj: tree, at: [-14, 38] }, { obj: person, at: [2, 20] }];
    const r = await req('POST', '/api/scene-editor/lint', { body: { rec } });
    assert.equal(r.status, 200, r.text);
    assert.ok(Array.isArray(r.json.rules) && r.json.rules.length > 3, JSON.stringify(r.json).slice(0, 600));
    assert.ok(r.json.rules.every(x => typeof x.rule === 'string' && typeof x.ok === 'boolean'));
    assert.equal(typeof r.json.pass, 'boolean');
    const bad = await req('POST', '/api/scene-editor/lint', { body: { rec: Object.assign({}, rec, { meta: Object.assign({}, rec.meta, { label: '</script>' }) }) } });
    assert.equal(bad.status, 200); assert.equal(bad.json.pass, false);
  } finally { port = save; await one.close(); setSceneEditorHooks({ root, env: { OPENDASH_SCENE_EDITOR: '1' }, registry: fakeRegistry, run: slowRun }); }
});

test('recipeObjectIds and recipeProblems (pure)', () => {
  const s = { place: [{ obj: 'a.b' }], scatter: [{ obj: ['c.d', 'e.f'] }, { obj: { 'g.h': 2 } }], flows: [{ mix: { 'vehicle.car': 1 } }] };
  assert.deepEqual(recipeObjectIds(s).sort(), ['a.b', 'c.d', 'e.f', 'g.h', 'vehicle.car']);
  assert.deepEqual(recipeProblems('v2h-test/canal', REC, { E: fakeRegistry.E }), []);
  const engine = recipeProblems('v2h-test/canal', REC, { E: fakeRegistry.E, get: (n) => (n === 'sceneRecipeCheck' ? () => [{ sev: 'error', msg: 'surface road: width must be > 0' }, { sev: 'warn', msg: 'only a warning' }] : undefined) });
  assert.deepEqual(engine.map(p => p.code), ['ENGINE']);
});

/* ---------- the editor's pure helpers (78-scene-editor.js in a VM, no DOM) ---------- */
function loadEditor() {
  const src = readFileSync(join(REPO, 'src', 'app', '78-scene-editor.js'), 'utf8');
  const ctx = { console, Math, JSON, Object, Array, Number, String, Set, Map, WeakMap, Promise, Date };
  vm.createContext(ctx);
  vm.runInContext(src + '\n;this.__ed = { sceneEditorCamera, sceneEditorProject, sceneEditorUnproject, sceneEditorGrid, sceneEditorHistory, sceneEditorApply, sceneEditorPlaceGround, sceneEditorDiff, sceneEditorValidAt, sceneEditorPreviewData, sceneEditorSurfaceAt, sceneEditorClass };', ctx, { filename: '78-scene-editor.js' });
  return ctx.__ed;
}

test('editor helpers: projection round trip and the ground grid', () => {
  const ed = loadEditor();
  const cam = ed.sceneEditorCamera({ camera: { eye: 1.65, fov: 66, horizon: 470 } });
  assert.ok(Math.abs(cam.f - 1232) < 1, 'f = 800 / tan(33 deg)');
  assert.ok(Math.abs(cam.dMin - 4.73) < 0.05);
  const p = ed.sceneEditorProject(cam, 3, 20);
  assert.ok(Math.abs(p.Y - (470 + cam.f * 1.65 / 20)) < 1e-6);
  const g = ed.sceneEditorUnproject(cam, p.X, p.Y);
  assert.ok(Math.abs(g.x - 3) < 1e-6 && Math.abs(g.d - 20) < 1e-6);
  assert.equal(ed.sceneEditorUnproject(cam, 800, 400), null, 'above the horizon');
  const lines = ed.sceneEditorGrid(cam);
  assert.ok(lines.length > 10 && lines.length < 200);
  assert.ok(lines.every(l => l.every(v => Number.isFinite(v))));
});

test('editor helpers: undo / redo stack and recipe edits', () => {
  const ed = loadEditor();
  const h = ed.sceneEditorHistory(3);
  const r0 = JSON.parse(JSON.stringify(REC));
  let r = r0;
  for (let i = 0; i < 5; i++) { h.push(r); r = ed.sceneEditorApply(r, { op: 'nudge', i: 0, dx: 0, dd: 1 }); }
  assert.equal(r.scene.place[0].d, 29);
  assert.equal(r0.scene.place[0].d, 24, 'edits never mutate the previous state');
  let back = r, steps = 0;
  while (h.canUndo()) { back = h.undo(back); steps++; }
  assert.equal(steps, 3, 'the stack keeps its last 3');
  assert.equal(back.scene.place[0].d, 26);
  const fwd = h.redo(back);
  assert.equal(fwd.scene.place[0].d, 27);
  const added = ed.sceneEditorApply(r0, { op: 'add', place: { obj: 'street.bench', on: 'road', d: 12, u: 0.5 } });
  assert.equal(added.scene.place.length, 3);
  const del = ed.sceneEditorApply(added, { op: 'delete', i: 0 });
  assert.equal(del.scene.place.length, 2); assert.equal(del.scene.place[0].obj, 'tree.oak');
  const sw = ed.sceneEditorApply(r0, { op: 'swap', i: 1, obj: 'tree.birch' });
  assert.equal(sw.scene.place[1].obj, 'tree.birch'); assert.deepEqual([...sw.scene.place[1].at], [-14, 38]);
  const mv = ed.sceneEditorApply(r0, { op: 'move', i: 0, x: -3.04, d: 18.26 });
  assert.deepEqual([...mv.scene.place[0].at], [-3, 18.3]); assert.equal(mv.scene.place[0].on, undefined, 'a moved placement is pinned to its ground point');
  const cam = ed.sceneEditorApply(r0, { op: 'camera', patch: { eye: 2.4 } });
  assert.equal(cam.scene.camera.eye, 2.4); assert.equal(cam.scene.camera.fov, 64);
  const d = ed.sceneEditorDiff(r0, ed.sceneEditorApply(ed.sceneEditorApply(mv, { op: 'delete', i: 1 }), { op: 'camera', patch: { eye: 2 } }));
  assert.deepEqual([d.moved, d.added, d.removed, d.camera], [1, 0, 1, true]);
});

test('editor helpers: the ground point of a placement and the stand-in validity rule', () => {
  const ed = loadEditor();
  const cam = ed.sceneEditorCamera(REC.scene);
  const g = ed.sceneEditorPlaceGround(REC.scene, cam, REC.scene.place[1]);
  assert.deepEqual([g.x, g.d], [-14, 38]);
  const road = ed.sceneEditorPlaceGround(REC.scene, cam, REC.scene.place[0]);
  assert.ok(road && Math.abs(road.d - 24) < 1e-9 && road.x > 3 && road.x < 12, 'on the road strip at d 24');
  const px = ed.sceneEditorPlaceGround(REC.scene, cam, { obj: 'bird.gull', x: 300, y: 140, s: 0.4 });
  assert.equal(px, null, 'a pixel placement above the horizon has no ground point');
  // without the engine (A), the stand-in rule: a car on the road is fine, on grass it is not; a tree on the road is not
  assert.equal(ed.sceneEditorValidAt(REC.scene, cam, 'vehicle.car', road.x, 24).ok, true);
  assert.equal(ed.sceneEditorValidAt(REC.scene, cam, 'vehicle.car', -30, 24).ok, false);
  assert.equal(ed.sceneEditorValidAt(REC.scene, cam, 'tree.oak', road.x, 24).ok, false);
  assert.equal(ed.sceneEditorValidAt(REC.scene, cam, 'boat.narrowboat', -2.5, 40).ok, true);
});

test('editor helpers, every callee absent (no core, no v2 compile): the stage plays a v1 stand-in that matches the handles', () => {
  const ed = loadEditor();
  const cam = ed.sceneEditorCamera(REC.scene);
  const scene = JSON.parse(JSON.stringify(REC.scene));
  scene.place.push({ obj: 'vehicle.car', at: [-2.5, 40] }, { obj: 'boat.narrowboat', on: 'canal', d: 30, u: 0.5 }, { obj: 'bird.gull', x: 300, y: 140, s: 0.4, pin: true });
  const data = ed.sceneEditorPreviewData(scene, { season: 'autumn' });
  assert.equal(data.v, 1); assert.equal(data.camera, undefined, 'v1 data: the core compiles it as before');
  assert.equal(data.view.horizon, 452); assert.equal(data.view.fov, 64);
  assert.ok(data.ground.length >= 2 && data.ground.every(g => /^M[-\d.]+ [-\d.]+(L[-\d.]+ [-\d.]+)+Z$/.test(g.d)), 'surfaces become projected ground fills');
  assert.equal(data.water.length, 1); assert.ok(data.water[0].y0 >= 452 && data.water[0].y1 <= 900);
  const objs = data.place.map(p => p.obj);
  assert.equal(objs.filter(o => o === 'vehicle.car').length, 1, 'the car in the canal is refused (not drawn); the one on the road is');
  const boat = data.place.find(p => p.obj === 'boat.narrowboat'), carP = data.place.find(p => p.obj === 'vehicle.car');
  const flat = ed.sceneEditorProject(cam, 0, 30).Y;
  assert.ok(boat.y > flat, 'a boat floats on the water level, below the ground plane (camera.water)');
  const g = ed.sceneEditorPlaceGround(REC.scene, cam, REC.scene.place[0]);
  assert.ok(Math.abs(carP.x - ed.sceneEditorProject(cam, g.x, g.d).X) < 0.2 && Math.abs(carP.y - ed.sceneEditorProject(cam, g.x, g.d).Y) < 0.2, 'the drawn car stands where its handle is');
  assert.equal(carP.layer, 'near'); assert.ok(carP.s > 0);
  assert.ok(data.place.some(p => p.obj === 'bird.gull' && p.x === 300 && p.y === 140), 'pixel placements are kept as they are');
  assert.equal(ed.sceneEditorSurfaceAt(REC.scene, cam, -2.5, 40).kind, 'water');
  assert.equal(ed.sceneEditorSurfaceAt(REC.scene, cam, -40, 40).kind, 'grass');
  assert.equal(ed.sceneEditorClass('boat.narrowboat'), 'boat'); assert.equal(ed.sceneEditorClass('vehicle.tram-x'), 'tram');
  // a placement problem never comes from another list: the editor maps only place[...] problems to handles (checked in the page)
  assert.equal(typeof ed.sceneEditorValidAt(REC.scene, cam, 'bird.gull', 0, 10).exempt, 'boolean');
});

test('with the recipe module (D, tools/lib/scene-recipe.mjs): read and save go through it, canonical and atomic', async (t) => {
  let R;
  try { R = await import('../tools/lib/scene-recipe.mjs'); } catch { t.skip('scene-recipe.mjs is not in this checkout yet'); return; }
  if (typeof R.writeRecipe !== 'function') { t.skip('no writeRecipe'); return; }
  const file = join(root, 'src', 'app', '71-scene-v2h-test-r-canal.js');
  writeFileSync(file, fileText(REC));
  const one = await start({ OPENDASH_SCENE_EDITOR: '1' }, { recipes: R });
  const save = port; port = one.port;
  try {
    const s = await req('GET', '/api/scene-editor/status');
    assert.equal(s.json.standIn, false);
    const r = await req('GET', '/api/scene-editor/recipe?ref=v2h-test/canal');
    assert.equal(r.status, 200, r.text);
    const rec = JSON.parse(JSON.stringify(r.json.rec)); rec.scene.place[1].at = [-15, 39];
    const w = await req('POST', '/api/scene-editor/recipe', { body: { ref: 'v2h-test/canal', version: r.json.version, rec } });
    assert.equal(w.status, 200, w.text);
    const text = readFileSync(file, 'utf8');
    assert.match(text, /"at":\[-15,39\]/);
    assert.equal(text.indexOf('/* Scene recipe v2: v2h-test/canal (test). */'), 0, 'the header is kept');
    assert.equal((await req('POST', '/api/scene-editor/recipe', { body: { ref: 'v2h-test/canal', version: r.json.version, rec } })).status, 409, 'the old version is stale');
  } finally { port = save; await one.close(); writeFileSync(file, fileText(REC)); setSceneEditorHooks({ root, env: { OPENDASH_SCENE_EDITOR: '1' }, registry: fakeRegistry, run: slowRun }); }
});
