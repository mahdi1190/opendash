#!/usr/bin/env node
// tools/make-test-data.mjs - build a complete, current-schema test data folder
// from real data, READING the sources only.
//
//   node tools/make-test-data.mjs <dest> [--state-from <file|dir>] [--finance-from <dir>] [--force] [--no-finance]
//
// Sources (read-only):
//   state     --state-from, else <repo>/data/state, else the legacy <repo>/state
//             (only dashboard-state.json and the calendar/inbox snapshots are
//             copied, not the backups)
//   finance   --finance-from, else <repo>/data/finance if it has a _system store or rules
// The destination must not be inside the repo or any source, and must be
// empty unless --force. After copying, every pending auto migration is applied
// to the COPY, so test servers see exactly what an upgraded user would.
//
// Then:  node serve.mjs --data-dir <dest> --port <yours> --no-open

import { existsSync, readdirSync, statSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { join, resolve, dirname, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { copyTree, isInside, readJson } from '../lib/fsutil.mjs';
import { REPO_ROOT, argValue, dataPaths, ensureDataDir } from '../lib/datadir.mjs';
import { autoMigrate } from './migrate.mjs';

const junk = (rel) => /(^|[\\/])(__pycache__|\.DS_Store|Thumbs\.db|desktop\.ini)$/i.test(rel) || /\.(pyc|lock)$/i.test(rel);

export async function makeTestData(dest, { stateFrom, financeFrom, force = false, noFinance = false, log = console.log } = {}) {
  if (!dest) throw new Error('usage: node tools/make-test-data.mjs <dest> [--state-from X] [--finance-from Y] [--force]');
  dest = resolve(dest);
  if (isInside(REPO_ROOT, dest)) throw new Error('the destination must be outside the repo (use e.g. C:/tmp/<you>/data)');

  // Resolve sources.
  const repoData = dataPaths(join(REPO_ROOT, 'data'));
  let stateDir = null, stateFile = null;
  if (stateFrom) {
    const s = resolve(stateFrom);
    if (existsSync(s) && statSync(s).isDirectory()) { stateDir = s; stateFile = join(s, 'dashboard-state.json'); }
    else { stateFile = s; stateDir = dirname(s); }
  } else if (existsSync(repoData.stateFile)) { stateDir = repoData.stateDir; stateFile = repoData.stateFile; }
  else if (existsSync(join(REPO_ROOT, 'state', 'dashboard-state.json'))) { stateDir = join(REPO_ROOT, 'state'); stateFile = join(stateDir, 'dashboard-state.json'); }
  if (!stateFile || !existsSync(stateFile)) throw new Error('no state file found to copy (use --state-from)');

  let fin = null;
  if (!noFinance) {
    if (financeFrom) fin = resolve(financeFrom);
    else if (['transactions.csv', 'rules.json', 'spend.py'].some(f => existsSync(join(repoData.finance, '_system', f)))) fin = repoData.finance;
    if (fin && !existsSync(fin)) throw new Error(`finance folder not found: ${fin}`);
  }
  for (const src of [stateDir, fin].filter(Boolean)) {
    if (isInside(src, dest) || isInside(dest, src)) throw new Error(`the destination overlaps a source (${src})`);
  }
  if (existsSync(dest) && readdirSync(dest).length) {
    if (!force) throw new Error(`${dest} is not empty (add --force to replace it)`);
    await rm(dest, { recursive: true, force: true });
  }
  await mkdir(dest, { recursive: true });
  const p = await ensureDataDir(dest);

  // State file + snapshots (whichever layout the source uses).
  const sp = await readJson(stateFile);
  if (!sp || !Array.isArray(sp.custom)) throw new Error('the source state file has no task list');
  await copyTree(dirname(stateFile), p.stateDir, { skip: (rel, isDir) => isDir || rel !== basename(stateFile) });
  if (basename(stateFile) !== 'dashboard-state.json') {
    const { rename } = await import('node:fs/promises');
    await rename(join(p.stateDir, basename(stateFile)), p.stateFile);
  }
  const snaps = [
    [join(stateDir, 'calendar.json'), p.calendar, 'calendar.json'],
    [join(stateDir, '..', 'calendar', 'calendar.json'), p.calendar, 'calendar.json'],
    [join(stateDir, 'inbox.json'), p.email, 'inbox.json'],
    [join(stateDir, '..', 'email', 'inbox.json'), p.email, 'inbox.json'],
  ];
  let nSnap = 0;
  for (const [from, toDir, name] of snaps) {
    if (!existsSync(from) || existsSync(join(toDir, name))) continue;
    const r = await copyTree(dirname(from), toDir, { skip: (rel, isDir) => isDir || rel !== name });
    nSnap += r.copied.length;
  }
  log(`  state: ${sp.custom.length} tasks copied${nSnap ? `, ${nSnap} snapshot file(s)` : ''}`);

  if (fin) {
    const r = await copyTree(fin, p.finance, { skip: (rel, isDir) => junk(rel) || (isDir && /(^|[\\/])_system[\\/]backups$/.test(rel)) });
    log(`  finance: ${r.copied.length} files copied`);
  } else {
    log('  finance: none (pass --finance-from <folder> to include it)');
  }

  const m = await autoMigrate({ dataDir: dest, log: (s) => log('  ' + s.trim()) });
  log(`  migrations: ${m.status}${m.applied.length ? ' (' + m.applied.map(a => a.id).join(', ') + ')' : ''}`);
  return { dest, tasks: sp.custom.length, finance: !!fin };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const argv = process.argv.slice(2);
  const dest = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && ['--state-from', '--finance-from'].includes(argv[i - 1])));
  console.log(`\n  Building a test data folder at ${dest ? resolve(dest) : '?'} (sources are only read)`);
  makeTestData(dest, {
    stateFrom: argValue(argv, '--state-from'), financeFrom: argValue(argv, '--finance-from'),
    force: argv.includes('--force'), noFinance: argv.includes('--no-finance'),
  }).then(r => console.log(`\n  Done. Start a test server with:\n     node serve.mjs --data-dir "${r.dest}" --port <your port> --no-open\n`))
    .catch(e => { console.error(`\n  ${e.message}\n`); process.exitCode = 1; });
}
