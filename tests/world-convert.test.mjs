// World engine v3, module F (docs/dev/WORLD_ENGINE.md 6, 7, 8.6): the converter, the host's pure part, the perf gate, the motion
// checks and the CLI. The browser half (render, perf --browser) is exercised by `node tools/world.mjs render | perf --browser`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { loadEngine, resolveRef, convertRef, convertData, validateSpec, sceneFileSource, WORLD_TEST_REFS } from '../tools/lib/world/convert.mjs';
import { worldPerfCheck, worldPerfNode, worldMotion, worldMotionSvg, WORLD_BUDGET } from '../tools/lib/world/perf.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const E = loadEngine({ root: ROOT });
const LOOK = new Set(['X', 'Y', 'px', 's', 'scale', 'layer', 'flip', 'tint', 'shadow', 'reflect', 'light', 'grade', 'mirror', 'ripple', 'glint', 'clarity', 'colour', 'k', 'sByY', 'pin']);
const looks = (o, path = '', out = []) => {
  if (Array.isArray(o)) o.forEach((x, i) => looks(x, `${path}[${i}]`, out));
  else if (o && typeof o === 'object') for (const k of Object.keys(o)) { if (LOOK.has(k)) out.push(path + '.' + k); looks(o[k], path + '.' + k, out); }
  return out;
};
const converted = new Map();
const conv = (r) => { if (!converted.has(r)) converted.set(r, convertRef(r, { root: ROOT, E })); return converted.get(r); };

test('the three test scenes convert from v2 and validate (8.6 acceptance)', () => {
  assert.equal(typeof E.worldValidate, 'function', 'module A is loaded');
  for (const r of WORLD_TEST_REFS) {
    const c = conv(r);
    assert.equal(c.validation.by, 'worldValidate');
    assert.deepEqual(c.validation.errors, [], `${r}: ${JSON.stringify(c.validation.errors.slice(0, 3))}`);
    assert.ok(c.ok);
    assert.match(c.meta.id, /-w3$/);
    assert.equal(c.spec.v, 3);
    assert.ok(c.spec.backdrop && c.spec.backdrop.style, 'a backdrop is always chosen');
    assert.ok(c.spec.entities.length > 0 && c.spec.life.length > 0, `${r}: entities and life`);
  }
});

test('converted specs hold no screen or look field, only world metres', () => {
  for (const r of WORLD_TEST_REFS) {
    const { spec } = conv(r);
    assert.deepEqual(looks(spec), [], r);
    for (const e of spec.entities) if (e.obj) { assert.ok(Array.isArray(e.at) && e.at.every(Number.isFinite) && e.at[1] > 0, JSON.stringify(e)); assert.equal(e.y, undefined); }
    for (const s of spec.surfaces) {
      assert.ok(s.poly || s.path, s.id);
      if (s.kind === 'water') for (const k of Object.keys(s)) assert.ok(['id', 'kind', 'water', 'poly', 'path', 'width', 'shallow'].includes(k), `water lock: ${k}`);
    }
    assert.equal(validateSpec(spec, {}).ok, true, 'the structural check agrees');
  }
});

test('the report lists what was dropped and what needs review; the original is untouched', () => {
  const hit = resolveRef(E, 'fleet-canal-2');
  const before = JSON.stringify(E.sceneData(hit.item));
  const c = conv('fleet-canal-2');
  assert.equal(JSON.stringify(E.sceneData(hit.item)), before, 'the v2 scene data is not modified');
  const R = c.report;
  assert.equal(R.from, 'v2');
  assert.ok(R.dropped.some(d => d.field === 'x,y,s'), 'pixel placements are listed');
  assert.ok(R.dropped.some(d => /water look/.test(d.why)), 'water look fields are listed');
  assert.ok(R.review.some(x => /pinned perspective art/.test(x.msg)), 'pinned perspective pieces are reviewed, not kept');
  assert.ok(R.review.some(x => x.path === 'backdrop'), 'the chosen backdrop is a review item');
  for (const r of R.review) assert.ok(r.path && r.msg);
});

test('v1-style data: camera synthesised, pixel placements unprojected at the foot, sky art reviewed', () => {
  const cam = E.sceneCamera({ camera: { eye: 1.65, fov: 66, horizon: 470, heading: 90 } });
  const foot = E.sceneProject(cam, 3, 20, 0);
  const data = { view: { lat: 51.3, lon: -0.8, horizon: 470, fov: 66, heading: 90 },
    place: [{ obj: 'tree.bank-oak', x: foot.X, y: foot.Y, s: 0.5 }, { obj: 'bird.gull', x: 300, y: 120, s: 0.3, layer: 'sky' }] };
  const c = convertData(data, { id: 'v1-test' }, E, {});
  assert.equal(c.report.from, 'v1');
  const oak = c.spec.entities.find(e => e.obj === 'tree.bank-oak');
  assert.ok(oak, 'the oak is placed');
  assert.ok(Math.abs(oak.at[0] - 3) < 0.05 && Math.abs(oak.at[1] - 20) < 0.05, JSON.stringify(oak.at));
  assert.ok(c.report.review.some(r => /bird\.gull/.test(r.msg)), 'the sky gull is a review item');
  assert.equal(c.spec.camera.eye, 1.65);
});

test('the scene file a conversion writes evaluates to the same spec through worldAdd', () => {
  const c = conv('sheffield-kelham-1');
  const src = sceneFileSource(c.meta, c.spec, c.report);
  assert.match(src, /worldAdd\('world-test'/);
  const got = [];
  vm.runInNewContext(src, { worldAdd: (pack, meta, spec) => got.push({ pack, meta, spec }) });
  assert.equal(got.length, 1);
  assert.equal(got[0].pack, 'world-test');
  assert.equal(JSON.stringify(got[0].spec), JSON.stringify(c.spec));
});

test('host: the derived v2 data compiles with no refused placement (statics are never re-judged)', () => {
  const specs = WORLD_TEST_REFS.map(r => conv(r).spec);
  for (const id of ['fleet-canal-2-w3', 'fleet-pond-2-w3', 'sheffield-kelham-1-w3']) { const h = resolveRef(E, 'world-test/' + id); if (h) specs.push(E.worldHostSpec(h.item)); }
  for (const spec of specs) {
    const d = E.worldHostV2Data(spec, { id: 'host-test' });
    assert.equal(d.v, 2);
    assert.ok(d.place.length > 0);
    for (const p of d.place) assert.ok(p.pin && Number.isFinite(p.x) && Number.isFinite(p.y) && p.s > 0, JSON.stringify(p));
    const C = E.sceneCompile(d, { season: 'summer' });
    assert.deepEqual(C.problems.filter(p => p.sev === 'error'), []);
  }
});

test('host: a static is scaled from its real size and stands on its anchor', () => {
  const cam = E.sceneCamera({ camera: { eye: 1.65, fov: 64, horizon: 460, heading: 0 } });
  const def = E.sceneObj('street.bench');
  const P = E.sceneProject(cam, 2, 10, 0);
  const d = E.worldHostV2Data({ v: 3, camera: { eye: 1.65, fov: 64, horizon: 460, heading: 0 }, surfaces: [{ id: 'g', kind: 'grass', poly: [[-50, 1], [50, 1], [50, 200], [-50, 200]] }],
    entities: [{ obj: 'street.bench', at: [2, 10], facing: 90 }], life: [], backdrop: { style: 'farmland' } }, { id: 'y' });
  const p = d.place.find(q => /^street\.bench/.test(q.obj));
  assert.ok(p, 'the bench is placed');
  assert.ok(Math.abs(p.x - P.X) < 0.2 && Math.abs(p.y - P.Y) < 0.2, 'anchor = projected foot');
  const info = E.worldObjectInfo('street.bench');
  const h = (info && info.size.h) || 0.9;
  assert.ok(Math.abs(p.s * def.size[1] - cam.f / 10 * h) / (cam.f / 10 * h) < 0.02, 'drawn height = f x real h / z');
});

test('host: views from facing against the line of sight (5 views + mirrors)', () => {
  const S = (facing, x, z) => E.worldHostViewOf(facing, x, z);
  assert.equal(S(0, 0, 10).view, 'back');
  assert.equal(S(180, 0, 10).view, 'front');
  assert.deepEqual([S(90, 0, 10).view, S(90, 0, 10).mirror], ['side', false]);
  assert.deepEqual([S(270, 0, 10).view, S(270, 0, 10).mirror], ['side', true]);
  assert.equal(S(45, 0, 10).view, 'q-back');
  assert.equal(S(135, 0, 10).view, 'q-front');
  assert.equal(S(45, 10, 10).view, 'back', 'off-axis: a thing 45 degrees right facing 45 is seen from behind');
});

test('perf gate: warn over budget, fail at 1.2x, any order violation fails', () => {
  const ok = worldPerfCheck({ frameMs: 9, lifeTickMs: 1.4, orderViolations: 0 });
  assert.equal(ok.ok, true);
  const warn = worldPerfCheck({ frameMs: 15 });
  assert.equal(warn.ok, true);
  assert.equal(warn.lines.find(l => l.item === 'frameMs').status, 'warn');
  const fail = worldPerfCheck({ frameMs: 14 * 1.21 });
  assert.equal(fail.ok, false);
  assert.equal(worldPerfCheck({ orderViolations: 1 }).ok, false);
  for (const k of ['coldLoadMs', 'frameMs', 'lifeTickMs', 'orderMs', 'chunks', 'sprites']) assert.ok(WORLD_BUDGET[k], k);
});

test('perf: the Node part measures every stage of a converted scene', () => {
  const m = worldPerfNode(conv('fleet-pond-2').spec, E, { ticks: 30 });
  for (const k of ['validate', 'build', 'nav', 'lifeInit', 'chunks']) assert.ok(Number.isFinite(m.stages[k]), k);
  assert.ok(m.chunks > 0 && m.chunks <= 24);
  assert.equal(m.orderViolations, 0);
});

test('motion: 60 s of life on the world-test scenes: nobody on a forbidden cell, off the water, popping, or out of order', () => {
  for (const id of ['fleet-canal-2-w3', 'fleet-pond-2-w3', 'sheffield-kelham-1-w3']) {
    const h = resolveRef(E, 'world-test/' + id);
    if (!h) continue;
    const spec = E.worldHostSpec(h.item);
    const r = worldMotion(E, spec, { seconds: 60 });
    const hard = r.red.filter(m => m.rule !== 'stuck');   // stuck walkers are module C's stuck detector (reported by `world motion`)
    assert.deepEqual(hard.slice(0, 5), [], id);
    assert.ok(r.agentsSeen > 0, id + ' has life');
    const svg = worldMotionSvg(E, spec, r);
    assert.match(svg, /^<svg[^>]*viewBox="0 0 1600 900"/);
  }
});

test('CLI: validate and convert', () => {
  const run = (...a) => spawnSync(process.execPath, [join(ROOT, 'tools', 'world.mjs'), ...a], { encoding: 'utf8', cwd: ROOT });
  const v = run('validate', 'fleet-pond-2');
  assert.equal(v.status, 0, v.stdout + v.stderr);
  assert.match(v.stdout, /valid/);
  const c = run('convert', 'fleet-canal-2', '--json');
  assert.equal(c.status, 0, c.stderr);
  const j = JSON.parse(c.stdout);
  assert.equal(j.spec.v, 3);
  assert.equal(j.meta.id, 'fleet-canal-2-w3');
  // --out never replaces an existing file without --force (the hand-built scene files stay)
  const tmp = mkdtempSync(join(tmpdir(), 'world-conv-')), f = join(tmp, 'x.js');
  assert.equal(run('convert', 'sheffield-kelham-1', '--out=' + f).status, 0);
  assert.ok(existsSync(f));
  const again = run('convert', 'sheffield-kelham-1', '--out=' + f);
  assert.equal(again.status, 1);
  assert.match(again.stdout, /NOT written/);
});
