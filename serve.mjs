// serve.mjs - entry point. start-opendash.bat / .sh run it through
// tools/supervisor.mjs (which restarts it); `node serve.mjs` alone works too.
//
// The server lives in server/: index.mjs (boot, args, static), http.mjs
// (helpers + safety checks), router.mjs (route table), state-store.mjs,
// lifecycle.mjs (exit codes, restarts) and routes/*.mjs (one file per API
// area). See MODULES.md.
//
// Usage:  node serve.mjs [--port 4173] [--no-open] [--data-dir <dir>]
//                        [--finance-dir <dir>] [--fresh]
//
// Stopping and restarting (server/lifecycle.mjs has the exit-code contract):
//   Ctrl+C, the window closed, SIGTERM, Settings > Server > Stop -> clean stop, exit 0
//   POST /api/server/restart        supervised: exit 75 (76 to rebuild first);
//                                   on its own: start a hidden replacement with the
//                                   same arguments (it waits for the port), then exit 0
// Every way of stopping is noted in <data>/logs/server.log, so an unexpected
// stop can be traced afterwards (Settings > Server shows the last reason).

import { appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { guardServe } from './lib/update-guard.mjs';

const ARGV = process.argv.slice(2);

// An update is never left half done (lib/update-guard.mjs, Node stdlib only), so it looks before any other app file
// loads: an install that was cut off is put back, and new code starts only once its rebuild has passed (else the
// previous version is put back). The rest of the app is imported after it.
const guard = await guardServe({ repoRoot: dirname(fileURLToPath(import.meta.url)), argv: ARGV });
if (guard.message) console.log(`\n  ${guard.message}\n`);
if (guard.go === 'stop') process.exit(78);
if (guard.go === 'restart') {
  // The previous version's files are back: start those, not this copy of serve.mjs.
  if (process.env.DASHBOARD_SUPERVISED === '1' && typeof process.send === 'function') process.exit(75);
  const again = spawnSync(process.execPath, [...process.execArgv, ...process.argv.slice(1)], { stdio: 'inherit', env: process.env });
  process.exit(again.status == null ? 1 : again.status);
}
const { main } = await import('./server/index.mjs');
const { EXIT, describeSignal, setLifecycleHandler, respawnDetached, nextEnv, rebuildApp, runNodeStep, installInProgress, markStopping } = await import('./server/lifecycle.mjs');
const INSTALL_WAIT_MS = 90000;   // how long a stop waits for an update that is being written (seconds, as a rule)

// The lifecycle handler is installed before main() opens the port, so a
// restart or stop asked for as soon as the server answers is never refused
// with 501. It acts once main() has handed over the server below.
let handleLifecycle = null;
const early = [];
setLifecycleHandler((req) => { if (handleLifecycle) handleLifecycle(req); else early.push(req); });

main(ARGV).then((srv) => {
  if (!srv || typeof srv.close !== 'function') { setLifecycleHandler(null); return; }
  const note = (msg) => { try { appendFileSync(srv.ctx.paths.serverLog, `${new Date().toISOString()} NOTE  ${String(msg).replace(/[\r\n]+/g, ' | ').slice(0, 2000)}\n`); } catch { /* log not writable */ } };
  process.on('exit', (code) => note(`server process exiting (code ${code})`));
  // An uncaught error still crashes the process (the supervisor restarts it);
  // this only writes down why, which the console window loses when it closes.
  process.on('uncaughtExceptionMonitor', (err, origin) => note(`crash (${origin}): ${String(err && err.stack || err).split('\n').slice(0, 8).join(' | ')}`));

  const supervised = srv.ctx.lifecycle.supervised;
  let stopping = false;

  /** Close the listener, end SSE streams, remove runtime.json; never waits more than ~3 s. */
  async function closeServer() {
    let timer;
    await Promise.race([srv.close().catch(() => {}), new Promise((r) => { timer = setTimeout(r, 3000); })]);
    clearTimeout(timer);
    try { srv.server.closeAllConnections?.(); } catch { /* already closed */ }
  }

  async function shutdown(reason, after) {
    if (stopping) return;
    stopping = true;
    markStopping();   // an update not yet writing never starts now
    note(`stopping: ${reason}`);
    // An update being written into the app folder finishes first: stopping part-way would leave it half old, half new.
    const inst = installInProgress();
    if (inst) {
      note('an update is being installed: it finishes first');
      let t;
      await Promise.race([inst, new Promise((r) => { t = setTimeout(r, INSTALL_WAIT_MS); })]);
      clearTimeout(t);
    }
    await closeServer();
    try { await after(); } catch (e) { note(`stop step failed: ${e && e.message || e}`); process.exit(EXIT.CRASH); }
  }
  const exitWith = (code) => () => process.exit(code);

  // Ctrl+C / closing the window / SIGTERM. A second Ctrl+C exits at once.
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGBREAK', 'SIGHUP']) {
    try {
      process.on(sig, () => {
        if (stopping) process.exit(EXIT.OK);
        setTimeout(() => process.exit(EXIT.OK), installInProgress() ? INSTALL_WAIT_MS + 4000 : 4000).unref();
        shutdown(describeSignal(sig), exitWith(EXIT.OK));
      });
    } catch { /* not on this OS */ }
  }

  // Under the supervisor: it asks over IPC (a clean stop on every OS), and if
  // it goes away (its window was closed, it was ended) this server stops too.
  if (supervised) {
    process.on('message', (m) => { if (m && m.cmd === 'stop') shutdown(`the supervisor asked it to stop (${String(m.reason || 'stop').slice(0, 120)})`, exitWith(EXIT.OK)); });
    process.on('disconnect', () => shutdown('the supervisor went away', exitWith(EXIT.OK)));
    try { process.channel?.unref?.(); } catch { /* fine */ }
  }

  // Settings > Server (POST /api/server/restart | /api/server/stop): the route
  // has already answered 202 when this runs.
  handleLifecycle = ({ action, rebuild }) => {
    if (action === 'stop') { shutdown('stop requested from the dashboard', exitWith(EXIT.OK)); return; }
    if (supervised) { shutdown(`${rebuild ? 'rebuild and restart' : 'restart'} requested from the dashboard (the supervisor starts it again)`, exitWith(rebuild ? EXIT.REBUILD : EXIT.RESTART)); return; }
    shutdown(`${rebuild ? 'rebuild and restart' : 'restart'} requested from the dashboard (starting a replacement)`, async () => {
      let lastRebuild = null;
      if (rebuild) {
        const log = (level, msg) => note(msg);
        lastRebuild = await rebuildApp({ args: ARGV, log, run: (s, a) => runNodeStep(s, a, { echo: () => {} }) });
      }
      const lastStop = rebuild ? (lastRebuild.ok ? 'rebuild requested' : `rebuild requested; the ${lastRebuild.step} step failed, so the previous build was restarted`) : 'restart requested';
      const pid = respawnDetached({ args: ARGV, env: nextEnv(process.env, { lastStop, lastRebuild }), logFile: srv.ctx.paths.serverLog });
      note(`started the replacement server (pid ${pid}); its console output goes to this log`);
      process.exit(EXIT.OK);
    });
  };
  for (const req of early.splice(0)) handleLifecycle(req);
}).catch((e) => {
  console.error('\n  The OpenDash server could not start:\n  ' + (e && e.stack || e) + '\n');
  process.exit(EXIT.CRASH);
});
