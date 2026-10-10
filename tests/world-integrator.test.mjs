// The world-engine integrator (docs/dev/WORLD_ENGINE.md 8.7): hooks, loaders and the three v3 test scenes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';
import { repoRoot, sceneSourceFiles } from '../tools/lib/scene-page.mjs';
import { SCENE_FILE_RE } from '../tools/lib/anim-sources.mjs';

const ROOT = repoRoot(), APP = join(ROOT, 'src', 'app');
const SCENES = { 'fleet-canal-2-w3': '79-world-zscene-fleet-canal-2.js', 'fleet-pond-2-w3': '79-world-zscene-fleet-pond-2.js', 'sheffield-kelham-1-w3': '79-world-zscene-sheffield-kelham-1.js' };
const FORBIDDEN = ['X', 'Y', 'px', 's', 'scale', 'layer', 'flip', 'tint', 'shadow', 'reflect', 'light', 'grade', 'mirror', 'ripple', 'glint', 'clarity', 'colour', 'path'];

function specOf(file) {
  const got = [];
  vm.runInNewContext(readFileSync(join(APP, file), 'utf8'), { worldAdd: (pack, meta, spec) => got.push({ pack, meta, spec }), Math });
  return got;
}

test('loaders pick up every 79-world file', () => {
  assert.ok(SCENE_FILE_RE.test('79-world-0core.js') && SCENE_FILE_RE.test('79-world-zscene-fleet-pond-2.js'));
  assert.ok(!SCENE_FILE_RE.test('79-story-core.js'));
  const names = sceneSourceFiles(ROOT).map(p => basename(p));
  for (const f of Object.values(SCENES)) assert.ok(names.includes(f), f);
  const w = names.filter(n => n.startsWith('79-world-'));
  assert.deepEqual(w, w.slice().sort(), 'build order is name order (core before scenes)');
});

test('the player routes data.v === 3 to worldRendererFor', () => {
  const src = readFileSync(join(APP, '78-scene-player.js'), 'utf8');
  assert.match(src, /data\.v === 3 && typeof worldRendererFor === 'function'\) return worldRendererFor\(item, el,/);
});

for (const [id, file] of Object.entries(SCENES)) {
  test(`${id}: registers one v3 spec in the hidden world-test pack, world fields only`, () => {
    const got = specOf(file);
    assert.equal(got.length, 1);
    const { pack, meta, spec } = got[0];
    assert.equal(pack, 'world-test'); assert.equal(meta.id, id); assert.equal(spec.v, 3);
    assert.ok(spec.backdrop && spec.backdrop.style, 'backdrop required');
    for (const e of spec.entities) {
      for (const k of FORBIDDEN) assert.ok(!(k in e), `${id}: entity ${e.obj || e.cluster} has screen/look field ${k}`);
      if (!e.cluster) { assert.ok(Array.isArray(e.at) && e.at.length === 2 && e.at.every(Number.isFinite), `${e.obj} at`); assert.ok(!('y' in e) || /^(air|wall)/.test(e.attach || '')); }
    }
    for (const l of spec.landmarks || []) assert.ok(l.src, `${l.obj} carries src`);
    const ids = new Set(spec.surfaces.map(s => s.id).concat(spec.entities.map(e => e.id).filter(Boolean)));
    for (const e of spec.entities) if (e.on) assert.ok(ids.has(e.on), `${id}: cluster on ${e.on}`);
    for (const p of spec.life) for (const k of ['on', 'host']) if (p[k]) assert.ok(ids.has(p[k]), `${id}: life ${p.who} ${k} ${p[k]}`);
    // rich standard: not sparse
    assert.ok(spec.entities.length >= 35, 'at least 35 entity entries');
    assert.ok(spec.life.length >= 5, 'at least 5 populations');
  });
}

// When module A is merged, the specs must pass the real validator.
const LOAD = join(ROOT, 'tools', 'lib', 'world', 'load.mjs');
test('the three specs pass worldValidate', { skip: !existsSync(join(APP, '79-world-0core.js')) || !existsSync(LOAD) ? 'module A not merged yet' : false }, async () => {
  const mod = await import(pathToFileURL(LOAD).href);
  const ctx = await (mod.loadWorld || mod.default)();
  for (const [id, file] of Object.entries(SCENES)) {
    const { spec } = specOf(file)[0];
    const r = ctx.worldValidate(spec);
    assert.ok(r.ok, `${id}: ${JSON.stringify(r.errors.slice(0, 8))}`);
  }
});

// package render (docs/dev/WORLD_ENGINE.md 2.8; I2): the world compositor applies to the live data of v3 scenes only
import { loadScenes } from '../tools/lib/scene-page.mjs';
const RN = ['worldHostData', 'worldHostLive', 'worldHostSpec', 'worldFramePassOn', 'sceneCompile', 'sceneData', 'sceneRenderPasses', 'sceneRenderIsV2', '_scPacks', '_animRefs'];
function loadR(extra = '') {
  const x = 'globalThis.__wi = {' + RN.map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ') + '};';
  loadScenes(ROOT, { fixtures: false, browser: true, extra: extra + '\n;\n' + x });
  const E = globalThis.__wi;
  delete globalThis.__wi;
  return E;
}
const R = loadR();
const passIds = (C, stage) => R.sceneRenderPasses(stage, C).map(p => p.id);
const itemOf = (E, pack, id) => (E._scPacks[pack] || []).find(it => it.id === id) || (E._animRefs && E._animRefs.get(pack + '/' + id)) || null;

test('the world passes apply to the live data of v3 scenes only: v1 and v2 scenes are untouched', () => {
  assert.equal(R.worldFramePassOn(), true);
  // a v3 scene's live data: the compositor draws it (the v2 movers pass stays out)
  const spec = R.worldHostSpec(itemOf(R, 'world-test', 'fleet-pond-2-w3'));
  const live = R.worldHostData(spec, { id: 'integ-pond', sim: 'none' });
  const C = R.sceneCompile(live, { season: 'summer' });
  assert.ok(passIds(C, 'frameGroup').includes('world-frame'));
  assert.ok(passIds(C, 'prebake').includes('world-frame'));
  assert.ok(!passIds(C, 'frameGroup').includes('world-life'));
  // its still: plain v2 data with the statics; no world pass (it is drawn as any v2 scene)
  const still = R.worldHostData(spec, { id: 'integ-pond', sim: false });
  const Cs = R.sceneCompile(still, { season: 'summer' });
  assert.ok(!passIds(Cs, 'frameGroup').some(id => /^world-/.test(id)));
  // the v2 originals of the test scenes and a v1 scene: no world pass ever applies
  let v2 = 0, v1 = 0;
  for (const [pack, packItems] of Object.entries(R._scPacks)) {
    if (pack === 'world-test') continue;
    for (const it of packItems) {
      let d = null;
      try { d = R.sceneData(it); } catch (e) { d = null; }
      if (!d || typeof d !== 'object' || d.world3) continue;
      if (d.v === 2 && v2 < 4) {
        const Cv = R.sceneCompile(d, { season: 'summer' });
        assert.ok(R.sceneRenderIsV2(Cv));
        assert.ok(!['prebake', 'frameGroup', 'movers', 'framePost'].some(st => passIds(Cv, st).some(id => /^world-/.test(id))), `${pack}/${it.id}`);
        v2++;
      } else if (d.v !== 2 && d.v !== 3 && v1 < 2 && Array.isArray(d.place)) {
        const Cv = R.sceneCompile(d, { season: 'summer' });
        if (!R.sceneRenderIsV2(Cv)) { assert.equal(passIds(Cv, 'frameGroup').length, 0, `${pack}/${it.id}`); v1++; }
      }
      if (v2 >= 4 && v1 >= 2) break;
    }
    if (v2 >= 4 && v1 >= 2) break;
  }
  assert.ok(v2 >= 1, 'v2 scenes were checked');
});

test('v3.1 specs route to the host too; the player hands raw v3 data to worldRendererFor', () => {
  const spec = Object.assign({}, R.worldHostSpec(itemOf(R, 'world-test', 'fleet-pond-2-w3')), { v: 3.1 });
  assert.equal(R.worldHostSpec({ scene: { v: 3.1, spec } }), spec);
  assert.equal(R.worldHostSpec(spec), spec);
  const live = R.worldHostData(spec, { id: 'integ-31', sim: 'none' });
  assert.equal(R.worldHostSpec(live), spec, 'the derived data knows its spec');
});

test('without the compositor the live data keeps its statics and the agents go through the v2 movers (a missing package removes a feature, never the scene)', () => {
  const N = loadR('function worldFramePassOn() { return false; }');
  const spec = N.worldHostSpec(itemOf(N, 'world-test', 'fleet-pond-2-w3'));
  const live = N.worldHostData(spec, { id: 'integ-nocomp', sim: 'none' });
  assert.ok(live.place.length > 50, 'statics as v2 placements');
  assert.equal(N.worldHostLive(live.id).compositor, false);
  const C = N.sceneCompile(live, { season: 'summer' });
  const ids = N.sceneRenderPasses('movers', C).map(p => p.id);
  assert.ok(ids.includes('world-life'));
  assert.ok(!N.sceneRenderPasses('frameGroup', C).map(p => p.id).includes('world-frame'));
});
