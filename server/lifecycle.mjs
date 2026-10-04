// server/lifecycle.mjs - how the server process starts, stops and restarts.
//
// Shared by serve.mjs (the server process), tools/supervisor.mjs (the process
// that keeps it running) and server/routes/server-control.mjs (the API).
//
// EXIT-CODE CONTRACT (server -> supervisor):
//   0   clean stop: Ctrl+C, the window closed, Settings > Server > Stop, or
//       "already running, opened it for you". The supervisor stops too.
//   75  RESTART requested (POST /api/server/restart): restarted at once.
//   76  REBUILD requested ({rebuild:true}): the supervisor runs
//       `node tools/migrate.mjs --auto`, `node build.mjs --syntax` and
//       `node build.mjs` first; if a step fails it restarts the previous build
//       and reports it (DASHBOARD_LAST_REBUILD -> /api/health.lastRebuild).
//   78  set-up problem (the port belongs to another program, the data folder
//       has not been moved yet): not restarted, the window shows why.
//   anything else (1, a signal, an uncaught exception): a CRASH, restarted
//       with backoff 1 s, 2 s, 5 s, 10 s; after 5 crashes within 60 s the
//       supervisor gives up with a clear log line.
//
// ENVIRONMENT handed to the next server (by the supervisor, or by an
// unsupervised server that replaces itself):
//   DASHBOARD_SUPERVISED=1          supervised (only believed with an IPC channel)
//   DASHBOARD_RESTART_COUNT=n       restarts since the first start
//   DASHBOARD_LAST_STOP=<text>      why the previous server stopped
//   DASHBOARD_LAST_REBUILD=<json>   {ok, step, code, at, message} of the last rebuild
//   DASHBOARD_RESTART_HISTORY=t,t   requested restarts (epoch ms) for the rate limit
//   DASHBOARD_RESPAWN_WAIT=ms       retry the port this long (the old one may still hold it)

import { spawn } from 'node:child_process';
import { openSync, closeSync, readFileSync, statSync, readSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from '../lib/datadir.mjs';

export const EXIT = Object.freeze({ OK: 0, CRASH: 1, RESTART: 75, REBUILD: 76, CONFIG: 78 });

/** What an exit means to the supervisor: 'stop' | 'restart' | 'rebuild' | 'config' | 'crash'. */
export function classifyExit(code, signal) {
  if (code === EXIT.OK && !signal) return 'stop';
  if (code === EXIT.RESTART) return 'restart';
  if (code === EXIT.REBUILD) return 'rebuild';
  if (code === EXIT.CONFIG) return 'config';
  return 'crash';
}
export function describeExit(code, signal) {
  if (signal) return `killed by ${signal}`;
  if (code === EXIT.RESTART) return 'exit 75: restart requested';
  if (code === EXIT.REBUILD) return 'exit 76: rebuild requested';
  if (code === EXIT.CONFIG) return 'exit 78: a set-up problem';
  // Windows reports NTSTATUS / TerminateProcess codes as large unsigned numbers.
  if (Number.isInteger(code) && (code > 0x7fffffff || code < 0)) {
    const signed = code > 0x7fffffff ? code - 0x100000000 : code;
    if (signed === -1) return 'exit code -1: ended from outside (e.g. Task Manager)';
    return `exit code ${signed} (0x${(signed >>> 0).toString(16).toUpperCase()})`;
  }
  return `exit code ${code}`;
}

/** How a signal reads in the log ("received SIGHUP" alone is not much help). */
export function describeSignal(sig, platform = process.platform) {
  const win = platform === 'win32';
  return {
    SIGINT: 'received SIGINT (Ctrl+C)',
    SIGBREAK: 'received SIGBREAK (Ctrl+Break, or the window was closed)',
    SIGHUP: win ? 'received SIGHUP (the window was closed)' : 'received SIGHUP (the terminal was closed)',
    SIGTERM: 'received SIGTERM (asked to stop by another program)',
  }[sig] || `received ${sig}`;
}

/** The server's argv for a restart: the same, but never open another browser tab. */
export function withNoOpen(args) {
  const a = [...(args || [])];
  return a.includes('--no-open') ? a : [...a, '--no-open'];
}

// ─── This process ────────────────────────────────────────────────────────
const HISTORY_MS = 10 * 60 * 1000;
const life = {
  startedAt: new Date().toISOString(), startedMs: Date.now(), supervised: false, restartCount: 0,
  lastStopReason: null, lastRebuild: null, history: [], handler: null, pending: null,
};

/** Read what the previous process (or the supervisor) handed over. Called once by main(). */
export function initLifecycle({ env = process.env, hasIpc = typeof process.send === 'function', now = Date.now() } = {}) {
  life.startedAt = new Date(now).toISOString();
  life.startedMs = now;
  life.supervised = env.DASHBOARD_SUPERVISED === '1' && !!hasIpc;
  life.restartCount = Math.max(0, parseInt(env.DASHBOARD_RESTART_COUNT, 10) || 0);
  life.lastStopReason = env.DASHBOARD_LAST_STOP ? { reason: String(env.DASHBOARD_LAST_STOP).slice(0, 300), at: null, source: 'restart' } : null;
  life.lastRebuild = null;
  if (env.DASHBOARD_LAST_REBUILD) { try { const r = JSON.parse(env.DASHBOARD_LAST_REBUILD); if (r && typeof r === 'object') life.lastRebuild = r; } catch { /* ignore */ } }
  life.history = String(env.DASHBOARD_RESTART_HISTORY || '').split(',').map(Number).filter(t => Number.isFinite(t) && t > now - HISTORY_MS && t <= now + 1000);
  life.pending = null;
  // Never hand these to programs the server starts (MCP, claude, the picker...).
  for (const k of ['DASHBOARD_SUPERVISED', 'DASHBOARD_RESTART_COUNT', 'DASHBOARD_LAST_STOP', 'DASHBOARD_LAST_REBUILD', 'DASHBOARD_RESTART_HISTORY']) delete env[k];
  return life;
}
export function lifecycle() { return life; }

/** For /api/health and /api/server/status. */
export function runtimeInfo(now = Date.now()) {
  return {
    pid: process.pid,
    startedAt: life.startedAt,
    uptime: Math.max(0, Math.round((now - life.startedMs) / 1000)),
    supervised: life.supervised,
    restartCount: life.restartCount,
    lastStopReason: life.lastStopReason,
    ...(life.lastRebuild ? { lastRebuild: life.lastRebuild } : {}),
  };
}
export function setLastStopReason(v) { life.lastStopReason = v; }

/** serve.mjs installs the real handler ({action:'restart'|'stop', rebuild, reason}); tests install a recorder. */
export function setLifecycleHandler(fn) { life.handler = typeof fn === 'function' ? fn : null; }
export function lifecycleAvailable() { return !!life.handler; }
export function lifecyclePending() { return life.pending; }

/**
 * Rate limit for requested restarts: at most `max` in `windowMs`, carried
 * across restarts (DASHBOARD_RESTART_HISTORY), one at a time.
 * -> {ok:true} | {ok:false, status, message, retryAfter}
 */
export function checkRestartAllowed({ now = Date.now(), max = 6, windowMs = HISTORY_MS } = {}) {
  if (life.pending) return { ok: false, status: 409, message: `already ${life.pending.action === 'stop' ? 'stopping' : 'restarting'}` };
  const recent = life.history.filter(t => t > now - windowMs);
  if (recent.length >= max) {
    const retryAfter = Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000));
    return { ok: false, status: 429, message: `the server was restarted ${recent.length} times in the last ${Math.round(windowMs / 60000)} minutes; wait a little and try again`, retryAfter };
  }
  return { ok: true };
}

/**
 * Take the one restart/stop slot at once, in the same tick as the checks and
 * before the 202 goes out: a burst of requests gets one 202 and 409s (the
 * handler itself only runs after the answer has been sent). false = taken.
 */
export function claimLifecycle({ action, rebuild = false, now = Date.now() }) {
  if (life.pending) return false;
  life.pending = { action, rebuild: !!rebuild, at: now };
  if (action === 'restart') life.history = [...life.history.filter(t => t > now - HISTORY_MS), now];
  return true;
}

/** Hand the request to serve.mjs (after the 202 has gone out). Returns the mode. */
export function requestLifecycle({ action, rebuild = false, reason, now = Date.now() }) {
  if (!life.handler) throw Object.assign(new Error('restarting needs the server to be started with serve.mjs'), { status: 501 });
  if (!life.pending) claimLifecycle({ action, rebuild, now });   // callers that did not claim first
  const mode = action === 'stop' ? 'stop' : life.supervised ? 'supervisor' : 'respawn';
  try { life.handler({ action, rebuild: !!rebuild, reason, mode }); }
  catch (e) { life.pending = null; throw e; }
  return mode;
}

/** The environment for the next server process (unsupervised restart). */
export function nextEnv(base, { lastStop, lastRebuild, waitMs = 15000, now = Date.now() } = {}) {
  const env = { ...base };
  delete env.DASHBOARD_SUPERVISED;
  env.DASHBOARD_RESTART_COUNT = String(life.restartCount + 1);
  if (lastStop) env.DASHBOARD_LAST_STOP = String(lastStop).slice(0, 300); else delete env.DASHBOARD_LAST_STOP;
  if (lastRebuild) env.DASHBOARD_LAST_REBUILD = JSON.stringify(lastRebuild); else delete env.DASHBOARD_LAST_REBUILD;
  env.DASHBOARD_RESTART_HISTORY = life.history.filter(t => t > now - HISTORY_MS).join(',');
  env.DASHBOARD_RESPAWN_WAIT = String(waitMs);
  return env;
}

/**
 * Start a detached replacement server (no window; its console output goes to
 * the server log). Returns its pid.
 */
export function respawnDetached({ args, env, logFile, script = join(REPO_ROOT, 'serve.mjs'), cwd = REPO_ROOT,
  execPath = process.execPath, execArgv = process.execArgv, spawnFn = spawn, open = openSync, close = closeSync } = {}) {
  let fd = null;
  try { fd = open(logFile, 'a'); } catch { fd = null; }
  try {
    const child = spawnFn(execPath, [...execArgv, script, ...withNoOpen(args)], {
      cwd, env, detached: true, windowsHide: true, shell: false,
      stdio: ['ignore', fd ?? 'ignore', fd ?? 'ignore'],
    });
    child?.on?.('error', () => { /* reported by the page: the server does not come back */ });
    child?.unref?.();
    return child && child.pid;
  } finally {
    if (fd != null) { try { close(fd); } catch { /* ignore */ } }
  }
}

// ─── Rebuild steps (the supervisor, or an unsupervised restart) ──────────
/** Run `node <script> ...args` in the app folder; resolves {code, tail}. Output is echoed and its last lines kept. */
export function runNodeStep(script, args = [], { cwd = REPO_ROOT, execPath = process.execPath, spawnFn = spawn, echo = (s) => process.stdout.write(s), timeoutMs = 5 * 60 * 1000, env = process.env } = {}) {
  return new Promise((resolve) => {
    let child;
    const lines = [];
    const keep = (buf) => {
      const s = String(buf);
      try { echo(s); } catch { /* console gone */ }
      for (const l of s.split(/\r?\n/)) if (l.trim()) { lines.push(l.trim()); if (lines.length > 20) lines.shift(); }
    };
    try {
      child = spawnFn(execPath, [join(cwd, script), ...args], { cwd, env, windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) { resolve({ code: -1, tail: [String(e && e.message || e)] }); return; }
    const timer = setTimeout(() => { try { child.kill(); } catch { /* gone */ } }, timeoutMs);
    child.stdout?.on('data', keep);
    child.stderr?.on('data', keep);
    child.on('error', (e) => { clearTimeout(timer); resolve({ code: -1, tail: [...lines, String(e && e.message || e)] }); });
    child.on('close', (code, signal) => { clearTimeout(timer); resolve({ code: code == null ? -1 : code, signal, tail: lines }); });
  });
}

/**
 * Migrations, syntax check, build - stops at the first failure.
 * -> {ok, step, code, at, message}. A failed step leaves index.html as it was
 * (the syntax check runs before the build writes anything).
 */
export async function rebuildApp({ args = [], run = runNodeStep, log = () => {}, now = () => Date.now() } = {}) {
  const steps = [
    ['migrate', 'tools/migrate.mjs', ['--auto', ...args]],
    ['check', 'build.mjs', ['--syntax']],
    ['build', 'build.mjs', []],
  ];
  for (const [step, script, a] of steps) {
    log('info', `rebuild: ${step === 'migrate' ? 'running migrations' : step === 'check' ? 'checking the app code' : 'building index.html'} (node ${script}${a.length ? ' ' + a.filter(x => x === '--auto' || x === '--syntax').join(' ') : ''})`);
    const r = await run(script, a);
    if (r.code !== 0) {
      const message = (r.tail || []).slice(-3).join(' | ').slice(0, 400) || `exit code ${r.code}`;
      log('error', `rebuild: the ${step} step failed (exit ${r.code}): ${message}`);
      return { ok: false, step, code: r.code, at: new Date(now()).toISOString(), message };
    }
  }
  return { ok: true, at: new Date(now()).toISOString() };
}

// ─── Why did the last server stop? (from the log) ─────────────────────────
/** The last ~64 KB of a file as text ('' when missing). */
export function readTail(file, bytes = 64 * 1024) {
  let fd;
  try {
    const size = statSync(file).size;
    const len = Math.min(size, bytes);
    const buf = Buffer.alloc(len);
    fd = openSync(file, 'r');
    readSync(fd, buf, 0, len, size - len);
    return buf.toString('utf8');
  } catch { return ''; }
  finally { if (fd != null) { try { closeSync(fd); } catch { /* ignore */ } } }
}
export function readLogLines(file, n = 200) {
  let text = readTail(file, Math.max(64 * 1024, n * 400));
  if (!text) { try { text = readFileSync(file, 'utf8'); } catch { text = ''; } }
  const lines = text.split(/\r?\n/).filter(l => l.length);
  if (text.length >= 64 * 1024 && lines.length) lines.shift();   // the first line may be cut
  return lines.slice(-n);
}

const LINE = /^(\d{4}-\d\d-\d\dT[\d:.]+Z)\s+([A-Z]+)\s+(.*)$/;
/**
 * The reason the PREVIOUS server stopped, from the log text before this one
 * started: {reason, at, source:'log'} or null (no earlier run in the log).
 */
export function lastStopFromLog(text) {
  const lines = String(text || '').split(/\r?\n/);
  let start = -1;
  for (let i = lines.length - 1; i >= 0; i--) if (/\bserver started on\b/.test(lines[i])) { start = i; break; }
  if (start < 0) return null;
  let stop = null, exit = null, crash = null, sup = null;
  for (let i = start + 1; i < lines.length; i++) {
    const m = LINE.exec(lines[i]);
    if (!m) continue;
    const [, at, , msg] = m;
    if (!stop && /^stopping: /.test(msg)) stop = { reason: msg.slice('stopping: '.length), at };
    else if (/^crash \(/.test(msg)) crash = { reason: msg, at };
    else if (/^server process exiting \(code -?\d+\)/.test(msg)) exit = { code: Number(/-?\d+/.exec(msg)[0]), at };
    else if (/^supervisor: /.test(msg)) sup = { reason: msg.slice('supervisor: '.length), at };
  }
  if (stop) return { ...stop, source: 'log' };
  if (crash) return { reason: crash.reason.slice(0, 300), at: crash.at, source: 'log' };
  if (exit) return { reason: exit.code === 0 ? 'stopped (exit code 0)' : `crashed (exit code ${exit.code})`, at: exit.at, source: 'log' };
  if (sup) return { reason: sup.reason, at: sup.at, source: 'log' };
  return { reason: 'unknown: the previous server ended without logging a stop (ended from outside, e.g. Task Manager, or the computer shut down)', at: null, source: 'log' };
}
