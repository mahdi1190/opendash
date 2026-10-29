// tools/launch.mjs - what the OpenDash shortcuts run (Start menu, desktop, sign-in).
//
//   node tools/launch.mjs [--port N] [--data-dir "X:\dir"] [--background] [--stop]
//
// If an OpenDash server already answers on the port, it only opens the browser
// (never a second server). Otherwise it starts the server with no window
// (tools/start-hidden.mjs, which has its own already-running and double-click
// guards), waits until the server answers, then opens the browser.
//   --background  start the server but do not open the browser (sign-in start)
//   --stop        ask a running server to stop, wait until it has, then exit
// Plain Node, no shell, no downloads. tools/launch.vbs runs it with no console window.

import { spawn } from 'node:child_process';
import { request } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export function parseArgs(argv) {
  const o = { port: 4173, dataDir: null, background: false, stop: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--background') o.background = true;
    else if (a === '--stop') o.stop = true;
    else if (a === '--port' && /^[0-9]{2,5}$/.test(argv[i + 1] || '') && Number(argv[i + 1]) < 65536) o.port = Number(argv[++i]);
    else if (a === '--data-dir' && argv[i + 1]) o.dataDir = argv[++i];
  }
  return o;
}

function http(port, method, path, token = null) {
  return new Promise((res) => {
    const req = request({
      host: '127.0.0.1', port, path, method, timeout: 2000,
      headers: { Host: `localhost:${port}`, Origin: `http://localhost:${port}`, 'Content-Length': method === 'POST' ? 2 : 0, 'Content-Type': 'application/json', ...(token ? { 'X-Dashboard-Token': token } : {}) },
    }, (r) => {
      let body = '';
      r.setEncoding('utf8');
      r.on('data', d => { if (body.length < 65536) body += d; });
      r.on('end', () => res({ status: r.statusCode, body }));
    });
    req.on('timeout', () => req.destroy());
    req.on('error', () => res(null));
    if (method === 'POST') req.write('{}');
    req.end();
  });
}

async function isUp(port) {
  const r = await http(port, 'GET', '/api/health?quick=1');
  try { return !!r && JSON.parse(r.body).app === 'dashboard'; } catch { return false; }
}

function openBrowser(url) {
  const [cmd, args] = process.platform === 'win32' ? ['rundll32.exe', ['url.dll,FileProtocolHandler', url]]
    : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  try { spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true, shell: false }).on('error', () => {}).unref(); } catch { /* no browser to open */ }
}

/** The local token of the data folder served on o.port, or null. */
async function tokenForPort(o) {
  try {
    const { resolveDataDir } = await import('../lib/datadir.mjs');
    const { readLocalToken, runtimePath } = await import('../server/actions/auth.mjs');
    const { readFileSync } = await import('node:fs');
    const cands = [];
    if (o.dataDir) cands.push(['--data-dir', o.dataDir]);
    cands.push([]);
    if (process.platform === 'win32' && process.env.LOCALAPPDATA) cands.push(['--data-dir', join(process.env.LOCALAPPDATA, 'OpenDash', 'data')]);
    for (const argv of cands) {
      const dir = resolveDataDir({ argv });
      try { if (JSON.parse(readFileSync(runtimePath(dir), 'utf8')).port !== o.port) continue; } catch { continue; }
      const t = readLocalToken(dir);
      if (t) return t;
    }
  } catch { /* no token: the stop request is refused and the caller carries on */ }
  return null;
}

export async function main(argv) {
  const o = parseArgs(argv);
  const url = `http://localhost:${o.port}`;
  if (o.stop) {
    if (!(await isUp(o.port))) return 0;
    // Stopping needs the local token (an Origin header alone is refused): find the data
    // folder whose runtime.json names this port (the installer passes no --data-dir).
    await http(o.port, 'POST', '/api/server/stop', await tokenForPort(o));
    for (let i = 0; i < 40 && await isUp(o.port); i++) await sleep(250);
    return 0;
  }
  if (!(await isUp(o.port))) {
    const win = process.platform === 'win32';
    const args = win ? [join(ROOT, 'tools', 'start-hidden.mjs')] : [join(ROOT, 'start-opendash.sh'), '--no-open'];
    if (o.port !== 4173) args.push('--port', String(o.port));
    if (o.dataDir) args.push('--data-dir', o.dataDir);
    spawn(win ? process.execPath : '/bin/sh', args, { cwd: ROOT, detached: true, stdio: 'ignore', windowsHide: true, shell: false }).unref();
    // The first start builds the page and may upgrade the data folder: allow a while.
    const until = Date.now() + 120000;
    while (Date.now() < until && !(await isUp(o.port))) await sleep(700);
  }
  if (!o.background) openBrowser(url);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((c) => { process.exitCode = c; }, () => { process.exitCode = 1; });
}
