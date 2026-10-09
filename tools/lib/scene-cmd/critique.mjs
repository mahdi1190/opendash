// scene critique: the automatic visual critic (docs/dev/SCENE_ENGINE_V2.md 21; builder G). Loaded by the `scene` command's delegation
// (tools/lib/anim-cmd/scene.mjs, 16.2), or run on its own: node tools/lib/scene-cmd/critique.mjs <ref> ...
//
//   scene critique [<ref>,... | --pack <id> | --region <id>] [--moments noon,golden,night] [--weather clear] [--ai | --no-ai] [--model claude-sonnet-5]
//                  [--only-weak] [--strict-placement] [--perf] [--out dir] [--json] [--calibrate] [--ingest pending.json] [--apply] [--date YYYY-MM-DD]
//   1. renders a contact sheet per scene (noon, golden hour, night at 800 x 450; scene-page.mjs), 2. measures the automatic facts (the lint
//   with the sanity and composition groups), 3. judges each scene against the rubric with the local Claude CLI (the read-only
//   scene-critique profile of lib/claude-runner.mjs) or, without it, writes review.html + pending.json for a person or an agent,
//   4. writes .anim-ref/critique/<run>/report.json { v: 1, run, refs, weak, passed, calibration? } that build workflows loop on.
//   --ingest turns a filled pending.json into report.json. --apply applies the mechanical fixes of weak RECIPE scenes through
//   scene-recipe.mjs (re-linting each; a fix that adds a sanity error is rolled back). --calibrate runs over the approved golden set
//   and exits 2 when a golden scene is judged below 4 anywhere.
//   (--times in the spec's usage line is `--moments` here: `scene` already has a boolean --times.)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CRITERIA, sceneFacts, renderSheet, judgeScene, runReport, reviewPage, pendingTemplate, ingest, suggestedFromFacts, calibrationOf,
  loadGolden, goldenEntries, goldenNeighbours, applyFixOps, rubricText, cmdLib, subPositionals, standalone, selectFor, withChromeOrNull,
  momentsFor, runId, fileSafe,
} from '../scene-critic.mjs';

const NAME = 'critique';
const splitList = (v) => [].concat(v || []).flatMap(x => String(x).split(',')).map(s => s.trim()).filter(Boolean);

async function aiReady(args) {
  if (args['no-ai']) return { ok: false, why: '--no-ai' };
  let runner, ai;
  try { runner = await import('../../../lib/claude-runner.mjs'); ai = await import('../../../lib/ai.mjs'); } catch (e) { return { ok: false, why: `no runner (${e.message})` }; }
  if (!runner.cliInstalled()) return { ok: false, why: 'the claude CLI is not installed' };
  const st = await ai.aiStatus();
  if (!st.available) return { ok: false, why: st.message || st.code || 'the claude CLI is not available' };
  return { ok: true, run: runner.runClaude, models: runner.SCENE_CRITIQUE_MODELS || ['claude-sonnet-5', 'claude-opus-5-5'] };
}

const command = {
  summary: 'the automatic visual critic: contact sheets at noon, golden hour and night, the automatic facts, a rubric score per scene (the local Claude CLI, read-only; else a review page), a report of the WEAK scenes with fixes',
  usage: 'scene critique [<ref>,... | --pack <id> | --region <id>] [--moments noon,golden,night] [--weather w] [--ai | --no-ai] [--model m] [--only-weak] [--strict-placement] [--out dir] [--json] [--calibrate] [--ingest pending.json] [--apply] [--date D]',
  options: {
    pack: { type: 'string', multiple: true, help: 'critique: every composed scene of this pack' },
    region: { type: 'string', help: 'critique: every pack of this region' },
    moments: { type: 'string', help: 'critique: the moments of the contact sheet (default noon,golden,night)' },
    weather: { type: 'string', help: 'critique: render with this weather (clear, rain, snow, fog ...)' },
    ai: { type: 'boolean', help: 'critique: require the local Claude CLI (fail when it is not available)' },
    'no-ai': { type: 'boolean', help: 'critique: never run the model; write review.html and pending.json instead' },
    model: { type: 'string', help: 'critique: claude-sonnet-5 (default) or claude-opus-5-5' },
    'only-weak': { type: 'boolean', help: 'critique: print only the weak scenes' },
    'strict-placement': { type: 'boolean', help: 'lint / critique: sanity and composition warnings become failures' },
    out: { type: 'string', help: 'critique: the run folder (default .anim-ref/critique/<run>/)' },
    json: { type: 'boolean', help: 'critique: print the report as JSON' },
    calibrate: { type: 'boolean', help: 'critique: run over the APPROVED golden set; exit 2 if a golden scene scores under 4 anywhere' },
    ingest: { type: 'string', help: 'critique: turn a filled pending.json into report.json' },
    apply: { type: 'boolean', help: 'critique: apply the mechanical fixes of weak recipe scenes (through scene-recipe.mjs), re-linting each' },
    date: { type: 'string', help: 'critique: the day of the moments (YYYY-MM-DD, default today)' },
    run: { type: 'string', help: 'critique: a run id (default the time)' },
    perf: { type: 'boolean', help: 'lint / critique: also time the scene in the real renderer (1600 x 900) and add it to the facts' },
    gpu: { type: 'boolean', help: 'perf: use the GPU (default: software raster, limits x swFactor)' },
  },
  async run(args, ctx, lib0) {
    const root = ctx.root, lib = await cmdLib(lib0);
    const run = args.run || runId();
    if (args.run && !/^[A-Za-z0-9_-]{1,60}$/.test(args.run)) throw new Error('--run must be letters, digits, - and _');
    const outDir = resolve(args.out || join(root, '.anim-ref', 'critique', run));

    /* ----- ingest ----- */
    if (args.ingest) {
      const file = resolve(args.ingest);
      const pending = JSON.parse(readFileSync(file, 'utf8'));
      const report = ingest(pending, { run: pending.run || run });
      const dir = args.out ? outDir : dirname(file);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'report.json'), JSON.stringify(report, null, 1) + '\n');
      printReport(ctx, report, args);
      ctx.out(join(dir, 'report.json'));
      return report.weak.length ? 2 : 0;
    }

    const reg = lib.loadRegistry(root), E = lib.engineOf(reg);
    E.require('scene critique');
    const thresholds = lib.loadThresholds(root);
    const golden = loadGolden(root);
    let list;
    if (args.calibrate) {
      const refs = goldenEntries(golden, { approvedOnly: true }).filter(e => e.kind === 'scene').map(e => e.ref);
      if (!refs.length) { ctx.out('calibrate: no approved golden scenes in tools/scene-golden.json: calibration proposes nothing (the user approves the candidates first)'); return 0; }
      list = selectFor(reg, E, {}, refs, lib);
    } else list = selectFor(reg, E, args, subPositionals(ctx, NAME), lib);
    if (!list.length) throw new Error('nothing to critique: give refs, --pack or --region');
    const moments = splitList(args.moments || 'noon,golden,night');
    for (const m of moments) if (!['dawn', 'noon', 'golden', 'dusk', 'night'].includes(m)) throw new Error(`--moments: ${m} is not dawn, noon, golden, dusk or night`);
    const ai = await aiReady(args);
    if (args.ai && !ai.ok) throw new Error(`--ai: ${ai.why}`);
    const model = args.model || 'claude-sonnet-5';
    if (ai.ok && !ai.models.includes(model)) throw new Error(`--model must be one of ${ai.models.join(', ')}`);
    mkdirSync(outDir, { recursive: true });
    if (!ai.ok) ctx.err(`critique: no model run (${ai.why}): writing the review page`);

    const scenes = [], results = [], errors = [];
    await withChromeOrNull(lib, args, async (chrome) => {
      if (!chrome) ctx.err('critique: no Chrome or no page harness (scene-page.mjs): no sheets, facts only');
      for (const s of list) {
        const data = s.data();
        const sc = { ref: s.ref, item: s.item, data, pack: s.pack };
        const facts = sceneFacts(sc, { E, reg, thresholds, strict: !!args['strict-placement'], lint: lib.lintScene });
        let sheet = null, panes = [];
        if (chrome) {
          try { const r = await renderSheet(chrome, lib.harness, sc, { root, times: momentsFor(lib.times, data, args.date, moments), outDir, weather: args.weather || null }); sheet = r.sheet; panes = r.panes; }
          catch (e) { ctx.err(`  ${s.ref}: no sheet (${e.message})`); }
        }
        if (chrome && args.perf && lib.harness && typeof lib.harness.scenePerf === 'function') {
          try {
            const o = { root, size: { w: 1600, h: 900 }, dpr: 1, still: false, renderer: 'canvas', seconds: 2 };
            if (sc.item) o.refs = [s.ref]; else o.data = data;
            const p = await lib.harness.scenePerf(chrome, o);
            facts.perf = p && p.drawMs ? { drawMs: p.drawMs.median, drawP95: p.drawMs.p95, dynMs: p.dynMs && p.dynMs.median, firstBakeMs: p.firstBakeMs, animatedDraws: p.animatedDraws, gpu: !!args.gpu } : { skipped: 'no stats' };
          } catch (e) { facts.perf = { skipped: e.message }; }
        }
        const neighbours = facts.fingerprint ? goldenNeighbours(facts.fingerprint, goldenEntries(golden, { approvedOnly: true }), 3).map(n => Object.assign(n, { sheet: goldenSheet(root, n.ref) })) : [];
        const entry = { ref: s.ref, facts, sheet, panes, neighbours, suggested: suggestedFromFacts(facts) };
        scenes.push(entry);
        if (ai.ok) {
          try { const r = await judgeScene(sc, { run: ai.run, model, sheet, panes, facts, neighbours, root }); results.push(r); ctx.err(`  ${s.ref}: ${r.total} / 40${r.weak ? ' WEAK' : ''}`); }
          catch (e) { errors.push({ ref: s.ref, error: e.message }); ctx.err(`  ${s.ref}: the model run failed (${e.message})`); }
        }
      }
    });
    // the review page whenever some scene has no model answer
    const unjudged = scenes.filter(s => !results.some(r => r.ref === s.ref));
    if (unjudged.length) {
      for (const s of unjudged) { s.sheetRel = s.sheet ? relative(outDir, s.sheet).replace(/\\/g, '/') : null; for (const n of s.neighbours) n.sheetRel = n.sheet ? relative(outDir, n.sheet).replace(/\\/g, '/') : null; }
      writeFileSync(join(outDir, 'review.html'), reviewPage({ run, scenes: unjudged, rubric: rubricText(root) }));
      writeFileSync(join(outDir, 'pending.json'), JSON.stringify(pendingTemplate({ run, scenes: unjudged }), null, 1) + '\n');
      ctx.out(join(outDir, 'review.html'));
      ctx.out(join(outDir, 'pending.json'));
    }
    const calibration = args.calibrate ? calibrationOf(results, golden) : null;
    const report = runReport({ run, refs: list.map(s => s.ref), results, calibration });
    if (errors.length) report.errors = errors;
    if (unjudged.length) report.pending = unjudged.map(s => s.ref);
    writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 1) + '\n');
    writeFileSync(join(outDir, 'facts.json'), JSON.stringify(scenes.map(s => ({ ref: s.ref, sheet: s.sheet, facts: Object.assign({}, s.facts, { rules: undefined }) })), null, 1) + '\n');

    /* ----- apply ----- */
    if (args.apply && report.weak.length) await applyAll(ctx, root, lib, E, thresholds, report, outDir);

    printReport(ctx, report, args);
    ctx.out(join(outDir, 'report.json'));
    if (calibration) {
      if (!calibration.ok) { ctx.out(`calibrate: ${calibration.disagreements.length} disagreement(s): the rubric or the prompt is miscalibrated`); for (const d of calibration.disagreements) ctx.out(`  ${d.ref} ${d.criterion} ${d.score}${d.reason ? ': ' + d.reason : ''}`); return 2; }
      ctx.out(`calibrate: ${calibration.n} golden scene(s), all 4 or more on every criterion`);
    }
    return report.weak.length || report.pending ? 2 : 0;
  },
};
function goldenSheet(root, ref) {
  const f = join(root, '.anim-ref', 'golden', `${fileSafe(ref)}--sheet.png`);
  return existsSync(f) ? f : null;
}
function printReport(ctx, report, args) {
  if (args.json) { ctx.out(JSON.stringify(report, null, 1)); return; }
  for (const w of report.weak) {
    ctx.out(`WEAK ${w.ref}: ${w.total} / 40   ${CRITERIA.map(c => `${c} ${w.scores[c]}`).join(', ')}`);
    for (const f of w.fixes) ctx.out(`   - ${f.criterion}: ${f.what}${f.where && f.where.item != null ? ` (place[${f.where.item}])` : ''}${f.how ? `   -> ${JSON.stringify(f.how)}` : ''}`);
  }
  if (!args['only-weak']) for (const r of report.passed) ctx.out(`ok   ${r}`);
  if (report.pending && report.pending.length) ctx.out(`${report.pending.length} scene(s) wait for a review: fill pending.json, then scene critique --ingest <it>`);
  ctx.out(`${report.weak.length} weak, ${report.passed.length} passed${report.pending ? `, ${report.pending.length} pending` : ''}`);
}
async function applyAll(ctx, root, lib, E, thresholds, report, outDir) {
  if (!lib.recipes || typeof lib.recipes.readRecipe !== 'function') { ctx.out('apply: tools/lib/scene-recipe.mjs (builder D) is not there: the fixes are listed, not applied'); return; }
  const known = new Set((lib.recipes.findRecipes(root) || []).map(r => r.ref));
  const lintErrors = (scene) => {
    try {
      const L = lib.lintScene(scene, thresholds, { E, svg: false });
      const sanity = L.rules.filter(r => r.group === 'sanity' && !r.ok && (r.sev === 'error' || !r.warn)).length;
      const probs = (L.compiled && L.compiled.problems || []).filter(p => p.sev === 'error').length;
      return sanity + probs;
    } catch { return 1e6; }
  };
  const objRole = (id) => { const d = E.obj(id); if (!d) return null; const t = (d.tags || []).find(x => x.startsWith('role:')); return t || d.category; };
  const log = [];
  for (const w of report.weak) {
    if (!known.has(w.ref)) { ctx.out(`apply: ${w.ref} is not a recipe scene: fix by hand`); continue; }
    const { rec, version, file } = lib.recipes.readRecipe(root, w.ref);
    const res = applyFixOps(rec, w.fixes, { lintErrors, objRole });
    if (res.applied.length) lib.recipes.writeRecipe(root, res.rec, { version, file });
    ctx.out(`apply: ${w.ref}: ${res.applied.length} applied, ${res.rolledBack.length} rolled back, ${res.manual.length} for a person`);
    log.push({ ref: w.ref, applied: res.applied, rolledBack: res.rolledBack, manual: res.manual });
  }
  writeFileSync(join(outDir, 'applied.json'), JSON.stringify(log, null, 1) + '\n');
}
export default command;
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) standalone(command, NAME).then(c => { process.exitCode = c; });
