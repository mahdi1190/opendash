// lib/os-integration.mjs - the opt-in start-up helpers in Settings > Server.
//
// Windows only (other systems get manual instructions, nothing is written):
//   autostart  "Start automatically when I log in": a per-user Run entry
//              HKCU\Software\Microsoft\Windows\CurrentVersion\Run  value "personal-dashboard"
//   protocol   "Enable the Start server button": a per-user URL protocol
//              HKCU\Software\Classes\dashboard-start  (URL Protocol, shell\open\command)
// Both run the SAME fixed command:
//   "<SystemRoot>\System32\wscript.exe" "<app>\tools\start-hidden.wsf" [--port N] [--data-dir "<dir>"]
// tools/start-hidden.wsf starts start-opendash.bat --no-open with no window
// (start-dashboard.bat when an older copy has only that).
// The protocol's command has no "%1": Windows never hands the link to it, and
// the launcher ignores every argument except a numeric --port and a plain
// --data-dir. Port and data folder are this server's own, fixed when the
// toggle is switched on (only if they are not the defaults).
//
// Every change runs reg.exe (by full path, an argument array, no shell)
// through an executor that tests replace: setOsExec(fn), or
// DASHBOARD_OS_EXEC=dry-run, which keeps an in-memory registry and records
// the commands instead of running anything. Turning a toggle off deletes
// exactly what turning it on wrote. State is always read back from the
// registry, never assumed.

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve, isAbsolute } from 'node:path';

export const SCHEME = 'dashboard-start';
export const RUN_VALUE = 'personal-dashboard';
export const RUN_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
export const APPROVED_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run';
export const PROTO_KEY = `HKCU\\Software\\Classes\\${SCHEME}`;
export const PROTO_CMD_KEY = `${PROTO_KEY}\\shell\\open\\command`;
export const LAUNCHER = join('tools', 'start-hidden.wsf');
// The visible launchers, preferred first: start-opendash.* now; start-dashboard.*
// is a shim that calls it (old desktop shortcuts), or the real one in an older copy.
export const START_SCRIPTS = Object.freeze({ bat: ['start-opendash.bat', 'start-dashboard.bat'], sh: ['start-opendash.sh', 'start-dashboard.sh'] });
export const FEATURES = Object.freeze(['autostart', 'protocol']);
const DEFAULT_PORT = 4173;
// Characters cmd.exe would treat specially; a path with them is refused.
const SAFE_PATH = /^[^"%!^&|<>\r\n\t]+$/;
const DRIVE_PATH = /^[A-Za-z]:\\/;   // what tools/start-hidden.wsf accepts for --data-dir

export class OsIntegrationError extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
}

const systemRootOf = (env) => String(env.SystemRoot || env.SYSTEMROOT || env.windir || 'C:\\Windows').replace(/[\\/]+$/, '');
export const regExe = (env = process.env) => join(systemRootOf(env), 'System32', 'reg.exe');
export const wscriptExe = (env = process.env) => join(systemRootOf(env), 'System32', 'wscript.exe');

/** The one command both toggles register. Throws OsIntegrationError for unsafe paths. */
export function launcherCommand({ repoRoot, port = DEFAULT_PORT, dataDir, defaultDataDir, env = process.env, platform = process.platform }) {
  const root = resolve(repoRoot);
  if (!SAFE_PATH.test(root)) throw new OsIntegrationError('UNSAFE_PATH', 'The app folder path contains a character (" % ! ^ & | < >) that cannot be used in a start-up command. Move the app folder to a plain path first.');
  const parts = [`"${wscriptExe(env)}"`, `"${join(root, LAUNCHER)}"`];
  const p = Number(port);
  if (Number.isInteger(p) && p > 0 && p < 65536 && p !== DEFAULT_PORT) parts.push('--port', String(p));
  if (dataDir) {
    const d = resolve(dataDir).replace(/[\\/]+$/, '');
    const def = defaultDataDir ? resolve(defaultDataDir).replace(/[\\/]+$/, '') : null;
    if (!def || d.toLowerCase() !== def.toLowerCase()) {
      if (!isAbsolute(d) || !SAFE_PATH.test(d)) throw new OsIntegrationError('UNSAFE_PATH', 'The data folder path contains a character (" % ! ^ & | < >) that cannot be used in a start-up command.');
      // The launcher only takes X:\... (a network path would be ignored there and
      // the default data folder started instead): refuse it here, visibly.
      if (platform === 'win32' && !DRIVE_PATH.test(d)) throw new OsIntegrationError('UNSAFE_PATH', 'The data folder must be on a drive with a letter (like C:\\...) for a start-up command; a network path cannot be used.');
      parts.push('--data-dir', `"${d}"`);
    }
  }
  return parts.join(' ');
}

/** The reg.exe calls that switch a feature on or off (pure; tests check them). */
export function plan(feature, enabled, command, env = process.env) {
  const reg = regExe(env);
  const R = (...args) => ({ file: reg, args });
  if (feature === 'autostart') {
    return enabled
      ? [R('add', RUN_KEY, '/v', RUN_VALUE, '/t', 'REG_SZ', '/d', command, '/f'),
        // A "disabled in Task Manager" mark from before would keep it off.
        { ...R('delete', APPROVED_KEY, '/v', RUN_VALUE, '/f'), optional: true }]
      : [{ ...R('delete', RUN_KEY, '/v', RUN_VALUE, '/f'), optional: true },
        { ...R('delete', APPROVED_KEY, '/v', RUN_VALUE, '/f'), optional: true }];
  }
  if (feature === 'protocol') {
    return enabled
      ? [R('add', PROTO_KEY, '/ve', '/t', 'REG_SZ', '/d', 'URL:OpenDash start', '/f'),
        R('add', PROTO_KEY, '/v', 'URL Protocol', '/t', 'REG_SZ', '/d', '', '/f'),
        R('add', PROTO_CMD_KEY, '/ve', '/t', 'REG_SZ', '/d', command, '/f')]
      : [{ ...R('delete', PROTO_KEY, '/f'), optional: true }];
  }
  throw new OsIntegrationError('BAD_FEATURE', `unknown feature: ${String(feature).slice(0, 30)}`);
}

/** Parse `reg query` output: [{name, type, data}] ('' name = the default value). */
export function parseRegQuery(stdout) {
  const out = [];
  for (const line of String(stdout || '').split(/\r?\n/)) {
    const m = /^\s{2,}(.*?)\s{4}(REG_[A-Z_]+)(?:\s{4}(.*))?$/.exec(line);
    if (!m) continue;
    const name = /^\(.*\)$/.test(m[1].trim()) ? '' : m[1].trim();   // "(Default)" in any language
    out.push({ name, type: m[2], data: m[3] == null ? '' : m[3] });
  }
  return out;
}

// ─── executors ───────────────────────────────────────────────────────────
/** Runs the program for real: full path, argument array, no shell, hidden, 15 s. */
export function realExec(file, args) {
  return new Promise((resolveP) => {
    execFile(file, args, { windowsHide: true, shell: false, timeout: 15000, encoding: 'utf8' }, (err, stdout, stderr) => {
      resolveP({ code: err ? (typeof err.code === 'number' ? err.code : 1) : 0, stdout: String(stdout || ''), stderr: String(stderr || (err && !stdout ? err.message : '') || '') });
    });
  });
}

/** An in-memory registry that understands the reg.exe calls above. Nothing is run. */
export function createDryRunExec() {
  const keys = new Map();          // lower-case key path -> {path, values: Map(lower name -> {name, type, data})}
  const calls = [];
  const key = (k) => String(k).toLowerCase();
  const opt = (args, flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
  async function exec(file, args) {
    calls.push({ file, args: [...args] });
    if (!/reg\.exe$/i.test(file)) return { code: 1, stdout: '', stderr: 'dry run: only reg.exe is emulated' };
    const [verb, k] = args;
    const name = args.includes('/ve') ? '' : opt(args, '/v');
    if (verb === 'add') {
      for (let p = k; p.includes('\\'); p = p.slice(0, p.lastIndexOf('\\'))) if (!keys.has(key(p))) keys.set(key(p), { path: p, values: new Map() });
      keys.get(key(k)).values.set(key(name ?? ''), { name: name ?? '', type: opt(args, '/t') || 'REG_SZ', data: opt(args, '/d') ?? '' });
      return { code: 0, stdout: 'The operation completed successfully.', stderr: '' };
    }
    if (verb === 'delete') {
      const e = keys.get(key(k));
      if (!e) return { code: 1, stdout: '', stderr: 'ERROR: The system was unable to find the specified registry key or value.' };
      if (name !== undefined) {
        if (!e.values.delete(key(name))) return { code: 1, stdout: '', stderr: 'ERROR: The system was unable to find the specified registry key or value.' };
      } else {
        for (const kk of [...keys.keys()]) if (kk === key(k) || kk.startsWith(key(k) + '\\')) keys.delete(kk);
      }
      return { code: 0, stdout: 'The operation completed successfully.', stderr: '' };
    }
    if (verb === 'query') {
      const e = keys.get(key(k));
      const v = e && e.values.get(key(name ?? ''));
      if (!e || (name !== undefined && !v)) return { code: 1, stdout: '', stderr: 'ERROR: The system was unable to find the specified registry key or value.' };
      const shown = name !== undefined ? [v] : [...e.values.values()];
      return { code: 0, stdout: `\r\n${e.path.replace(/^HKCU/, 'HKEY_CURRENT_USER')}\r\n${shown.map(x => `    ${x.name || '(Default)'}    ${x.type}    ${x.data}`).join('\r\n')}\r\n\r\n`, stderr: '' };
    }
    return { code: 1, stdout: '', stderr: 'dry run: unknown reg verb' };
  }
  return { exec, calls, keys };
}

let execOverride = null;
let dryRun = null;
/** Tests: replace the executor (fn(file, args) -> {code, stdout, stderr}); null restores the default. */
export function setOsExec(fn) { execOverride = typeof fn === 'function' ? fn : null; }
function currentExec(env) {
  if (execOverride) return execOverride;
  if (String(env.DASHBOARD_OS_EXEC || '').toLowerCase() === 'dry-run') { dryRun = dryRun || createDryRunExec(); return dryRun.exec; }
  return realExec;
}
/** The dry-run executor's record (DASHBOARD_OS_EXEC=dry-run), or null. */
export function dryRunRecord() { return dryRun; }

// ─── the service ─────────────────────────────────────────────────────────
/**
 * createOsIntegration({platform, repoRoot, port, dataDir, defaultDataDir, env, exec, exists})
 *   -> { supported, status(), set(feature, enabled), manual(), expectedCommand() }
 */
export function createOsIntegration({ platform = process.platform, repoRoot, port = DEFAULT_PORT, dataDir, defaultDataDir, env = process.env, exec, exists = existsSync } = {}) {
  const supported = platform === 'win32';
  const run = (file, args) => (exec || currentExec(env))(file, args);
  const expectedCommand = () => launcherCommand({ repoRoot, port, dataDir, defaultDataDir, env, platform });
  const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

  async function query(k, name) {
    const r = await run(regExe(env), ['query', k, ...(name === '' ? ['/ve'] : ['/v', name])]);
    if (r.code !== 0) return null;
    const vals = parseRegQuery(r.stdout);
    return vals.find(v => v.name.toLowerCase() === String(name).toLowerCase()) || (name === '' ? vals[0] : null) || null;
  }

  async function status() {
    if (!supported) return { platform, supported: false, scheme: SCHEME, autostart: { enabled: false }, protocol: { enabled: false }, manual: manual() };
    let expected = null, expectedError = null;
    try { expected = expectedCommand(); } catch (e) { expectedError = e.message; }
    const run1 = await query(RUN_KEY, RUN_VALUE);
    const approved = run1 ? await query(APPROVED_KEY, RUN_VALUE) : null;
    // Task Manager > Startup apps writes 03.. (off) / 02.. (on) here.
    const approvedOn = approved ? !/^0[13]/.test(String(approved.data).replace(/\s/g, '')) : true;
    const cmd = await query(PROTO_CMD_KEY, '');
    const marker = cmd ? await query(PROTO_KEY, 'URL Protocol') : null;
    return {
      platform, supported: true, scheme: SCHEME, launcher: LAUNCHER.replace(/\\/g, '/'),
      launcherPresent: !!(repoRoot && exists(join(repoRoot, LAUNCHER))),
      scriptHost: exists(wscriptExe(env)),
      ...(expectedError ? { problem: expectedError } : {}),
      autostart: { enabled: !!run1, current: !!run1 && same(run1.data, expected), approved: run1 ? approvedOn : null, command: run1 ? run1.data : null },
      protocol: { enabled: !!(cmd && marker), current: !!cmd && same(cmd.data, expected), command: cmd ? cmd.data : null },
      expected,
    };
  }

  async function set(feature, enabled) {
    if (!FEATURES.includes(feature)) throw new OsIntegrationError('BAD_FEATURE', 'feature must be autostart or protocol');
    if (!supported) throw new OsIntegrationError('UNSUPPORTED', 'This only works on Windows. See the instructions shown instead.', 501);
    let command = null;
    if (enabled) {
      command = expectedCommand();
      if (!exists(join(repoRoot, LAUNCHER))) throw new OsIntegrationError('NO_LAUNCHER', `${LAUNCHER} is missing from the app folder.`, 500);
      if (!exists(wscriptExe(env))) throw new OsIntegrationError('NO_SCRIPT_HOST', 'Windows Script Host (wscript.exe) is not available on this computer, so OpenDash cannot be started without a window. Use the OpenDash shortcut instead.', 501);
    }
    for (const step of plan(feature, !!enabled, command, env)) {
      const r = await run(step.file, step.args);
      if (r.code !== 0 && !step.optional) throw new OsIntegrationError('REG_FAILED', `Windows refused the change (reg.exe ${step.args[0]}: ${String(r.stderr || r.stdout || 'exit ' + r.code).trim().slice(0, 200)})`, 500);
    }
    return status();
  }

  /** What to do by hand on macOS / Linux (and the Windows equivalents, for reference). */
  function manual() {
    const root = repoRoot ? resolve(repoRoot) : '<the app folder>';
    const pick = (kind) => (repoRoot && START_SCRIPTS[kind].find(f => exists(join(root, f)))) || START_SCRIPTS[kind][0];
    const sh = `${root.replace(/\\/g, '/')}/${pick('sh')}`;
    if (platform === 'darwin') {
      return {
        autostart: `System Settings > General > Login Items > Open at Login: add a small script or Automator app that runs "${sh} --no-open". (Or a LaunchAgent in ~/Library/LaunchAgents with ProgramArguments ["/bin/sh", "${sh}", "--no-open"] and RunAtLoad true.)`,
        start: `Run "${sh}" in Terminal (or double-click it in Finder after "chmod +x").`,
      };
    }
    if (platform === 'win32') {
      return { autostart: 'Use the switch above.', start: `Double-click ${pick('bat')} in ${root} (or your OpenDash shortcut).` };
    }
    return {
      autostart: `Add a file ~/.config/autostart/opendash.desktop with the lines [Desktop Entry], Type=Application, Name=OpenDash, Exec=/bin/sh "${sh}" --no-open. (Or a systemd user service: ExecStart=/bin/sh ${sh} --no-open, then "systemctl --user enable --now opendash".)`,
      start: `Run "${sh}" in a terminal.`,
    };
  }

  return { supported, status, set, manual, expectedCommand };
}
