#!/usr/bin/env node
// tools/relocate.mjs - move the data folder (and the app) out of OneDrive, from
// a terminal. The same steps as Settings > Data > "Move my data out of
// OneDrive" (lib/relocate/index.mjs). Without --yes NOTHING is changed: it
// prints the plan, every file count and every setting that would change.
//
//   node tools/relocate.mjs                       the plan (dry run): what would move where,
//                                                 every reference that would be re-pointed
//   node tools/relocate.mjs --to <dir>            ...to another data folder (default: this
//                                                 computer's OpenDash folder\Data)
//        [--app-to <dir> | --no-app | --app]      move the app folder too (default: only
//                                                 when it is in a synced folder)
//   node tools/relocate.mjs --run --yes           do it (OpenDash must be closed first)
//   node tools/relocate.mjs --status              the last move and where things are
//   node tools/relocate.mjs --finish              rename the old folder now (normally done
//                                                 when OpenDash starts in the new place)
//   node tools/relocate.mjs --resume --yes        finish a move a crash interrupted
//   node tools/relocate.mjs --cancel              stop an unfinished copy (nothing was switched)
//   node tools/relocate.mjs --undo [--yes]        what "Undo move" would do / do it
//   --data-dir <dir>   the data folder (default: the one OpenDash uses)
//   --app-dir <dir>    the app folder (default: the one this script is in)
//   --json             machine-readable output
//
// Internal (the server starts it detached after a move or an undo):
//   --handoff --wait <pid,pid> --start <appDir> [--port N] [--start-data <dir>] [--window]
//   waits for the old server to end, renames the old folder, starts OpenDash
//   from <appDir>.
//
// Exit codes: 0 ok, 1 error, 2 refused (a check failed, or OpenDash is running).

import { pathToFileURL } from 'node:url';
import { REPO_ROOT, argValue, resolveDataDir } from '../lib/datadir.mjs';
import { createRelocator } from '../lib/relocate/index.mjs';
import { waitForExit, launchApp } from '../lib/relocate/adapters.mjs';
import { discoverServer } from '../server/actions/auth.mjs';

const has = (argv, f) => argv.includes(f);

/** The plan in plain words. */
export function planText(p) {
  const L = [];
  L.push(p.ok ? 'This is what the move would do (nothing has changed yet):' : 'The move cannot start yet:');
  for (const x of p.problems || []) L.push(`  ! ${x.text}`);
  for (const x of p.warnings || []) L.push(`  - ${x.text}`);
  L.push('');
  L.push(`1. Copy the data folder (${p.data.files} files, ${p.data.size}), checking every file:`);
  L.push(`     from ${p.from.data}`);
  L.push(`     to   ${p.to.data}`);
  if (p.app) {
    L.push(`   and the app folder (${p.app.files} files, ${p.app.size}):`);
    L.push(`     from ${p.from.app}`);
    L.push(`     to   ${p.to.app}`);
  }
  for (const it of p.internal || []) L.push(`   In the copy, ${it.label} is updated to the new place.`);
  L.push('2. Switch: OpenDash on this computer uses the new place from now on.');
  const auto = (p.refs || []).filter(r => r.how === 'auto'), manual = (p.refs || []).filter(r => r.how === 'manual'), info = (p.refs || []).filter(r => r.how === 'info');
  L.push(`3. Update ${auto.length} setting${auto.length === 1 ? '' : 's'} that point at the old place:`);
  for (const r of auto) {
    L.push(`   - ${r.label}`);
    L.push(`       in ${r.where}`);
    for (const c of (r.changes || []).slice(0, 6)) L.push(`       ${c.what}: ${c.before}\n         -> ${c.after}`);
  }
  if (manual.length) {
    L.push('   These need you (a program OpenDash uses for them is missing):');
    for (const r of manual) L.push(`   - ${r.label}\n       ${String(r.manual || '').split('\n').join('\n       ')}`);
  }
  if (info.length) {
    L.push('   Checked, nothing to change:');
    for (const r of info) L.push(`   - ${r.label}: ${r.detail}`);
  }
  L.push(`4. Keep the old folder, renamed to "${String(p.oldName || '').split(/[\\/]/).pop()}", with a README.`);
  L.push('   Nothing is deleted. Settings > Data > Undo move puts everything back.');
  return L.join('\n');
}

export async function main(argv = process.argv.slice(2), { env = process.env, out = (s) => console.log(s), err = (s) => console.error(s) } = {}) {
  const json = has(argv, '--json');
  const print = (obj, text) => out(json ? JSON.stringify(obj, null, 1) : text);

  if (has(argv, '--handoff')) return handoff(argv, { env, err });

  const dataDir = resolveDataDir({ argv, env });
  const home = env === process.env ? undefined : (env.USERPROFILE || env.HOME);
  const R = createRelocator({ dataDir, appDir: argValue(argv, '--app-dir') || REPO_ROOT, env, ...(home ? { home } : {}), log: (lvl, msg) => { if (!json) err(`  ${msg}`); } });
  const opts = {
    ...(argValue(argv, '--to') ? { to: argValue(argv, '--to') } : {}),
    ...(argValue(argv, '--app-to') ? { toApp: argValue(argv, '--app-to'), moveApp: true } : {}),
    ...(has(argv, '--no-app') ? { moveApp: false } : has(argv, '--app') ? { moveApp: true } : {}),
  };
  const running = async () => { const s = await discoverServer(dataDir, { timeoutMs: 2500 }).catch(() => null); return s && s.port ? s : null; };
  const refuseRunning = async () => {
    const s = await running();
    if (!s) return false;
    err(`\n  OpenDash is running (port ${s.port}). Use Settings > Data in OpenDash, or close it first and run this again.\n`);
    return true;
  };

  try {
    if (has(argv, '--status')) { const s = R.status(); print(s, statusText(s)); return 0; }
    if (has(argv, '--finish')) { const r = await R.finish(); print(r, r.length ? r.map(m => m.phase === 'finished' ? `The old folder is now "${Object.values(m.renamed).join('", "')}".` : `Not yet: ${m.finishError}`).join('\n') : 'Nothing to finish.'); return 0; }
    if (has(argv, '--cancel')) { const m = R.cancel(); print(m, 'The unfinished copy was stopped. Nothing was switched; the partial copy is kept and a later move into it finishes it.'); return 0; }
    if (has(argv, '--undo')) {
      const u = await R.undoPlan();
      if (!has(argv, '--yes')) { print(u, undoText(u)); return u.ok ? 0 : 2; }
      if (await refuseRunning()) return 2;
      const r = await R.undo({ onProgress: progress(json, err) });
      print(r, `Done: back in ${r.move.from.data}. Start OpenDash again.`);
      return 0;
    }
    if (has(argv, '--resume')) {
      if (!has(argv, '--yes')) { const s = R.status(); print(s, s.open ? `A move is not finished (${s.move.phase}). Run again with --yes to finish it.` : 'Nothing to resume.'); return 0; }
      if (await refuseRunning()) return 2;
      const r = await R.resume({ onProgress: progress(json, err) });
      if (r) await R.finish();
      print(r, r ? `Done. OpenDash now uses ${r.restart.dataDir}. Start it again.` : 'Nothing to resume.');
      return 0;
    }
    const p = await R.plan(opts);
    if (!has(argv, '--run')) { print(p, planText(p) + (p.ok ? '\n\nTo do it: close OpenDash, then run this again with --run --yes' : '')); return p.ok ? 0 : 2; }
    if (!has(argv, '--yes')) { print(p, planText(p) + '\n\nAdd --yes to do it.'); return 0; }
    if (!p.ok) { print(p, planText(p)); return 2; }
    if (await refuseRunning()) return 2;
    const r = await R.run(opts, { expectId: p.id, onProgress: progress(json, err) });
    const fin = await R.finish();
    const left = r.move.refs.filter(x => ['manual', 'failed', 'skipped'].includes(x.status));
    print({ ...r, finished: fin }, [
      `Done. OpenDash now uses ${r.move.to.data}${r.move.to.app ? ` (app: ${r.move.to.app})` : ''}.`,
      fin[0] && fin[0].phase === 'finished' ? `The old folder is kept as "${Object.values(fin[0].renamed).join('", "')}".` : 'The old folder is renamed the next time OpenDash starts.',
      ...left.map(x => `Still to do: ${x.label}: ${x.error || x.manual}`),
      `Start OpenDash again${r.move.to.app ? ` from ${r.move.to.app}` : ''}.`,
    ].join('\n'));
    return 0;
  } catch (e) {
    if (e.plan) out(json ? JSON.stringify({ error: e.message, code: e.code, plan: e.plan }, null, 1) : `\n  ${e.message}\n`);
    else err(`\n  ${e.message}\n`);
    return e.status === 409 ? 2 : 1;
  }
}

function progress(json, err) {
  let last = '';
  return (p) => {
    if (json) return;
    const line = p.step === 'repoint' ? `  updating: ${p.label}` : p.total ? `  ${p.step}: ${p.done}/${p.total} files` : `  ${p.step}`;
    if (line !== last && (p.step === 'repoint' || !p.done || p.done % 100 === 0 || p.phase === 'copied')) err(line);
    last = line;
  };
}

function statusText(s) {
  const L = [`Data folder: ${s.dataDir}${s.synced.data ? `  (in ${s.synced.data})` : ''}`, `App folder:  ${s.appDir}${s.synced.app ? `  (in ${s.synced.app})` : ''}`];
  if (s.move) L.push(`Last move: ${s.move.phase} (${s.move.createdAt}) ${s.move.from.data} -> ${s.move.to.data}`);
  if (s.canUndo) L.push('It can be undone: node tools/relocate.mjs --undo');
  if (s.others.length) L.push(`Open on: ${s.others.map(o => o.hostname).join(', ')}`);
  return L.join('\n');
}

function undoText(u) {
  if (!u.ok) return ['Undo is not possible right now:', ...u.problems.map(p => `  ! ${p.text}`)].join('\n');
  return [
    'Undo would:',
    u.changedFiles ? `  1. copy ${u.changedFiles} file${u.changedFiles === 1 ? '' : 's'} changed since the move back into the old folder (the versions they replace are kept in its backups/)` : '  1. nothing to copy back: no file changed since the move',
    ...u.places.map(p => (p.now !== p.back ? `  2. rename "${p.now}" back to "${p.back}"` : `  2. use "${p.back}" again`)),
    `  3. put back ${u.refs.length} setting${u.refs.length === 1 ? '' : 's'}: ${u.refs.map(r => r.label).join('; ') || 'none'}`,
    '  The new folder is kept (not deleted). Add --yes to do it.',
  ].join('\n');
}

/** After a move from the page: wait for the old server, finish (rename), start OpenDash from the new place. */
async function handoff(argv, { env, err }) {
  const pids = String(argValue(argv, '--wait') || '').split(',').map(Number).filter(n => Number.isInteger(n) && n > 0);
  const appDir = argValue(argv, '--start');
  if (!appDir) { err('--handoff needs --start <appDir>'); return 1; }
  const left = await waitForExit(pids, { timeoutMs: 120000 });
  if (left.length) err(`still running after 2 minutes: ${left.join(', ')}; starting anyway`);
  const startData = argValue(argv, '--start-data') || null;
  try {
    const dataDir = resolveDataDir({ argv: startData ? ['--data-dir', startData] : [], env, repoRoot: appDir });
    await createRelocator({ dataDir, appDir, env }).finish();
  } catch (e) { err(`the old folder could not be renamed yet: ${e.message}`); }
  launchApp({ appDir, port: Number(argValue(argv, '--port')) || 4173, dataDir: startData, window: has(argv, '--window'), env });
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((c) => { process.exitCode = c; }, (e) => { console.error(e); process.exitCode = 1; });
}

export const _test = { undoText, statusText };
