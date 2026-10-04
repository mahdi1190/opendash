// server/routes/server-control.mjs - Settings > Server: status, restart, stop,
// the log, the opt-in Windows start-up helpers, and the offline page's service worker.
//
//   GET  /api/server/status        -> {pid, port, version, build, startedAt, uptime, supervised, restartCount,
//                                      lastStopReason, lastRebuild?, dataDir, logFile, platform, node, pending}
//   POST /api/server/restart       {rebuild?: boolean} -> 202 {ok, restarting, mode: supervisor|respawn, rebuild, pid}
//                                  then the server shuts down cleanly (listener closed, SSE ended,
//                                  runtime.json removed) and comes back with a new pid
//                                  (server/lifecycle.mjs has the exit-code contract)
//   POST /api/server/stop          {} -> 202 {ok, stopping, pid}; a clean stop (the supervisor stops too)
//   GET  /api/server/log?lines=200 -> {file, lines:[...]}   (the last lines of <data>/logs/server.log)
//   GET  /api/server/integration   -> what Windows has registered right now (queried, never assumed)
//   POST /api/server/integration   {feature: 'autostart'|'protocol', enabled: boolean} -> the same, re-queried
//   GET  /sw.js                    the offline page's service worker (src/sw.js, versioned by the build)
//
// Restart, stop, the log and the integration switches (GET too: it runs
// reg.exe) need the page itself (same origin: Origin / Sec-Fetch-Site) or a
// local program with X-Dashboard-Token (<data>/local-token), on top of the
// router's Host (421) and cross-site (403) checks; anything else is 401.
// Restarts are rate limited (6 in 10 minutes, one at a time: 429 / 409; the
// slot is claimed before the 202, so a burst gets one 202). Status is
// same-origin only, like /api/health.

import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { HttpError, MIME } from '../http.mjs';
import { ensureLocalToken, tokenMatches, TOKEN_HEADER } from '../actions/auth.mjs';
import { runtimeInfo, checkRestartAllowed, claimLifecycle, requestLifecycle, lifecycleAvailable, lifecyclePending, readLogLines } from '../lifecycle.mjs';
import { createOsIntegration, OsIntegrationError, SCHEME } from '../../lib/os-integration.mjs';
import { writeJson, readJson } from '../../lib/fsutil.mjs';

const SW_FILE = 'src/sw.js';

export default function register(app) {
  const ctx = app.ctx;
  const { dataDir, log } = ctx;
  const paths = ctx.paths;
  let token = null;
  const getToken = async () => (token = token || await ensureLocalToken(dataDir));
  const launchFile = join(dataDir, 'launch.json');

  /** The page itself or a local program with the token; 401 otherwise. */
  async function requireLocalCaller(c) {
    const presented = c.req.headers[TOKEN_HEADER];
    if (presented !== undefined) {
      if (tokenMatches(String(presented).trim(), await getToken())) return 'token';
      throw new HttpError(401, 'wrong X-Dashboard-Token (read it from <data>/local-token)');
    }
    const origin = c.req.headers.origin;
    const ours = origin === `http://localhost:${c.port}` || origin === `http://127.0.0.1:${c.port}`;
    if (ours || c.req.headers['sec-fetch-site'] === 'same-origin') return 'browser';
    throw new HttpError(401, 'this needs the dashboard page itself, or a local program sending X-Dashboard-Token (the contents of <data>/local-token)');
  }

  // For routes/updates.mjs (looked up per request, so file load order does not matter).
  ctx.requireLocalCaller = requireLocalCaller;
  ctx.acceptLifecycle = accept;

  const integration = () => createOsIntegration({
    repoRoot: ctx.repoRoot, port: ctx.port, dataDir, defaultDataDir: join(ctx.repoRoot, 'data'),
  });

  // What /api/health tells the page about the Start server button, for when the
  // server is down (the page keeps it). Written when the switch changes.
  let hint = null;
  try { const j = JSON.parse(readFileSync(launchFile, 'utf8')); hint = j && j.protocol === true ? SCHEME : null; } catch { hint = null; }
  ctx.launchHint = () => hint;
  async function rememberLaunch(st) {
    hint = st && st.protocol && st.protocol.enabled && st.protocol.current ? SCHEME : null;
    const prev = await readJson(launchFile, { fallback: {} }).catch(() => ({}));
    await writeJson(launchFile, { ...prev, protocol: !!hint, autostart: !!(st && st.autostart && st.autostart.enabled), checkedAt: new Date().toISOString() }).catch(() => {});
  }

  function status() {
    return {
      ...runtimeInfo(),
      port: ctx.port, version: ctx.version, build: typeof ctx.buildId === 'function' ? ctx.buildId() : null,
      dataDir: paths.root, logFile: paths.serverLog, platform: process.platform, node: process.version,
      canRestart: lifecycleAvailable(), pending: lifecyclePending(),
    };
  }

  app.route({ path: '/api/server/status', method: 'GET', sameOrigin: true, quiet: true, handler: () => status() });

  function accept(c, action, rebuild, extra) {
    if (!lifecycleAvailable()) throw new HttpError(501, 'restart is only available when OpenDash was started with start-opendash or node serve.mjs');
    const ok = action === 'restart' ? checkRestartAllowed() : (lifecyclePending() ? { ok: false, status: 409, message: 'already stopping or restarting' } : { ok: true });
    if (!ok.ok) {
      if (ok.retryAfter) c.res.setHeader('Retry-After', String(ok.retryAfter));
      throw new HttpError(ok.status, ok.message);
    }
    // Claimed in this same tick (no await since the checks above): concurrent
    // requests cannot all pass the checks and all get a 202.
    if (!claimLifecycle({ action, rebuild })) throw new HttpError(409, 'already stopping or restarting');
    const mode = action === 'stop' ? 'stop' : (ctx.lifecycle && ctx.lifecycle.supervised ? 'supervisor' : 'respawn');
    log('note', `${action === 'stop' ? 'stop' : rebuild ? 'rebuild and restart' : 'restart'} requested from the dashboard (${mode})`);
    // Answer first, then go: the 202 must reach the page before the listener closes.
    // ('close' too: a caller that hangs up early must not leave the slot taken.)
    let fired = false;
    const go = () => {
      if (fired) return;
      fired = true;
      setTimeout(() => {
        try { requestLifecycle({ action, rebuild, reason: `${action} requested` }); }
        catch (e) { log('error', `${action} failed: ${e && e.message || e}`); }
      }, 50);
    };
    c.res.once('finish', go);
    c.res.once('close', go);
    return c.json(202, action === 'stop'
      ? { ok: true, stopping: true, pid: process.pid }
      : { ok: true, restarting: true, mode, rebuild: !!rebuild, pid: process.pid, waitSeconds: rebuild ? 90 : 30, ...(extra || {}) });
  }

  app.route({
    path: '/api/server/restart', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      await requireLocalCaller(c);
      const b = await c.body({ allowEmpty: true });
      if (b.rebuild !== undefined && typeof b.rebuild !== 'boolean') throw new HttpError(400, 'rebuild must be true or false');
      return accept(c, 'restart', b.rebuild === true);
    },
  });

  app.route({
    path: '/api/server/stop', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      await requireLocalCaller(c);
      await c.body({ allowEmpty: true });
      return accept(c, 'stop', false);
    },
  });

  app.route({
    path: '/api/server/log', method: 'GET', sameOrigin: true, quiet: true,
    handler: async (c) => {
      await requireLocalCaller(c);   // the page (Sec-Fetch-Site) or the token: not any program on this computer
      const n = Math.min(1000, Math.max(1, parseInt(c.query.get('lines'), 10) || 200));
      await log.flush?.();
      return { file: paths.serverLog, lines: readLogLines(paths.serverLog, n) };
    },
  });

  let busy = false;
  const recent = [];
  app.route({
    path: '/api/server/integration', method: ['GET', 'POST'], sameOrigin: true, methodError: 'GET or POST',
    handler: async (c) => {
      // Both run reg.exe (and GET writes launch.json): the page or the token only.
      await requireLocalCaller(c);
      const os = integration();
      if (c.method === 'GET') {
        const st = await os.status();
        if (st.supported) await rememberLaunch(st);
        return st;
      }
      const b = await c.body();
      if (!['autostart', 'protocol'].includes(b.feature)) throw new HttpError(400, 'feature must be "autostart" or "protocol"');
      if (typeof b.enabled !== 'boolean') throw new HttpError(400, 'enabled must be true or false');
      const now = Date.now();
      while (recent.length && recent[0] < now - 60000) recent.shift();
      if (busy) throw new HttpError(409, 'another change is still running');
      if (recent.length >= 10) throw new HttpError(429, 'too many changes in a minute; wait a moment');
      recent.push(now);
      busy = true;
      try {
        const st = await os.set(b.feature, b.enabled);
        await rememberLaunch(st);
        log('note', `start-up helper ${b.feature} turned ${b.enabled ? 'on' : 'off'}`);
        return st;
      } catch (e) {
        if (e instanceof OsIntegrationError) throw new HttpError(e.status, e.message, { code: e.code });
        throw e;
      } finally { busy = false; }
    },
  });

  // ─── the service worker ──────────────────────────────────────────────
  // Versioned by index.html's build and the worker's own text: a new build is
  // a new worker, which takes over at once and deletes the old cache.
  let swCache = { key: null, body: null };
  function swBody() {
    const file = join(ctx.repoRoot, SW_FILE);
    const st = statSync(file);
    const build = typeof ctx.buildId === 'function' ? ctx.buildId() : '0';
    const key = `${st.size}:${st.mtimeMs}:${build}`;
    if (swCache.key !== key) {
      const src = readFileSync(file, 'utf8');
      const v = createHash('sha256').update(src).update(String(build)).digest('hex').slice(0, 12);
      swCache = { key, body: src.replace("'__SW_VERSION__'", JSON.stringify(v)) };
    }
    return swCache.body;
  }
  app.route({
    path: '/sw.js', method: 'GET', quiet: true,
    handler: async (c) => {
      let body;
      try { body = swBody(); } catch { throw new HttpError(404, 'not found'); }
      c.send(200, body, MIME['.js'], { 'Service-Worker-Allowed': '/' });
    },
  });
}
