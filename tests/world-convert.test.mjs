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
    // U4: ok means valid AND at least as rich as the source (the critic's box measure on both sides)
    assert.ok(c.critic && Number.isFinite(c.critic.source) && Number.isFinite(c.critic.converted), `${r}: the critic compared both`);
    assert.equal(c.ok, c.validation.ok && c.critic.ok);
    assert.equal(c.report.critic, c.critic);
    if (!c.critic.ok) assert.ok(c.report.review.some(x => x.path === 'critic'), 'a poorer conversion is a review item');
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
  // QP3: the pinned perspective pieces of a canal view are parts of real objects seen close; they are carried over as those objects
  // (the hero narrowboat framing the view, the willow whose fronds hang from the corner), never dropped with the composition
  assert.ok(R.review.some(x => /perspective pieces of one hull -> boat\.narrowboat/.test(x.msg) && /framing element/.test(x.msg)), 'the near hero boat is carried over as a framing narrowboat');
  assert.ok(R.review.some(x => /tree\.canal-willow just outside the frame/.test(x.msg)), 'the fronds become the willow they hang from');
  const hero = c.spec.entities.filter(e => /^conv-boat/.test(e.id || ''));
  assert.ok(hero.length >= 1 && hero.some(e => e.framed === true && e.attach === 'water'), 'a near boat in the water, marked as a framing element');
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
  // the bench stands on the grass edge of a path, facing it (K1: benches on paving or the grass edge); the engine may still
  // nudge it (P1-P3), so the anchor is checked against where the world put it
  const spec = { v: 3, camera: { eye: 1.65, fov: 64, horizon: 460, heading: 0 }, surfaces: [{ id: 'g', kind: 'grass', poly: [[-50, 1], [50, 1], [50, 200], [-50, 200]] }, { id: 'p', kind: 'path', path: [[3.5, 1], [3.5, 200]], width: 1.6 }],
    entities: [{ obj: 'street.bench', at: [2, 10], facing: 90 }], life: [], backdrop: { style: 'farmland' } };
  const w = E.worldHostWorld(spec, {}), be = w.entities.find(e => e.obj === 'street.bench');
  assert.ok(be, 'the world keeps the bench');
  const d = E.worldHostV2Data(spec, { id: 'y', world: w });
  const P = E.sceneProject(cam, be.x, be.z, be.y);
  const p = d.place.find(q => /^street\.bench/.test(q.obj));
  assert.ok(p, 'the bench is placed');
  assert.ok(Math.abs(p.x - P.X) < 0.2 && Math.abs(p.y - P.Y) < 0.2, 'anchor = projected foot');
  const info = E.worldObjectInfo('street.bench');
  const h = (info && info.size.h) || 0.9;
  assert.ok(Math.abs(p.s * def.size[1] - cam.f / be.z * h) / (cam.f / be.z * h) < 0.02, 'drawn height = f x real h / z');
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

test('perf gate: the cold load and the world bake fail at 1.2x, frame and warm-load times are reported, any order violation fails', () => {
  const ok = worldPerfCheck({ frameMs: 9, lifeTickMs: 1.4, orderViolations: 0 });
  assert.equal(ok.ok, true);
  // the user's gate is the cold load (under 5 s at a 4x CPU throttle, to a fully drawn scene); the frame and warm-load times depend on the machine:
  // reported ('info'), never failed (SCENE_LESSONS: a forced flush once made every frame 100 times slower)
  const info = worldPerfCheck({ frameMs: 90, frameP95: 400, warmLoadMs: 9000 });
  assert.equal(info.ok, true);
  for (const k of ['frameMs', 'frameP95', 'warmLoadMs']) assert.equal(info.lines.find(l => l.item === k).status, 'info', k);
  assert.equal(worldPerfCheck({ coldLoadMs: 4000, worldBakeMs: 4900 }).ok, true);
  assert.equal(worldPerfCheck({ worldBakeMs: 5000 * 1.21 }).ok, false);
  assert.equal(worldPerfCheck({ coldLoadMs: 5000 * 1.21 }).ok, false);
  assert.equal(worldPerfCheck({ worldBakeMs: 5200 }).lines.find(l => l.item === 'worldBakeMs').status, 'warn');
  assert.equal(worldPerfCheck({ orderViolations: 1 }).ok, false);
  for (const k of ['coldLoadMs', 'worldBakeMs', 'warmLoadMs', 'frameMs', 'frameP95', 'lifeTickMs', 'orderMs', 'chunks', 'sprites', 'spriteMB']) assert.ok(WORLD_BUDGET[k], k);
  assert.equal(WORLD_BUDGET.frameMs.budget, 8); assert.equal(WORLD_BUDGET.frameP95.budget, 14); assert.equal(WORLD_BUDGET.coldLoadMs.budget, 5000); assert.equal(WORLD_BUDGET.worldBakeMs.budget, 5000); assert.equal(WORLD_BUDGET.warmLoadMs.budget, 1000);
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

test('core (23 Oct): a building takes the generator\'s seed, front and shop; a computed 1:1 size registers and unregisters', () => {
  const spec = { v: 3, place: { lat: 53.48, lon: -2.25 }, camera: { eye: 1.65, fov: 60, horizon: 450, heading: 0 }, surfaces: [{ id: 'pave', kind: 'pavement', poly: [[-30, 1], [30, 1], [30, 80], [-30, 80]] }],
    buildings: [{ id: 'ok', foot: [[-20, 40], [-10, 40], [-10, 50], [-20, 50]], storeys: 3, style: 'victorian-terrace', seed: 42, front: 0, shop: { kind: 'cafe' } },
      { id: 'bad', foot: [[10, 40], [20, 40], [20, 50], [10, 50]], storeys: 3, seed: -1, front: 9, shop: 'yes' }], backdrop: { style: 'town-low' }, seed: 1 };
  const errs = E.worldValidate(spec).errors.filter(e => /^buildings/.test(e.path));
  assert.deepEqual(errs.filter(e => /^buildings\[0\]/.test(e.path)), [], 'seed, front and shop are building keys');
  assert.deepEqual(errs.filter(e => /^buildings\[1\]/.test(e.path)).map(e => e.path).sort(), ['buildings[1].front', 'buildings[1].seed', 'buildings[1].shop']);
  // a pinned drawing with no real size: no descriptor until its computed size is registered, and none again once removed
  const PIECE = /[.-](p-v\d|[a-z]*-view-|fpv-|wl-\d|wr-\d)|-(parapet|bough)$/;   // perspective pieces are screen art, never sized
  const ids = (E.sceneObjs ? E.sceneObjs() : []).map(o => typeof o === 'string' ? o : o && o.id).filter(id => typeof id === 'string' && /^(structure|street|landmark)\./.test(id) && !PIECE.test(id) && E.worldObjectInfo(id) === null && !(E.sceneObj(id).real && E.sceneObj(id).real.h > 0) && Array.isArray(E.sceneObj(id).size));
  if (!ids.length) return;
  const id = ids[0];
  assert.equal(E.worldSizeAutoDefine(id, { h: 7.5, l: 2, w: 1.2, from: 'test' }), true);
  assert.equal(E.worldObjectInfo(id).size.h, 7.5);
  assert.equal(E.worldObjectInfo(id).src, 'auto');
  E.worldSizeAutoDefine(id, null);
  assert.equal(E.worldObjectInfo(id), null);
  // the converter computes it from a pinned placement: h = size[1] x s x anchor depth / f
  const data = { v: 2, id: 'pin-test', camera: { eye: 1.65, fov: 60, horizon: 450, heading: 0 }, surfaces: [{ id: 'g', kind: 'grass', rest: true }], place: [{ obj: id, x: 800, y: 600, s: 1, pin: true }] };
  const out = convertData(data, { id: 'pin-test' }, E, { ref: 'test/pin-test' });
  const cam = E.sceneCamera(Object.assign({}, data, { camera: data.camera })), g = E.sceneUnproject(cam, 800, 600);
  assert.equal(out.report.sizes.length, 1);
  assert.ok(Math.abs(out.report.sizes[0].h - E.sceneObj(id).size[1] * g.d / cam.f) < 0.02, JSON.stringify(out.report.sizes[0]));
  assert.ok(out.spec.entities.concat(out.spec.landmarks || []).some(e => e.obj === id), 'the drawing is placed (it has a size now)');
  E.worldSizeAutoDefine(id, null);
});

test('lossless conversion: buildings, cars and buses, one population per surface, nudges, pits and a compact file', () => {
  // Deansgate's v2 source: 6 footprints, a drive flow with its bus every 3 min, street trees in pits
  const c = conv('uk-north-manchester-centre/greater-manchester-manchester-centre-4');
  assert.equal(c.validation.ok, true, JSON.stringify(c.validation.errors.slice(0, 3)));
  assert.equal(c.spec.buildings.length, c.report.counts.v2Buildings);
  assert.equal(c.spec.buildings.length, 6);
  for (const b of c.spec.buildings) { assert.ok(b.foot.length >= 4 && b.style && Number.isInteger(b.seed) && b.front === 0 && (b.storeys || b.h), JSON.stringify(b)); }
  assert.ok(!c.spec.entities.some(e => /^building\./.test(e.obj || e.cluster || '')), 'no building entities or gen-direct placeholders');
  const cars = c.spec.life.find(l => l.who === 'cars'), buses = c.spec.life.find(l => l.who === 'buses');
  assert.deepEqual(cars && cars.mix, { 'vehicle.car-city': 5, 'vehicle.taxi-black': 3, 'vehicle.car': 2 }, 'the flow\'s own vehicles');
  assert.equal(buses && buses.every, '3min');
  assert.deepEqual(buses.mix, { 'vehicle.bus-double-decker': 1 });
  assert.ok(!c.spec.life.some(l => l.who === 'traffic'));
  assert.equal(c.spec.backdrop.style, 'city-manchester-towers');
  assert.ok(c.spec.surfaces.some(s => /^tree-pit-/.test(s.id) && s.kind === 'grass'), 'pit: true keeps its pit');
  assert.ok(c.report.counts.nudged > 0 && c.report.review.some(r => /kept where the placement solver settled/.test(r.msg)), 'conflicts nudged, not deleted');
  assert.ok(c.report.notes.some(n => /nudged [\d.]+ m by the placement solver/.test(n)));
  assert.ok(!c.report.review.some(r => /\$nudge/.test(r.msg)) && !c.report.notes.some(n => /\$nudge/.test(n)), 'no temporary names leak');
  // a duplicate (a placed object and the compile's copy of it) is merged, never nudged apart into two
  for (const sp of [c.spec, conv('uk-north-manchester-quays-nq/greater-manchester-ancoats-canal').spec]) {
    const ents = sp.entities.filter(e => e.obj && Array.isArray(e.at));
    for (let i = 0; i < ents.length; i++) for (let j = i + 1; j < ents.length; j++) if (ents[i].obj === ents[j].obj && /^street\.lamp/.test(ents[i].obj)) assert.ok(Math.hypot(ents[i].at[0] - ents[j].at[0], ents[i].at[1] - ents[j].at[1]) >= 0.5, `${ents[i].obj} twice: ${ents[i].at} / ${ents[j].at}`);
  }
  const src = sceneFileSource(c.meta, c.spec, c.report), lines = src.split('\n').length;
  assert.ok(lines < 40 + c.spec.surfaces.length + c.spec.buildings.length + c.spec.entities.length + c.spec.life.length + 30, 'one line per entry: ' + lines);
  // sheffield-centre-1: the houses of its Pinstone Street rule and its at/frontage buildings come through; a flow on two surfaces is two populations
  const s = conv('uk-north-sheffield-centre/south-yorkshire-sheffield-centre-1');
  assert.equal(s.spec.buildings.length, s.report.counts.v2Buildings);
  assert.ok(s.spec.buildings.filter(b => /^v2 streets/.test(b.src)).length >= 10, 'the street rule\'s houses');
  assert.ok(s.spec.buildings.some(b => b.party === 'both'), 'terrace party walls');
  const per = new Map(); for (const l of s.spec.life) if (l.on) per.set(l.on, (per.get(l.on) || 0) + 1);
  assert.ok([...per.keys()].length >= 5, 'one population per lived surface: ' + [...per.keys()].join(', '));
  assert.ok(s.critic.ok, `critic ${s.critic.converted} vs ${s.critic.source}`);
});

test('CLI: validate and convert', () => {
  const run = (...a) => spawnSync(process.execPath, [join(ROOT, 'tools', 'world.mjs'), ...a], { encoding: 'utf8', cwd: ROOT });
  const v = run('validate', 'fleet-pond-2');
  assert.equal(v.status, 0, v.stdout + v.stderr);
  assert.match(v.stdout, /valid/);
  const c = run('convert', 'fleet-canal-2', '--json');
  const j = JSON.parse(c.stdout);
  assert.equal(j.spec.v, 3);
  assert.equal(j.meta.id, 'fleet-canal-2-w3');
  // exit 0 only when valid and at least as rich as the source (U4)
  assert.equal(c.status, j.report.validation.ok && j.report.critic && j.report.critic.ok ? 0 : 1, c.stderr);
  // --out never replaces an existing file without --force (the hand-built scene files stay)
  const tmp = mkdtempSync(join(tmpdir(), 'world-conv-')), f = join(tmp, 'x.js');
  const first = run('convert', 'sheffield-kelham-1', '--out=' + f);
  assert.match(first.stdout, /critic: converted [\d.]+ vs source [\d.]+/);
  assert.ok(existsSync(f), first.stdout);
  const again = run('convert', 'sheffield-kelham-1', '--out=' + f);
  assert.equal(again.status, 1);
  assert.match(again.stdout, /NOT written/);
});
