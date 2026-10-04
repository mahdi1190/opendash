#!/usr/bin/env node
// tools/migrate.mjs - applies data migrations (tools/migrations/NNN-*.mjs) to a data folder.
//
//   node tools/migrate.mjs                         list applied / pending
//   node tools/migrate.mjs --auto                  back up the data folder, then apply every
//                                                  pending AUTO migration (the launchers run this)
//   node tools/migrate.mjs <id|NNN> [options]      run one migration (also re-runs an applied one)
//   node tools/migrate.mjs --list --json           machine-readable status
//
// Common options: --data-dir <dir> (default: DASHBOARD_DATA_DIR, then <repo>/data),
//                 --dry-run (print what would change, write nothing).
// Exit codes: 0 ok, 1 a migration failed, 2 the legacy folder must be copied first (001).
//
// Migration 001-data-dir is never applied automatically: copying the old
// state/ folder is a one-time step the user runs on purpose.

import { readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { copyTree } from '../lib/fsutil.mjs';
import { resolveDataDir, dataPaths, ensureDataDir, legacyStatus } from '../lib/datadir.mjs';
import { applyMigration, loadApplied } from './migrations/_lib.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIG_DIR = join(HERE, 'migrations');
const BACKUP_KEEP = 5;

export async function loadMigrations(dir = MIG_DIR) {
  const files = readdirSync(dir).filter(f => /^\d{3}-[a-z0-9-]+\.mjs$/.test(f)).sort();
  const mods = [];
  for (const f of files) {
    const m = await import(pathToFileURL(join(dir, f)).href);
    if (m.id !== f.replace(/\.mjs$/, '')) throw new Error(`${f}: export const id must be '${f.replace(/\.mjs$/, '')}'`);
    if (typeof m.run !== 'function') throw new Error(`${f}: must export async function run(ctx)`);
    mods.push({ id: m.id, description: m.description || '', auto: m.auto !== false, run: m.run });
  }
  return mods;
}

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

/** Copy the data folder (minus bulky derived folders) to <data>/backups/pre-migrate-<stamp>/. */
export async function backupDataDir(dataDir) {
  const p = dataPaths(dataDir);
  const dest = join(p.backups, `pre-migrate-${stamp()}`);
  const skip = (rel, isDir) => {
    const r = rel.replace(/\\/g, '/');
    return (isDir && (r === 'backups' || r === 'logs' || r === 'state/backups' || r === 'state/sync-backups'
      || r === 'finance/_system/backups' || /(^|\/)__pycache__$/.test(r))) || /\.lock$/.test(r);
  };
  const r = await copyTree(p.root, dest, { skip });
  const { readdir, rm } = await import('node:fs/promises');
  const old = (await readdir(p.backups)).filter(n => n.startsWith('pre-migrate-')).sort();
  for (const n of old.slice(0, Math.max(0, old.length - BACKUP_KEEP))) await rm(join(p.backups, n), { recursive: true, force: true });
  return { dest, files: r.copied.length };
}

/** Apply pending auto migrations. Returns {status, applied:[...]}. */
export async function autoMigrate({ dataDir, dryRun = false, log = console.log, argv = [], repoRoot } = {}) {
  const legacy = legacyStatus({ dataDir, ...(repoRoot ? { repoRoot } : {}) });
  if (legacy) return { status: 'legacy', legacy, applied: [] };
  const mods = await loadMigrations();
  // A new data folder (missing or empty): the migrations only set it up, so
  // there is nothing to back up and no upgrade to report step by step.
  const root = dataPaths(dataDir).root;
  const fresh = !existsSync(root) || !readdirSync(root).length;
  if (!dryRun) await ensureDataDir(dataDir);
  const done = new Set((await loadApplied(dataPaths(dataDir))).applied.map(a => a.id));
  const pending = mods.filter(m => m.auto && !done.has(m.id));
  if (!pending.length) return { status: 'up-to-date', applied: [] };
  const quiet = fresh && !dryRun;
  if (quiet) log('  A new data folder: setting it up.');
  else if (!dryRun) {
    const b = await backupDataDir(dataDir);
    log(`  backed up the data folder (${b.files} files) to ${b.dest}`);
  }
  const applied = [];
  for (const m of pending) {
    if (!quiet) log(`  ${dryRun ? 'would apply' : 'applying'} ${m.id}: ${m.description}`);
    const r = await applyMigration(m, { dataDir, dryRun, argv, repoRoot, log: quiet ? () => {} : (s) => log('    ' + s) });
    if (!quiet) for (const n of r.notes || []) log('    - ' + n);
    applied.push({ id: m.id, changed: !!r.changed });
  }
  return { status: 'applied', applied, ...(quiet ? { fresh: true } : {}) };
}

async function main(argv) {
  const dataDir = resolveDataDir({ argv });
  const dryRun = argv.includes('--dry-run');
  const asJson = argv.includes('--json');
  const positional = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--') && !['--auto', '--dry-run', '--json', '--list', '--force'].includes(argv[i - 1])));

  if (argv.includes('--auto')) {
    console.log(`\n  Checking data migrations (${dataDir})${dryRun ? ' [dry run]' : ''}`);
    const r = await autoMigrate({ dataDir, dryRun, argv });
    if (r.status === 'legacy') {
      console.error(`\n  Your data is still in the old folder (${r.legacy.legacyStateDir}).`);
      console.error(`  Copy it into the data folder once with:\n\n     ${r.legacy.command}\n`);
      console.error('  Add --finance-from "<folder>" to bring a finance folder along, and --dry-run to preview.\n');
      process.exitCode = 2;
      return;
    }
    console.log(r.status === 'up-to-date' ? '  Data is up to date.\n' : r.fresh ? '  Data folder ready.\n' : `  Applied ${r.applied.length} migration(s).\n`);
    return;
  }

  const mods = await loadMigrations();
  if (positional.length) {
    const want = positional[0];
    const m = mods.find(x => x.id === want || x.id.startsWith(want + '-'));
    if (!m) { console.error(`  No migration '${want}'. Known: ${mods.map(x => x.id).join(', ')}`); process.exitCode = 1; return; }
    console.log(`\n${m.id}${dryRun ? ' (dry run: nothing will be written)' : ''}\n  ${m.description}\n  data folder: ${dataDir}\n`);
    const r = await applyMigration(m, { dataDir, dryRun, argv });
    for (const n of r.notes || []) console.log('  - ' + n);
    console.log(`\n  ${r.changed ? (dryRun ? 'Would change data.' : 'Done.') : 'Nothing to do.'}\n`);
    return;
  }

  const applied = (await loadApplied(dataPaths(dataDir))).applied;
  const legacy = legacyStatus({ dataDir });
  const rows = mods.map(m => ({ id: m.id, auto: m.auto, applied: applied.find(a => a.id === m.id)?.at || null, description: m.description }));
  if (asJson) { console.log(JSON.stringify({ dataDir, legacy: !!legacy, migrations: rows }, null, 1)); return; }
  console.log(`\n  Data folder: ${dataDir}${legacy ? '\n  (old state/ folder not copied yet: ' + legacy.command + ')' : ''}\n`);
  for (const r of rows) console.log(`  ${r.applied ? 'applied ' + r.applied.slice(0, 16) : (r.auto ? 'PENDING          ' : 'manual           ')}  ${r.id}  ${r.description}`);
  console.log('');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(e => { console.error(`\n  Migration failed: ${e.message}\n  Your data folder backup is in <data>/backups/.\n`); process.exitCode = 1; });
}
