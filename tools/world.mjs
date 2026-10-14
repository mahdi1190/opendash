#!/usr/bin/env node
// The world engine's tool (docs/dev/WORLD_ENGINE.md 6, 7, 16.4, 16.5). Node >= 20, no dependencies. Never uses the live server:
// the browser commands drive their own Chrome over a pipe (tools/release-chrome.mjs).
//
//   node tools/world.mjs validate <ref | spec.json> [--log] [--json]
//                         strict errors (exit 1 on any); --log builds the world and prints its load log (every strip, snap, move,
//                         re-attach, drop and fill, with the reason and the package that acted)
//   node tools/world.mjs convert <ref> [--out[=file]] [--force] [--report] [--json]
//                         v2 / v1 -> v3 with the review report and the critic against the source (U4: exit 1 below it)
//   node tools/world.mjs render <ref> [--dir=D] [--dates=spring,summer,autumn,night] [--wx=rain] [--gpu] [--dpr=1]
//   node tools/world.mjs motion <ref> [--seconds=600] [--svg=file] [--json]
//   node tools/world.mjs invariants <ref> [--seconds=360] [--hz=5] [--matrix] [--browser] [--json]
//                         the invariant checker (16.2) over the full loop at 3 dates x 5 times (--matrix: 4 seasons x 5 times x 3
//                         weathers, V7); exit 1 on any violation
//   node tools/world.mjs adversarial [<id>] [--seconds=120] [--hz=5] [--json]
//                         every adversarial fixture (16.3): registers, builds, explains every fix in its log, zero violations
//   node tools/world.mjs critic <ref> [--against=<ref>] [--json]      richness, emptiness and framing (P7, C1, C4, C6)
//   node tools/world.mjs sheet <ref> [--matrix] [--sizes=16:9,tile] [--dir=D]   dates x times x sizes, or the V6 matrix
//   node tools/world.mjs capture <ref> [--full] [--every=6] [--seconds=20 --fps=2] [--size=1600x900] [--at=<ISO>] [--wx=rain] [--gif] [--dir=D]   the WHOLE loop as a frame strip
//   node tools/world.mjs compare <v3 ref> <original ref> [--dir=D]            side by side at 3 dates x 5 times
//   node tools/world.mjs perf <ref> [--browser] [--no-gpu] [--throttle=4] [--seconds=4] [--json]
//                         the Node budget table and the per-system profile (G12); --browser: both average-machine sizes x the
//                         matrix extremes (F1, F2, Z1). Exit 1 at 1.2x a budget
//   node tools/world.mjs glitch <ref | file.png ...> [--dates=summer,winter,night,dusk] [--wx=rain] [--dir=D] [--json]
//                         the render-glitch pixel checks (tools/lib/world/glitch.mjs; SCENE_LESSONS G) on rendered cells: flat bright
//                         discs, a sawtooth in the water's reflection, an unreadable night. A ref is rendered first (its water's
//                         near half is the sawtooth box). Exit 1 on any failure
//   node tools/world.mjs accept [--browser] [--quick] [--reviewed=list.txt] [--authoring=times.json] [--out=report.md]
//                         the acceptance suite of 16.5 with a printed PASS / FAIL gate (X4), the package owner table (X1), the
//                         privacy scan of the world files (I3), the files to checkpoint per phase (X2), the SCENE_LESSONS
//                         reminder (X3) and the authoring time per test scene (Z2). Exit 0 only on PASS
// <ref>: 'world-test/<id>-w3', a bare id ('fleet-canal-2-w3'), a v2 ref ('uk-south-east/hampshire-fleet-canal-2') or a short alias
// ('fleet-canal-2'), or a .json file holding a v3 spec (or an adversarial fixture: { id, expect, spec }).
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { loadEngine, resolveRef, convertRef, validateSpec, sceneFileSource, WORLD_TEST_REFS, WORLD_ALIASES } from './lib/world/convert.mjs';
import { worldPerfNode, worldPerfBrowser, worldPerfCheck, worldPerfText, worldMotion, worldMotionSvg, worldPerfProfile, worldPerfProfileText, worldPerfMatrix } from './lib/world/perf.mjs';
import { adversarialFixtures, adversarialText, worldMomentsOf, worldMatrixCells, OWNERS } from './lib/world/adversarial.mjs';
import { worldCritic, criticOfRef, criticText } from './lib/world/critic.mjs';
import { repoRoot } from './lib/scene-page.mjs';
import { runCells } from './lib/world/cells.mjs';

const argv = process.argv.slice(2);
const flags = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), true] : [a.slice(2, i), a.slice(i + 1)]; }));
const pos = argv.filter(a => !a.startsWith('--'));
const [cmd, ref] = pos;
const root = repoRoot();
const out = (s) => process.stdout.write(s + '\n');
/** Where pictures and reports go by default: the system's temp folder (never inside the repo). */
export const WORLD_OUT = join(tmpdir(), 'opendash-world');
const dirOf = (sub) => resolve(typeof flags.dir === 'string' ? flags.dir : join(WORLD_OUT, sub));

/** The v3 spec for a ref: a v3 item's spec, a JSON file (a spec or an adversarial fixture), or a v2 / v1 scene converted in memory. */
export function specOf(E, r) {
  if (r && r.endsWith('.json') && existsSync(r)) {
    const j = JSON.parse(readFileSync(r, 'utf8'));
    const id = r.replace(/^.*[\\/]/, '').replace(/\.json$/, '');
    return j && j.spec && j.expect ? { spec: j.spec, id: j.id || id, converted: false, fixture: j } : { spec: j, id, converted: false };
  }
  const hit = resolveRef(E, r) || resolveRef(E, 'world-test/' + r);
  if (!hit) throw new Error(`unknown scene '${r}'`);
  const s = E.worldHostSpec ? E.worldHostSpec(hit.item) : null;
  if (s) return { spec: s, id: hit.item.id, ref: hit.ref, converted: false };
  const c = convertRef(r, { root, E, critic: false });
  return { spec: c.spec, id: c.meta.id, ref: c.ref, converted: true, report: c.report };
}
/** The page source of a ref for the browser tools: a registered item by ref, else the spec through the host. */
const pageSrcOf = (s) => ({ spec: s.spec, id: s.id, ref: s.ref });

const DATES = {
  spring: '2026-04-18T14:00:00Z', summer: '2026-07-16T13:00:00Z', autumn: '2026-10-22T13:00:00Z', winter: '2026-01-20T13:00:00Z',
  night: '2026-07-16T22:30:00Z', dusk: '2026-10-22T17:15:00Z',
};
const chromeOf = async (gpu) => { const { launchChrome } = await import('./release-chrome.mjs'); return launchChrome(gpu ? { extraArgs: ['--enable-gpu', '--ignore-gpu-blocklist'] } : {}); };

/* ---------- the acceptance suite's pieces (exported for the tests) ---------- */

/** The package table of docs/dev/WORLD_ENGINE.md section 8: [{ key, files, ids }] (X1). */
export function worldOwners(rootDir = root) {
  const md = readFileSync(join(rootDir, 'docs', 'dev', 'WORLD_ENGINE.md'), 'utf8');
  const i = md.indexOf('## 8. Work packages');
  const part = i >= 0 ? md.slice(i, md.indexOf('\n## ', i + 10)) : '';
  const rows = [];
  for (const line of part.split('\n')) {
    const m = /^\|\s*`([a-z-]+)`\s*\|(.*)\|(.*)\|\s*$/.exec(line);
    if (!m) continue;
    rows.push({ key: m[1], files: [...m[2].matchAll(/`([^`]+)`/g)].map(x => x[1]), ids: m[3].split(',').map(s => s.trim()).filter(Boolean) });
  }
  return rows;
}
/** The files a checkpoint commit of one phase (package) takes (X2): its own files that exist (globs and brace lists expanded). */
export function worldPhaseFiles(rootDir, row) {
  const outFiles = [];
  for (const f of row.files) {
    const brace = /^(.*)\{([^}]+)\}(.*)$/.exec(f);
    const list = brace ? brace[2].split(',').map(x => brace[1] + x.trim() + brace[3]) : [f];
    for (const p of list) {
      if (p.includes('*')) {
        const dir = p.slice(0, p.lastIndexOf('/')), re = new RegExp('^' + p.slice(p.lastIndexOf('/') + 1).replace(/[.]/g, '\\.').replace(/\*/g, '.*') + '$');
        if (existsSync(join(rootDir, dir))) for (const n of readdirSync(join(rootDir, dir)).sort()) if (re.test(n)) outFiles.push(dir + '/' + n);
      } else if (existsSync(join(rootDir, p))) outFiles.push(p);
    }
  }
  return outFiles;
}
/** The world engine's files for the privacy scan (I3). */
export function worldFiles(rootDir = root) {
  const list = [];
  const add = (dir, re) => { if (existsSync(join(rootDir, dir))) for (const n of readdirSync(join(rootDir, dir)).sort()) if (re.test(n)) list.push(dir + '/' + n); };
  add('src/app', /^79-world-.*\.js$/); add('tools', /^world\.mjs$/); add('tools/lib/world', /\.mjs$/); add('tests', /^world-.*\.test\.mjs$/);
  add('tests/fixtures/world', /\.json$/); add('tests/fixtures/world/adversarial', /\.json$/); add('docs/dev', /^(WORLD_ENGINE.*|SCENE_LESSONS)\.md$/);
  return list;
}
/** The privacy scan over the world files (docs/dev/PRIVACY-SCAN.md; the private term list when the user keeps one). */
export async function worldPrivacyScan(rootDir = root) {
  const P = await import('./privacy-scan.mjs');
  let terms = null, termInfo = 'generic rules only (no private term list found)';
  for (const f of [P.DEFAULT_TERMS(rootDir), process.env.DASHBOARD_DATA_DIR && join(resolve(process.env.DASHBOARD_DATA_DIR), 'privacy-terms.txt')].filter(Boolean)) {
    if (!existsSync(f)) continue;
    const p = P.parseTerms(readFileSync(f, 'utf8'));
    terms = P.termMatcher(p.terms); termInfo = `${p.terms.length} private term(s) from the user's term list`;
    break;
  }
  const allow = P.loadAllow(P.DEFAULT_ALLOW(rootDir));
  const files = worldFiles(rootDir), findings = [];
  for (const rel of files) {
    const buf = readFileSync(join(rootDir, rel));
    for (const f of [...P.scanPathName(rel, { terms }), ...P.scanFile(rel, buf, { terms, allowed: (x) => allow.allowed(x, rel), project: allow.project })]) findings.push(f);
  }
  const errors = findings.filter(f => f.severity === 'error'), warnings = findings.filter(f => f.severity !== 'error');
  return { ok: !errors.length, files: files.length, errors, warnings, termInfo, mask: P.mask };
}
/** The authoring time per test scene (Z2): o.authoring (a JSON file { id: { minutes, rounds, note } }) or the scene file's git history. */
export function worldAuthoring(rootDir, ids, file) {
  let given = {};
  if (file && existsSync(file)) { try { given = JSON.parse(readFileSync(file, 'utf8')); } catch { given = {}; } }
  return ids.map(id => {
    if (given[id]) return Object.assign({ id, by: 'given' }, given[id]);
    const f = `src/app/79-world-zscene-${id.replace(/-w3$/, '')}.js`;
    const g = spawnSync('git', ['log', '--follow', '--format=%at', '--', f], { cwd: rootDir, encoding: 'utf8' });
    const ts = g.status === 0 ? g.stdout.trim().split(/\s+/).filter(Boolean).map(Number).sort((a, b) => a - b) : [];
    if (!ts.length) return { id, minutes: null, rounds: 0, by: 'not measured (no commits yet: pass --authoring=<json>)' };
    if (ts.length < 2) return { id, minutes: null, rounds: ts.length, by: 'not measured (one commit only: record the start and the first good render, and pass --authoring=<json>)' };
    return { id, minutes: Math.round((ts[ts.length - 1] - ts[0]) / 60), rounds: ts.length, by: 'git history of ' + f + ' (first to last commit; rounds = commits)' };
  });
}

/** The acceptance suite (16.5). Returns { pass, items: [{ id, name, status: 'pass' | 'fail' | 'pending' | 'skip', lines }], report }. */
export async function worldAccept(E, o = {}) {
  const items = [], push = (id, name, status, lines) => { items.push({ id, name, status, lines }); if (o.onItem) o.onItem(items[items.length - 1]); };
  const scenes = (o.scenes || WORLD_TEST_REFS).map(r => ({ alias: r, ref: 'world-test/' + r + '-w3', source: WORLD_ALIASES[r] }));
  const quick = !!o.quick, seconds = quick ? 30 : (Number.isFinite(E.WORLD_LOOP_S) ? E.WORLD_LOOP_S : 360), hz = quick ? 2 : (o.hz || 5);
  const failedRules = new Set();
  // 1. unit tests (world-acceptance runs items 2 and 3 below itself)
  if (o.tests !== false) {
    const files = readdirSync(join(root, 'tests')).filter(f => /^world-.*\.test\.mjs$/.test(f) && f !== 'world-acceptance.test.mjs').map(f => join('tests', f));
    const r = spawnSync(process.execPath, ['--test', ...files], { cwd: root, encoding: 'utf8', timeout: 30 * 60000 });
    const fails = (r.stdout || '').split('\n').filter(l => /^not ok|^✖/.test(l.trim())).slice(0, 20);
    const sum = (r.stdout || '').split('\n').filter(l => /^ℹ (tests|pass|fail)/.test(l)).join(', ');
    push('16.5.1', 'unit tests (node --test tests/world-*.test.mjs; timing tests compare medians at 1.2x)', r.status === 0 ? 'pass' : 'fail', [sum, ...fails]);
  } else push('16.5.1', 'unit tests', 'skip', ['skipped (--no-tests)']);
  // 2. the invariant checker over the full loop at 3 dates x 5 times (and the V7 matrix)
  {
    const lines = []; let bad = 0;
    // every cell in its own child process, several at once (tools/lib/world/cells.mjs): a native fault stays in its cell
    const secs = o.matrix ? Math.min(seconds, quick ? 10 : 20) : seconds, jobs = [], meta = [];
    for (const s of scenes) {
      let spec; try { spec = specOf(E, s.ref).spec; } catch (e) { lines.push(`${s.ref}: ${e.message}`); bad++; continue; }
      const cells = o.matrix ? worldMatrixCells(spec).map(c => ({ label: `${c.season} ${c.moment} ${c.wx}`, ms: c.ms, wx: c.wx })) : worldMomentsOf(spec).map(m => ({ label: `${m.date} ${m.moment}`, ms: m.ms }));
      for (const c of cells) { jobs.push({ op: 'inv', spec, ms: c.ms, wx: c.wx, seconds: secs, hz }); meta.push({ s, c }); }
    }
    const results = await runCells(jobs, { root });
    results.forEach((r, i) => {
      const { s, c } = meta[i];
      if (r.uniq || r.error) { bad++; for (const k of Object.keys(r.counts || {})) failedRules.add(k); lines.push(`${s.ref} ${c.label}: ${r.uniq} violation(s)${r.error ? ' ERROR ' + r.error : ''} ${Object.entries(r.counts || {}).map(([k, n]) => `${k} ${n} [${OWNERS[k] || '?'}]`).join(', ')}${r.frameNote ? ' (' + r.frameNote + ')' : ''}`); }
      if (r.retried) lines.push(`${s.ref} ${c.label}: its process died and was run again (${r.retried}x; a native fault, not the scene)`);
    });
    for (const s of scenes) lines.push(`${s.ref}: ${meta.filter(m => m.s === s).length} cells x ${secs} s at ${hz} Hz checked`);
    push(o.matrix ? '16.5.2 + V7' : '16.5.2', `invariant checker, ${o.matrix ? 'the matrix (4 seasons x 5 times x 3 weathers)' : 'full loop at 3 dates x 5 times'}: zero violations`, bad ? 'fail' : 'pass', lines);
  }
  // 2b. the same checker on the REAL rendered frames (browser): Chrome draws every frame of the loop and the record of what it drew
  // is checked, so the checker is no longer a parallel simulation that can look clean while the page shows something else
  if (o.browser) {
    const lines = []; let bad = 0;
    const { worldBrowserInvariants } = await import('./lib/world/browserinv.mjs');
    const chrome = await chromeOf(true);
    try {
      for (const s of scenes) {
        const sp = specOf(E, s.ref), moms = worldMomentsOf(sp.spec, ['07-15', '01-15', '10-15']);
        const pick = [moms.find(m => m.date.endsWith('07-15') && m.moment === 'noon'), moms.find(m => m.date.endsWith('01-15') && m.moment === 'dusk'), moms.find(m => m.date.endsWith('10-15') && m.moment === 'night')].filter(Boolean);
        const r = await worldBrowserInvariants(chrome, { ref: s.ref, spec: sp.spec, id: sp.id }, { moments: pick.map((m, i) => ({ label: `${m.date} ${m.moment}`, at: m.at, seconds: i === 0 ? seconds : Math.min(seconds, 120) })), hz: quick ? 1 : 2, loop: seconds, root });
        for (const c of r.cells) {
          if (c.uniq || c.error) { bad++; for (const k of Object.keys(c.counts || {})) failedRules.add(k); }
          lines.push(`${c.uniq || c.error ? 'FAIL' : 'ok  '} ${s.ref} ${c.label}: ${c.frames} real frames, up to ${c.agents} agents drawn, ${c.uniq} violation(s)${c.error ? ' ERROR ' + c.error : ''} ${Object.entries(c.counts || {}).map(([k, n]) => `${k} ${n} [${OWNERS[k] || '?'}]`).join(', ')}`);
        }
        for (const e of r.errors) { bad++; lines.push(`FAIL ${s.ref}: ${e}`); }
      }
    } finally { await chrome.close(); }
    push('16.2b', 'invariant checker on the real rendered frames (the page draws every frame; what it drew is checked): zero violations', bad ? 'fail' : 'pass', lines);
  }
  // 3. the adversarial scenes
  {
    const res = await runCells(adversarialFixtures(root).map(fx => ({ op: 'adv', file: fx.file, seconds: quick ? 30 : 120, hz })), { root });
    res.forEach((r, i) => { if (r.error && !r.id) Object.assign(r, { id: adversarialFixtures(root)[i].id, ok: false, registered: null, built: false, logOk: false, missing: [], violations: 0, run: { counts: {}, first: {}, frames: 0, kind: '-', error: r.error } }); });
    for (const r of res) for (const k of Object.keys((r.run && r.run.counts) || {})) failedRules.add(k);
    push('16.5.3', `adversarial scenes (${res.length}): register, build, a log for every fix, zero violations over ${quick ? 30 : 120} s`, res.every(r => r.ok) && res.length >= 14 ? 'pass' : 'fail', adversarialText(res).split('\n'));
  }
  // 4. the test scenes against their originals: the critic (Node), compare sheets and full-loop captures (browser)
  {
    const lines = []; let bad = 0;
    for (const s of scenes) {
      try {
        const v3 = criticOfRef(E, s.ref, {}, resolveRef), src = criticOfRef(E, s.source, {}, resolveRef), ok = v3.score + 0.5 >= src.score;
        if (!ok) bad++;
        lines.push(`${ok ? 'ok  ' : 'FAIL'} ${s.ref}: critic ${v3.score} vs original ${src.score}${v3.problems.length ? '; ' + v3.problems.slice(0, 3).join('; ') : ''}`);
      } catch (e) { bad++; lines.push(`FAIL ${s.ref}: ${e.message}`); }
    }
    if (o.browser) {
      const { worldCompare } = await import('./lib/world/compare.mjs'), { worldCapture } = await import('./lib/world/capture.mjs'), { worldSheet } = await import('./lib/world/sheet.mjs');
      const chrome = await chromeOf(true);
      try {
        for (const s of scenes) {
          const sp = specOf(E, s.ref);
          const cmp = await worldCompare(chrome, { ref: s.ref, spec: sp.spec, id: sp.id }, { ref: s.source }, { dir: join(o.out || WORLD_OUT, 'compare'), spec: sp.spec });
          const cap = await worldCapture(chrome, { ref: s.ref, spec: sp.spec, id: sp.id }, { full: true, dir: join(o.out || WORLD_OUT, 'capture') });
          const mat = o.matrix ? await worldSheet(chrome, { ref: s.ref, spec: sp.spec, id: sp.id }, { matrix: true, dir: join(o.out || WORLD_OUT, 'sheet') }) : null;
          for (const e of [...cmp.errors, ...cap.errors, ...((mat && mat.errors) || [])]) { bad++; lines.push(`FAIL ${s.ref}: ${e}`); }
          lines.push(`     ${s.ref}: compare ${cmp.sheet}; loop strip ${cap.strip}${mat ? '; matrix ' + mat.sheet : ''}`);
          (o.forReview || []).push(cmp.sheet, cap.strip, ...(mat ? [mat.sheet] : []));
        }
      } finally { await chrome.close(); }
    } else lines.push('compare sheets and full-loop captures: not rendered (--browser)');
    push('16.5.4', 'test scenes at least as rich as their originals (critic), compare sheets and full-loop captures', bad ? 'fail' : o.browser ? 'pass' : 'pending', lines);
  }
  // 5. performance (F1, F2, Z1): the Node profile always, the browser gates with --browser
  {
    const lines = []; let bad = 0;
    for (const s of scenes) {
      try {
        const sp = specOf(E, s.ref).spec, p = worldPerfProfile(E, sp, { seconds: quick ? 5 : 20 });
        if (!p.ok) bad++;
        lines.push(...worldPerfProfileText(p, s.ref).split('\n'));
        if (o.browser) {
          const chrome = await chromeOf(true);
          try {
            for (const m of await worldPerfMatrix(chrome, sp, { id: s.alias, seconds: quick ? 2 : 4 })) {
              if (!m.check.ok) bad++;
              lines.push(`  ${m.check.ok ? 'ok  ' : 'FAIL'} ${s.ref} ${m.size} ${m.extreme}: ${m.check.error || m.check.lines.filter(l => l.status !== 'n/a').map(l => `${l.item} ${l.value}${l.unit}${l.status !== 'ok' ? ' ' + l.status.toUpperCase() : ''}`).join(', ')}`);
            }
          } finally { await chrome.close(); }
        }
      } catch (e) { bad++; lines.push(`FAIL ${s.ref}: ${e.message}`); }
    }
    if (!o.browser) lines.push('browser gates (cold and warm load, frame median and p95, sprites; both sizes x both extremes): not run (--browser)');
    push('16.5.5', 'performance gates F1, F2, Z1 at 1920x1080 @1.25 and 3440x1440, GPU on, throttle 4', bad ? 'fail' : o.browser ? 'pass' : 'pending', lines);
  }
  // 6. the fresh reviewer (X4)
  {
    const lines = [];
    let status = 'pending';
    if (o.reviewed && existsSync(o.reviewed)) {
      const list = readFileSync(o.reviewed, 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
      status = list.length ? 'fail' : 'pass';
      lines.push(list.length ? `the reviewer listed ${list.length} weird thing(s):` : 'the reviewer listed nothing weird', ...list.map(l => '  - ' + l));
    } else lines.push('a fresh-context reviewer (not an author) must look at every compare sheet, matrix and full-loop strip and list anything weird;',
      'pass the list with --reviewed=<file> (one item per line; an empty file is a pass)');
    if ((o.forReview || []).length) lines.push('for review:', ...o.forReview.map(f => '  ' + f));
    push('16.5.6', 'fresh-context reviewer (X4)', status, lines);
  }
  // I3: the privacy scan of the world files
  {
    const p = await worldPrivacyScan(root);
    push('I3', `privacy scan of the world files (${p.files} files, ${p.termInfo})`, p.ok ? 'pass' : 'fail',
      [...p.errors.map(f => `ERROR ${f.file}:${f.line}:${f.col} [${f.rule}] ${f.message}`), ...p.warnings.slice(0, 20).map(f => `warn  ${f.file}:${f.line}:${f.col} [${f.rule}] ${f.message}`)]);
  }
  const pass = items.every(i => i.status === 'pass' || i.status === 'skip');
  return { pass, items, failedRules: [...failedRules] };
}

/** The accept report: the gate, the owner table (X1), the checkpoint files (X2), the lessons reminder (X3), authoring times (Z2). */
export function worldAcceptReport(res, o = {}) {
  const L = [];
  L.push('# World engine acceptance', '', `Gate: **${res.pass ? 'PASS' : 'FAIL'}**${res.pass ? '' : ' (nothing is shown to the user until every item passes; X4)'}`, '');
  L.push('| item | check | result |', '|---|---|---|');
  for (const i of res.items) L.push(`| ${i.id} | ${i.name} | ${i.status.toUpperCase()} |`);
  for (const i of res.items) { L.push('', `## ${i.id} ${i.name}: ${i.status.toUpperCase()}`, '', '```'); for (const l of i.lines) L.push(l); L.push('```'); }
  const owners = worldOwners(root);
  L.push('', '## X1. Package owners (each builder edits only its own files)', '', '| package | files | requirement ids |', '|---|---|---|');
  for (const r of owners) L.push(`| ${r.key} | ${r.files.join(', ')} | ${r.ids.join(', ')} |`);
  if (res.failedRules && res.failedRules.length) {
    L.push('', 'Failing rules and their owners:', '');
    for (const k of res.failedRules) L.push(`- ${k}: ${OWNERS[k] || '?'}`);
  }
  L.push('', '## X2. Checkpoint commits (the orchestrator commits each phase; this tool never commits)', '',
    'Commit each phase with only its own files and a noreply author, after the privacy scan above, e.g.:', '');
  for (const r of owners) {
    const files = worldPhaseFiles(root, r);
    if (files.length) L.push(`- ${r.key}: \`git add ${files.join(' ')}\` then \`git commit --author="<name> <noreply address>" -m "World engine: ${r.key}"\``);
  }
  L.push('', '## X3. SCENE_LESSONS', '', 'Every new class of mistake found in this run gets a row in docs/dev/SCENE_LESSONS.md (section F: the mistake, why it',
    'happened, the rule that now prevents it) and, where it can be checked, a requirement in WORLD_ENGINE_REQUIREMENTS.md with an invariant or a test.');
  if (res.failedRules && res.failedRules.length) L.push('', 'Candidates from this run: ' + res.failedRules.join(', ') + '.');
  if (o.authoring) {
    L.push('', '## Z2. Authoring time per test scene (target: a new place to a first good render in under 30 minutes, no glitch rounds)', '', '| scene | minutes | rounds | measured by |', '|---|---|---|---|');
    for (const a of o.authoring) L.push(`| ${a.id} | ${a.minutes == null ? 'n/a' : a.minutes} | ${a.rounds == null ? 'n/a' : a.rounds} | ${a.by} |`);
  }
  return L.join('\n') + '\n';
}

async function main() {
  if (!cmd || flags.help || (!ref && !['adversarial', 'accept'].includes(cmd))) { out(readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter(l => l.startsWith('//')).map(l => l.slice(3)).join('\n')); return 2; }
  const E = loadEngine({ root });

  if (cmd === 'validate') {
    const s = specOf(E, ref);
    const v = validateSpec(s.spec, E);
    let log = null;
    if (flags.log) { try { const w = E.worldBuild(JSON.parse(JSON.stringify(s.spec)), { season: 'summer' }); log = Array.isArray(w.log) ? w.log : null; } catch (e) { log = [{ action: 'error', reason: 'worldBuild threw: ' + e.message }]; } }
    if (flags.json) { out(JSON.stringify(Object.assign({}, v, { log }), null, 1)); return v.ok ? 0 : 1; }
    out(`${s.id}${s.converted ? ' (converted in memory from ' + s.ref + ')' : ''}: ${v.ok ? 'valid' : v.errors.length + ' error(s)'} [${v.by}]`);
    for (const e of v.errors) out(`  ${String(e.rule).padEnd(18)} ${e.path}: ${e.msg}${e.fix ? '   fix: ' + e.fix : ''}${e.severity ? '  (' + e.severity + ')' : ''}`);
    if (flags.log) {
      if (!log) out('  load log: none (the world has no log yet: the sense package keeps world.log)');
      else { out(`  load log (${log.length}):`); for (const l of log) out(`    ${String(l.action).padEnd(9)} ${String(l.id || l.obj || l.path || '').padEnd(28)} ${l.rule ? '[' + l.rule + '] ' : ''}${l.reason || ''}${l.by ? '  (by ' + l.by + ')' : ''}`); }
      if (s.fixture) { const { logMatches } = await import('./lib/world/adversarial.mjs'); const m = logMatches(log, s.fixture.expect); out(`  expected log entries: ${m.ok ? 'all present' : 'MISSING ' + JSON.stringify(m.missing)}`); }
    }
    return v.ok ? 0 : 1;
  }

  if (cmd === 'convert') {
    const c = convertRef(ref, { root, E });
    const R = c.report;
    if (flags.json) out(JSON.stringify({ meta: c.meta, spec: c.spec, report: R }, null, 1));
    else {
      out(`${c.ref} (${R.from}) -> ${c.meta.id}: ${c.ok ? 'OK' : c.validation.ok ? 'VALID BUT POORER THAN THE SOURCE' : 'INVALID'} [${c.validation.by}]`);
      out('  ' + Object.entries(R.counts).map(([k, v]) => `${k} ${v}`).join(', '));
      if (c.critic) out(`  critic: converted ${c.critic.converted} vs source ${c.critic.source}: ${c.critic.ok ? 'at least as rich' : 'BELOW THE SOURCE (U4, P7)'}`);
      const n = flags.report ? Infinity : 12;
      out(`  review (${R.review.length}):`); for (const r of R.review.slice(0, n)) out(`    ${r.path}: ${r.msg}`);
      if (R.review.length > n) out(`    ... ${R.review.length - n} more (--report)`);
      if (flags.report) { out(`  dropped (${R.dropped.length}):`); for (const d of R.dropped) out(`    ${d.path}.${d.field}: ${d.why}`); for (const s of R.notes) out('  note: ' + s); }
      for (const e of c.validation.errors) out(`  ERROR ${e.rule} ${e.path}: ${e.msg}`);
    }
    if (flags.out) {
      const file = typeof flags.out === 'string' ? resolve(flags.out) : join(root, 'src', 'app', `79-world-zscene-${c.meta.id.replace(/-w3$/, '')}.js`);
      if (existsSync(file) && !flags.force) { out(`  NOT written: ${file} exists (--force to replace; or --out=<other file>)`); return 1; }
      writeFileSync(file, sceneFileSource(c.meta, c.spec, R));
      out(`  wrote ${file}`);
    }
    return c.ok ? 0 : 1;
  }

  if (cmd === 'motion') {
    const s = specOf(E, ref);
    const r = worldMotion(E, s.spec, { seconds: Number(flags.seconds) || 600 });
    if (flags.json) out(JSON.stringify(Object.assign({}, r, { tracks: undefined }), null, 1));
    else {
      out(`${s.id}: ${r.seconds} s simulated, ${r.agentsSeen} agents, ${r.red.length} red mark(s)`);
      const by = {}; for (const m of r.red) by[m.rule] = (by[m.rule] || 0) + 1;
      for (const [k, v] of Object.entries(by)) out(`  ${k}: ${v}`);
      for (const m of r.red.slice(0, 20)) out(`    t ${m.t.toFixed(1)} ${m.id} (${m.cls}) ${m.rule}: ${m.msg}`);
    }
    const svg = typeof flags.svg === 'string' ? resolve(flags.svg) : join(WORLD_OUT, `${s.id}-motion.svg`);
    mkdirSync(resolve(svg, '..'), { recursive: true });
    writeFileSync(svg, worldMotionSvg(E, s.spec, r));
    out(`  overlay: ${svg}`);
    return r.red.length ? 1 : 0;
  }

  if (cmd === 'invariants' && flags.browser) {
    // the checker on the REAL rendered frames: the page draws every frame of the loop and the record of what it drew is checked
    const s = specOf(E, ref), loop = E.WORLD_LOOP_S || 360;
    const moments = flags.matrix ? worldMatrixCells(s.spec).map(c => ({ label: `${c.season} ${c.moment} ${c.wx}`, at: c.at, wx: c.wx })) : worldMomentsOf(s.spec).map(m => ({ label: `${m.date} ${m.moment}`, at: m.at }));
    const { worldBrowserInvariants } = await import('./lib/world/browserinv.mjs');
    const chrome = await chromeOf(!flags['no-gpu']);
    let bad = 0;
    try {
      const r = await worldBrowserInvariants(chrome, pageSrcOf(s), { moments, seconds: Number(flags.seconds) || (flags.matrix ? 20 : loop), hz: Number(flags.hz) || 2, loop, root,
        onCell: (c) => {
          const fail = c.uniq || c.error; if (fail) bad++;
          if (!flags.json) {
            out(`${fail ? 'FAIL' : 'ok  '} ${s.id} ${c.label}: ${c.frames} real frames, up to ${c.agents} agents drawn, ${c.uniq} violation(s)${c.error ? ' ERROR ' + c.error : ''}`);
            for (const [k, n] of Object.entries(c.counts)) out(`       ${k.padEnd(20)} ${String(n).padStart(5)}  e.g. t ${c.first[k] ? c.first[k].t + ' s: ' + c.first[k].msg : ''}   [${OWNERS[k] || '?'}]`);
          }
        } });
      for (const e of r.errors) out('  ERROR ' + e);
      if (flags.json) out(JSON.stringify(r.cells, null, 1));
      return bad || r.errors.length ? 1 : 0;
    } finally { await chrome.close(); }
  }

  if (cmd === 'invariants') {
    const s = specOf(E, ref);
    const cells = flags.matrix ? worldMatrixCells(s.spec).map(c => ({ label: `${c.season} ${c.moment} ${c.wx}`, ms: c.ms, wx: c.wx })) : worldMomentsOf(s.spec).map(m => ({ label: `${m.date} ${m.moment}`, ms: m.ms }));
    const seconds = Number(flags.seconds) || (flags.matrix ? 20 : (E.WORLD_LOOP_S || 360)), hz = Number(flags.hz) || 5, all = [];
    const res = await runCells(cells.map(c => ({ op: 'inv', spec: s.spec, ms: c.ms, wx: c.wx, seconds, hz })), { root });
    for (const [ci, c] of cells.entries()) {
      const r = res[ci];
      all.push(Object.assign({ cell: c.label }, r, { violations: r.violations.slice(0, 20) }));
      if (!flags.json) {
        out(`${r.uniq ? 'FAIL' : 'ok  '} ${s.id} ${c.label}: ${r.frames} frames, ${r.agentsSeen} agents, ${r.uniq} violation(s), ${r.msPerFrame} ms a frame [${r.kind}${r.frameSource ? ', ' + r.frameSource : ''}]${r.error ? ' ERROR ' + r.error : ''}`);
        for (const [k, n] of Object.entries(r.counts)) out(`       ${k.padEnd(20)} ${String(n).padStart(5)}  e.g. ${r.first[k].msg}   [${OWNERS[k] || '?'}]`);
        if (r.na.length) out(`       n/a (the owning package is not loaded yet): ${r.na.join(', ')}`);
      }
    }
    if (flags.json) out(JSON.stringify(all, null, 1));
    return all.some(r => r.uniq || r.error) ? 1 : 0;
  }

  if (cmd === 'adversarial') {
    const fxs = adversarialFixtures(root).filter(f => !ref || f.id === ref);
    if (!fxs.length) { out(`no adversarial fixture ${ref || ''}`); return 2; }
    const res = await runCells(fxs.map(fx => ({ op: 'adv', file: fx.file, seconds: Number(flags.seconds) || 120, hz: Number(flags.hz) || 5 })), { root });
    res.forEach((r, i) => { if (r.error && !r.id) Object.assign(r, { id: fxs[i].id, ok: false, registered: null, built: false, logOk: false, missing: [], violations: 0, log: [], run: { counts: {}, first: {}, frames: 0, kind: '-', error: r.error } }); });
    if (flags.json) out(JSON.stringify(res.map(r => Object.assign({}, r, { log: r.log.slice(0, 200), run: r.run && Object.assign({}, r.run, { log: undefined, violations: r.run.violations.slice(0, 30) }) })), null, 1));
    else { out(adversarialText(res)); out(`${res.filter(r => r.ok).length} of ${res.length} pass`); }
    return res.every(r => r.ok) ? 0 : 1;
  }

  if (cmd === 'critic') {
    const s = specOf(E, ref);
    const c = s.converted ? Object.assign({ ref: s.ref }, worldCritic(E, s.spec, {})) : criticOfRef(E, s.ref || ref, {}, resolveRef);
    let against = null;
    if (typeof flags.against === 'string') against = criticOfRef(E, flags.against, {}, resolveRef);
    // one exit rule for both outputs: poorer than the source, or any critic problem
    const bad = (against && c.score + 0.5 < against.score) || (c.problems && c.problems.length) ? 1 : 0;
    if (flags.json) { out(JSON.stringify({ critic: c, against }, null, 1)); return bad; }
    out(criticText(c, s.id));
    if (against) out(`  against ${against.ref}: ${against.score} -> ${c.score + 0.5 >= against.score ? 'at least as rich' : 'POORER THAN THE SOURCE (P7, U4)'}`);
    return bad;
  }

  if (cmd === 'sheet') {
    const s = specOf(E, ref);
    const { worldSheet } = await import('./lib/world/sheet.mjs');
    const chrome = await chromeOf(!flags['no-gpu']);
    try {
      const r = await worldSheet(chrome, pageSrcOf(s), { matrix: !!flags.matrix, sizes: typeof flags.sizes === 'string' ? flags.sizes.split(',') : undefined, dir: dirOf('sheet'), root, onCell: (c) => out(`  ${c.label}: ${c.file}`) });
      for (const e of r.errors) out('  ERROR ' + e);
      out(`sheet: ${r.sheet}`);
      return r.errors.length ? 1 : 0;
    } finally { await chrome.close(); }
  }

  if (cmd === 'capture') {
    const s = specOf(E, ref);
    const { worldCapture } = await import('./lib/world/capture.mjs');
    const chrome = await chromeOf(!flags['no-gpu']);
    try {
      const sz = typeof flags.size === 'string' && /^\d+x\d+$/.test(flags.size) ? { w: Number(flags.size.split('x')[0]), h: Number(flags.size.split('x')[1]) } : undefined;
      const r = await worldCapture(chrome, pageSrcOf(s), { full: !!flags.full, every: Number(flags.every) || 6, seconds: Number(flags.seconds) || 20, fps: Number(flags.fps) || 2, gif: !!flags.gif, dir: dirOf('capture'), root, loop: E.WORLD_LOOP_S || 360, size: sz, at: typeof flags.at === 'string' ? flags.at : undefined, wx: typeof flags.wx === 'string' ? flags.wx : undefined });
      for (const e of r.errors) out('  ERROR ' + e);
      out(`${r.frames.length} frames over ${r.seconds} s; strip: ${r.strip}${r.gif ? '; gif: ' + r.gif : ''}`);
      return r.errors.length ? 1 : 0;
    } finally { await chrome.close(); }
  }

  if (cmd === 'compare') {
    const other = pos[2];
    if (!other) { out('compare <v3 ref> <original ref>'); return 2; }
    const s = specOf(E, ref), hit = resolveRef(E, other);
    if (!hit) { out(`unknown scene '${other}'`); return 2; }
    const { worldCompare } = await import('./lib/world/compare.mjs');
    let critic = null;
    try { const v3 = s.converted ? worldCritic(E, s.spec, {}) : criticOfRef(E, s.ref, {}, resolveRef), src = criticOfRef(E, hit.ref, {}, resolveRef); critic = { v3: v3.score, source: src.score }; } catch { critic = null; }
    const chrome = await chromeOf(!flags['no-gpu']);
    try {
      const r = await worldCompare(chrome, pageSrcOf(s), { ref: hit.ref }, { dir: dirOf('compare'), root, spec: s.spec, critic });
      for (const e of r.errors) out('  ERROR ' + e);
      out(`compare: ${r.sheet}${critic ? `  (critic: world ${critic.v3} vs original ${critic.source})` : ''}`);
      return r.errors.length ? 1 : 0;
    } finally { await chrome.close(); }
  }

  if (cmd === 'perf') {
    const s = specOf(E, ref);
    const n = worldPerfNode(s.spec, E, { ticks: Number(flags.ticks) || 300 });
    const prof = worldPerfProfile(E, s.spec, { seconds: Number(flags.profile) || 20 });
    let ok = worldPerfCheck(n).ok && prof.ok;
    const res = { node: n, profile: prof, browser: null };
    if (flags.browser) {
      const chrome = await chromeOf(!flags['no-gpu']);
      try {
        if (flags.single) { const m = await worldPerfBrowser(chrome, s.spec, { id: s.id, seconds: Number(flags.seconds) || 4, throttle: flags.throttle == null ? 4 : Number(flags.throttle) }); res.browser = [{ size: '1600x900', extreme: 'now', measures: m, check: worldPerfCheck(m) }]; }
        else res.browser = await worldPerfMatrix(chrome, s.spec, { id: s.id, seconds: Number(flags.seconds) || 4, throttle: flags.throttle == null ? 4 : Number(flags.throttle) });
      } finally { await chrome.close(); }
      for (const m of res.browser) ok = ok && m.check.ok;
    }
    if (flags.json) out(JSON.stringify(res, (k, v) => (k === 'raw' ? undefined : v), 1));
    else {
      out(worldPerfText(worldPerfCheck(n), s.id + ' (the Node part)')); out('  stages: ' + JSON.stringify(n.stages));
      out(worldPerfProfileText(prof, s.id));
      for (const m of res.browser || []) { out(worldPerfText(m.check, `${s.id} ${m.size} ${m.extreme} (GPU ${flags['no-gpu'] ? 'off' : 'on'}, throttle ${flags.throttle == null ? 4 : flags.throttle})`)); if (m.check.error) out('  ERROR ' + m.check.error); }
      if (!flags.browser) out('  (--browser: cold and warm load, frames and sprites at 1920x1080 @1.25 and 3440x1440, summer noon and a snowy night)');
    }
    return ok ? 0 : 1;
  }

  if (cmd === 'render') {
    const s = specOf(E, ref);
    const { sceneRenderPng } = await import('./lib/scene-page.mjs');
    const dir = dirOf('render');
    const names = String(typeof flags.dates === 'string' ? flags.dates : 'spring,summer,autumn,night').split(',');
    const P = s.spec.place || {}, loc = [P.lat != null ? P.lat : 51.5, P.lon != null ? P.lon : -0.1];
    const chrome = await chromeOf(!!flags.gpu);
    try {
      for (const nm of names) {
        const at = DATES[nm] || nm;
        const file = join(dir, `${s.id}-${nm.replace(/[^a-z0-9-]/gi, '')}.png`);
        // sync: the life sim is built before the first frame, so the still shows the warmed-up movers
        await sceneRenderPng(chrome, { data: `worldHostData(${JSON.stringify(s.spec)}, { id: ${JSON.stringify(s.id)}, sync: true })`, at, location: loc, still: true, dpr: Number(flags.dpr) || 1, wx: typeof flags.wx === 'string' ? flags.wx : undefined }, file);
        out(`  ${nm} (${at}): ${file}`);
      }
    } finally { await chrome.close(); }
    return 0;
  }

  if (cmd === 'glitch') {
    const G = await import('./lib/world/glitch.mjs');
    const files = pos.slice(1).filter(f => /\.png$/i.test(f));
    const cells = [];   // [{ label, file, water, night }]
    if (files.length) for (const f of files) cells.push({ label: f.replace(/^.*[\\/]/, ''), file: resolve(f), water: null, night: /night/i.test(f) });
    else {
      const s = specOf(E, ref), { sceneRenderPng } = await import('./lib/scene-page.mjs'), dir = dirOf('glitch');
      const P = s.spec.place || {}, loc = [P.lat != null ? P.lat : 51.5, P.lon != null ? P.lon : -0.1];
      // the sawtooth box: the near half of the scene's water on the screen (device px of the 1600 x 900 render)
      let water = null;
      try {
        const w = E.worldBuild(JSON.parse(JSON.stringify(s.spec)), { season: 'summer' });
        for (const R of (E.worldWaterPlan ? E.worldWaterPlan(w, w.cam) : []) || []) {
          const b = [Math.max(0, R.box[0]), Math.max(R.box[1] + (Math.min(900, R.box[3]) - R.box[1]) * 0.45, 0), Math.min(1600, R.box[2]), Math.min(900, R.box[3])];
          if (!water || (b[2] - b[0]) * (b[3] - b[1]) > (water[2] - water[0]) * (water[3] - water[1])) water = b;
        }
      } catch { water = null; }
      const chrome = await chromeOf(!!flags.gpu);
      try {
        for (const nm of String(typeof flags.dates === 'string' ? flags.dates : 'summer,winter,night,dusk').split(',')) {
          const at = DATES[nm] || nm, file = join(dir, `${s.id}-${nm.replace(/[^a-z0-9-]/gi, '')}${typeof flags.wx === 'string' ? '-' + flags.wx : ''}.png`);
          await sceneRenderPng(chrome, { data: `worldHostData(${JSON.stringify(s.spec)}, { id: ${JSON.stringify(s.id)}, sync: true })`, at, location: loc, still: true, dpr: 1, wx: typeof flags.wx === 'string' ? flags.wx : undefined }, file);
          cells.push({ label: `${s.id} ${nm}`, file, water, night: null });
        }
      } finally { await chrome.close(); }
    }
    const all = [];
    for (const c of cells) {
      const img = G.glitchLoad(c.file);
      // the night checks on a dark frame (or one named night)
      const lum = G.glitchLum(img), med = Array.from(lum.filter((_, i) => i % 11 === 0)).sort((a, b) => a - b), dark = med[Math.floor(med.length / 2)] < 0.22;
      const r = G.glitchCheck(img, { night: c.night != null ? c.night || dark : dark, water: c.water ? c.water.map((v, i) => v * (i % 2 ? img.height / 900 : img.width / 1600)) : null });
      all.push({ cell: c.label, file: c.file, res: r });
      if (!flags.json) out(G.glitchText(r, `${c.label}  ${c.file}`));
    }
    if (flags.json) out(JSON.stringify(all.map(a => ({ cell: a.cell, file: a.file, ok: a.res.ok, discs: a.res.discs.discs, sawtooth: { value: a.res.sawtooth.value, rows: a.res.sawtooth.rows }, night: a.res.night ? { value: a.res.night.value, p5: a.res.night.p5, p95: a.res.night.p95 } : null })), null, 1));
    return all.every(a => a.res.ok) ? 0 : 1;
  }

  if (cmd === 'accept') {
    const forReview = [];
    const t0 = Date.now();
    const res = await worldAccept(E, { browser: !!flags.browser, quick: !!flags.quick, matrix: !!flags.matrix, reviewed: typeof flags.reviewed === 'string' ? resolve(flags.reviewed) : null,
      tests: !flags['no-tests'], forReview, out: dirOf('accept'), onItem: (i) => out(`${i.status.toUpperCase().padEnd(7)} ${i.id} ${i.name}`) });
    const authoring = worldAuthoring(root, WORLD_TEST_REFS.map(r => r + '-w3'), typeof flags.authoring === 'string' ? resolve(flags.authoring) : null);
    const report = worldAcceptReport(res, { authoring });
    const file = typeof flags.out === 'string' ? resolve(flags.out) : join(WORLD_OUT, 'accept.md');
    mkdirSync(resolve(file, '..'), { recursive: true });
    writeFileSync(file, report);
    out('');
    for (const i of res.items) if (i.status !== 'pass') { out(`--- ${i.id} ${i.name}: ${i.status.toUpperCase()}`); for (const l of i.lines.slice(0, 40)) out('  ' + l); }
    out('');
    out(`Package owners: ${worldOwners(root).map(r => r.key).join(', ')} (the table, the checkpoint files per phase and the SCENE_LESSONS reminder are in the report)`);
    out(`Authoring time (Z2): ${authoring.map(a => `${a.id} ${a.minutes == null ? 'n/a' : a.minutes + ' min, ' + a.rounds + ' round(s)'}`).join('; ')}`);
    out(`Report: ${file}  (${Math.round((Date.now() - t0) / 1000)} s)`);
    out(`GATE: ${res.pass ? 'PASS' : 'FAIL'}${res.pass ? '' : ' - nothing is shown to the user until every item passes and a fresh reviewer signs off (X4)'}`);
    return res.pass ? 0 : 1;
  }
  out(`unknown command '${cmd}' (validate | convert | render | motion | invariants | adversarial | critic | sheet | capture | compare | perf | glitch | accept)`);
  return 2;
}

if (process.argv[1] && /[\\/]world\.mjs$/.test(process.argv[1])) {
  main().then(code => { process.exitCode = code; }).catch(e => { console.error(e && e.stack || e); process.exitCode = 1; });
}
