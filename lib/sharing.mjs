// lib/sharing.mjs - moving the dashboard and its data around.
//
//   appFiles(repoRoot)                    which files make up the APP (never data)
//   exportApp(repoRoot)                   -> {buffer, name, files}   clean zip of the app
//   exportData({dataDir, financeDir})     -> {buffer, name, files}   zip of the user's data
//   inspectDataZip(buffer)                -> what an import would bring (counts only)
//   importData({buffer, dataDir, financeDir, store, setConfig, log})
//   listBackups(paths) / restoreBackup({name, paths, store}) / backupNow({paths, store})
//   backupDataDir(dataDir, label)         full copy into <data>/backups/<label>-<stamp>/
//   resetData({dataDir, financeDir, store, setConfig, includeFinance})
//   diagnostics({...})                    facts for Settings > Diagnostics, no personal content
//
// Every write goes through lib/fsutil.mjs; state writes go through the state
// store (lock, version stamping, backups, live sync). Nothing is deleted
// without a copy in <data>/backups first.

import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { promises as fsp } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { homedir, platform, arch, release } from 'node:os';
import { createZip, readZip } from './zip.mjs';
import { atomicWrite, copyTree, isInside, readJson, writeJson, withLock } from './fsutil.mjs';
import { dataPaths, validateConfig, defaultConnections, REPO_ROOT } from './datadir.mjs';
import { dropRetiredState } from './state-keys.mjs';
import { clockTodayIn, canonZone, processZone } from './clock.mjs';

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
// File names are machine artefacts: the HOME day (config.timezone), not the UTC
// day, which is a day behind between 00:00 and 01:00 in British Summer Time (travel spec S7).
const today = (dataDir) => {
  let tz = '';
  try { if (dataDir) tz = JSON.parse(readFileSync(dataPaths(dataDir).config, 'utf8')).timezone; } catch { /* no config: below */ }
  return clockTodayIn(canonZone(tz) || processZone() || 'UTC');
};

// ─── The app ───────────────────────────────────────────────────────────────
// Allowlist: only these top-level files and folders are the app.
const APP_TOP_FILES = ['README.md', 'README-STANDALONE.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'MODULES.md', 'CLAUDE.md',
  'package.json', 'build.mjs', 'serve.mjs', 'start-opendash.bat', 'start-opendash.sh', 'start-dashboard.bat', 'start-dashboard.sh', 'check.bat', 'index.html', '.gitignore'];
const APP_DIRS = ['src', 'server', 'lib', 'mcp', 'tools', 'vendor', 'assets', 'tests'];
// Never in an app copy, wherever they are (personal scripts, caches, secrets).
const NEVER = [
  /(^|\/)(data|state|secrets|logs|backups|node_modules|\.git|\.claude|__pycache__)(\/|$)/i,
  /(^|\/)\.env(\..*)?$/i, /\.lock$/i, /\.pyc$/i, /(^|\/)(Thumbs\.db|desktop\.ini|\.DS_Store)$/i,
  /^tools\/apply_sync\.py$/i, /^tools\/write_snapshot_local.*\.py$/i,
  /(^|\/)(dashboard-backup-|opendash-backup-|opendash-data-|[a-z]+-dashboard-|tasks-).*\.(json|md)$/i, /\.pre-standalone$/i,
  /(^|\/)local-token$/i, /(^|\/)runtime\.json$/i, /\.tmp-[^/]*$/i,
];
const relPosix = (root, p) => relative(root, p).split(sep).join('/');

function walk(dir, root, out, skip) {
  let names;
  try { names = readdirSync(dir).sort(); } catch { return; }
  for (const n of names) {
    const full = join(dir, n);
    const rel = relPosix(root, full);
    if (skip(rel)) continue;
    let st; try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walk(full, root, out, skip);
    else if (st.isFile()) out.push({ full, rel, size: st.size, mtime: st.mtime });
  }
}

export function appFiles(repoRoot = REPO_ROOT) {
  const skip = (rel) => NEVER.some(re => re.test(rel));
  const out = [];
  for (const f of APP_TOP_FILES) {
    const full = join(repoRoot, f);
    if (existsSync(full) && !skip(f)) { const st = statSync(full); out.push({ full, rel: f, size: st.size, mtime: st.mtime }); }
  }
  for (const d of APP_DIRS) walk(join(repoRoot, d), repoRoot, out, skip);
  return out;
}

const CLEAN_GITIGNORE = `# Your data - never commit it. Everything you own lives in the data folder
# (default ./data, or --data-dir / DASHBOARD_DATA_DIR).
/data/
data/
state/
secrets/
.env
.env.*
*.lock
dashboard-backup-*.json
dashboard-data-*.zip
opendash-backup-*.json
opendash-data-*.json
opendash-data-*.zip
# The built page (start-opendash rebuilds it on every start)
/index.html
# Editor / OS noise
.claude/*
.vscode/
.idea/
Thumbs.db
desktop.ini
.DS_Store
node_modules/
`;

export function appFolderName(repoRoot = REPO_ROOT) {
  let v = '0';
  try { v = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')).version || '0'; } catch { /* keep 0 */ }
  return `opendash-v${String(v).replace(/[^0-9a-z.-]/gi, '')}`;
}

export function exportApp(repoRoot = REPO_ROOT) {
  const top = appFolderName(repoRoot);
  const files = appFiles(repoRoot);
  // An empty data folder with a note, so the layout is obvious after unzipping.
  // Unix permissions travel with the zip so start-opendash.sh stays executable on macOS/Linux.
  // The repo's own .gitignore talks about its owner's setup: a copy gets a generic one.
  const entries = files.map(f => ({ name: `${top}/${f.rel}`, data: f.rel === '.gitignore' ? CLEAN_GITIGNORE : readFileSync(f.full), mtime: f.mtime, mode: /\.sh$/.test(f.rel) ? 0o755 : 0o644 }));
  entries.push({ name: `${top}/data/README.txt`, data: 'Your data folder. It is created on first start and is never part of an app copy.\n', mode: 0o644 });
  return { buffer: createZip(entries), name: `${top}.zip`, files: entries.length };
}

// ─── The data ──────────────────────────────────────────────────────────────
// What a data export holds (relative to the data folder). Machine-specific
// files (connections, runtime, token, logs, locks) and secrets are left out.
const DATA_TOP = ['config.json', 'migrations.json'];
const DATA_DIRS = ['state', 'calendar', 'email'];
const DATA_SKIP = (rel) => /(^|\/)backups(\/|$)/i.test(rel) || /(^|\/)sync-backups(\/|$)/i.test(rel)
  || /\.lock$/i.test(rel) || /\.tmp-/i.test(rel) || /(^|\/)__pycache__(\/|$)/i.test(rel) || /\.pyc$/i.test(rel)
  // the actions journal holds undo snapshots and one-machine tokens: it starts fresh after a move
  || /^state\/actions-journal\.json$/i.test(rel);

export function exportData({ dataDir, financeDir }) {
  const p = dataPaths(dataDir);
  const files = [];
  for (const f of DATA_TOP) {
    const full = join(p.root, f);
    if (existsSync(full)) files.push({ full, rel: f, mtime: statSync(full).mtime });
  }
  for (const d of DATA_DIRS) walk(join(p.root, d), p.root, files, DATA_SKIP);
  const fin = financeDir ? resolve(financeDir) : p.finance;
  if (existsSync(fin)) {
    const tmp = [];
    walk(fin, fin, tmp, DATA_SKIP);
    for (const f of tmp) files.push({ ...f, rel: `finance/${f.rel}` });
  }
  const top = `opendash-data-${today(dataDir)}`;
  const manifest = { app: 'dashboard', kind: 'data-export', version: 1, exportedAt: new Date().toISOString(), files: files.length };
  const entries = files.map(f => ({ name: `${top}/${f.rel}`, data: readFileSync(f.full), mtime: f.mtime }));
  entries.push({ name: `${top}/dashboard-export.json`, data: JSON.stringify(manifest, null, 1) });
  return { buffer: createZip(entries), name: `${top}.zip`, files: entries.length };
}

const ALLOWED_IMPORT = (rel) => DATA_TOP.includes(rel) || /^(state|calendar|email|finance)\/.+/.test(rel);

/** Strip a single common top folder, keep only files the data folder may hold. */
function importEntries(buffer) {
  const raw = readZip(buffer);
  const tops = new Set(raw.map(e => e.name.split('/')[0]));
  const strip = tops.size === 1 && raw.every(e => e.name.includes('/')) ? [...tops][0] + '/' : '';
  const entries = [], ignored = [];
  for (const e of raw) {
    const rel = strip ? e.name.slice(strip.length) : e.name;
    if (rel === 'dashboard-export.json') continue;
    if (!ALLOWED_IMPORT(rel) || DATA_SKIP(rel)) { ignored.push(rel); continue; }
    entries.push({ rel, data: e.data, mtime: e.mtime });
  }
  return { entries, ignored };
}

/** What importing this zip would bring in (counts, no content). Throws on a bad zip. */
export function inspectDataZip(buffer) {
  const { entries, ignored } = importEntries(buffer);
  const st = entries.find(e => e.rel === 'state/dashboard-state.json');
  let state = null;
  if (st) {
    try { state = JSON.parse(st.data.toString('utf8')); } catch { throw new Error('the state file in the zip is not valid JSON'); }
    if (!state || !Array.isArray(state.custom)) throw new Error('the zip has no dashboard state (no task list)');
  }
  const cfg = entries.find(e => e.rel === 'config.json');
  if (!st && !cfg) throw new Error('this zip is not an OpenDash data export (no state or config.json)');
  return {
    files: entries.length, ignored: ignored.length,
    tasks: state ? state.custom.length : null,
    people: state && Array.isArray(state.people) ? state.people.length : null,
    hasConfig: !!cfg, financeFiles: entries.filter(e => e.rel.startsWith('finance/')).length,
    savedAt: state && state._lastSave ? new Date(Number(state._lastSave)).toISOString() : null,
  };
}

/** Full copy of the data folder (and an outside finance folder) before a big change. */
export async function backupDataDir(dataDir, label, { financeDir } = {}) {
  const p = dataPaths(dataDir);
  const dest = join(p.backups, `${label}-${stamp()}`);
  const skip = (rel, isDir) => {
    const r = rel.replace(/\\/g, '/');
    return (isDir && (r === 'backups' || r === 'logs' || r === 'state/backups' || r === 'state/sync-backups'
      || r === 'finance/_system/backups' || /(^|\/)__pycache__$/.test(r))) || /\.lock$/.test(r) || /\.tmp-/.test(r);
  };
  const r = await copyTree(p.root, dest, { skip });
  let extra = 0;
  if (financeDir && !isInside(p.root, financeDir) && existsSync(financeDir)) {
    const f = await copyTree(financeDir, join(dest, 'finance-outside'), { skip: (rel, isDir) => isDir && /(^|[\\/])(backups|__pycache__)$/.test(rel) });
    extra = f.copied.length;
  }
  // keep the last 5 of each kind
  const kind = (await fsp.readdir(p.backups)).filter(n => n.startsWith(label + '-')).sort();
  for (const n of kind.slice(0, Math.max(0, kind.length - 5))) await fsp.rm(join(p.backups, n), { recursive: true, force: true });
  return { dest, files: r.copied.length + extra, name: dest.split(/[\\/]/).pop() };
}

/**
 * Replace the data with the zip's. Backs up the current data folder first.
 * The state goes through the store (so open tabs adopt it via live sync);
 * config is merged through setConfig (validated; financeDir is never taken).
 */
export async function importData({ buffer, dataDir, financeDir, store, setConfig, log = () => {} }) {
  const info = inspectDataZip(buffer);
  const { entries } = importEntries(buffer);
  const p = dataPaths(dataDir);
  const fin = financeDir ? resolve(financeDir) : p.finance;
  const backup = await backupDataDir(dataDir, 'pre-import', { financeDir: fin });
  let written = 0;
  for (const e of entries) {
    if (e.rel === 'state/dashboard-state.json') continue;            // below, through the store
    if (e.rel === 'config.json') continue;
    if (e.rel === 'migrations.json') continue;                        // below (merged)
    const target = e.rel.startsWith('finance/') ? join(fin, e.rel.slice('finance/'.length)) : join(p.root, e.rel);
    const base = e.rel.startsWith('finance/') ? fin : p.root;
    if (!isInside(base, target)) throw new Error('refusing a path outside the data folder');
    await atomicWrite(target, e.data);
    written++;
  }
  const cfgE = entries.find(e => e.rel === 'config.json');
  if (cfgE) {
    let c = {};
    try { c = JSON.parse(cfgE.data.toString('utf8')); } catch { /* ignore a broken config */ }
    const { config } = validateConfig(c && typeof c === 'object' ? c : {});
    delete config.financeDir;
    if (!config.onboardedAt) config.onboardedAt = new Date().toISOString();
    await setConfig(config);
    written++;
  }
  const migE = entries.find(e => e.rel === 'migrations.json');
  if (migE) {
    try {
      const m = JSON.parse(migE.data.toString('utf8'));
      if (m && Array.isArray(m.applied)) {
        await withLock(p.migrations, async () => {
          const cur = await readJson(p.migrations, { fallback: { version: 1, applied: [] } });
          const have = new Set((cur.applied || []).map(a => a.id));
          for (const a of m.applied) if (a && typeof a.id === 'string' && !have.has(a.id)) cur.applied.push({ id: a.id, at: a.at || null, changed: !!a.changed });
          await writeJson(p.migrations, cur, { trailingNewline: true });
        });
        written++;
      }
    } catch { /* ignore */ }
  }
  const stE = entries.find(e => e.rel === 'state/dashboard-state.json');
  let version = null;
  if (stE) {
    const next = JSON.parse(stE.data.toString('utf8'));
    dropRetiredState(next);   // an older export's boards (a retired feature) are left out
    const r = await store.mutate(() => ({ next, result: true }), { source: 'script', client: 'data import', summary: 'Imported data from a backup zip' });
    version = r.version;
    written++;
  }
  log('note', `data import: ${written} files written, backup ${backup.name}`);
  return { ...info, written, backup: backup.name, version };
}

// ─── State backups ─────────────────────────────────────────────────────────
const BACKUP_NAME = /^(daily\/)?[A-Za-z0-9][A-Za-z0-9._-]{0,120}\.json$/;

export async function listBackups(paths) {
  const out = [];
  const add = async (dir, prefix, kindOf) => {
    let names = [];
    try { names = await fsp.readdir(dir); } catch { return; }
    for (const n of names) {
      if (!/\.json$/i.test(n) || n.startsWith('.')) continue;
      try {
        const st = await fsp.stat(join(dir, n));
        if (!st.isFile()) continue;
        out.push({ name: prefix + n, kind: kindOf(n), at: st.mtime.toISOString(), size: st.size });
      } catch { /* vanished */ }
    }
  };
  await add(paths.stateBackups, '', (n) => n.startsWith('state-') ? 'automatic' : n.startsWith('manual-') ? 'manual'
    : n.startsWith('pre-restore-') ? 'before restore' : n.startsWith('pre-') ? 'before an upgrade' : n.startsWith('corrupt-') ? 'damaged file' : 'other');
  await add(paths.stateDaily, 'daily/', () => 'daily');
  out.sort((a, b) => b.at.localeCompare(a.at));
  return out;
}

async function readBackupFile(paths, name) {
  if (!BACKUP_NAME.test(String(name || ''))) throw Object.assign(new Error('unknown backup'), { status: 400 });
  const file = name.startsWith('daily/') ? join(paths.stateDaily, name.slice(6)) : join(paths.stateBackups, name);
  if (!isInside(paths.stateBackups, file) || !existsSync(file)) throw Object.assign(new Error('unknown backup'), { status: 404 });
  let obj;
  try { obj = JSON.parse(await fsp.readFile(file, 'utf8')); } catch { throw Object.assign(new Error('that backup is not readable'), { status: 400 }); }
  if (!obj || !Array.isArray(obj.custom)) throw Object.assign(new Error('that backup has no task list'), { status: 400 });
  return obj;
}

export async function backupInfo(paths, name) {
  const obj = await readBackupFile(paths, name);
  return { name, tasks: obj.custom.length, people: Array.isArray(obj.people) ? obj.people.length : 0, savedAt: obj._lastSave ? new Date(Number(obj._lastSave)).toISOString() : null };
}

/** Restore a state backup. The current state is saved as pre-restore-<stamp>.json first. */
export async function restoreBackup({ name, paths, store }) {
  const obj = await readBackupFile(paths, name);
  const r = await store.mutate(async (cur) => {
    await atomicWrite(join(paths.stateBackups, `pre-restore-${stamp()}.json`), JSON.stringify(cur, null, 1));
    // Keep where the user is (UI keys) from the current state; take the data from the backup.
    const next = { ...obj };
    dropRetiredState(next);   // a backup from before the boards were retired
    for (const k of ['view', 'theme', 'density', 'sidebarCollapsed', 'collapsedSidebar']) if (k in cur) next[k] = cur[k];
    return { next, result: true };
  }, { source: 'script', client: 'backup restore', summary: 'Restored a backup' });
  await pruneKind(paths.stateBackups, 'pre-restore-', 10);
  return { restored: name, tasks: obj.custom.length, version: r.version };
}

export async function backupNow({ paths, store }) {
  const txt = await store.readText();
  if (!txt) throw Object.assign(new Error('there is no data to back up yet'), { status: 409 });
  const name = `manual-${stamp()}.json`;
  await atomicWrite(join(paths.stateBackups, name), txt.text);
  await pruneKind(paths.stateBackups, 'manual-', 20);
  return { name };
}

async function pruneKind(dir, prefix, keep) {
  try {
    const names = (await fsp.readdir(dir)).filter(n => n.startsWith(prefix) && n.endsWith('.json')).sort();
    for (const n of names.slice(0, Math.max(0, names.length - keep))) await fsp.unlink(join(dir, n)).catch(() => {});
  } catch { /* none */ }
}

// ─── Reset ─────────────────────────────────────────────────────────────────
/**
 * Start over: back up everything, then an empty state, default settings and
 * connections, no calendar/email snapshots. Finance files are kept unless
 * includeFinance (they are in the backup either way).
 */
export async function resetData({ dataDir, financeDir, store, setConfig, includeFinance = false, log = () => {} }) {
  const p = dataPaths(dataDir);
  const fin = financeDir ? resolve(financeDir) : p.finance;
  const backup = await backupDataDir(dataDir, 'pre-reset', { financeDir: fin });
  await store.mutate(() => ({ next: { custom: [] }, result: true }), { source: 'script', client: 'reset', summary: 'App data reset' });
  const d = validateConfig({}).config;
  delete d.financeDir;
  await setConfig({ ...d, onboardedAt: null });
  await writeJson(p.connections, defaultConnections(), { trailingNewline: true });
  for (const f of [p.calendarFile, p.inboxFile, join(p.stateDir, 'actions-journal.json')]) await fsp.rm(f, { force: true }).catch(() => {});
  let financeCleared = 0;
  if (includeFinance && existsSync(fin)) {
    for (const n of await fsp.readdir(fin)) {
      if (n === '_system') {
        // keep the pipeline's own scripts and rules, drop the data
        for (const s of await fsp.readdir(join(fin, n)).catch(() => [])) {
          if (/^(analysis|summary|balances|balances_history|bank_categories|dashboard_update|budgets)\.json$|^transactions\.csv$/i.test(s)) { await fsp.rm(join(fin, n, s), { force: true }); financeCleared++; }
        }
      } else if (n === 'inbox' || n === 'processed' || n === 'reports') {
        await fsp.rm(join(fin, n), { recursive: true, force: true }); financeCleared++;
      }
    }
  }
  log('note', `app data reset (backup ${backup.name}${includeFinance ? `, finance cleared ${financeCleared}` : ''})`);
  return { backup: backup.name, financeCleared };
}

// ─── Diagnostics ───────────────────────────────────────────────────────────
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
/** Remove paths and addresses that could identify the user. */
export function scrub(text, { dataDir, home = homedir(), repoRoot = REPO_ROOT } = {}) {
  let s = String(text ?? '');
  const subs = [[dataDir, '<data>'], [repoRoot, '<app>'], [home, '~']].filter(([a]) => a);
  for (const [from, to] of subs) {
    for (const v of new Set([from, from.replace(/\\/g, '/'), from.replace(/\//g, '\\')])) s = s.split(v).join(to);
  }
  return s.replace(EMAIL, '<email>').replace(/([?&](token|key|code|secret)=)[^&\s]+/gi, '$1<hidden>');
}

export async function tailLog(file, lines = 40) {
  try {
    const txt = await fsp.readFile(file, 'utf8');
    return txt.split(/\r?\n/).filter(Boolean).slice(-lines);
  } catch { return []; }
}

export async function diagnostics({ dataDir, financeDir, version, store, connections, queue, migrations, financeAvailable, port }) {
  const p = dataPaths(dataDir);
  const st = await store.info().catch(() => ({}));
  const sc = (t) => scrub(t, { dataDir: p.root });
  const conn = {};
  for (const [id, c] of Object.entries(connections || {})) {
    if (!c || typeof c !== 'object' || !('status' in c)) continue;
    conn[id] = { status: c.status, checkedAt: c.checkedAt || null, code: c.code || null, message: c.message ? sc(c.message).slice(0, 240) : null };
  }
  return {
    app: { version, node: process.version, platform: `${platform()} ${release()} (${arch()})`, port, uptimeMin: Math.round(process.uptime() / 60) },
    data: {
      folder: p.root, folderShown: sc(p.root),
      stateExists: !!st.exists, stateSizeKb: st.size ? Math.round(st.size / 1024) : 0, taskCount: st.taskCount ?? null,
      financeAvailable: !!financeAvailable, financeOutside: !!(financeDir && !isInside(p.root, financeDir)),
      migrations: (migrations || []).map(m => m.id),
    },
    connections: conn,
    queue: queue || null,
    log: (await tailLog(p.serverLog, 40)).map(sc),
  };
}

/** Plain-text diagnostics for the clipboard (paths already scrubbed). */
export function diagnosticsText(d) {
  const L = [`OpenDash ${d.app.version} · Node ${d.app.node} · ${d.app.platform}`, `Data folder: ${d.data.folderShown}`,
    `State: ${d.data.stateExists ? `${d.data.stateSizeKb} KB, ${d.data.taskCount ?? '?'} tasks` : 'none yet'} · finance ${d.data.financeAvailable ? 'set up' : 'not set up'}`,
    `Migrations: ${d.data.migrations.join(', ') || 'none'}`, '', 'Connections:'];
  for (const [id, c] of Object.entries(d.connections)) L.push(`  ${id}: ${c.status}${c.code ? ` (${c.code})` : ''}${c.checkedAt ? ` · checked ${c.checkedAt}` : ''}${c.message ? ` · ${c.message}` : ''}`);
  L.push('', 'Recent log:', ...d.log.map(l => '  ' + l));
  return L.join('\n');
}
