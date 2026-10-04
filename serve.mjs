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
import { main } from './server/index.mjs';
import { EXIT, describeSignal, setLifecycleHandler, respawnDetached, nextEnv, rebuildApp, runNodeStep } from './server/lifecycle.mjs';

const ARGV = process.argv.slice(2);

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
    note(`stopping: ${reason}`);
    await closeServer();
    try { await after(); } catch (e) { note(`stop step failed: ${e && e.message || e}`); process.exit(EXIT.CRASH); }
  }
  const exitWith = (code) => () => process.exit(code);

  // Ctrl+C / closing the window / SIGTERM. A second Ctrl+C exits at once.
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGBREAK', 'SIGHUP']) {
    try {
      process.on(sig, () => {
        if (stopping) process.exit(EXIT.OK);
        setTimeout(() => process.exit(EXIT.OK), 4000).unref();
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
