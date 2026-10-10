// Long Node runs of the world tools, one child process per cell (docs/dev/WORLD_ENGINE.md 16.5). Node >= 20, no dependencies.
//
// Why: a full acceptance run is tens of minutes of tight simulation. On some machines the process can die from a native fault
// that has nothing to do with the scene (seen in Oct 2026 on a laptop CPU: V8 CHECK failures and segfaults at random places,
// different on every run, also with --jitless). One child per cell keeps a fault to that cell, which is run again (a fault
// that comes back on every retry is reported as an error of that cell); it also runs the cells in parallel.
//
//   runCells(jobs, { concurrency, retries, root }) -> Promise<[result]>   jobs: [{ op: 'inv', ref | spec, ms, wx, seconds, hz }
//                                                                            | { op: 'adv', file, seconds, hz }]; results in job order
//   node tools/lib/world/cells.mjs <job.json>                              the child: prints one JSON result on stdout
import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir, cpus } from 'node:os';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);

/** Run one job in this process (the child's work; also usable in process by tests). */
export async function runCellHere(job) {
  const { loadEngine, resolveRef } = await import('./convert.mjs');
  const A = await import('./adversarial.mjs');
  const E = loadEngine({ root: job.root });
  if (job.op === 'adv') {
    const fx = JSON.parse(readFileSync(job.file, 'utf8'));
    const r = A.adversarialRun(E, Object.assign({ file: job.file }, fx), { seconds: job.seconds, hz: job.hz });
    // keep the result small: the log and the violations are summarised
    return Object.assign({}, r, { log: (r.log || []).slice(0, 200), run: r.run && Object.assign({}, r.run, { log: undefined, violations: (r.run.violations || []).slice(0, 30) }) });
  }
  let spec = job.spec;
  if (!spec) {
    const hit = resolveRef(E, job.ref) || resolveRef(E, 'world-test/' + job.ref);
    if (!hit) throw new Error(`unknown scene '${job.ref}'`);
    spec = E.worldHostSpec(hit.item);
  }
  const r = A.worldInvariantRun(E, spec, { ms: job.ms, wx: job.wx, seconds: job.seconds, hz: job.hz });
  return Object.assign({}, r, { log: undefined, violations: (r.violations || []).slice(0, 20) });
}

/** The cells in child processes, `concurrency` at a time; a child that dies abnormally is run again up to `retries` times. */
export function runCells(jobs, o = {}) {
  const conc = Math.max(1, Math.min(o.concurrency || Math.max(1, Math.floor(cpus().length / 3)), 8)), retries = o.retries == null ? 2 : o.retries;
  const dir = join(tmpdir(), 'opendash-world', 'cells-' + process.pid + '-' + Date.now());
  mkdirSync(dir, { recursive: true });
  const out = new Array(jobs.length);
  let next = 0, live = 0;
  return new Promise((done) => {
    const finish = () => { try { rmSync(dir, { recursive: true, force: true }); } catch { /* temp */ } done(out); };
    const launch = (i, attempt) => {
      live++;
      const file = join(dir, `job-${i}.json`);
      writeFileSync(file, JSON.stringify(Object.assign({ root: o.root }, jobs[i])));
      const ch = spawn(process.execPath, [SELF, file], { stdio: ['ignore', 'pipe', 'pipe'] });
      let so = '', se = '';
      ch.stdout.on('data', (d) => { so += d; });
      ch.stderr.on('data', (d) => { se += d; });
      ch.on('close', (code, sig) => {
        live--;
        let res = null;
        if (code === 0) { try { res = JSON.parse(so.trim().split('\n').pop()); } catch { res = null; } }
        if (!res && attempt < retries) { launch(i, attempt + 1); return; }
        out[i] = res || { error: `the cell's process died (exit ${code}${sig ? ', ' + sig : ''}) ${attempt + 1} time(s): ${String(se).split('\n').filter(Boolean).slice(-2).join(' / ').slice(0, 300)}`, counts: {}, first: {}, uniq: 0, violations: [], na: [], frames: 0 };
        if (attempt) out[i].retried = attempt;
        pump();
      });
    };
    const pump = () => {
      while (live < conc && next < jobs.length) launch(next++, 0);
      if (!live && next >= jobs.length) finish();
    };
    if (!jobs.length) finish(); else pump();
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const job = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  runCellHere(job).then((r) => { process.stdout.write(JSON.stringify(r) + '\n'); }).catch((e) => { process.stderr.write(String(e && e.stack || e) + '\n'); process.exitCode = 1; });
}
