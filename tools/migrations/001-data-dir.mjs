// 001-data-dir - copy the pre-2.0 layout into the data folder. COPY ONLY:
// nothing is moved or deleted, and nothing already in the data folder is
// overwritten, so it is safe to run twice and safe to undo (delete the copy).
//
//   <repo>/state/                    -> <data>/state/    (state file, backups/, sync-backups/, notes)
//   <repo>/state/calendar.json       -> <data>/calendar/calendar.json
//   <repo>/state/inbox.json          -> <data>/email/inbox.json
//   <repo>/secrets/                  -> <data>/secrets/  (Google OAuth files, if any)
//   --finance-from <folder>          -> <data>/finance/  (the finance pipeline folder)
//
// Options: --legacy-state <dir> (default <repo>/state), --secrets-from <dir>
// (default <repo>/secrets), --finance-from <dir>, --data-dir, --dry-run.
// Not applied by `migrate.mjs --auto`: run it explicitly, once:
//   node tools/migrate.mjs 001-data-dir --finance-from "<finance folder>" --dry-run
//   node tools/migrate.mjs 001-data-dir --finance-from "<finance folder>"

import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { copyTree, isInside } from '../../lib/fsutil.mjs';
import { runIfMain } from './_lib.mjs';

export const id = '001-data-dir';
export const description = 'Copy the old state/ (and a finance folder, if given) into the data folder. Copies only; never moves or overwrites.';
export const auto = false;

const SNAPSHOTS = { 'calendar.json': ['calendar', 'calendar.json'], 'inbox.json': ['email', 'inbox.json'] };
const junk = (rel) => /(^|[\\/])(__pycache__|\.DS_Store|Thumbs\.db|desktop\.ini)$/i.test(rel) || /\.pyc$/i.test(rel);

function countFiles(dir) {
  let n = 0, bytes = 0;
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) { if (!junk(e.name)) walk(p); }
      else if (!junk(e.name)) { n++; bytes += statSync(p).size; }
    }
  };
  if (existsSync(dir)) walk(dir);
  return { n, bytes };
}
const mb = (b) => (b / 1048576).toFixed(1) + ' MB';

export async function run(ctx) {
  const notes = [];
  const { paths, dryRun } = ctx;
  const legacyState = resolve(ctx.arg('--legacy-state') || join(ctx.repoRoot, 'state'));
  const secretsFrom = resolve(ctx.arg('--secrets-from') || join(ctx.repoRoot, 'secrets'));
  const financeFrom = ctx.arg('--finance-from') ? resolve(ctx.arg('--finance-from')) : null;
  let changed = false;

  for (const [label, src] of [['legacy state', legacyState], ['finance', financeFrom], ['secrets', secretsFrom]]) {
    if (src && isInside(paths.root, src)) throw new Error(`the ${label} source is inside the data folder; nothing to copy`);
  }
  if (financeFrom && isInside(financeFrom, paths.root)) throw new Error('the data folder is inside the finance folder; pick a different --data-dir');

  // 1. State folder.
  if (existsSync(legacyState)) {
    const c = countFiles(legacyState);
    notes.push(`state: ${c.n} files (${mb(c.bytes)}) from ${legacyState}`);
    const r = await copyTree(legacyState, paths.stateDir, { dryRun, skip: (rel) => junk(rel) || rel in SNAPSHOTS });
    notes.push(`state: ${dryRun ? 'would copy' : 'copied'} ${r.copied.length}, already there ${r.existing.length}`);
    if (r.existing.includes('dashboard-state.json')) notes.push('state: the data folder already has a state file; it was left untouched');
    changed ||= r.copied.length > 0;
    for (const [name, [dir, file]] of Object.entries(SNAPSHOTS)) {
      const from = join(legacyState, name);
      if (!existsSync(from)) continue;
      const to = join(paths.root, dir, file);
      if (existsSync(to)) { notes.push(`${name}: already in ${dir}/`); continue; }
      const rr = await copyTree(legacyState, join(paths.root, dir), { dryRun, skip: (rel) => rel !== name });
      if (!dryRun && rr.copied.length) {
        const { rename } = await import('node:fs/promises');
        if (name !== file) await rename(join(paths.root, dir, name), to);
      }
      notes.push(`${name}: ${dryRun ? 'would copy' : 'copied'} to ${dir}/${file}`);
      changed = true;
    }
  } else {
    notes.push(`state: no legacy folder at ${legacyState} (nothing to copy)`);
  }

  // 2. Finance folder.
  if (financeFrom) {
    if (!existsSync(financeFrom)) throw new Error(`--finance-from folder does not exist: ${financeFrom}`);
    const c = countFiles(financeFrom);
    notes.push(`finance: ${c.n} files (${mb(c.bytes)}) from ${financeFrom}`);
    const r = await copyTree(financeFrom, paths.finance, { dryRun, skip: junk });
    notes.push(`finance: ${dryRun ? 'would copy' : 'copied'} ${r.copied.length}, already there ${r.existing.length}`);
    changed ||= r.copied.length > 0;
  } else {
    notes.push('finance: no --finance-from given (the finance folder stays wherever it is; pass --finance-from to copy it)');
  }

  // 3. Google OAuth secrets.
  if (existsSync(secretsFrom) && readdirSync(secretsFrom).length) {
    const r = await copyTree(secretsFrom, paths.secrets, { dryRun, skip: junk });
    notes.push(`secrets: ${dryRun ? 'would copy' : 'copied'} ${r.copied.length} file(s), already there ${r.existing.length}`);
    changed ||= r.copied.length > 0;
  }

  // 4. Verify the copied state file.
  if (!dryRun && existsSync(paths.stateFile)) {
    const s = JSON.parse(readFileSync(paths.stateFile, 'utf8'));
    if (!Array.isArray(s.custom)) throw new Error('the copied state file has no task list; check it before starting the server');
    notes.push(`verified: state file parses, ${s.custom.length} tasks`);
  }
  notes.push('The old folders were not changed. Delete them yourself once the dashboard works from the data folder.');
  return { changed, notes };
}

await runIfMain(import.meta.url, { id, description, auto, run });
