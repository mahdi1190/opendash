// tools/start-hidden.mjs - the fixed no-window launcher the Windows switches
// in Settings > Server register (lib/os-integration.mjs):
//
//   "<SystemRoot>\System32\conhost.exe" --headless "<node.exe>" "<app>\tools\start-hidden.mjs" [--port N] [--data-dir "X:\dir"]
//
// It starts start-opendash.bat --no-open (start-dashboard.bat in an older copy
// that has only that) with no window and DASHBOARD_NO_PAUSE=1, unless an
// OpenDash server already answers on the port or a start was asked for under
// 20 s ago (a page opening the dashboard-start:// link again and again cannot
// pile up builds and migrations; the stamp dashboard-start-<port>.stamp in the
// temp folder is shared with older copies).
//
// Safety: it reads only a numeric --port and a plain drive-letter --data-dir,
// in that form, and stops reading at the first anything else (Windows never
// hands it the link: the registered command has no "%1"). The batch file is
// always this app folder's own.
//
// How it stays hidden: conhost --headless gives this process a console with
// no window. It starts a second copy of itself detached (no console at all)
// and exits at once; that copy runs cmd.exe with CREATE_NO_WINDOW (a console
// nobody sees, which node and the supervisor then share) and waits for it, so
// the server is never tied to the short-lived first process. Without conhost
// (an older Windows) the only difference is a brief console flash.
//
// DASHBOARD_LAUNCHER_DRY_RUN=<dir>: print what would run (JSON) and use <dir>
// for the stamp; nothing is started (tests).

import { spawn } from 'node:child_process';
import { existsSync, statSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const DEFAULT_PORT = 4173;
export const GUARD_MS = 20000;
export const BATS = Object.freeze(['start-opendash.bat', 'start-dashboard.bat']);
const SAFE_PATH = /^[^"%!^&|<>\r\n\t]+$/;
const DATA_DIR = /^[A-Za-z]:\\[^"%!^&|<>\r\n\t]+$/;
const CHILD_FLAG = '--hidden-child';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Only "--port N" and "--data-dir X:\..." (each once, in any order); stops at the first anything else. */
export function parseLauncherArgs(argv) {
  const out = { port: DEFAULT_PORT, dataDir: null };
  for (let i = 0; i < argv.length; i += 2) {
    const [k, v] = [argv[i], argv[i + 1]];
    if (k === '--port' && /^[0-9]{2,5}$/.test(v || '') && Number(v) > 0 && Number(v) < 65536) out.port = Number(v);
    // (a trailing \ is dropped: before the closing quote it would escape it for node)
    else if (k === '--data-dir' && DATA_DIR.test((v || '').replace(/\\+$/, ''))) out.dataDir = v.replace(/\\+$/, '');
    else break;
  }
  return out;
}

/** The batch file to run: this app folder's start-opendash.bat, else the old name. */
export function pickBat(root = ROOT, exists = existsSync) {
  const f = BATS.find(b => exists(join(root, b)));
  return f ? join(root, f) : null;
}

/** cmd.exe's command line (verbatim): every part is checked or fixed, so the quoting is plain. */
export function cmdLine(bat, { port, dataDir }) {
  if (!SAFE_PATH.test(bat)) throw new Error('unsafe app folder path');
  const args = ['--no-open'];
  if (port !== DEFAULT_PORT) args.push('--port', String(port));
  if (dataDir) args.push('--data-dir', `"${dataDir}"`);
  return `/d /s /c ""${bat}" ${args.join(' ')}"`;
}

function dashboardAnswers(port) {
  return new Promise((res) => {
    const req = request({ host: '127.0.0.1', port, path: '/api/health?quick=1', timeout: 1500, headers: { Host: `localhost:${port}` } }, (r) => {
      let body = '';
      r.setEncoding('utf8');
      r.on('data', d => { body += d; if (body.length > 65536) req.destroy(); });
      r.on('end', () => { try { res(JSON.parse(body).app === 'dashboard'); } catch { res(false); } });
    });
    req.on('timeout', () => req.destroy());
    req.on('error', () => res(false));
    req.end();
  });
}

/** True when a start was asked for under GUARD_MS ago; otherwise records this one. */
export function guardStamp(dir, port, now = Date.now()) {
  const f = join(dir, `dashboard-start-${port}.stamp`);
  try { if (now - statSync(f).mtimeMs < GUARD_MS) return true; } catch { /* no stamp yet */ }
  try { writeFileSync(f, String(now)); } catch { /* temp folder not writable: start anyway */ }
  return false;
}

async function main(argv, env) {
  const systemRoot = String(env.SystemRoot || env.SYSTEMROOT || env.windir || 'C:\\Windows').replace(/[\\/]+$/, '');
  const cmdExe = join(systemRoot, 'System32', 'cmd.exe');
  if (argv[0] === CHILD_FLAG) {
    // Second stage: no console of its own. cmd.exe gets a window-less one.
    const opts = parseLauncherArgs(argv.slice(1));
    const bat = pickBat();
    if (!bat) return 1;
    const child = spawn(cmdExe, [cmdLine(bat, opts)], {
      cwd: ROOT, stdio: 'ignore', windowsHide: true, windowsVerbatimArguments: true, shell: false,
      env: { ...env, DASHBOARD_NO_PAUSE: '1' },
    });
    return await new Promise((res) => { child.on('exit', (c) => res(c ?? 0)); child.on('error', () => res(1)); });
  }
  const opts = parseLauncherArgs(argv);
  const bat = pickBat();
  const dry = env.DASHBOARD_LAUNCHER_DRY_RUN;
  if (!bat) { if (dry) console.log(JSON.stringify({ started: false, reason: 'no start script' })); return 1; }
  if (await dashboardAnswers(opts.port)) { if (dry) console.log(JSON.stringify({ started: false, reason: 'running' })); return 0; }
  if (guardStamp(dry || tmpdir(), opts.port)) { if (dry) console.log(JSON.stringify({ started: false, reason: 'recent' })); return 0; }
  const childArgs = [fileURLToPath(import.meta.url), CHILD_FLAG];
  if (opts.port !== DEFAULT_PORT) childArgs.push('--port', String(opts.port));
  if (opts.dataDir) childArgs.push('--data-dir', opts.dataDir);
  if (dry) { console.log(JSON.stringify({ started: true, node: process.execPath, args: childArgs, cmd: cmdExe, cmdLine: cmdLine(bat, opts) })); return 0; }
  const stage2 = spawn(process.execPath, childArgs, { cwd: ROOT, detached: true, stdio: 'ignore', windowsHide: true, shell: false, env });
  stage2.unref();
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2), process.env).then((c) => { process.exitCode = c; }, () => { process.exitCode = 1; });
}
