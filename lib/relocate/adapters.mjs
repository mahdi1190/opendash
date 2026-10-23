// lib/relocate/adapters.mjs - the operating-system pieces of a move, behind
// small adapters (lib/relocate/refs.mjs and index.mjs take them as
// arguments, so tests and other platforms - a future desktop or phone app -
// bring their own):
//
//   registryAdapter({exec})      Windows registry through reg.exe (full path, argument
//                                array, no shell). exec defaults to lib/os-integration.mjs's
//                                executor rules: DASHBOARD_OS_EXEC=dry-run keeps an
//                                in-memory registry.
//   cliAdapter({env})            finds and runs claude / codex / gemini (no shell, 30 s)
//   shortcutsAdapter()           reads and writes Windows .lnk shortcuts (one hidden
//                                PowerShell for all of them, WScript.Shell)
//   freeBytes(path)              free space on the drive that holds path (fs.statfs)
//   syncLocalDir(dataDir)        this computer's sync identity folder for a data folder
//   waitForExit(pids)            wait for the old server and supervisor to end (the hand-over)
//   launchApp({appDir, ...})     start OpenDash again from a folder (window or hidden, detached)
//   realAdapters({env, ...})     all of the above for this computer
//
// UNDER THE TEST RUNNER realAdapters() never reaches the real computer: the
// registry is an in-memory one, no CLI is found, no shortcut is read, unless a
// test passes its own. (Belt and braces: tests inject fakes anyway.)

import { execFile, spawn } from 'node:child_process';
import { installSpawnGuard } from '../spawn-guard.mjs';
installSpawnGuard();   // in a test process, never start a real AI agent CLI (lib/spawn-guard.mjs)
import { existsSync, statfsSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { hostname } from 'node:os';
import { regExe, parseRegQuery, realExec, createDryRunExec } from '../os-integration.mjs';
import { resolveCli } from '../claude-runner.mjs';
import { codexExecutable, geminiExecutable } from '../assistant-connections.mjs';
import { defaultLocalDir } from '../sync/node-host.mjs';

export const underTestRunner = () => !!(process.env.NODE_TEST_CONTEXT || process.execArgv.some(a => a === '--test' || a.startsWith('--test-')));

let sharedDryRun = null;
function defaultExec(env) {
  if (underTestRunner() || String(env.DASHBOARD_OS_EXEC || '').toLowerCase() === 'dry-run') { sharedDryRun = sharedDryRun || createDryRunExec(); return sharedDryRun.exec; }
  return realExec;
}

/** query(key, name) -> {type, data} | null; set(key, name, type, data). name '' is the key's default value. */
export function registryAdapter({ exec, env = process.env } = {}) {
  const run = exec || defaultExec(env);
  const reg = regExe(env);
  return {
    async query(key, name) {
      const r = await run(reg, ['query', key, ...(name === '' ? ['/ve'] : ['/v', name])]);
      if (r.code !== 0) return null;
      const vals = parseRegQuery(r.stdout);
      const v = vals.find(x => x.name.toLowerCase() === String(name).toLowerCase()) || (name === '' ? vals[0] : null);
      return v ? { type: v.type, data: v.data } : null;
    },
    async set(key, name, type, data) {
      const r = await run(reg, ['add', key, ...(name === '' ? ['/ve'] : ['/v', name]), '/t', type || 'REG_SZ', '/d', data, '/f']);
      if (r.code !== 0) throw new Error(`Windows refused the change (reg.exe: ${String(r.stderr || r.stdout).trim().slice(0, 160)})`);
    },
  };
}

function execTool(file, args, { cwd, env, timeoutMs = 30000 } = {}) {
  const script = /\.(mjs|cjs|js)$/i.test(extname(file));
  return new Promise((res) => {
    execFile(script ? process.execPath : file, [...(script ? [file] : []), ...args], { cwd, env, shell: false, windowsHide: true, timeout: timeoutMs, maxBuffer: 1 << 20, encoding: 'utf8' },
      (err, stdout, stderr) => res({ code: err ? (typeof err.code === 'number' ? err.code : 1) : 0, stdout: String(stdout || ''), stderr: String(stderr || (err && !stdout ? err.message : '') || '') }));
  });
}

/** which(tool) -> path | null; run(tool, args, {cwd}) -> {code, stdout, stderr}. tools: claude, codex, gemini. */
export function cliAdapter({ env = process.env, platform = process.platform, home } = {}) {
  const h = home || env.USERPROFILE || env.HOME;
  const find = (tool) => {
    if (tool === 'claude') { const c = resolveCli(env, platform); return c && /[\\/]/.test(c) && existsSync(c) ? c : null; }
    if (tool === 'codex') return codexExecutable({ env, platform, home: h });
    if (tool === 'gemini') return geminiExecutable({ env, platform, home: h });
    return null;
  };
  return {
    async which(tool) { return find(tool); },
    async run(tool, args, { cwd } = {}) {
      const exe = find(tool);
      if (!exe) return { code: 127, stdout: '', stderr: `${tool} is not installed on this computer` };
      return execTool(exe, args, { cwd: cwd || h, env });
    },
  };
}

// One PowerShell for all the shortcuts; the file list travels in an environment
// variable (JSON), never on the command line.
const PS_READ = [
  "$ErrorActionPreference = 'SilentlyContinue'",
  '[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false',
  '$sh = New-Object -ComObject WScript.Shell',
  '$out = @()',
  'foreach ($f in (ConvertFrom-Json $env:OD_LNK_FILES)) { $s = $sh.CreateShortcut($f); $out += [pscustomobject]@{ file = $f; target = $s.TargetPath; args = $s.Arguments; workdir = $s.WorkingDirectory; icon = $s.IconLocation } }',
  'ConvertTo-Json -InputObject @($out) -Compress',
].join('\n');
const PS_WRITE = [
  "$ErrorActionPreference = 'Stop'",
  '$j = ConvertFrom-Json $env:OD_LNK_SET',
  '$s = (New-Object -ComObject WScript.Shell).CreateShortcut($j.file)',
  '$s.TargetPath = $j.target; $s.Arguments = $j.args; $s.WorkingDirectory = $j.workdir; if ($j.icon) { $s.IconLocation = $j.icon }',
  '$s.Save()',
  "Write-Output 'OK'",
].join('\n');

/** read(files) -> [{file, target, args, workdir, icon}]; write(file, {target, args, workdir, icon}). Windows only. */
export function shortcutsAdapter({ env = process.env, run } = {}) {
  const ps = resolve(String(env.SystemRoot || env.SYSTEMROOT || 'C:\\Windows'), 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const go = run || ((script, extra) => execTool(ps, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script], { env: { ...env, ...extra }, timeoutMs: 30000 }));
  return {
    async read(files) {
      if (!files.length) return [];
      const r = await go(PS_READ, { OD_LNK_FILES: JSON.stringify(files) });
      if (r.code !== 0) return [];
      try { const j = JSON.parse(r.stdout.trim() || '[]'); return Array.isArray(j) ? j : [j]; } catch { return []; }
    },
    async write(file, f) {
      const r = await go(PS_WRITE, { OD_LNK_SET: JSON.stringify({ file, target: f.target || '', args: f.args || '', workdir: f.workdir || '', icon: f.icon || '' }) });
      if (r.code !== 0 || !/OK/.test(r.stdout)) throw new Error(`the shortcut could not be saved (${String(r.stderr).trim().slice(0, 160)})`);
    },
  };
}

/** Free bytes on the drive that holds `p` (its nearest existing parent), or null when unknown. */
export function freeBytes(p) {
  let cur = resolve(p);
  for (let i = 0; i < 64; i++) {
    if (existsSync(cur)) {
      try { const s = statfsSync(cur); return Number(s.bavail) * Number(s.bsize); } catch { return null; }
    }
    const up = dirname(cur);
    if (up === cur) return null;
    cur = up;
  }
  return null;
}

// ─── Starting OpenDash again after a move ────────────────────────────────
const pidAlive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };

/** Wait until every pid has ended (or timeoutMs). Returns the ones still running. */
export async function waitForExit(pids, { timeoutMs = 90000, pollMs = 300, alive = pidAlive } = {}) {
  const until = Date.now() + timeoutMs;
  let left = pids.filter(p => Number.isInteger(p) && p > 0 && p !== process.pid);
  while (left.length && Date.now() < until) { await new Promise(r => setTimeout(r, pollMs)); left = left.filter(alive); }
  return left;
}

/**
 * Start OpenDash from appDir the way the user had it: `window` -> the normal
 * start-opendash window (Windows) / a detached start-opendash.sh; otherwise the
 * hidden launcher (tools/start-hidden.mjs, the one the Windows switches use).
 * Detached: this process can end at once. Returns {started, how}.
 */
export function launchApp({ appDir, port = 4173, dataDir = null, window = false, env = process.env, platform = process.platform, spawnFn } = {}) {
  const sp = spawnFn || ((cmd, args, o) => { const c = spawn(cmd, args, o); c.unref(); return c; });
  const extra = [...(Number(port) && Number(port) !== 4173 ? ['--port', String(port)] : []), ...(dataDir ? ['--data-dir', dataDir] : [])];
  const common = { cwd: appDir, detached: true, stdio: 'ignore', windowsHide: true, shell: false, env: { ...env } };
  delete common.env.DASHBOARD_SUPERVISED; delete common.env.DASHBOARD_RESPAWN_WAIT;
  if (platform === 'win32') {
    if (window) {
      const cmdExe = resolve(String(env.SystemRoot || env.SYSTEMROOT || 'C:\\Windows'), 'System32', 'cmd.exe');
      const bat = resolve(appDir, existsSync(resolve(appDir, 'start-opendash.bat')) ? 'start-opendash.bat' : 'start-dashboard.bat');
      const line = `/d /c start "OpenDash" /D "${appDir}" "${bat}" --no-open${extra.map(a => (/[\s\\]/.test(a) ? ` "${a}"` : ` ${a}`)).join('')}`;
      delete common.env.DASHBOARD_NO_PAUSE;   // a window someone sees may pause on an error
      sp(cmdExe, [line], { ...common, windowsVerbatimArguments: true });
      return { started: true, how: 'window' };
    }
    sp(process.execPath, [resolve(appDir, 'tools', 'start-hidden.mjs'), ...extra], common);
    return { started: true, how: 'hidden' };
  }
  sp('/bin/sh', [resolve(appDir, 'start-opendash.sh'), '--no-open', ...extra], common);
  return { started: true, how: 'background' };
}

/** Every adapter for this computer (see the header for what the test runner gets instead). */
export function realAdapters({ env = process.env, platform = process.platform, home } = {}) {
  const testing = underTestRunner();
  return {
    registry: platform === 'win32' ? registryAdapter({ env }) : null,
    cli: testing ? { which: async () => null, run: async () => ({ code: 127, stdout: '', stderr: 'not under tests' }) } : cliAdapter({ env, platform, home }),
    shortcuts: platform === 'win32' && !testing ? shortcutsAdapter({ env }) : null,
    syncLocalDir: testing || env.DASHBOARD_SYNC_LOCAL_DIR ? null : (dataDir) => defaultLocalDir(dataDir, hostname(), { env, platform, ...(home ? { home } : {}) }),
    freeBytes,
  };
}

export const _test = { dryRun: () => sharedDryRun };
