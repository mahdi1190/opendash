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
//   realAdapters({env, ...})     all of the above for this computer
//
// UNDER THE TEST RUNNER realAdapters() never reaches the real computer: the
// registry is an in-memory one, no CLI is found, no shortcut is read, unless a
// test passes its own. (Belt and braces: tests inject fakes anyway.)

import { execFile } from 'node:child_process';
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
