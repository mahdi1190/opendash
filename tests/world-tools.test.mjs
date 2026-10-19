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


/* ---------- the tools package (docs/dev/WORLD_ENGINE.md 16.4, 16.5; U3, U4, V6, V7, F1, F2, Z1, Z2, X1-X4, I3, G9) ---------- */
const E = (await import('../tools/lib/world/convert.mjs')).loadEngine({ root: ROOT });
const { resolveRef } = await import('../tools/lib/world/convert.mjs');
const W = await import('../tools/world.mjs');
const C = await import('../tools/lib/world/critic.mjs');
const SH = await import('../tools/lib/world/sheet.mjs');
const CAP = await import('../tools/lib/world/capture.mjs');
const CMP = await import('../tools/lib/world/compare.mjs');
const ADV = await import('../tools/lib/world/adversarial.mjs');
const PF = await import('../tools/lib/world/perf.mjs');
const world = (...a) => spawnSync(process.execPath, [join(ROOT, 'tools', 'world.mjs'), ...a], { cwd: ROOT, encoding: 'utf8', timeout: 600000, maxBuffer: 256 * 1024 * 1024 });
const specOfRef = (r) => E.worldHostSpec(resolveRef(E, r).item);
const BROWSER = process.env.WORLD_BROWSER === '1';

test('sheet, matrix, capture and compare plans (U3, V6): 3 dates x 5 times + sizes; 4 seasons x 5 times x 3 weathers; the whole loop', () => {
  const spec = specOfRef('world-test/fleet-pond-2-w3');
  const plain = SH.worldSheetPlan(spec);
  assert.equal(plain.filter(c => c.row < 3).length, 15);
  assert.deepEqual(plain.filter(c => c.row === 3).map(c => c.size), Object.keys(SH.WORLD_SIZES));
  assert.deepEqual(SH.WORLD_SIZES['21:9'], { w: 3440, h: 1440 }); assert.deepEqual(SH.WORLD_SIZES['4k'], { w: 3840, h: 2160 });
  const m = SH.worldSheetPlan(spec, { matrix: true });
  assert.equal(m.length, 65, '60 cells and a winter snow day');
  assert.deepEqual([...new Set(m.map(c => c.season))].sort(), ['autumn', 'spring', 'summer', 'winter']);
  assert.deepEqual([...new Set(m.map(c => c.wx))].sort(), ['clear', 'cloudy', 'rain', 'snow']);
  assert.deepEqual([...new Set(m.map(c => c.moment))], ['dawn', 'noon', 'golden', 'dusk', 'night']);
  for (const c of m) assert.ok(Number.isFinite(Date.parse(c.at)), c.label);
  const full = CAP.worldCapturePlan({ full: true, loop: 360, every: 6 });
  assert.equal(full.length, 62); assert.equal(full[0], 0); assert.equal(full[60], 360); assert.equal(full[61], 366, 'the frame after the seam');
  assert.ok(CAP.worldCapturePlan({ seconds: 20, fps: 2 }).length === 41);
  const cmp = CMP.worldComparePlan(spec);
  assert.equal(cmp.length, 15);
  assert.ok(SH.worldReviewChecklist('sheet').some(l => /green deciduous trees/.test(l)) && SH.worldReviewChecklist('sheet').some(l => /snow/.test(l)) && SH.worldReviewChecklist('sheet').some(l => /lit windows/.test(l)) && SH.worldReviewChecklist('sheet').some(l => /shadows at night/.test(l)), 'V7 checklist');
});

test('critic (P7, U4): one box measure for both sides; a poorer world scores lower; --against compares with the source', () => {
  const rec = (n, z, obj) => Array.from({ length: n }, (_, i) => ({ obj: obj + (i % 7), z, box: [i * 37 % 1500, 300 + (i % 5) * 60, i * 37 % 1500 + 80, 400 + (i % 5) * 60] }));
  const rich = C.criticScore([...rec(40, 8, 'a'), ...rec(200, 40, 'b'), ...rec(300, 200, 'c')], { horizon: 460 });
  const poor = C.criticScore([...rec(2, 8, 'a'), ...rec(10, 40, 'b')], { horizon: 460 });
  assert.ok(rich.score > poor.score + 20, `${rich.score} vs ${poor.score}`);
  assert.deepEqual(C.criticScore([...rec(40, 8, 'a')], { horizon: 460 }), C.criticScore([...rec(40, 8, 'a')], { horizon: 460 }), 'deterministic');
  const spec = specOfRef('world-test/fleet-canal-2-w3');
  const full = C.worldCritic(E, spec);
  for (const k of ['score', 'richness', 'coverage', 'framing', 'problems', 'by']) assert.ok(k in full, k);
  // emptied AND unfilled (the kb fill would lift a bare world back to the richness target: P7 by design)
  const bare = C.worldCritic(E, Object.assign({}, spec, { entities: [], landmarks: [], fill: false }));
  assert.ok(bare.score < full.score, `an emptied world scores lower (${bare.score} < ${full.score})`);
  const src = C.criticOfRef(E, 'fleet-canal-2', {}, resolveRef);
  assert.equal(src.v, 2); assert.ok(src.score > 0 && src.records > 100, 'the v2 source through its compile');
  const ag = C.criticAgainst(E, spec, 'fleet-canal-2', {}, resolveRef);
  assert.equal(ag.ok, ag.v3.score + 0.5 >= ag.source.score);
  const r = world('critic', 'fleet-canal-2-w3', '--against=fleet-canal-2', '--json');
  const j = JSON.parse(r.stdout);
  assert.ok(j.critic.score > 0 && j.against.score > 0);
  assert.equal(r.status, (j.critic.score + 0.5 < j.against.score) || (j.critic.problems || []).length ? 1 : 0, 'exit 1 when poorer than the source or with problems');
});

test('accept pieces (X1, X2, I3, Z2): the owner table, the phase files, the privacy scan of the world files, authoring times', async () => {
  const owners = W.worldOwners(ROOT);
  assert.deepEqual(owners.map(r => r.key), ['kb', 'sense', 'systems', 'life', 'appearance', 'render', 'look', 'tools']);
  const tools = owners.find(r => r.key === 'tools');
  for (const id of ['U3', 'U4', 'V6', 'V7', 'F1', 'F2', 'Z1', 'Z2', 'X1-X4', 'I3', 'G9']) assert.ok(tools.ids.includes(id), id);
  const files = W.worldPhaseFiles(ROOT, tools);
  for (const f of ['tools/world.mjs', 'tools/lib/world/critic.mjs', 'src/app/79-world-9inv.js', 'src/app/79-world-9debug.js', 'tests/world-invariants.test.mjs', 'tests/fixtures/world/adversarial/empty-scene.json']) assert.ok(files.includes(f), f);
  assert.ok(W.worldFiles(ROOT).includes('src/app/79-world-9inv.js'));
  const p = await W.worldPrivacyScan(ROOT);
  assert.ok(p.files > 20);
  assert.deepEqual(p.errors.map(f => `${f.file}:${f.line} ${f.rule}`), [], 'no personal data in the world files');
  const a = W.worldAuthoring(ROOT, ['fleet-canal-2-w3'], null);
  assert.equal(a.length, 1); assert.ok(a[0].by && 'minutes' in a[0] && 'rounds' in a[0]);
  const report = W.worldAcceptReport({ pass: false, items: [{ id: '16.5.2', name: 'invariants', status: 'fail', lines: ['x'] }], failedRules: ['habitat'] }, { authoring: a });
  assert.match(report, /Gate: \*\*FAIL\*\*/);
  assert.match(report, /## X1\. Package owners/); assert.match(report, /## X2\. Checkpoint commits/); assert.match(report, /never commits/);
  assert.match(report, /## X3\. SCENE_LESSONS/); assert.match(report, /## Z2\. Authoring time/); assert.match(report, /habitat: sense/);
});

function refMedian() {
  const t = [];
  for (let k = 0; k < 5; k++) { const a = new Float64Array(200000); let x = 12345; for (let i = 0; i < a.length; i++) { x = (x * 1103515245 + 12345) >>> 0; a[i] = x; } const t0 = performance.now(); a.sort(); t.push(performance.now() - t0); }
  t.sort((p, q) => p - q); return t[2];
}
test('perf (F1, F2, Z1, G12): both average-machine sizes, the matrix extremes, and the per-system profile within 1.2x of each budget', async () => {
  assert.deepEqual(PF.WORLD_PERF_SIZES.map(s => s.id), ['1920x1080@1.25', '3440x1440']);
  assert.equal(PF.WORLD_PERF_SIZES[0].size.w * PF.WORLD_PERF_SIZES[0].dpr, 1920);
  const snow = PF.WORLD_PERF_EXTREMES.find(e => e.id === 'snowy-night');
  assert.equal(snow.wx, 'snow');
  const at = PF.worldPerfAt(snow, { place: { lon: 0 } }, 2026);
  assert.equal(at, '2026-01-15T22:00:00.000Z');
  const spec = specOfRef('world-test/sheffield-kelham-1-w3');
  // medians over the run (the runner keeps p50 per system), judged at 1.2x. The suite runs its files side by side, so a run
  // that lands on a busy moment is measured again after a pause (up to 6 tries); a real regression fails every try
  let over = [];
  for (let k = 0; k < 6; k++) {
    if (k) await new Promise(r => setTimeout(r, 2500));
    const p = PF.worldPerfProfile(E, spec, { seconds: 8 });
    assert.ok(p.systems.length >= 1, 'the profile lists the systems');
    // a slower machine than the one the budgets were set on (a shared CI runner) is allowed its ratio: a fixed reference workload (a sort of
    // 200 000 numbers, 16 ms on that machine; the same as tests/world-life.test.mjs) says how much slower it is right now
    const scale = Math.max(1, refMedian() / 16);
    over = p.systems.filter(s => s.status === 'fail' && s.p50 > s.budget * 1.2 * scale).map(s => `${s.id} p50 ${s.p50} ms > 1.2 x ${s.budget} ms (x${scale.toFixed(2)} for this machine)`);
    if (!over.length) break;
  }
  assert.deepEqual(over, [], 'a system over its budget (tell its owner)');
});

test('the adversarial fixtures (16.3): 14 deliberately wrong scenes, each with the log actions it must produce', () => {
  const fx = ADV.adversarialFixtures(ROOT);
  assert.equal(fx.length, 14);
  const want = ['boats-on-towpath', 'bough-no-tree', 'fronds-mid-air', 'people-in-hedge-and-wall', 'bench-across-path', 'cars-on-the-right', 'duck-on-roof',
    'train-off-rails', 'empty-scene', 'hand-set-light', 'landmark-behind-trees', 'giant-person', 'crowd-too-big', 'camera-into-wall'];
  assert.deepEqual(fx.map(f => f.id).sort(), want.slice().sort());
  for (const f of fx) {
    assert.ok(f.title && f.about && Array.isArray(f.req) && f.req.length, f.id);
    assert.ok(f.expect && Array.isArray(f.expect.log) && f.expect.log.length, f.id + ': the log actions it must produce');
    for (const e of f.expect.log) assert.ok(Array.isArray(e.any) && e.any.length && (e.id || e.n || e.match || e.obj), f.id + ': ' + JSON.stringify(e));
    assert.equal(f.spec.v, 3, f.id);
    assert.ok(f.spec.camera && Array.isArray(f.spec.surfaces), f.id);
  }
  // logMatches: exact, any-of, counts and patterns
  const log = [{ id: 'nb1', action: 'snap', rule: 'badAttach' }, { action: 'strip', path: 'light' }, { action: 'strip', path: 'grade' }, { action: 'default', reason: 'backdrop style from place.style' }];
  assert.equal(ADV.logMatches(log, { log: [{ any: ['snap', 'drop'], id: 'nb1' }] }).ok, true);
  assert.equal(ADV.logMatches(log, { log: [{ any: ['drop'], id: 'nb1' }] }).ok, false);
  assert.equal(ADV.logMatches(log, { log: [{ any: ['strip'], n: 2 }] }).ok, true);
  assert.equal(ADV.logMatches(log, { log: [{ any: ['strip'], n: 3 }] }).ok, false);
  assert.equal(ADV.logMatches(log, { log: [{ any: ['default', 'fill'], match: 'backdrop|style' }] }).ok, true);
});

test('the invariant run and the CLI: invariants, adversarial and validate --log', () => {
  const spec = specOfRef('world-test/fleet-pond-2-w3');
  const r = ADV.worldInvariantRun(E, spec, { seconds: 4, hz: 2 });
  assert.ok(r.frames >= 9 && r.ran.length > 15, `frames ${r.frames}, rules ${r.ran.length}`);
  for (const k of ['counts', 'first', 'uniq', 'violations', 'na', 'agentsSeen', 'msPerFrame', 'kind', 'frameSource']) assert.ok(k in r, k);
  const a = world('adversarial', 'bench-across-path', '--seconds=4', '--hz=2', '--json');
  const j = JSON.parse(a.stdout);
  assert.equal(j.length, 1); assert.equal(j[0].id, 'bench-across-path');
  assert.equal(a.status, j[0].ok ? 0 : 1);
  const v = world('validate', join('tests', 'fixtures', 'world', 'adversarial', 'hand-set-light.json'), '--log');
  assert.equal(v.status, 1, 'hand-set light is invalid in strict mode');
  assert.match(v.stdout, /screenOrLookField|unknownKey/);
  assert.match(v.stdout, /load log|expected log entries/);
  // (the 15-cell CLI run hangs for the whole 600 s on the Windows Node 20 CI runner only (Node 22 and 24 on Windows, and every other system, pass it
  // in seconds); not reproduced locally, so that one cell of the matrix skips it. Open item: find out what the cell processes wait for.)
  if (process.platform === 'win32' && /^v20\./.test(process.version)) return;
  const inv = world('invariants', 'fleet-pond-2', '--seconds=1', '--hz=1', '--json');
  const cells = JSON.parse(inv.stdout);
  assert.equal(cells.length, 15, '3 dates x 5 times');
  assert.equal(inv.status, cells.some(c => c.uniq || c.error) ? 1 : 0);
});

test('the dev overlays and the scrubber (G9, V6): registered as a render pass, off unless #worlddev=1', () => {
  assert.equal(typeof E.worldDebug, 'function');
  assert.equal(typeof E.worldDevApply, 'function');
  assert.deepEqual(Object.keys(E.WORLD_DEV_LAYERS).sort(), ['footprints', 'light', 'nav', 'order', 'paths', 'profile', 'violations', 'water', 'wind']);
  assert.equal(E.worldDevOn(), false, 'no page address in Node');
  assert.equal(E.worldDevApply({ ms: 0 }), 0, 'no document in Node');
  // the pass draws into any 2D context: a recording stub
  const calls = [];
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (typeof k === 'string' ? (...a) => { calls.push(k); return k === 'measureText' ? { width: 10 } : undefined; } : undefined)), set: (t, k, v) => { t[k] = v; return true; } });
  assert.equal(E.worldDebug({ C: { id: 'nothing' } }, ctx, 0), 0, 'no live world: nothing drawn');
});

test('review tools at full size (audit bug 20): captures are 1600 x 900 by default, --size is parsed, snow is refused on a warm date', async () => {
  assert.deepEqual(CAP.WORLD_CAPTURE_SIZE, { w: 1600, h: 900 });
  assert.deepEqual(CAP.worldSizeOf('1600x900'), { w: 1600, h: 900 });
  assert.deepEqual(CAP.worldSizeOf('480x270'), { w: 480, h: 270 });
  assert.deepEqual(CAP.worldSizeOf('16:9'), { w: 1600, h: 900 });
  assert.equal(CAP.worldSizeOf('big'), null);
  assert.equal(ADV.worldWeatherFits('snow', '2026-07-16T22:30:00Z').ok, false, 'snow in July');
  assert.match(ADV.worldWeatherFits('snow', '2026-07-16T22:30:00Z').why, /July/);
  assert.equal(ADV.worldWeatherFits('snow', '2026-01-20T13:00:00Z').ok, true, 'snow in January');
  assert.equal(ADV.worldWeatherFits('snow', '2026-01-20T13:00:00Z', -33.9).ok, false, 'January is summer in the south');
  assert.equal(ADV.worldWeatherFits('rain', '2026-07-16T13:00:00Z').ok, true);
  const r = world('render', 'world-test/fleet-pond-2-w3', '--dates=summer', '--wx=snow', '--dir=' + join(ROOT, 'no-such-dir-render'));
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stdout, /refused: --wx=snow/);
});

test('the matrix has a winter snow day (audit bug 20): 4 seasons x 5 times x 3 weathers + 5 snow cells, snow only in winter', () => {
  const m = ADV.worldMatrixCells(specOfRef('world-test/fleet-pond-2-w3'));
  assert.equal(m.length, 65);
  const snow = m.filter(c => c.wx === 'snow');
  assert.equal(snow.length, 5);
  assert.ok(snow.every(c => c.season === 'winter'));
  for (const c of snow) assert.ok(ADV.worldWeatherFits('snow', c.at).ok, c.at);
});

test('world check plan (the pixel checks): dates x loop times; the matrix at the loop times', async () => {
  const CHK = await import('../tools/lib/world/check.mjs');
  const spec = specOfRef('world-test/fleet-canal-2-w3');
  const p = CHK.worldCheckPlan(spec);
  assert.equal(p.length, 15, '5 dates x 3 loop times');
  assert.deepEqual([...new Set(p.map(c => c.t))], [0, 90, 180]);
  assert.equal(CHK.worldCheckPlan(spec, { matrix: true, times: [0] }).length, 65);
  for (const r of ['drawn', 'crown', 'shadowOrphan', 'deckDrawn', 'particles', 'nightLight', 'waterGap']) assert.ok(CHK.WORLD_CHECK_RULES.includes(r), r);
  for (const r of CHK.WORLD_CHECK_RULES) assert.ok(E.WORLD_INVARIANTS.some(x => x.rule === r), 'a registered rule: ' + r);
});

test('Node perf orders what the renderer orders (audit bug 21): render plan chunks, live statics and agents, with occluder redraws', () => {
  const spec = specOfRef('world-test/fleet-canal-2-w3');
  const n = PF.worldPerfNode(spec, E, { ticks: 30 });
  assert.ok(Number.isFinite(n.orderMs) && Number.isFinite(n.occDraws) && Number.isFinite(n.planStatics), JSON.stringify(n).slice(0, 300));
  assert.ok(n.planStatics > 100, 'the plan holds the statics the browser draws');
  // the check itself: a plan of 300+ statics in fewer than 6 chunks fails (one bitmap makes every mover redraw its occluders)
  const c = PF.worldPerfCheck({ planStatics: 704, chunks: 2 });
  assert.equal(c.ok, false);
  assert.ok(c.lines.some(l => l.item === 'chunkSpread' && l.status === 'fail'));
  assert.equal(PF.worldPerfCheck({ planStatics: 704, chunks: 12 }).lines.some(l => l.item === 'chunkSpread'), false);
});

test('motion red marks catch bodies through each other, outfit clones and walkers on water (audit bug 8)', () => {
  // a fake engine: one walker standing still on open water, two people in the same outfit overlapping for 4 s
  const surf = [{ id: 'w', kind: 'water', poly: [[-50, 0], [50, 0], [50, 100], [-50, 100]] }];
  const agents = [
    { id: 'a', cls: 'stroll', obj: 'person.walker', variant: 2, outfit: 1, x: 1, y: 0, z: 20, layer: 'walk', state: 'idle' },
    { id: 'b', cls: 'stroll', obj: 'person.walker', variant: 2, outfit: 1, x: 1.1, y: 0, z: 20.1, layer: 'walk', state: 'idle' },
  ];
  const F = { worldBuild: () => ({ cam: { water: 0 }, surfaces: surf }), worldNavBuild: () => ({}), worldLifeInit: () => ({}), worldLifeTick: () => {}, worldAgents: () => agents.map(a => Object.assign({}, a)),
    worldSurfaceAt: (w, x, z) => surf[0] };
  const m = PF.worldMotion(F, {}, { seconds: 5 });
  const rules = new Set(m.red.map(r => r.rule));
  for (const r of ['overlap', 'clone', 'water']) assert.ok(rules.has(r), r + ' in ' + [...rules].join(','));
});

test('critic (C1, C4, C6): the framing rules always run, a demoted landmark and a bare frame are problems', () => {
  const spec = specOfRef('world-test/sheffield-kelham-1-w3');
  const c = C.worldCritic(E, spec, {});
  assert.ok(Array.isArray(c.problems));
  assert.ok(c.problems.every(p => typeof p === 'string'));
  // (merge of 15 Oct) the one emptiness gate is main's strict measure (look's worldDetailCoverage), not uk-rebuild's box-vs-C6 rule
  // (CRITIC_BARE_MAX is not kept): every FAIL rule of the strict measure is a problem of the critic
  assert.ok(c.strict && Array.isArray(c.strict.problems), 'the strict measure ran');
  for (const p of c.strict.problems.filter(p => p.severity !== 'warn')) assert.ok(c.problems.some(q => q.startsWith(p.rule + ':')), p.rule + ' is a problem');
});

test('browser: a sheet, a capture and the perf gates render (WORLD_BROWSER=1)', { skip: !BROWSER && 'set WORLD_BROWSER=1 to run the browser parts' }, async () => {
  const { launchChrome } = await import('../tools/release-chrome.mjs');
  const chrome = await launchChrome();
  try {
    const src = { ref: 'world-test/fleet-pond-2-w3', spec: specOfRef('world-test/fleet-pond-2-w3') };
    const page = await SH.worldPageOpen(chrome, src, { size: SH.WORLD_SIZES['16:9'], root: ROOT, at: '2026-07-15T12:00:00Z' });
    await page.set({ at: '2026-01-15T12:00:00Z' });
    const png = await page.png();
    assert.ok(png.length > 2000, 'a picture');
    const cap = await CAP.worldCapture(chrome, src, { seconds: 1, fps: 2, root: ROOT, at: '2026-07-15T12:00:00Z' });
    assert.deepEqual(cap.errors, []); assert.equal(cap.frames.length, 3);
    assert.deepEqual(cap.size, { w: 1600, h: 900 }, 'full-size frames by default');
    // the pixel check runs on a real frame, judges it with the frame-record rules, and boxes what it finds
    const CHK = await import('../tools/lib/world/check.mjs');
    const r = await CHK.worldCheck(chrome, src, { dates: ['summer'], times: [30], root: ROOT });
    assert.deepEqual(r.errors, []);
    assert.equal(r.cells.length, 1);
    assert.ok(r.cells[0].stats.statics > 50 && r.cells[0].stats.ran.includes('drawn'), JSON.stringify(r.cells[0].stats));
    const m = await PF.worldPerfBrowser(chrome, src.spec, { id: 'test', seconds: 1 });
    assert.ok(Number.isFinite(m.coldLoadMs) && Number.isFinite(m.frameMs), JSON.stringify(m).slice(0, 300));
  } finally { await chrome.close(); }
});
