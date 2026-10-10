// The world engine wired into the app's scene loading and the anim-pack tools (docs/dev/WORLD_ENGINE.md 8.7).
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../tools/lib/scene-page.mjs';
import { loadRegistry } from '../tools/lib/anim-render.mjs';
import { worldScenes, worldSceneOf, worldEntry, worldEngineOf } from '../tools/lib/world/refs.mjs';
import { worldMotion } from '../tools/lib/world/perf.mjs';

const ROOT = repoRoot();
const reg = loadRegistry(ROOT, { fresh: true });
const get = reg.R.get;
const cli = (...args) => spawnSync(process.execPath, [join(ROOT, 'tools', 'anim-pack.mjs'), ...args], { cwd: ROOT, encoding: 'utf8', timeout: 300000 });

test('the registry finds every v3 scene by ref, id and short name', () => {
  const all = worldScenes(reg);
  assert.ok(all.length >= 3, 'the three test scenes');
  for (const w of all) {
    assert.equal(worldSceneOf(reg, w.ref).ref, w.ref);
    assert.equal(worldSceneOf(reg, w.item.id).ref, w.ref);
    if (w.item.id.endsWith('-w3')) assert.equal(worldSceneOf(reg, w.item.id.replace(/-w3$/, '')).ref, w.ref);
  }
});

test('a worldAdd item draws through every v2 path: its scene data is the derived v2 data, its still is not empty', () => {
  for (const w of worldScenes(reg)) {
    const d = get('sceneData')(w.item);
    assert.equal(d.v, 2, `${w.ref}: derived v2 data`);
    assert.ok(Array.isArray(d.place) && d.place.length > 50, `${w.ref}: statics placed (${d.place && d.place.length})`);
    assert.equal(get('worldHostSpec')(w.item), w.spec, 'the spec stays reachable');
    const svg = w.item.svg({ season: 'summer' });
    assert.ok(svg.length > 50000, `${w.ref}: the SVG still has the scene in it (${svg.length} bytes)`);
    const e = worldEntry(reg, w);
    assert.equal(e.kind, 'world'); assert.equal(e.data().v, 2);
  }
});

test('the life sim of each test scene: 300 s with no red mark (no forbidden cell, floater, pop, stuck walker, order fault)', () => {
  const E = worldEngineOf(reg);
  for (const w of worldScenes(reg).filter(x => x.pack === 'world-test')) {
    const m = worldMotion(E, w.spec, { seconds: 300 });
    assert.deepEqual(m.red.map(r => `${r.rule} ${r.id} ${r.msg}`), [], w.ref);
    assert.ok(m.agentsSeen >= 5, `${w.ref}: agents ${m.agentsSeen}`);
  }
});

test('scene validate: every v3 scene valid, a bad spec fails with its rule (exit 1)', () => {
  const ok = cli('scene', 'validate');
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /VALID +world-test\/fleet-pond-2-w3/);
  const fx = readdirSync(join(ROOT, 'tests', 'fixtures', 'world')).find(f => /^bad-.*\.json$/.test(f));
  const bad = cli('scene', 'validate', '--file', join(ROOT, 'tests', 'fixtures', 'world', fx));
  assert.equal(bad.status, 1, bad.stdout + bad.stderr);
  assert.match(bad.stdout, /INVALID/);
});

test('scene motion and scene lint accept v3 refs', () => {
  const m = cli('scene', 'motion', 'fleet-pond-2-w3', '--seconds', '30');
  assert.equal(m.status, 0, m.stdout + m.stderr);
  assert.match(m.stdout, /PASS +world-test\/fleet-pond-2-w3 +\(v3; 30 s of life sim/);
  // (the text output: --json through a pipe can be cut short when the tool exits)
  const l = cli('scene', 'lint', 'world-test/fleet-pond-2-w3', '--seconds', '30');
  assert.match(l.stdout, /PASS +world +validate +0 +0 errors/, l.stdout);
  assert.match(l.stdout, /PASS +world +motion +0 +0 red marks in 30 s/);
  const movers = l.stdout.match(/bar +movers +(\d+)/);
  assert.ok(movers && Number(movers[1]) > 0, 'movers come from the life sim');
});
