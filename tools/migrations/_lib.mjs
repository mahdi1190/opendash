// tools/migrations/_lib.mjs - shared helpers for data migrations.
//
// A migration is a file tools/migrations/NNN-name.mjs exporting:
//
//   export const id = 'NNN-name';          // must equal the file name
//   export const description = '...';
//   export const auto = true;              // true: applied by `migrate.mjs --auto`
//                                          // false: only when asked by id (e.g. 001)
//   export async function run(ctx) { ... return { changed, notes: [] }; }
//
//   ctx = { dataDir, paths, dryRun, argv, arg(name), log(msg), repoRoot, state }
//   ctx.state.read()            -> state object or null (no state file)
//   ctx.state.write(obj)        -> writes it under the lock, after a backup copy,
//                                  bumping _lastSave so open tabs reload
//
// Rules: idempotent (running twice changes nothing the second time), no
// network, Node stdlib only, never delete user data, honour ctx.dryRun, and
// print counts rather than personal content.
//
// Every migration file ends with:   await runIfMain(import.meta.url, { id, description, auto, run });
// so it can also be run on its own:  node tools/migrations/NNN-name.mjs --data-dir <dir> [--dry-run]

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readJson, writeJson, withLock, atomicWrite } from '../../lib/fsutil.mjs';
import { REPO_ROOT, argValue, resolveDataDir, dataPaths, ensureDataDir } from '../../lib/datadir.mjs';

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

export function stateIO(paths, { dryRun = false, migrationId = 'migration' } = {}) {
  return {
    exists: () => existsSync(paths.stateFile),
    async read() {
      if (!existsSync(paths.stateFile)) return null;
      return readJson(paths.stateFile);
    },
    async write(obj) {
      if (dryRun) return false;
      await withLock(paths.stateFile, async () => {
        let prevSave = 0;
        if (existsSync(paths.stateFile)) {
          const prevText = readFileSync(paths.stateFile, 'utf8');
          try { prevSave = Number(JSON.parse(prevText)._lastSave) || 0; } catch { /* keep 0 */ }
          await atomicWrite(join(paths.stateBackups, `pre-${migrationId}-${stamp()}.json`), prevText);
        }
        obj._lastSave = Math.max(Date.now(), prevSave + 1);
        await atomicWrite(paths.stateFile, JSON.stringify(obj, null, 1));
      });
      return true;
    },
  };
}

export async function loadApplied(paths) {
  const m = await readJson(paths.migrations, { fallback: null });
  return m && Array.isArray(m.applied) ? m : { version: 1, applied: [] };
}

export async function recordApplied(paths, id, result) {
  await withLock(paths.migrations, async () => {
    const m = await loadApplied(paths);
    m.applied = m.applied.filter(a => a.id !== id);
    m.applied.push({ id, at: new Date().toISOString(), changed: !!result?.changed });
    await writeJson(paths.migrations, m, { trailingNewline: true });
  });
}

export function makeCtx({ dataDir, argv = [], dryRun = false, migrationId, log = (s) => console.log('  ' + s), repoRoot = REPO_ROOT }) {
  const paths = dataPaths(dataDir);
  return {
    dataDir: paths.root, paths, dryRun, argv, repoRoot, log,
    arg: (name) => argValue(argv, name),
    state: stateIO(paths, { dryRun, migrationId }),
  };
}

/** Run one migration module against a data dir; records it unless dry-run. */
export async function applyMigration(mod, { dataDir, argv = [], dryRun = false, log, repoRoot } = {}) {
  if (!dryRun) await ensureDataDir(dataDir);
  const ctx = makeCtx({ dataDir, argv, dryRun, migrationId: mod.id, log, repoRoot });
  const result = (await mod.run(ctx)) || { changed: false, notes: [] };
  if (!dryRun) await recordApplied(ctx.paths, mod.id, result);
  return result;
}

/** Lets a migration file run standalone. */
export async function runIfMain(metaUrl, mod) {
  const main = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === metaUrl;
  if (!main) return;
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const dataDir = resolveDataDir({ argv });
  console.log(`\n${mod.id}${dryRun ? ' (dry run: nothing will be written)' : ''}\n  ${mod.description}\n  data folder: ${dataDir}\n`);
  try {
    const r = await applyMigration(mod, { dataDir, argv, dryRun });
    for (const n of r.notes || []) console.log('  - ' + n);
    console.log(`\n  ${r.changed ? (dryRun ? 'Would change data.' : 'Done.') : 'Nothing to do.'}\n`);
  } catch (e) {
    console.error(`\n  FAILED: ${e.message}\n`);
    process.exitCode = 1;
  }
}

export { REPO_ROOT, dataPaths, ensureDataDir, readJson, writeJson, existsSync, join };
