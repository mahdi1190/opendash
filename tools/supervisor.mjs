// tools/supervisor.mjs - keeps the dashboard server running.
//
//   node tools/supervisor.mjs [the same arguments as serve.mjs]
//
// start-opendash.bat / .sh run this instead of serve.mjs (a plain
// `node serve.mjs` still works on its own; it just is not restarted).
// It runs serve.mjs as a child process and follows the exit-code contract in
// server/lifecycle.mjs:
//   0  clean stop (Ctrl+C, the window closed, Settings > Server > Stop) -> stop too
//   75 restart requested                       -> start it again at once (beyond 6
//                                                 requested in 10 minutes: 10 s later)
//   76 rebuild requested                       -> migrations + syntax check + build,
//                                                 then start it (the previous build
//                                                 if a step failed; reported)
//   78 set-up problem                          -> stop (the window shows why)
//   anything else = a crash                    -> start it again after 1 s, 2 s, 5 s,
//                                                 10 s...; give up after 5 crashes in 60 s
// Ctrl+C / closing the window / SIGTERM: the child is asked to stop over its
// IPC channel (so it always shuts down cleanly and removes runtime.json; a
// console's own Ctrl+C reaches it too), and is killed only if it has not
// stopped after 10 s. If the supervisor itself dies, the child sees its IPC
// channel close and stops. Everything goes to <data>/logs/server.log as
// "supervisor: ..." lines, and to this window.

import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT, resolveDataDir, dataPaths } from '../lib/datadir.mjs';
import { createLogger } from '../server/log.mjs';
import { EXIT, classifyExit, describeExit, describeSignal, withNoOpen, rebuildApp, runNodeStep } from '../server/lifecycle.mjs';

export const BACKOFF_MS = Object.freeze([1000, 2000, 5000, 10000, 30000]);
export const CRASH_LIMIT = 5;
export const CRASH_WINDOW_MS = 60 * 1000;
const HISTORY_MS = 10 * 60 * 1000;
// The server refuses a 7th requested restart in 10 minutes (429). Should more
// exits 75/76 arrive anyway (a bug, or a local program looping), each further
// one waits this long first, so they can never become a tight loop.
export const REQUEST_LIMIT = 6;
export const REQUEST_DELAY_MS = 10000;

/**
 * The supervisor loop, with everything that touches the OS injectable (tests):
 *   spawnChild(args, env) -> a ChildProcess-like (pid, on('exit'), send(), kill(), connected)
 *   rebuild(args)         -> Promise<{ok, step, code, at, message}>
 *   log(level, msg)       msg without the "supervisor: " prefix (added here)
 *   now(), sleep(ms)      clock
 * run() resolves with the supervisor's own exit code.
 */
export function createSupervisor({
  args = [], env = process.env, spawnChild, rebuild = (a) => rebuildApp({ args: a }), log = () => {},
  now = () => Date.now(), sleep = (ms) => new Promise(r => setTimeout(r, ms)),
  backoff = BACKOFF_MS, crashLimit = CRASH_LIMIT, crashWindowMs = CRASH_WINDOW_MS, stopTimeoutMs = 10000,
  requestLimit = REQUEST_LIMIT, requestDelayMs = REQUEST_DELAY_MS,
} = {}) {
  const say = (level, msg) => { try { log(level, 'supervisor: ' + msg); } catch { /* log not writable */ } };
  let child = null, stopping = false, stopReason = null, wake = null, killTimer = null;
  let restarts = 0, lastStop = null, lastRebuild = null;
  let crashes = [], history = [];

  function waitExit(c) {
    return new Promise((resolve) => {
      let done = false;
      const fin = (code, signal) => { if (done) return; done = true; resolve({ code, signal }); };
      c.on('exit', fin);
      c.on('error', (e) => { say('error', `could not start the server: ${e && e.message || e}`); fin(-1, null); });
    });
  }
  /** Sleep that a stop request cuts short. */
  function pause(ms) {
    return new Promise((resolve) => {
      let done = false;
      const fin = () => { if (done) return; done = true; wake = null; resolve(); };
      wake = fin;
      Promise.resolve(sleep(ms)).then(fin, fin);
    });
  }

  function stop(reason = 'stop') {
    if (stopping) return;
    stopping = true; stopReason = reason;
    say('info', `${reason}: stopping the server`);
    if (wake) wake();
    const c = child;
    if (!c) return;
    try { if (c.connected && typeof c.send === 'function') c.send({ cmd: 'stop', reason }); } catch { /* channel closed */ }
    killTimer = setTimeout(() => {
      if (child === c) { say('warn', `the server did not stop within ${Math.round(stopTimeoutMs / 1000)} s; ending it`); try { c.kill(); } catch { /* gone */ } }
    }, stopTimeoutMs);
    killTimer.unref?.();
  }

  async function run() {
    let first = true;
    for (;;) {
      if (stopping) return EXIT.OK;
      const t = now();
      history = history.filter(x => x > t - HISTORY_MS);
      const childEnv = { ...env, DASHBOARD_SUPERVISED: '1', DASHBOARD_RESTART_COUNT: String(restarts), DASHBOARD_RESTART_HISTORY: history.join(',') };
      for (const k of ['DASHBOARD_LAST_STOP', 'DASHBOARD_LAST_REBUILD', 'DASHBOARD_RESPAWN_WAIT']) delete childEnv[k];
      if (lastStop) childEnv.DASHBOARD_LAST_STOP = lastStop;
      if (lastRebuild) childEnv.DASHBOARD_LAST_REBUILD = JSON.stringify(lastRebuild);
      if (!first) childEnv.DASHBOARD_RESPAWN_WAIT = '15000';
      const c = spawnChild(first ? [...args] : withNoOpen(args), childEnv);
      child = c;
      say('info', `${first ? 'started' : 'restarted'} the server (pid ${c && c.pid}${restarts ? `, restart ${restarts}` : ''})`);
      first = false;
      const { code, signal } = await waitExit(c);
      child = null;
      if (killTimer) { clearTimeout(killTimer); killTimer = null; }
      const what = describeExit(code, signal);
      if (stopping) { say('info', `the server stopped (${what}); the supervisor stops too`); return EXIT.OK; }
      const kind = classifyExit(code, signal);
      if (kind === 'stop') { say('info', 'the server stopped cleanly (exit 0); not restarting'); return EXIT.OK; }
      if (kind === 'config') { say('error', 'the server could not start because of a set-up problem (exit 78, see the message above); not restarting'); return EXIT.CONFIG; }
      if (kind === 'restart') {
        history.push(now());
        lastStop = 'restart requested'; lastRebuild = null;
        say('info', 'restart requested; starting it again now');
      } else if (kind === 'rebuild') {
        history.push(now());
        say('info', 'rebuild requested: migrations, check and build first');
        let r;
        try { r = await rebuild(args); } catch (e) { r = { ok: false, step: 'rebuild', code: -1, at: new Date(now()).toISOString(), message: String(e && e.message || e) }; }
        lastRebuild = r;
        if (r.ok) { lastStop = 'rebuild requested'; say('info', 'rebuild done; starting the new build'); }
        else { lastStop = `rebuild requested; the ${r.step} step failed, so the previous build was restarted`; say('error', `the rebuild failed at the ${r.step} step (exit ${r.code}); starting the previous build. ${r.message || ''}`.trim()); }
        if (stopping) return EXIT.OK;
      } else {
        const tc = now();
        crashes = crashes.filter(x => x > tc - crashWindowMs);
        crashes.push(tc);
        lastStop = `crashed (${what})`; lastRebuild = null;
        if (crashes.length >= crashLimit) {
          say('error', `giving up: the server crashed ${crashes.length} times within ${Math.round(crashWindowMs / 1000)} s (last: ${what}). Fix the error shown above, then start OpenDash again.`);
          return EXIT.CRASH;
        }
        const delay = backoff[Math.min(crashes.length - 1, backoff.length - 1)];
        say('warn', `the server crashed (${what}); starting it again in ${delay >= 1000 ? Math.round(delay / 100) / 10 + ' s' : delay + ' ms'} (crash ${crashes.length} of ${crashLimit} allowed within ${Math.round(crashWindowMs / 1000)} s)`);
        await pause(delay);
        if (stopping) { say('info', 'stopped while waiting to restart'); return EXIT.OK; }
      }
      if (kind === 'restart' || kind === 'rebuild') {
        const n = history.filter(x => x > now() - HISTORY_MS).length;
        if (n > requestLimit) {
          say('warn', `${n} restarts were requested within ${Math.round(HISTORY_MS / 60000)} minutes (the limit is ${requestLimit}); waiting ${Math.round(requestDelayMs / 1000)} s before starting it again`);
          await pause(requestDelayMs);
          if (stopping) { say('info', 'stopped while waiting to restart'); return EXIT.OK; }
        }
      }
      restarts++;
    }
  }

  return { run, stop, get child() { return child; }, get stopping() { return stopping; }, get stopReason() { return stopReason; } };
}

/** The real thing: node serve.mjs as a child with an IPC channel, sharing this console. */
export function spawnServer(args, env, { script = process.env.DASHBOARD_SUPERVISOR_SERVE || join(REPO_ROOT, 'serve.mjs') } = {}) {
  return spawn(process.execPath, [...process.execArgv, script, ...args], {
    cwd: REPO_ROOT, env, shell: false, windowsHide: true,
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
  });
}

async function main(argv) {
  const dataDir = resolveDataDir({ argv });
  const log = createLogger(dataPaths(dataDir).serverLog, { echo: true, echoInfo: true });
  const sup = createSupervisor({
    args: argv, spawnChild: (a, e) => spawnServer(a, e), log,
    rebuild: (a) => rebuildApp({ args: a, log: (level, m) => log(level, 'supervisor: ' + m), run: (s, x) => runNodeStep(s, x) }),
  });
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGBREAK', 'SIGHUP']) {
    try { process.on(sig, () => sup.stop(describeSignal(sig))); } catch { /* not on this OS */ }
  }
  // A program that started the supervisor with an IPC channel can ask it to stop too.
  if (typeof process.send === 'function') {
    process.on('message', (m) => { if (m && m.cmd === 'stop') sup.stop('asked to stop'); });
    process.on('disconnect', () => sup.stop('the program that started the supervisor went away'));
  }
  let code = EXIT.CRASH;
  try { code = await sup.run(); }
  catch (e) { await log('error', `supervisor: failed: ${e && e.stack || e}`); }
  await log.flush();
  process.exit(code);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
