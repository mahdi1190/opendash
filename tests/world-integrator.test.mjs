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
    // a marsh (79-world-4marsh.js) makes surfaces, rails and plants of its own, every id prefixed with the marsh's id
    const known = (x) => ids.has(x) || (spec.marsh || []).some(m => typeof m.id === 'string' && String(x).startsWith(m.id + '-'));
    for (const e of spec.entities) if (e.on) assert.ok(known(e.on), `${id}: cluster on ${e.on}`);
    for (const p of spec.life) for (const k of ['on', 'host']) if (p[k]) assert.ok(known(p[k]), `${id}: life ${p.who} ${k} ${p[k]}`);
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

/* ---------- the integration pass (10 Oct): the packages end to end ---------- */
const ADD = `
(function () {
  const spec = { v: 3, place: { lat: 51.29, lon: -0.82, style: 'canal-wooded' }, camera: { eye: 1.65, fov: 64, horizon: 468, heading: 200 },
    surfaces: [{ id: 'cut', kind: 'water', water: 'canal', poly: [[-12, 1], [-3.5, 1], [-3.5, 260], [-12, 260]] }, { id: 'tow', kind: 'towpath', path: [[0, 1], [0, 260]], width: 2.6 }],
    entities: [{ obj: 'boat.narrowboat', id: 'nb-near', at: [-7.5, 6], facing: 0, attach: 'water' }], life: [{ who: 'walkers', on: 'tow', rate: '4/min' }], backdrop: { style: 'canal-wooded' }, seed: 3 };
  const meta = { id: 'integ-v3-1', label: 'Test canal (world)', site: 'a test canal', colour: 'green', mood: 'calm', intensity: 'subtle', priority: 1, theme: 'any',
    region: ['GB-ENG'], tags: ['uk', 'test'], county: 'hampshire', ukRegion: 'south-east', ukKind: 'town', ukPlace: 'integ-canal', ukTown: 'Fleet', ukView: 'towpath', when: () => true };
  globalThis.__integV = animRegisterPack({ id: 'integ-v3', name: 'Integration v3', version: '1.0.0', description: 'test', items: [worldItem(meta, spec)] });
  const spec31 = Object.assign({}, spec, { v: 3.1, camera: undefined, cameras: [{ id: 'east', at: [0, -5], heading: 0, height: 1.65 }, { id: 'west', at: [-20, 120], heading: 180, height: 1.65 }] });
  globalThis.__integItems = worldItems(Object.assign({}, meta, { id: 'integ-v31' }), spec31);
})();`;
const IX = loadR(ADD + "\n;globalThis.__ix = { animItem, worldBuild, worldAddLog, worldFrameAt, worldFrameScene, worldStaticPresent: typeof worldStaticPresent === 'function' ? worldStaticPresent : null, worldOrderNearer, worldKb: typeof worldKb === 'function' ? worldKb : null, v: globalThis.__integV, items: globalThis.__integItems };");
const IXE = globalThis.__ix; delete globalThis.__ix;

test('I1: a v3 item registers through animRegisterPack like any pack item (ref, county, ukPlace, ukView, when, still, load log)', () => {
  assert.deepEqual(IXE.v, { ok: true, errors: [] });
  const it = IXE.animItem('integ-v3/integ-v3-1');
  assert.ok(it, 'in the animation registry by ref');
  for (const [k, v] of Object.entries({ county: 'hampshire', ukPlace: 'integ-canal', ukView: 'towpath', composed: true, world: 3 })) assert.equal(it[k], v, k);
  assert.equal(typeof it.when, 'function');
  const d = R.sceneData(it);
  assert.equal(d.v, 2, 'its scene is the derived v2 data (prebake, bake cache and restart clock work as for any composed item)');
  assert.ok(d.world3, 'and it knows its world');
  assert.ok(it.svg({ season: 'summer' }).length > 1000, 'the still (tiles, reduced motion) is not empty');
  const log = IXE.worldAddLog('integ-v3-1');
  assert.ok(log.some(l => l.id === 'nb-near' && l.rule === 'C1' && l.by === 'appearance'), 'the load log names the frame fix of the near boat');
  // Q7: one item per camera, each with its own view
  assert.deepEqual(IXE.items.map(i => i.id), ['integ-v31-east', 'integ-v31-west']);
  assert.deepEqual(IXE.items.map(i => i.ukView), ['towpath-east', 'towpath-west']);
});

test('the load path runs the frame stage: C1 before and after the fill, C4 with demotion of a landmark this camera cannot show', () => {
  const spec = { v: 3, place: { lat: 51.29, lon: -0.82 }, camera: { eye: 1.65, fov: 64, horizon: 468, heading: 0 },
    surfaces: [{ id: 'yard', kind: 'grass', poly: [[-200, 1], [200, 1], [200, 400], [-200, 400]] }],
    entities: [{ obj: 'building.terrace', id: 'wall', at: [0, 3], facing: 0 }, { obj: 'building.mill-red-brick', at: [-3, 70], facing: 0, id: 'mill' }],
    landmarks: [{ obj: 'structure.bridge-brick', at: [-8, 200], facing: 90, id: 'lm', src: 'test' }], backdrop: { style: 'farmland' }, seed: 1 };
  const w = IXE.worldBuild(spec, {});
  assert.ok(w.log.some(l => l.id === 'wall' && l.rule === 'C1' && (l.action === 'drop' || l.action === 'move')), 'a wall in the lens\'s face is moved or dropped');
  const lm = w.entities.find(e => e.id === 'lm');
  assert.ok(lm && lm.landmark === false && lm.landmarkDemoted, 'the hidden landmark stays as scenery');
  assert.ok(w.log.some(l => l.action === 'demote' && l.rule === 'C4' && /Fix:/.test(l.reason)), 'and the log tells the author how to fix the camera');
  const raw = IXE.worldBuild(spec, { frame: false });
  assert.ok(raw.entities.some(e => e.id === 'wall') && raw.entities.find(e => e.id === 'lm').landmark, 'frame: false skips the stage');
});

test('the frame record: absent statics are not drawn (S1, V3), shadows carry their water holes (L2), flat things lie under movers (R1)', () => {
  assert.equal(typeof IXE.worldStaticPresent, 'function');
  const sc = IXE.worldFrameScene(R.worldHostSpec(itemOf(R, 'world-test', 'fleet-canal-2-w3')), { date: Date.UTC(2026, 0, 15, 12) });
  const f = IXE.worldFrameAt(sc, 2);
  const jan = Object.assign({ ms: Date.UTC(2026, 0, 15, 12) }, f.ctx);
  for (const e of f.ents) if (e.static && e.obj && !e.landmark) assert.ok(IXE.worldStaticPresent(Object.assign({}, e), jan), `${e.obj} drawn in January`);
  assert.ok(f.ents.some(e => e.shadow && Array.isArray(e.shadow.holes)), 'shadows carry holes');
  // a walker on a boardwalk is drawn after the boardwalk; a decal under anything standing
  const deck = { id: 'bw', obj: 'structure.boardwalk', static: true, x: 0, z: 20, foot: [[-1, 10], [1, 10], [1, 30], [-1, 30]], height: 0.4, solidity: 'walkable' };
  const walker = { id: 'p', obj: 'person.walker', static: false, x: 0, z: 20, foot: [[0, 20]] };
  assert.equal(IXE.worldOrderNearer(walker, deck), true);
  const litter = { id: 'lit', obj: 'ground.leaf-litter', static: true, x: 0, z: 20, foot: [[-1, 19], [1, 19], [1, 21], [-1, 21]], height: 0.02, decal: true };
  assert.equal(IXE.worldOrderNearer(walker, litter), true);
  // strictly nearer things stay nearer, flat or not
  const nearKerb = { id: 'k', obj: 'line.kerb', static: true, x: 0, z: 5, foot: [[-1, 4], [1, 4], [1, 6], [-1, 6]], height: 0.12 };
  assert.equal(IXE.worldOrderNearer(walker, nearKerb), false);
});
