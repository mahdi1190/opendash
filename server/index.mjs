// server/index.mjs - boots the dashboard server. `node serve.mjs` calls main().
//
//   node serve.mjs [--port 4173] [--no-open] [--data-dir <dir>]
//                  [--finance-dir <dir>] [--state-dir <dir>] [--fresh]
//
//   --data-dir      the user's data folder (default: DASHBOARD_DATA_DIR, then <repo>/data)
//   --finance-dir   override the finance folder (default: config.financeDir, then <data>/finance)
//   --state-dir     override only the state folder (old test setups)
//   --fresh         start even though the data dir is empty and a legacy state/ exists
//
// Serves index.html (with the public config injected) and the /api routes from
// server/routes/*.mjs. Binds 127.0.0.1 only. Node stdlib only.
//
// Restarts (server/lifecycle.mjs): a replacement started by a restart gets
// DASHBOARD_RESPAWN_WAIT and keeps retrying the port that long instead of
// deciding "already running" (the old server may not have let go yet). A port
// held by another program, or data that still has to be moved, exits with 78
// (a set-up problem the supervisor does not retry).

import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import {
  REPO_ROOT, argValue, resolveDataDir, dataPaths, ensureDataDir, loadConfig, saveConfig, publicConfig, legacyStatus,
} from '../lib/datadir.mjs';
import { setRunnerLogger, setCliPath } from '../lib/claude-runner.mjs';
import { aiStatus, setDefaultModel } from '../lib/ai.mjs';
import { initGoogle } from '../lib/google.mjs';
import { initFinance, financeAvailable, cleanupPartials } from '../lib/finance.mjs';
import { createApp } from './router.mjs';
import { createLogger } from './log.mjs';
import { createStateStore } from './state-store.mjs';
import { send, injectConfig, hostAllowed, MIME } from './http.mjs';
import { EXIT, initLifecycle, lastStopFromLog, readTail } from './lifecycle.mjs';

export async function main(argv = process.argv.slice(2)) {
  const has = (f) => argv.includes(f);
  const life = initLifecycle();
  const respawnWaitMs = Math.min(60000, Math.max(0, Number(process.env.DASHBOARD_RESPAWN_WAIT) || 0));
  delete process.env.DASHBOARD_RESPAWN_WAIT;
  const port = Number(argValue(argv, '--port')) || 4173;
  const open = !has('--no-open');
  const dataDir = resolveDataDir({ argv });

  // No silent migration: a data dir without state next to a legacy state/
  // folder means the user has not moved their data yet.
  const legacy = (has('--fresh') || argValue(argv, '--state-dir')) ? null : legacyStatus({ dataDir });
  if (legacy) {
    console.error(`
  Your OpenDash data is still in the old place:
     ${legacy.legacyStateDir}
  and the data folder has no state yet:
     ${legacy.dataDir}

  Copy it into the data folder once (nothing is moved or deleted) with:

     ${legacy.command}

  Add  --finance-from "<folder>"  to copy a finance folder that lives elsewhere.
  Add  --dry-run  to see what it would do first.
  (Or start empty on purpose with --fresh.)
`);
    process.exitCode = EXIT.CONFIG;
    return null;
  }

  const paths = await ensureDataDir(dataDir);
  // Optional environment overrides (e.g. CLAUDE_CLI_PATH, PYTHON): <data>/.env,
  // then <repo>/.env. Variables already set in the environment win.
  for (const f of [join(paths.root, '.env'), join(REPO_ROOT, '.env')]) {
    if (existsSync(f)) { try { process.loadEnvFile(f); } catch (e) { console.error(`  could not read ${f}: ${e.message}`); } }
  }
  setCliPath(null);   // re-resolve the claude executable with the loaded environment
  const stateDir = argValue(argv, '--state-dir') ? resolve(argValue(argv, '--state-dir')) : paths.stateDir;
  const log = createLogger(paths.serverLog);
  // Why the previous server stopped: handed over by a restart, else read from the log.
  if (!life.lastStopReason) life.lastStopReason = lastStopFromLog(readTail(paths.serverLog));
  let config = await loadConfig(dataDir);
  setDefaultModel(config.ai.model);
  setRunnerLogger(({ profile, model, ms, ok, code }) => log(ok ? 'info' : 'warn', `claude ${profile} ${model} ${ms}ms ${ok ? 'ok' : code}`));

  // Start-up work that runs in the background (cleanup, the AI probe, MCP
  // discovery). close() waits for it, so nothing writes to the data folder
  // after close() has returned; settled() lets a caller wait for it too.
  const background = new Set();
  const track = (p) => {
    const q = Promise.resolve(p).catch(() => {}).finally(() => background.delete(q));
    background.add(q);
    return q;
  };
  const settled = async () => { while (background.size) await Promise.all([...background]); };

  const financeDir = resolve(argValue(argv, '--finance-dir') || process.env.DASHBOARD_FINANCE_DIR || config.financeDir || paths.finance);
  initFinance(financeDir, { currency: config.currency });
  track(cleanupPartials());
  initGoogle(paths.secrets);
  const store = createStateStore({ stateDir, log });
  // A short hash of index.html as it is on disk now (cached by size + mtime).
  let buildCache = { key: null, id: null };
  function buildId() {
    const file = join(REPO_ROOT, 'index.html');
    try {
      const st = statSync(file);
      const key = `${st.size}:${st.mtimeMs}`;
      if (buildCache.key !== key) buildCache = { key, id: createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 12) };
      return buildCache.id;
    } catch { return null; }
  }
  let version = '0';
  try { version = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')).version || '0'; } catch { /* no package.json */ }

  const ctx = {
    port, dataDir, paths: { ...paths, stateDir }, repoRoot: REPO_ROOT, financeDir, log, store, version, lifecycle: life, buildId, track,
    getConfig: () => config,
    setConfig: async (patch) => { config = await saveConfig(dataDir, patch); setDefaultModel(config.ai.model); return config; },
  };
  const app = createApp(ctx);
  await registerRoutes(app);

  // Requests that arrive while start-up finishes (the onReady hooks: local
  // token, live sync, runtime.json) wait for it, so a client that finds the
  // port open never meets a half-started server.
  let started;
  const startup = new Promise((r) => { started = r; });
  const server = createServer(async (req, res) => {
    await startup;
    try {
      if (await app.handle(req, res)) return;
      if (!hostAllowed(req, port)) return send(res, 421, 'misdirected request');
      const url = new URL(req.url, `http://localhost:${port}`);
      // Only the app itself is served. Nothing else in the repo (and nothing in
      // the data folder) is reachable over HTTP.
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'method not allowed');
      if (url.pathname === '/' || url.pathname === '/index.html') {
        const file = join(REPO_ROOT, 'index.html');
        if (!existsSync(file)) return send(res, 500, 'index.html is missing: run node build.mjs');
        // build: which index.html this page is (Settings > Server reloads the page after a rebuild).
        const html = injectConfig(await readFile(file, 'utf8'), { ...publicConfig(config), build: buildId() });
        // X-Dashboard-App: the offline-page worker (src/sw.js) keeps only a page with this mark.
        return send(res, 200, req.method === 'HEAD' ? '' : html, MIME['.html'], { 'X-Dashboard-App': 'dashboard' });
      }
      if (url.pathname === '/favicon.ico') return send(res, 204, '');
      return send(res, 404, 'not found');
    } catch (err) {
      log('error', `unhandled: ${err && err.stack || err}`);
      if (!res.headersSent) send(res, 500, 'internal error');
    }
  });

  const waitUntil = Date.now() + respawnWaitMs;
  let retried = 0;
  server.on('error', async (e) => {
    if (e.code !== 'EADDRINUSE') { log('error', String(e)); process.exit(EXIT.CRASH); }
    // A replacement after a restart: the old server is still letting go of the port.
    if (Date.now() < waitUntil) {
      if (!retried++) log('info', `port ${port} is still in use; waiting up to ${Math.round(respawnWaitMs / 1000)} s for it`);
      setTimeout(() => server.listen(port, '127.0.0.1'), 400);
      return;
    }
    const url = `http://localhost:${port}/`;
    let mine = false;
    try {
      const r = await fetch(`${url}api/health`, { signal: AbortSignal.timeout(3000) });
      const h = await r.json();
      mine = !!(h && h.ok && (h.app === 'dashboard' || h.stateFile));
    } catch { /* not us, or not answering */ }
    if (mine) {
      console.log(`\n  OpenDash is already running.\n  ${open ? 'Opening' : 'It is at'} ${url}\n`);
      if (open) openBrowser(url);
      process.exit(0);
    }
    console.error(`\n  Port ${port} is in use by something that is not OpenDash.`);
    // .\ works in both cmd.exe and PowerShell (PowerShell will not run a bare
    // start-opendash.bat from the current folder); sh works without the +x flag.
    console.error(`  Start on a different port (in a terminal in the app folder):\n     ${process.platform === 'win32' ? '.\\start-opendash.bat' : 'sh start-opendash.sh'} --port ${port + 1}\n`);
    process.exit(EXIT.CONFIG);
  });

  // Loopback only: never reachable from the network.
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  const url = `http://localhost:${port}/`;
  console.log(`\n  OpenDash       ->  ${url}`);
  console.log(`  data folder    ->  ${paths.root}`);
  console.log(`  state file     ->  ${store.file}`);
  console.log(`  finances       ->  ${financeDir}${financeAvailable() ? '' : '  (not configured)'}`);
  console.log(`  log            ->  ${paths.serverLog}`);
  console.log(`\n  Ctrl+C to stop.\n`);
  log('info', `server started on ${url} (data ${paths.root}; pid ${process.pid}; ${life.supervised ? 'supervised' : 'not supervised'}${life.restartCount ? `; restart ${life.restartCount}` : ''})`);
  try { await app.runReady(); } // route files' onReady hooks (runtime.json, live sync)
  finally { started(); }
  if (open) openBrowser(url);
  track(aiStatus());            // warm the AI probe so /api/health answers fast
  const close = async () => {
    const closed = new Promise(r => server.close(r));
    await app.runClose();       // ends long-lived responses (SSE) so close() can finish
    server.closeIdleConnections?.();
    await closed;
    await settled();
    await log.flush();          // the last request lines
  };
  return { server, app, ctx, close, settled };
}

/** Load every server/routes/*.mjs (sorted) and let it register its routes. */
export async function registerRoutes(app, dir = join(REPO_ROOT, 'server', 'routes')) {
  const files = (await readdir(dir)).filter(f => f.endsWith('.mjs')).sort();
  for (const f of files) {
    const mod = await import(pathToFileURL(join(dir, f)).href);
    if (typeof mod.default !== 'function') throw new Error(`server/routes/${f} must export default function register(app)`);
    await mod.default(app);
  }
  return files;
}

function openBrowser(url) {
  const cmd = process.platform === 'win32' ? 'explorer' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  try { spawn(cmd, [url], { detached: true, stdio: 'ignore' }).unref(); }
  catch { /* headless or no browser; the URL is printed anyway */ }
}
