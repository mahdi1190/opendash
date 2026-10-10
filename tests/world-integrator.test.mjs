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
