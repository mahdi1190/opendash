// server/routes/relocate.mjs - Settings > Data > "Move my data out of OneDrive"
// (lib/relocate/index.mjs) and "Undo move".
//
//   GET  /api/relocate              -> {dataDir, appDir, synced, suggested, recommendApp, move, open,
//                                       canUndo, others, job, paused, canRestart}
//   POST /api/relocate/plan         {to?, toApp?, moveApp?} -> the plan (the dry run: checks, sizes,
//                                   every reference with before/after; nothing changes)
//   POST /api/relocate/start        {planId, to?, toApp?, moveApp?} -> 202 {job}; 409 {code:'PLAN_CHANGED', plan}
//                                   when the plan is no longer the one the user saw
//   POST /api/relocate/resume       {} -> 202 {job}: finish a move a crash interrupted
//   POST /api/relocate/cancel       {} -> the move: stop an unfinished copy (nothing was switched)
//   POST /api/relocate/finish       {} -> [moves]: rename the old folder now
//   POST /api/relocate/undo-plan    {} -> what Undo would do
//   POST /api/relocate/undo         {moveId} -> 202 {job}
//   GET  /api/relocate/job          -> {state: idle|running|done|error, kind, step, done, total, bytesDone,
//                                       bytesTotal, label, error, result, restart}
//
// The page only (same origin, like "Use here anyway"). While a job copies,
// state writes answer 423 MOVING (ctx.moveGate). When it is done, OpenDash
// starts again from the new place: tools/relocate.mjs --handoff (detached)
// waits for this server and its supervisor to end, renames the old folder
// and starts OpenDash (a window if it had one, else hidden), then this server
// stops. The page polls /api/health and reloads. At start-up a server
// running in a move's new folder finishes what is left (an interrupted
// re-pointing, the rename).

import { spawn } from 'node:child_process';
import { installSpawnGuard } from '../../lib/spawn-guard.mjs';
installSpawnGuard();   // in a test process, never start a real AI agent CLI (lib/spawn-guard.mjs)
import { join, isAbsolute } from 'node:path';
import { createRelocator, publicMove } from '../../lib/relocate/index.mjs';
import { readRecord, openMove } from '../../lib/relocate/record.mjs';
import { samePath } from '../../lib/relocate/paths.mjs';
import { realAdapters, underTestRunner } from '../../lib/relocate/adapters.mjs';
import { lifecycleAvailable, requestLifecycle } from '../lifecycle.mjs';
import { HttpError } from '../http.mjs';

export default function register(app) {
  const ctx = app.ctx;
  const { log } = ctx;
  const root = (ctx.paths && ctx.paths.root) || ctx.dataDir;
  const gate = ctx.moveGate || { pause() {}, resume() {}, status: () => ({ paused: false }) };
  const relocator = () => createRelocator({
    dataDir: root, appDir: ctx.repoRoot, log,
    // tests set these on the context (a fake home, environment and adapters)
    ...(ctx.relocateHome ? { home: ctx.relocateHome } : {}), ...(ctx.relocateEnv ? { env: ctx.relocateEnv } : {}),
    adapters: ctx.relocateAdapters || realAdapters(),
    othersLive: ctx.hosts && ctx.hosts.others ? () => ctx.hosts.others() : undefined,
  });
  let job = { state: 'idle' };

  const fromPage = (c) => {
    const origin = c.req.headers.origin, sfs = c.req.headers['sec-fetch-site'];
    if (origin === `http://localhost:${c.port}` || origin === `http://127.0.0.1:${c.port}` || sfs === 'same-origin') return;
    throw new HttpError(403, 'only the OpenDash page can do this');
  };
  const pathArg = (v, what) => {
    if (v === undefined || v === null || v === '') return undefined;
    if (typeof v !== 'string' || v.length > 400 || !isAbsolute(v) || /[\u0000-\u001f]/.test(v)) throw new HttpError(400, `${what} must be a full folder path`);
    return v;
  };
  const input = (b) => ({
    to: pathArg(b.to, 'The new data folder'), toApp: pathArg(b.toApp, 'The new app folder'),
    ...(typeof b.moveApp === 'boolean' ? { moveApp: b.moveApp } : {}),
  });
  const asHttp = (e) => {
    if (!(e && e.status && e.code)) return e;
    const body = { error: e.message, code: e.code, ...(e.plan ? { plan: e.plan } : {}) };
    return new HttpError(e.status, e.message, { code: e.code, toJSON: () => body });
  };

  /** Start OpenDash again from appDir (after this server stops), or say how. */
  function restartElsewhere({ appDir, dataDir }) {
    const startData = dataDir && !samePath(dataDir, join(appDir, 'data')) ? dataDir : null;
    const plan = { appDir, dataDir: startData, port: ctx.port, window: process.env.DASHBOARD_NO_PAUSE !== '1' };
    if (underTestRunner() || process.env.DASHBOARD_RELOCATE_NO_HANDOFF === '1') { ctx.relocateHandoff = plan; return { mode: 'test', ...plan }; }
    if (!lifecycleAvailable()) return { mode: 'manual', ...plan };
    const wait = [process.pid, ...(ctx.lifecycle && ctx.lifecycle.supervised && process.ppid ? [process.ppid] : [])].join(',');
    const args = [join(appDir, 'tools', 'relocate.mjs'), '--handoff', '--wait', wait, '--start', appDir,
      ...(ctx.port !== 4173 ? ['--port', String(ctx.port)] : []), ...(startData ? ['--start-data', startData] : []), ...(plan.window ? ['--window'] : [])];
    try {
      const child = spawn(process.execPath, args, { cwd: appDir, detached: true, stdio: 'ignore', windowsHide: true, shell: false });
      child.unref();
    } catch (e) {
      log('error', `move: could not start the hand-over (${e.message}); start OpenDash again by hand`);
      return { mode: 'manual', ...plan };
    }
    setTimeout(() => {
      try { requestLifecycle({ action: 'stop', reason: 'moved to a new folder' }); }
      catch (e) { log('error', `move: could not stop for the restart (${e.message})`); }
    }, 1500);   // the page has its answer and its last status by then
    return { mode: 'handoff', ...plan };
  }

  function startJob(kind, fn) {
    if (job.state === 'running') throw new HttpError(409, 'A move is already running.');
    job = { state: 'running', kind, step: 'checks', startedAt: new Date().toISOString() };
    const onProgress = (p) => { job = { ...job, ...p, state: 'running' }; };
    const p = (async () => {
      try {
        const r = await fn(onProgress);
        const restart = r && r.restart ? restartElsewhere(r.restart) : null;
        job = { state: 'done', kind, result: r ? r.move : null, restart, finishedAt: new Date().toISOString() };
        log('note', `${kind === 'undo' ? 'undo move' : 'move'} done${restart ? ` (restart: ${restart.mode})` : ''}`);
      } catch (e) {
        // Nothing switched yet: back to normal. (After the switch the gate stays
        // paused: this server's paths are the old place now.)
        const rec = readRecord({ dataDir: root });
        const m = openMove(rec);
        if (!m || m.phase === 'copying' || m.phase === 'cancelled') gate.resume();
        job = { state: 'error', kind, error: e.message, code: e.code || null, ...(e.plan ? { plan: e.plan } : {}), finishedAt: new Date().toISOString() };
        log('warn', `${kind === 'undo' ? 'undo move' : 'move'} stopped: ${e.code || ''} ${e.message}`.slice(0, 300));
      }
    })();
    if (typeof ctx.track === 'function') ctx.track(p);
    return job;
  }

  app.onReady(async () => {
    // This server runs in a move's new folder: finish what is left (no await: start-up goes on).
    const rec = readRecord({ dataDir: root });
    const mine = rec.moves.filter(m => samePath(m.to.data, root) && ['switching', 'switched'].includes(m.phase));
    if (!mine.length) return;
    const p = (async () => {
      await new Promise(r => setTimeout(r, underTestRunner() ? 0 : 5000));   // the hand-over usually does it first
      const R = relocator();
      try { if (mine.some(m => m.phase === 'switching')) await R.resume(); await R.finish(); }
      catch (e) { log('warn', `move: finishing stopped (${e.message})`); }
    })();
    if (typeof ctx.track === 'function') ctx.track(p);
  });

  app.route({
    path: '/api/relocate', method: 'GET', quiet: true,
    handler: () => ({ ...relocator().status(), job: publicJob(), paused: gate.status().paused, canRestart: lifecycleAvailable() }),
  });
  app.route({ path: '/api/relocate/job', method: 'GET', quiet: true, handler: () => publicJob() });

  app.route({
    path: '/api/relocate/plan', method: 'POST', methodError: 'POST only',
    handler: async (c) => { fromPage(c); const b = await c.body({ allowEmpty: true }); try { return await relocator().plan(input(b)); } catch (e) { throw asHttp(e); } },
  });

  app.route({
    path: '/api/relocate/start', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      fromPage(c);
      const b = await c.body();
      if (typeof b.planId !== 'string' || !/^[0-9a-f]{16}$/.test(b.planId)) throw new HttpError(400, 'planId is needed: look at the plan first');
      const R = relocator();
      const opts = input(b);
      // The checks first, in this request, so a refusal is an answer, not a failed job.
      const p = await R.plan(opts);
      if (p.id !== b.planId) return c.json(409, { error: 'Something changed since you looked at the plan. Please look at it again.', code: 'PLAN_CHANGED', plan: p });
      if (!p.ok) return c.json(409, { error: p.problems.map(x => x.text).join(' '), code: p.problems[0].code, plan: p });
      const j = startJob('move', (onProgress) => R.run(opts, { expectId: b.planId, onProgress, gate }));
      log('note', `move started: ${p.from.data} -> ${p.to.data}${p.to.app ? ` (and the app -> ${p.to.app})` : ''}`);
      return c.json(202, { job: j });
    },
  });

  app.route({
    path: '/api/relocate/resume', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      fromPage(c);
      await c.body({ allowEmpty: true });
      const R = relocator();
      if (!R.status().open) throw new HttpError(409, 'There is no unfinished move.');
      return c.json(202, { job: startJob('move', async (onProgress) => { gate.pause(); return R.resume({ onProgress }); }) });
    },
  });

  app.route({
    path: '/api/relocate/cancel', method: 'POST', methodError: 'POST only',
    handler: async (c) => { fromPage(c); await c.body({ allowEmpty: true }); try { const m = relocator().cancel(); gate.resume(); return m; } catch (e) { throw asHttp(e); } },
  });

  app.route({
    path: '/api/relocate/finish', method: 'POST', methodError: 'POST only',
    handler: async (c) => { fromPage(c); await c.body({ allowEmpty: true }); return { moves: await relocator().finish() }; },
  });

  app.route({
    path: '/api/relocate/undo-plan', method: 'POST', methodError: 'POST only',
    handler: async (c) => { fromPage(c); await c.body({ allowEmpty: true }); return relocator().undoPlan(); },
  });

  app.route({
    path: '/api/relocate/undo', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      fromPage(c);
      const b = await c.body();
      const R = relocator();
      const u = await R.undoPlan();
      if (b.moveId && u.moveId && b.moveId !== u.moveId) return c.json(409, { error: 'That move is not the last one any more.', code: 'PLAN_CHANGED', plan: u });
      if (!u.ok) return c.json(409, { error: u.problems.map(x => x.text).join(' '), code: u.problems[0].code, plan: u });
      return c.json(202, { job: startJob('undo', (onProgress) => R.undo({ onProgress, gate })) });
    },
  });

  function publicJob() {
    const j = { ...job };
    if (j.result) j.result = publicMove(j.result);
    return j;
  }
}
