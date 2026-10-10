// The visual critic and the golden set (docs/dev/SCENE_ENGINE_V2.md 21, 22; builder G): the read-only runner profile, a fake model run
// through the report builder, the review page and ingest, the mechanical fixes with roll-back, calibration and compare-to-golden.
// No model is ever started: the runner's arguments are checked with buildArgs, and judgeScene gets a fake `run`.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { buildArgs, SCENE_CRITIQUE_MODELS } from '../lib/claude-runner.mjs';
import {
  CRITERIA, SCENE_CRITIQUE_SCHEMA, judgeScene, normaliseScene, checkHow, isWeak, runReport, reviewPage, pendingTemplate, ingest, applyFixOps, calibrationOf,
  loadGolden, goldenEntries, goldenNeighbours, calibrateThresholds, compareToGolden, rubricText, sceneFacts, measureScene, critiquePrompt,
} from '../tools/lib/scene-critic.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const temps = [];
const tmp = (p) => { const d = mkdtempSync(join(tmpdir(), p)); temps.push(d); return d; };
after(() => { for (const d of temps) rmSync(d, { recursive: true, force: true }); });
const scores = (v, over = {}) => Object.assign(Object.fromEntries(CRITERIA.map(c => [c, v])), over);

test('the scene-critique profile is read-only: only Read, inside the image folder; no MCP; the schema; the model allowlist', () => {
  const dir = tmp('g-crit-');
  const { args, format, timeoutMs, model } = buildArgs('scene-critique', { imageDir: dir, jsonSchema: SCENE_CRITIQUE_SCHEMA });
  const val = (flag) => args[args.indexOf(flag) + 1];
  assert.equal(val('--tools'), 'Read', 'the only built-in tool');
  assert.equal(val('--allowedTools'), 'Read(./**)', 'Read limited to the working folder (the image folder)');
  for (const t of ['Bash', 'Write', 'Edit', 'WebFetch', 'WebSearch', 'mcp__*']) assert.ok(val('--disallowedTools').split(',').includes(t), t);
  assert.ok(args.includes('--strict-mcp-config') && !args.includes('--mcp-config'), 'no MCP server at all');
  assert.equal(val('--setting-sources'), '');
  assert.equal(val('--permission-mode'), 'dontAsk');
  assert.deepEqual(JSON.parse(val('--json-schema')), JSON.parse(JSON.stringify(SCENE_CRITIQUE_SCHEMA)));
  assert.equal(format, 'json');
  assert.equal(timeoutMs, 5 * 60000);
  assert.equal(model, 'claude-sonnet-5');
  assert.deepEqual([...SCENE_CRITIQUE_MODELS], ['claude-sonnet-5', 'claude-opus-5-5']);
  assert.equal(buildArgs('scene-critique', { imageDir: dir, jsonSchema: {}, model: 'claude-opus-5-5' }).model, 'claude-opus-5-5');
  assert.throws(() => buildArgs('scene-critique', { imageDir: dir, jsonSchema: {}, model: 'claude-haiku-4-5' }), /not allowed/);
  for (const bad of ['', 'relative/dir', dir + '/../x', dir + '*']) assert.throws(() => buildArgs('scene-critique', { imageDir: bad, jsonSchema: {} }), /imageDir/, JSON.stringify(bad));
  assert.throws(() => buildArgs('scene-critique', { imageDir: dir }), /jsonSchema/);
});

test('judgeScene: the images are copied into a private folder that is the run\'s cwd and image folder; a fake answer becomes the report', async () => {
  const src = tmp('g-png-');
  const png = (n) => { const f = join(src, n); writeFileSync(f, Buffer.from('89504e470d0a1a0a', 'hex')); return f; };
  const sheet = png('s.png'), panes = ['noon', 'golden', 'night'].map(m => ({ moment: m, file: png(m + '.png') }));
  let seen = null;
  const run = async (o) => {
    seen = { profile: o.profile, cwd: o.cwd, imageDir: o.imageDir, files: readdirSync(o.imageDir).sort(), prompt: o.prompt, system: o.systemPrompt, schema: o.jsonSchema };
    return { model: o.model, ms: 5, json: { ref: 'p/a', scores: scores(4, { clutter: 2 }), reasons: { clutter: 'too many lamps' }, fixes: [{ criterion: 'clutter', what: 'lamps in a row', where: { item: 3 }, how: { op: 'delete' } }, { criterion: 'lighting', what: 'haze', how: { op: 'set', path: 'scene.atmos', value: 'clear' } }, { criterion: 'scale', what: 'a giant', how: { op: 'explode' } }] } };
  };
  const facts = { ref: 'p/a', placements: [{ i: 0, obj: 'tree.oak' }], metrics: {}, rules: [{ big: 1 }], fingerprint: { grid: [] } };
  const r = await judgeScene({ ref: 'p/a' }, { run, sheet, panes, facts, root: ROOT, tmp: tmpdir() });
  assert.equal(seen.profile, 'scene-critique');
  assert.equal(seen.cwd, seen.imageDir);
  assert.deepEqual(seen.files, ['golden.png', 'night.png', 'noon.png', 'sheet.png']);
  assert.ok(!existsSync(seen.imageDir), 'the private folder is removed afterwards');
  assert.match(seen.system, /## The criteria/, 'the rubric is in the fixed system prompt');
  assert.match(seen.prompt, /\.\/sheet\.png/);
  assert.ok(!/"rules"/.test(seen.prompt), 'the facts sent are trimmed');
  assert.equal(seen.schema, SCENE_CRITIQUE_SCHEMA);
  assert.equal(r.total, 30); assert.equal(r.weak, true, 'a criterion at 2 makes it weak');
  assert.equal(r.fixes.length, 3);
  assert.deepEqual(r.fixes[1].how, { op: 'set', path: 'scene.atmos', value: 'clear' });
  assert.equal(r.fixes[2].how, undefined, 'an unknown op is kept as text for a person');
  // a run report lists ONLY the weak scenes, with the passed refs
  const ok = normaliseScene({ scores: scores(4) }, 'p/b');
  const rep = runReport({ run: 'x', refs: ['p/a', 'p/b'], results: [r, ok] });
  assert.deepEqual(rep.weak.map(w => w.ref), ['p/a']);
  assert.deepEqual(rep.passed, ['p/b']);
  assert.equal(rep.v, 1);
});

test('the weak rule, the answer check and the fix ops', () => {
  assert.equal(isWeak(scores(4)), false);
  assert.equal(isWeak(scores(4, { life: 2 })), true);
  assert.equal(isWeak(scores(3, { placement: 4, scale: 4, clutter: 4, lighting: 4 })), true, '28 < 30');
  assert.equal(isWeak(scores(4, { life: 3, realism: 3 })), false, '30 is not weak');
  assert.throws(() => normaliseScene({ scores: scores(4, { scale: 6 }) }, 'p/x'), /scale/);
  assert.throws(() => normaliseScene({ scores: { placement: 3 } }, 'p/x'), /scale, clutter/);
  assert.equal(checkHow({ op: 'move', on: 'road', d: 22 }).op, 'move');
  assert.equal(checkHow({ op: 'move', on: 'Road!', d: 22 }), null);
  assert.equal(checkHow({ op: 'set', path: 'scene.place', value: [] }), null, 'only the listed scene keys');
  assert.equal(checkHow({ op: 'density', flow: 'walkers', value: 9 }), null);
  assert.equal(checkHow({ op: 'swap', obj: 'vehicle.car' }).obj, 'vehicle.car');
  const long = normaliseScene({ scores: scores(5), reasons: { placement: 'x'.repeat(500) + '\u0007' } }, 'p/y');
  assert.equal(long.reasons.placement.length, 200);
});

test('no model: the review page and pending.json; --ingest round-trips into the same report', () => {
  const facts = { ref: 'p/a', lint: { warnings: ['composition.thirds: centred'], failures: [] }, metrics: { hazeMean: 0.3, salientMax: 12, scalePairMax: 1 }, composition: null, problems: [] };
  const scenes = [{ ref: 'p/a<b>', facts, sheet: null, neighbours: [], suggested: { clutter: ['12 salient'] } }];
  const html = reviewPage({ run: 'r1', scenes, rubric: rubricText(ROOT) });
  assert.match(html, /p\/a&lt;b&gt;/, 'escaped');
  assert.ok(!/<b>/.test(html.replace(/<\/?(h1|h2|h3|p|pre|code|section|details|summary|div|figure|figcaption|img|html|head|body|style|title|meta)[^>]*>/g, '')));
  const pending = pendingTemplate({ run: 'r1', scenes });
  assert.deepEqual(Object.keys(pending.scenes[0].scores), [...CRITERIA]);
  assert.throws(() => ingest(pending), /not complete/);
  pending.scenes[0].scores = scores(2);
  pending.scenes[0].fixes = [{ criterion: 'clutter', what: 'too much', where: { item: 1 }, how: { op: 'delete' } }];
  const rep = ingest(JSON.parse(JSON.stringify(pending)));
  assert.equal(rep.run, 'r1');
  assert.equal(rep.weak.length, 1);
  assert.deepEqual(rep.weak[0].fixes[0].how, { op: 'delete' });
});

test('--apply: a move is applied; a fix that adds a sanity error is rolled back; deletes go last', () => {
  const rec = { v: 2, pack: 'p', meta: { id: 'a' }, scene: { id: 'a', camera: { horizon: 470 }, surfaces: [{ id: 'road', kind: 'road' }, { id: 'verge', kind: 'verge' }],
    place: [{ obj: 'vehicle.car', at: [3, 22] }, { obj: 'tree.oak', at: [-10, 40] }, { obj: 'street.bench', at: [4, 12] }], flows: [{ id: 'walkers', kind: 'walk', density: 1 }] } };
  // the fake sanity count: a car not on the road is an error; a tree on the road is an error
  const lintErrors = (sc) => sc.place.filter(p => (p.obj === 'vehicle.car' && p.on !== 'road') || (p.obj === 'tree.oak' && p.on === 'road')).length;
  const fixes = [
    { criterion: 'clutter', what: 'the bench', where: { item: 2 }, how: { op: 'delete' } },
    { criterion: 'placement', what: 'the car on the verge', where: { item: 0 }, how: { op: 'move', on: 'road', d: 22 } },
    { criterion: 'placement', what: 'move the tree onto the road', where: { item: 1 }, how: { op: 'move', on: 'road', d: 40 } },
    { criterion: 'life', what: 'busier', how: { op: 'density', flow: 'walkers', value: 1.5 } },
    { criterion: 'lighting', what: 'raise the horizon', how: { op: 'set', path: 'scene.camera.horizon', value: 500 } },
    { criterion: 'scale', what: 'a giant', where: { item: 9 }, how: { op: 'swap', obj: 'tree.birch' } },
    { criterion: 'realism', what: 'just wrong' },
  ];
  const res = applyFixOps(rec, fixes, { lintErrors });
  assert.deepEqual(res.rec.scene.place[0], { obj: 'vehicle.car', on: 'road', d: 22 });
  assert.equal(res.rec.scene.place.length, 2, 'the bench deleted');
  assert.deepEqual(res.rec.scene.place[1], { obj: 'tree.oak', at: [-10, 40] }, 'the tree move was rolled back');
  assert.equal(res.rolledBack.length, 1);
  assert.equal(res.rec.scene.flows[0].density, 1.5);
  assert.equal(res.rec.scene.camera.horizon, 500);
  assert.equal(res.manual.length, 2, 'the missing placement and the fix with no op');
  assert.equal(rec.scene.place.length, 3, 'the input is not changed');
  // a swap keeps the role
  const sw = applyFixOps(rec, [{ criterion: 'scale', what: 'x', where: { item: 1 }, how: { op: 'swap', obj: 'vehicle.bus' } }], { objRole: (id) => (id.startsWith('tree') ? 'role:tree' : 'role:vehicle') });
  assert.equal(sw.applied.length, 0); assert.match(sw.manual[0].why, /role/);
});

test('the golden set: the file parses; nothing approved means no calibration proposals; neighbours rank by fingerprint', () => {
  const g = loadGolden(ROOT);
  assert.equal(g.v, 1);
  assert.ok(g.entries.filter(e => e.kind === 'scene').length >= 5);
  assert.ok(g.entries.filter(e => e.kind === 'object').length >= 5);
  assert.equal(goldenEntries(g, { approvedOnly: true }).length, 0, 'only the user approves entries');
  for (const e of g.entries) assert.equal(e.approved, false);
  assert.match(calibrateThresholds(g.entries).note, /proposes nothing/);
  assert.match(calibrationOf([{ ref: g.entries[0].ref, scores: scores(1), weak: true }], g).note, /no approved/);
  // with approved, measured entries: proposals and calibration disagreements
  const fp = (h, t) => ({ preset: 'street', horizon: h, horizonBucket: Math.round(h / 50), headingClass: 'N', third: t, grid: new Array(1008).fill(0).map((_, i) => (i % (h % 7 + 2) ? 0 : 1)) });
  const ent = [
    { ref: 'p/g1', kind: 'scene', approved: true, metrics: { fingerprint: fp(470, 'L'), critic: { hazeMean: 0.05, salientMax: 6, skyShare: 0.3, subjectSize: 0.3, thirdsDist: 0.02, leadDist: 0.05 } } },
    { ref: 'p/g2', kind: 'scene', approved: true, metrics: { fingerprint: fp(330, 'R'), critic: { hazeMean: 0.1, salientMax: 8, skyShare: 0.4, subjectSize: 0.25, thirdsDist: 0.04, leadDist: 0.1 } } },
    { ref: 'p/c', kind: 'scene', approved: false, metrics: { fingerprint: fp(470, 'L'), critic: {} } },
  ];
  const cal = calibrateThresholds(ent);
  assert.equal(cal.proposals['composed.sanity.haze.max'].value, 0.115);
  assert.equal(cal.proposals['composed.sanity.clutter.max'].value, 9.2);
  assert.deepEqual(cal.proposals['composed.composition.skyShare.default'].value, [0.255, 0.46]);
  const nb = goldenNeighbours(fp(470, 'L'), ent.filter(e => e.approved), 2);
  assert.equal(nb[0].ref, 'p/g1');
  const deltas = compareToGolden({ critic: { hazeMean: 0.31, salientMax: 7, skyShare: 0.35 } }, nb);
  assert.equal(deltas.find(d => d.metric === 'hazeMean').verdict, 'above');
  assert.match(deltas.find(d => d.metric === 'hazeMean').line, /hazeMean 0\.31 against golden 0\.05 to 0\.1 \(above\)/);
  assert.equal(deltas.find(d => d.metric === 'salientMax').verdict, 'within');
  const gg = { v: 1, entries: ent };
  const c2 = calibrationOf([{ ref: 'p/g1', scores: scores(4, { life: 3 }), reasons: { life: 'empty' }, weak: false }, { ref: 'p/c', scores: scores(1), weak: true }], gg);
  assert.equal(c2.ok, false); assert.equal(c2.n, 1);
  assert.deepEqual(c2.disagreements.map(d => [d.ref, d.criterion]), [['p/g1', 'life']]);
});

test('facts and golden metrics on a real composed scene (the composition group is added when the lint does not wire it)', async () => {
  const { loadRegistry } = await import('../tools/lib/anim-render.mjs');
  const { engineOf, dataOf, lintScene } = await import('../tools/lib/scene-lint.mjs');
  const reg = loadRegistry(ROOT), E = engineOf(reg);
  if (!E.ready) return;
  const TH = JSON.parse(readFileSync(join(ROOT, 'tools', 'anim-quality.json'), 'utf8'));
  const e = reg.items().find(x => x.ref === 'texas/fort-worth-stockyards-scene');
  const sc = { ref: e.ref, item: e.item, data: dataOf(e.item, E), pack: e.pack };
  const f = sceneFacts(sc, { E, reg, thresholds: TH, lint: lintScene });
  assert.ok(f.rules.some(r => r.group === 'composition'));
  assert.ok(Number.isFinite(f.metrics.salientMax) && f.metrics.salientMax > 0, `the active scene has measured salience (${f.metrics.salientMax})`);
  assert.ok(f.placements.length && f.placements.every(p => Number.isInteger(p.i) && p.obj));
  const prompt = critiquePrompt(sc, f, ['sheet.png']);
  assert.ok(prompt.length < 16000);
  const m = measureScene(sc, { E, reg, thresholds: TH, lint: lintScene });
  assert.equal(m.fingerprint.grid.length, 7 * 144);
  assert.ok(Number.isFinite(m.critic.hazeMean) && Number.isFinite(m.critic.skyShare));
});

test('the critique command without a model or Chrome: facts, review page, pending.json and report.json', async () => {
  const cmd = (await import('../tools/lib/scene-cmd/critique.mjs')).default;
  const out = [], err = [], dir = tmp('g-crun-');
  const lib = { harness: null, findBrowser: () => null };
  const code = await cmd.run({ 'no-ai': true, out: dir, run: 'test-run', date: '2026-10-08' }, { root: ROOT, out: (s) => out.push(s), err: (s) => err.push(s), positionals: ['critique', 'texas/gulf-coast-sunrise'] }, lib);
  assert.equal(code, 2, 'pending scenes are not passed');
  for (const f of ['review.html', 'pending.json', 'report.json', 'facts.json']) assert.ok(existsSync(join(dir, f)), f);
  const rep = JSON.parse(readFileSync(join(dir, 'report.json'), 'utf8'));
  assert.deepEqual(rep.pending, ['texas/gulf-coast-sunrise']);
  assert.equal(rep.run, 'test-run');
  const pend = JSON.parse(readFileSync(join(dir, 'pending.json'), 'utf8'));
  pend.scenes[0].scores = scores(4);
  writeFileSync(join(dir, 'pending.json'), JSON.stringify(pend));
  const code2 = await cmd.run({ ingest: join(dir, 'pending.json') }, { root: ROOT, out: (s) => out.push(s), err: () => {}, positionals: ['critique'] }, lib);
  assert.equal(code2, 0);
  assert.deepEqual(JSON.parse(readFileSync(join(dir, 'report.json'), 'utf8')).passed, ['texas/gulf-coast-sunrise']);
});
