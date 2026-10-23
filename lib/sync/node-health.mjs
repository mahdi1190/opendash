// lib/sync/node-health.mjs - the Node side of Settings > Sync > Health: cheap
// checks of this computer that the sync engine cannot make itself, and the
// fix buttons. The checklist itself (what each finding means, in plain
// words, and its one fix) is lib/sync/health.mjs, which is pure.
//
// EVERY COMMAND IS FIXED. Programs run by full path with an argument array,
// never through a shell, never with text from a request: the only values
// that go in are this computer's own (the node.exe that runs the server,
// passed to PowerShell through an environment variable rather than the
// script text; the sync folder from this computer's own settings, which
// lib/sync/node-host.mjs checkFolder accepted). A fix is one name from FIXES.
// DASHBOARD_OS_EXEC=dry-run runs nothing (every check answers "unknown").
// Checks run only when the Health page asks (never on a timer) and are kept
// for 90 seconds.
//
//   Windows  Get-NetConnectionProfile (Public or Private network), the inbound
//            firewall rules Windows made for node.exe, the firewall profiles
//            (one PowerShell call); tasklist (is OneDrive / Google Drive /
//            Dropbox running); reg query of OneDrive's personal account (signed
//            in, its folder, a different account than before: only a hash of
//            the address is kept, in this computer's own sync folder); attrib
//            (files still online-only); free disk space (fs.statfs)
//   macOS    ps (is the cloud app running); socketfilterfw (the firewall, block
//            all, node blocked); stat -f %Xf (files still online-only: the
//            File Provider "dataless" flag); free disk space
//
// Exports: createNodeSyncHealth({engine, dataDir, ...}) -> {facts(), fix(name, opts)},
// probeDeviceName(), findSyncFolders().

import { execFile, spawn } from 'node:child_process';
import { promises as fsp, existsSync } from 'node:fs';
import { join, resolve, basename, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { installSpawnGuard } from '../spawn-guard.mjs';
import { syncRootFor, SYNC_DIR_NAME, DEVICE_RE, isSyncFileName, detectCloudFolders } from './folder.mjs';
import { oneDriveOf } from '../onedrive.mjs';
installSpawnGuard();   // in a test process, never start a real AI agent CLI (lib/spawn-guard.mjs)

const CACHE_MS = 90 * 1000;
const sysRoot = (env) => String(env.SystemRoot || env.SYSTEMROOT || env.windir || 'C:\\Windows').replace(/[\\/]+$/, '');
const WIN = (env) => ({
  powershell: join(sysRoot(env), 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
  tasklist: join(sysRoot(env), 'System32', 'tasklist.exe'),
  reg: join(sysRoot(env), 'System32', 'reg.exe'),
  attrib: join(sysRoot(env), 'System32', 'attrib.exe'),
  explorer: join(sysRoot(env), 'explorer.exe'),
  control: join(sysRoot(env), 'System32', 'control.exe'),
});
const MAC = { ps: '/bin/ps', stat: '/usr/bin/stat', open: '/usr/bin/open', fw: '/usr/libexec/ApplicationFirewall/socketfilterfw', scutil: '/usr/sbin/scutil' };

// The one PowerShell script (fixed text; node.exe's path arrives in OPENDASH_NODE_EXE).
const PS_NET = [
  "$ErrorActionPreference = 'SilentlyContinue'",
  '$p = @(Get-NetConnectionProfile | ForEach-Object { [pscustomobject]@{ name = [string]$_.Name; alias = [string]$_.InterfaceAlias; category = [string]$_.NetworkCategory } })',
  '$node = $env:OPENDASH_NODE_EXE',
  '$r = @()',
  "if ($node) { $r = @(Get-NetFirewallApplicationFilter -Program $node | Get-NetFirewallRule | Where-Object { [string]$_.Direction -eq 'Inbound' } | ForEach-Object { [pscustomobject]@{ enabled = [string]$_.Enabled; action = [string]$_.Action; profile = [string]$_.Profile } }) }",
  '$f = @(Get-NetFirewallProfile | ForEach-Object { [pscustomobject]@{ name = [string]$_.Name; enabled = [string]$_.Enabled } })',
  '[pscustomobject]@{ profiles = $p; rules = $r; fw = $f } | ConvertTo-Json -Compress -Depth 4',
].join('; ');

const ONEDRIVE_KEY = 'HKCU\\Software\\Microsoft\\OneDrive\\Accounts\\Personal';
const BIOS_KEY = 'HKLM\\HARDWARE\\DESCRIPTION\\System\\BIOS';
const SF_DATALESS = 0x40000000;

function dryRun(env) { return String(env.DASHBOARD_OS_EXEC || '').toLowerCase() === 'dry-run'; }
/** Run a fixed program: {code, stdout, stderr}; never throws. */
function run(file, args, { env = process.env, timeoutMs = 10000, extraEnv = null } = {}) {
  if (dryRun(env)) return Promise.resolve({ code: 1, stdout: '', stderr: 'dry run' });
  return new Promise((res) => {
    try {
      execFile(file, args, { timeout: timeoutMs, windowsHide: true, maxBuffer: 4 * 1024 * 1024, shell: false, env: extraEnv ? { ...env, ...extraEnv } : env }, (err, stdout, stderr) => {
        res({ code: err ? (typeof err.code === 'number' ? err.code : 1) : 0, stdout: String(stdout || ''), stderr: String(stderr || '') });
      });
    } catch (e) { res({ code: 1, stdout: '', stderr: String(e && e.message) }); }
  });
}
/** Start a fixed program and let it go (a settings page, the cloud app, a folder). */
function launch(file, args, { env = process.env } = {}) {
  if (dryRun(env)) return Promise.resolve(true);
  return new Promise((res) => {
    let child;
    try { child = spawn(file, args, { detached: true, stdio: 'ignore', shell: false, windowsHide: false }); }
    catch { res(false); return; }
    let done = false;
    const end = (v) => { if (done) return; done = true; try { child.unref(); } catch { /* fine */ } res(v); };
    child.once('error', () => end(false));
    child.once('spawn', () => end(true));
    setTimeout(() => end(true), 1500).unref?.();
  });
}

/** reg.exe query output -> {name: data}. */
function regValues(text) {
  const out = {};
  for (const line of String(text || '').split(/\r?\n/)) {
    const m = /^\s{2,}(\S(?:.*?\S)?)\s{2,}(REG_\w+)\s{2,}(.*)$/.exec(line);
    if (m) out[m[1]] = m[3].trim();
  }
  return out;
}
const hashOf = (s) => createHash('sha256').update(String(s || '').trim().toLowerCase()).digest('hex').slice(0, 16);
async function freeBytes(p) {
  if (!p || typeof fsp.statfs !== 'function') return null;
  try { const s = await fsp.statfs(p); return Number(s.bavail) * Number(s.bsize); } catch { return null; }
}

/** macOS: "Sam's MacBook Pro"; Windows: the BIOS maker and model. For lib/sync/devname.mjs. */
export async function probeDeviceName({ platform = process.platform, env = process.env } = {}) {
  if (platform === 'darwin') {
    const r = await run(MAC.scutil, ['--get', 'ComputerName'], { env, timeoutMs: 3000 });
    return r.code === 0 ? { computerName: r.stdout.trim().slice(0, 80) } : null;
  }
  if (platform === 'win32') {
    const r = await run(WIN(env).reg, ['query', BIOS_KEY], { env, timeoutMs: 4000 });
    if (r.code !== 0) return null;
    const v = regValues(r.stdout);
    return { bios: { manufacturer: v.SystemManufacturer || '', product: v.SystemProductName || '', family: v.SystemFamily || '', version: v.SystemVersion || '' } };
  }
  return null;
}

/**
 * Where an OpenDash Sync folder holding any of `ids` (device ids) is now:
 * [{folder, root, label, renamed}] (folder: what to choose in Settings > Sync;
 * renamed: the folder holds the sync but is not called "OpenDash Sync" any
 * more, so it has to be renamed back first). Looks two levels deep inside
 * each cloud folder this computer has, and next to the folder in use.
 */
export async function findSyncFolders(ids, { current = null, detect = () => detectCloudFolders(), maxDirs = 400 } = {}) {
  const want = (ids || []).filter(id => DEVICE_RE.test(id));
  if (!want.length) return [];
  const bases = [];
  try { for (const d of detect() || []) bases.push({ path: d.path, label: d.label }); } catch { /* none */ }
  if (current) { bases.push({ path: current, label: 'your sync folder' }); bases.push({ path: dirname(resolve(current)), label: 'next to your sync folder' }); }
  const out = [], seen = new Set();
  const curRoot = current ? syncRootFor(current).toLowerCase() : null;
  let checked = 0;
  const holds = (dir) => want.some(id => existsSync(join(dir, 'devices', id)));
  const consider = (dir, label) => {
    const key = resolve(dir).toLowerCase();
    if (seen.has(key) || key === curRoot) return;
    seen.add(key);
    if (!holds(dir)) return;
    const named = basename(dir).toLowerCase() === SYNC_DIR_NAME.toLowerCase();
    out.push({ folder: named ? dirname(dir) : dir, root: dir, label, renamed: !named });
  };
  const subdirs = async (dir) => { try { return (await fsp.readdir(dir, { withFileTypes: true })).filter(d => d.isDirectory() && !d.name.startsWith('.')).map(d => join(dir, d.name)); } catch { return []; } };
  for (const b of bases) {
    if (!b.path || !existsSync(b.path)) continue;
    consider(join(b.path, SYNC_DIR_NAME), b.label);
    for (const d1 of await subdirs(b.path)) {
      if (++checked > maxDirs) return out;
      consider(d1, b.label);
      if (basename(d1).toLowerCase() === 'devices') continue;
      for (const d2 of await subdirs(d1)) { if (++checked > maxDirs) return out; consider(d2, b.label); }
    }
  }
  return out;
}

/** Which cloud app a folder belongs to: 'onedrive' | 'gdrive' | 'dropbox' | null. */
export function cloudKindOf(folder) {
  const s = String(folder || '').toLowerCase();
  if (/onedrive/.test(s)) return 'onedrive';
  if (/google ?drive|my drive|googledrive/.test(s)) return 'gdrive';
  if (/dropbox/.test(s)) return 'dropbox';
  return null;
}
const PROC = {
  win32: { onedrive: ['onedrive.exe'], gdrive: ['googledrivefs.exe'], dropbox: ['dropbox.exe'] },
  darwin: { onedrive: [/\/onedrive\.app\//i, /^onedrive$/i], gdrive: [/\/google drive\.app\//i, /^google drive$/i], dropbox: [/\/dropbox\.app\//i, /^dropbox$/i] },
};

export function createNodeSyncHealth({ engine, dataDir, env = process.env, platform = process.platform, log = () => {}, nodeExe = process.execPath, detect = () => detectCloudFolders() } = {}) {
  let cache = null, busy = null, downloading = null;
  const L = () => engine.localFiles;
  const say = (lvl, m) => { try { log(lvl, `sync health: ${m}`); } catch { /* fine */ } };

  async function readLocal() { try { const t = await L().read('health.json'); return t ? JSON.parse(t) : {}; } catch { return {}; } }
  async function writeLocal(o) { try { await L().write('health.json', JSON.stringify(o, null, 1)); } catch { /* fine */ } }

  // ─── Windows ────────────────────────────────────────────────────────
  async function winNet() {
    const r = await run(WIN(env).powershell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', PS_NET], { env, timeoutMs: 20000, extraEnv: { OPENDASH_NODE_EXE: nodeExe } });
    if (r.code !== 0 || !r.stdout.trim()) return null;
    let j; try { j = JSON.parse(r.stdout.trim()); } catch { return null; }
    const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
    const profiles = arr(j.profiles).map(p => ({ name: String(p.name || '').slice(0, 80), alias: String(p.alias || '').slice(0, 80), category: String(p.category || '') }));
    const cats = new Set(profiles.map(p => (p.category === 'DomainAuthenticated' ? 'Domain' : p.category)));
    const applies = (rule) => rule.enabled === 'True' && (/any/i.test(rule.profile) || [...cats].some(c => new RegExp(`\\b${c}\\b`, 'i').test(rule.profile)));
    const rules = arr(j.rules).map(x => ({ enabled: String(x.enabled), action: String(x.action), profile: String(x.profile) }));
    const fwOn = arr(j.fw).filter(f => String(f.enabled) === 'True').map(f => String(f.name));
    return {
      network: { profiles, publicActive: profiles.some(p => p.category === 'Public'), wifi: profiles.some(p => /wi-?fi|wireless|wlan/i.test(p.alias)) },
      firewall: {
        os: 'windows', on: [...cats].some(c => fwOn.includes(c)) || (!cats.size && fwOn.length > 0),
        blockRules: rules.filter(x => x.action === 'Block' && applies(x)).length,
        allowRules: rules.filter(x => x.action === 'Allow' && applies(x)).length,
        anyRules: rules.length,
      },
    };
  }
  async function winProcesses() {
    const r = await run(WIN(env).tasklist, ['/FO', 'CSV', '/NH'], { env, timeoutMs: 8000 });
    if (r.code !== 0) return null;
    const names = new Set();
    for (const line of r.stdout.split(/\r?\n/)) { const m = /^"([^"]+)"/.exec(line); if (m) names.add(m[1].toLowerCase()); }
    return names;
  }
  async function winOneDrive() {
    const r = await run(WIN(env).reg, ['query', ONEDRIVE_KEY], { env, timeoutMs: 5000 });
    if (r.code !== 0) return { signedIn: false, folder: null, account: null };
    const v = regValues(r.stdout);
    return { signedIn: !!(v.UserFolder || v.UserEmail || v.cid), folder: v.UserFolder || null, account: v.UserEmail ? hashOf(v.UserEmail) : (v.cid ? hashOf(v.cid) : null) };
  }
  /** attrib over the sync folder: how many of the other devices' files are still online-only (O). */
  async function winOnlineOnly(root, me) {
    const r = await run(WIN(env).attrib, ['/S', join(root, '*')], { env, timeoutMs: 10000 });
    if (r.code !== 0) return null;
    let files = 0, offline = 0, unpinned = 0;
    for (const line of r.stdout.split(/\r?\n/)) {
      const i = line.toLowerCase().indexOf(root.toLowerCase());
      if (i < 0) continue;
      const flags = line.slice(0, i), p = line.slice(i).trim();
      if (!isSyncFileName(basename(p)) || (me && p.includes(me))) continue;
      files++;
      if (/O/.test(flags)) offline++;
      if (/U/.test(flags)) unpinned++;
    }
    return { files, offline, unpinned };
  }

  // ─── macOS ──────────────────────────────────────────────────────────
  async function macProcesses() {
    const r = await run(MAC.ps, ['-axo', 'comm='], { env, timeoutMs: 5000 });
    if (r.code !== 0) return null;
    return r.stdout.split('\n').map(s => s.trim()).filter(Boolean);
  }
  async function macFirewall() {
    if (!existsSync(MAC.fw)) return null;
    const g = await run(MAC.fw, ['--getglobalstate'], { env, timeoutMs: 4000 });
    if (g.code !== 0) return null;
    const on = /enabled|state = [12]/i.test(g.stdout) && !/disabled|state = 0/i.test(g.stdout);
    const b = await run(MAC.fw, ['--getblockall'], { env, timeoutMs: 4000 });
    const blockAll = /enabled|on\b/i.test(b.stdout) && !/disabled|off\b/i.test(b.stdout);
    const a = await run(MAC.fw, ['--getappblocked', nodeExe], { env, timeoutMs: 4000 });
    const nodeBlocked = /\bblocked\b/i.test(a.stdout) && !/not blocked|permitted/i.test(a.stdout);
    return { os: 'mac', on, blockAll: on && blockAll, nodeBlocked: on && nodeBlocked };
  }
  /** The other devices' sync files and whether macOS still has them only in the cloud ("dataless"). */
  async function syncFiles(root, me) {
    const out = [];
    let devs = [];
    try { devs = (await fsp.readdir(join(root, 'devices'), { withFileTypes: true })).filter(d => d.isDirectory() && DEVICE_RE.test(d.name) && d.name !== me).map(d => d.name); } catch { return out; }
    for (const id of devs) {
      let names = [];
      try { names = await fsp.readdir(join(root, 'devices', id)); } catch { continue; }
      for (const n of names) if (isSyncFileName(n)) out.push(join(root, 'devices', id, n));
      if (out.length >= 400) break;
    }
    return out.slice(0, 400);
  }
  async function macOnlineOnly(root, me) {
    const files = await syncFiles(root, me);
    if (!files.length) return { files: 0, offline: 0, bytes: 0, list: [] };
    const off = [];
    let bytes = 0;
    for (let i = 0; i < files.length; i += 60) {
      const part = files.slice(i, i + 60);
      const r = await run(MAC.stat, ['-f', '%Xf %z %N', '--', ...part], { env, timeoutMs: 8000 });
      for (const line of r.stdout.split('\n')) {
        const m = /^([0-9A-Fa-f]+) (\d+) (.+)$/.exec(line.trim());
        if (m && (parseInt(m[1], 16) & SF_DATALESS)) { off.push(m[3]); bytes += Number(m[2]) || 0; }
      }
    }
    return { files: files.length, offline: off.length, bytes, list: off };
  }

  // ─── Everything, for the Health page ────────────────────────────────
  async function gather() {
    const st = engine.status();
    const folder = st.folder || null;
    const root = folder ? syncRootFor(folder) : null;
    const me = engine.deviceId || null;
    const kind = cloudKindOf(folder);
    const facts = { platform, at: Date.now(), cloud: { kind, running: null, signedIn: null, accountChanged: false, personalFolder: null, outsidePersonal: false }, network: null, firewall: null, disk: null, onlineOnly: null, downloading: !!downloading };
    const rootThere = !!(root && existsSync(root));
    facts.folder = { exists: !!(folder && existsSync(folder)), root: rootThere };
    facts.disk ={ data: await freeBytes(dataDir), sync: folder && existsSync(folder) ? await freeBytes(folder) : null };
    if (platform === 'win32') {
      const [net, procs, od] = await Promise.all([st.live && st.live.on ? winNet() : Promise.resolve(null), winProcesses(), kind === 'onedrive' ? winOneDrive() : Promise.resolve(null)]);
      if (net) { facts.network = net.network; facts.firewall = net.firewall; }
      if (procs && kind) facts.cloud.running = PROC.win32[kind].some(n => procs.has(n));
      if (od) {
        facts.cloud.signedIn = od.signedIn;
        facts.cloud.personalFolder = od.folder;
        if (od.folder && folder) {
          const where = oneDriveOf(folder, env);
          facts.cloud.outsidePersonal = !!(where && !where.work && resolve(where.root).toLowerCase() !== resolve(od.folder).toLowerCase() && !resolve(folder).toLowerCase().startsWith(resolve(od.folder).toLowerCase()));
        }
        // A different personal account than when this computer first checked (only a hash is kept).
        if (od.account) {
          const mine = await readLocal();
          if (!mine.account) await writeLocal({ ...mine, account: od.account, at: new Date().toISOString() });
          else if (mine.account !== od.account) facts.cloud.accountChanged = true;
        }
      }
      if (rootThere) facts.onlineOnly = await winOnlineOnly(root, me);
    } else if (platform === 'darwin') {
      const [procs, fw] = await Promise.all([macProcesses(), st.live && st.live.on ? macFirewall() : Promise.resolve(null)]);
      if (procs && kind) facts.cloud.running = procs.some(p => PROC.darwin[kind].some(re => re.test(p) || re.test(basename(p))));
      facts.firewall = fw;
      if (rootThere) { const o = await macOnlineOnly(root, me); facts.onlineOnly = { files: o.files, offline: o.offline, bytes: o.bytes }; }
    }
    return facts;
  }
  /** This computer's facts for the checklist (kept 90 s; `fresh` asks again). */
  async function facts({ fresh = false } = {}) {
    if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return { ...cache, downloading: !!downloading };
    if (busy) return busy;
    busy = gather().then((f) => { cache = f; return f; }).catch((e) => { say('warn', `checks failed (${e && (e.code || e.message)})`); return cache || { platform, at: Date.now(), cloud: {} }; }).finally(() => { busy = null; });
    return busy;
  }

  // ─── Fix buttons ────────────────────────────────────────────────────
  const settingsUri = {
    network: { win32: (f) => (f && f.network && !f.network.wifi ? 'ms-settings:network-ethernet' : 'ms-settings:network-wifi'), darwin: () => 'x-apple.systempreferences:com.apple.preference.network' },
    datetime: { win32: () => 'ms-settings:dateandtime', darwin: () => 'x-apple.systempreferences:com.apple.preference.datetime' },
    storage: { win32: () => 'ms-settings:storagesense', darwin: () => 'x-apple.systempreferences:com.apple.settings.Storage' },
  };
  async function openUri(uri) {
    if (platform === 'win32') return launch(WIN(env).explorer, [uri], { env });
    if (platform === 'darwin') return launch(MAC.open, [uri], { env });
    return false;
  }
  async function startCloud(kind) {
    if (platform === 'darwin') return launch(MAC.open, ['-a', { onedrive: 'OneDrive', gdrive: 'Google Drive', dropbox: 'Dropbox' }[kind] || 'OneDrive'], { env });
    if (platform !== 'win32') return false;
    const pf = env.ProgramFiles || 'C:\\Program Files', pf86 = env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', la = env.LOCALAPPDATA || '';
    const cands = {
      onedrive: [la && join(la, 'Microsoft', 'OneDrive', 'OneDrive.exe'), join(pf, 'Microsoft OneDrive', 'OneDrive.exe'), join(pf86, 'Microsoft OneDrive', 'OneDrive.exe')],
      dropbox: [join(pf86, 'Dropbox', 'Client', 'Dropbox.exe'), join(pf, 'Dropbox', 'Client', 'Dropbox.exe')],
      gdrive: [join(pf, 'Google', 'Drive File Stream', 'GoogleDriveFS.exe')],
    }[kind] || [];
    const exe = cands.filter(Boolean).find(p => existsSync(p));
    return exe ? launch(exe, [], { env }) : false;
  }
  /** Read the other devices' online-only files once, so the cloud app downloads them (in the background, one at a time). */
  function downloadAll(root, me) {
    if (downloading) return downloading;
    downloading = (async () => {
      const files = await syncFiles(root, me);
      let n = 0;
      for (const f of files) { try { const h = await fsp.open(f, 'r'); try { await h.read(Buffer.alloc(1), 0, 1, 0); await fsp.readFile(f); } finally { await h.close(); } n++; } catch { /* still on its way */ } }
      say('info', `asked for ${n} file(s) to be downloaded`);
      cache = null;
    })().finally(() => { downloading = null; });
    return downloading;
  }

  const FIXES = new Set(['open-network', 'open-firewall', 'open-datetime', 'open-storage', 'open-folder', 'start-cloud', 'keep-offline', 'download', 'compact', 'sync-now', 'fresh', 'relink', 'recheck']);
  /** One fix: {ok, message, status?}. 400-style errors carry .status/.code like the engine's. */
  async function fix(name, { folder } = {}) {
    const bad = (m, code = 'BAD_FIX') => { const e = new Error(m); e.status = 400; e.code = code; return e; };
    if (!FIXES.has(name)) throw bad('Unknown fix.');
    const st = engine.status();
    const f = cache;
    const root = st.folder ? syncRootFor(st.folder) : null;
    const opened = (ok, what) => ({ ok: !!ok, message: ok ? `Opened ${what}.` : `Could not open ${what} on this computer: follow the steps instead.` });
    switch (name) {
      case 'open-network': return opened(settingsUri.network[platform] && await openUri(settingsUri.network[platform](f)), platform === 'darwin' ? 'Network settings' : 'the network settings');
      case 'open-datetime': return opened(settingsUri.datetime[platform] && await openUri(settingsUri.datetime[platform]()), 'Date & time settings');
      case 'open-storage': return opened(settingsUri.storage[platform] && await openUri(settingsUri.storage[platform]()), 'Storage settings');
      case 'open-firewall':
        if (platform === 'win32') return opened(await launch(WIN(env).control, ['/name', 'Microsoft.WindowsFirewall', '/page', 'pageConfigureApps'], { env }), '"Allow apps through Windows Firewall"');
        if (platform === 'darwin') return opened(await openUri('x-apple.systempreferences:com.apple.preference.security?Firewall'), 'the firewall settings');
        return opened(false, 'the firewall settings');
      case 'open-folder': {
        const p = root && existsSync(root) ? root : st.folder;
        if (!p || !existsSync(p)) return { ok: false, message: 'The sync folder is not there on this computer.' };
        if (platform === 'win32') return opened(await launch(WIN(env).explorer, [p], { env }), 'the sync folder');
        if (platform === 'darwin') return opened(await launch(MAC.open, [p], { env }), 'the sync folder');
        return opened(false, 'the sync folder');
      }
      case 'start-cloud': {
        const kind = cloudKindOf(st.folder) || 'onedrive';
        const ok = await startCloud(kind);
        cache = null;
        return { ok: !!ok, message: ok ? `Started ${st.cloud || 'the cloud app'}. Sign in if it asks; sync carries on by itself.` : `Could not start ${st.cloud || 'the cloud app'} from here: start it from the Start menu (or Applications).` };
      }
      case 'keep-offline': {
        if (!root || !existsSync(root)) return { ok: false, message: 'The sync folder is not there on this computer.' };
        if (platform === 'win32') {
          const a = await run(WIN(env).attrib, ['+P', '-U', root], { env, timeoutMs: 10000 });
          const b = await run(WIN(env).attrib, ['+P', '-U', '/S', '/D', join(root, '*')], { env, timeoutMs: 30000 });
          cache = null;
          return { ok: a.code === 0 && b.code === 0, message: a.code === 0 && b.code === 0 ? `${st.cloud || 'OneDrive'} now keeps the OpenDash Sync folder on this computer.` : 'Windows did not accept that: right-click the OpenDash Sync folder > "Always keep on this device".' };
        }
        downloadAll(root, engine.deviceId);
        return { ok: true, message: 'Downloading the files now. To keep them on this Mac for good: in Finder, right-click the OpenDash Sync folder > "Always Keep on This Device" (or "Make available offline").' };
      }
      case 'download':
        if (!root || !existsSync(root)) return { ok: false, message: 'The sync folder is not there on this computer.' };
        downloadAll(root, engine.deviceId);
        return { ok: true, message: 'Asked for the files to be downloaded. This page shows the progress.' };
      case 'compact': { const s = await engine.compactNow(); return { ok: true, message: 'Compacted: a fresh snapshot, and old change logs of this computer removed.', status: s }; }
      case 'sync-now': case 'recheck': { await engine.syncNow(); cache = null; return { ok: true, message: 'Checked again.', status: engine.status() }; }
      case 'fresh': { const s = await engine.startFresh(); return { ok: true, message: 'Sync starts again in this folder. On your other computers choose this folder too (Settings > Sync > Folder).', status: s }; }
      case 'relink': {
        // Only a place the folder search found (never a path typed into a request).
        const cands = (st.health && st.health.moved && st.health.moved.candidates) || [];
        const c = cands.find(x => x.folder === folder && !x.renamed);
        if (!c) throw bad('Choose one of the folders listed.', 'BAD_FOLDER');
        const s = await engine.relink(c.folder);
        return { ok: true, message: 'Using the OpenDash Sync folder where it is now.', status: s };
      }
      default: throw bad('Unknown fix.');
    }
  }

  return { facts, fix, get downloading() { return !!downloading; } };
}
