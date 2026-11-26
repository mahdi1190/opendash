// lib/update-guard.mjs - an app update is never left half done, and new code never runs unbuilt.
//
// lib/updater.mjs writes <app>/update-in-progress.json before it changes the first file of the app folder, and it
// stays until the new version has been rebuilt:
//   {v: 1, step, from, to, mode: 'zip'|'git', backup?: <data>/update-backup/<from>, added?: [app paths the update
//    adds], pid, at, tried?}
//   step 'install'   files are being written (pid: the server doing it)
//        'rebuild'   every file is in; the new code may run only once migrations, the check and the build have passed
//        'restored'  the previous version was put back: why, and the failed rebuild, for the next server to report
// Before any other app file loads, the launchers' first step (tools/migrate.mjs --auto: guardLaunch) and every server
// start (serve.mjs: guardServe) look at it:
//   install, its server gone   cut off part-way (the window closed, the process ended, the computer stopped): the old
//                              files are put back from the backup and the files the update added are removed
//   rebuild, after a rebuild   DASHBOARD_LAST_REBUILD (any supervisor, or an unsupervised restart) passed: the update
//                              is done. Failed: the old files are put back, so the previous version runs again
//   rebuild, at a plain start  rebuilt here first (node serve.mjs by hand, or the launchers after an interrupted
//                              update). A launcher start that finds it a second time puts the old files back.
// A git update has no backup: a failed rebuild stops with exit 78 and says what to do.
// Node stdlib only and no other app file, so it works whatever mix of old and new files is on disk.

import { existsSync, readdirSync } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { basename, dirname, isAbsolute, join } from 'node:path';

export const UPDATE_MARKER = 'update-in-progress.json';
const STALE_MS = 15 * 60 * 1000;   // an install takes seconds: a marker this old has no live installer
const RETRY = new Set(['EPERM', 'EBUSY', 'EACCES', 'EAGAIN']);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function retry(fn) {
  for (let i = 0, d = 50; ; i++, d = Math.min(1000, d * 2)) {
    try { return await fn(); }
    catch (e) { if (!RETRY.has(e && e.code) || i >= 8) throw e; await sleep(d); }
  }
}
async function writeAtomic(file, data) {
  await mkdir(dirname(file), { recursive: true });
  const tmp = join(dirname(file), `.${basename(file)}.tmp-${process.pid}-${Date.now().toString(36)}`);
  await retry(() => writeFile(tmp, data));
  try { await retry(() => rename(tmp, file)); }
  catch (e) { await rm(tmp, { force: true }).catch(() => {}); throw e; }
}

export const markerFile = (repoRoot) => join(repoRoot, UPDATE_MARKER);
/** The marker, or null when there is none. A marker that cannot be read now (locked) throws: never taken for none. */
export async function readUpdateMarker(repoRoot) {
  let text;
  try { text = await retry(() => readFile(markerFile(repoRoot), 'utf8')); }
  catch (e) { if (e && e.code === 'ENOENT') return null; throw e; }
  try { const m = JSON.parse(text); return m && typeof m === 'object' && !Array.isArray(m) && m.v === 1 ? m : null; }
  catch { return null; }
}
export async function writeUpdateMarker(repoRoot, m) { await writeAtomic(markerFile(repoRoot), JSON.stringify({ ...m, v: 1 }, null, 1)); }
export async function clearUpdateMarker(repoRoot) { await retry(() => rm(markerFile(repoRoot), { force: true })); }

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; }
  catch (e) { return e.code === 'EPERM'; }
}
/** Is the server that wrote an 'install' marker still writing? */
export function installerAlive(m, now = Date.now()) {
  return !!m && m.pid !== process.pid && pidAlive(m.pid) && now - (Date.parse(m.at) || 0) < STALE_MS;
}

const okRel = (p) => typeof p === 'string' && !!p && !isAbsolute(p) && !p.includes('\0') && !p.split(/[\\/]/).includes('..');
const TMP_RE = /^\..+\.tmp-\d+-[0-9a-z]+$/;   // a temp file a cut-off write left (lib/fsutil.mjs atomicWrite, writeAtomic above)
function listFiles(dir) {
  const out = [];
  const walk = (rel) => {
    let names;
    try { names = readdirSync(rel ? join(dir, rel) : dir, { withFileTypes: true }); } catch { return; }
    for (const n of names) {
      const r = rel ? `${rel}/${n.name}` : n.name;
      if (n.isDirectory()) walk(r);
      else if (n.isFile() && !TMP_RE.test(n.name)) out.push(r);
    }
  };
  walk('');
  return out;
}

/** Put the previous version back: every file the backup holds goes over the app folder, the files the update added go. */
export async function putBackUpdate(repoRoot, m) {
  const backup = m && typeof m.backup === 'string' && isAbsolute(m.backup) && basename(dirname(m.backup)) === 'update-backup' ? m.backup : null;
  if (!backup || !existsSync(backup)) return { ok: false, restored: 0, removed: 0, error: 'the copy of the previous version is missing' };
  let restored = 0, removed = 0;
  try {
    for (const rel of listFiles(backup)) {
      if (!okRel(rel)) continue;
      await writeAtomic(join(repoRoot, rel), await retry(() => readFile(join(backup, rel))));
      restored++;
    }
    for (const rel of Array.isArray(m.added) ? m.added : []) {
      if (!okRel(rel)) continue;
      await retry(() => rm(join(repoRoot, rel), { force: true }));
      removed++;
    }
  } catch (e) {
    return { ok: false, restored, removed, error: `${(e && e.code) || 'error'}: ${String((e && e.message) || e).slice(0, 200)}` };
  }
  return { ok: true, restored, removed };
}

/** Run `node <script> ...args` in the app folder (output shown) -> exit code. */
function runNode(repoRoot, script, args, env) {
  const r = spawnSync(process.execPath, [join(repoRoot, script), ...args], {
    cwd: repoRoot, env: { ...env, DASHBOARD_REBUILD_STEP: '1' }, stdio: 'inherit', windowsHide: true, timeout: 5 * 60 * 1000,
  });
  return r.status == null ? -1 : r.status;
}
/** Migrations, the check and the build (as server/lifecycle.mjs rebuildApp) -> {ok, step, code, at, message}. */
function rebuildHere(repoRoot, argv, env) {
  for (const [step, script, args] of [['migrate', 'tools/migrate.mjs', ['--auto', ...argv]], ['check', 'build.mjs', ['--syntax']], ['build', 'build.mjs', []]]) {
    const code = runNode(repoRoot, script, args, env);
    if (code !== 0) return { ok: false, step, code, at: new Date().toISOString(), message: `the ${step} step failed (exit ${code})` };
  }
  return { ok: true, at: new Date().toISOString() };
}
function lastRebuildOf(env) {
  try { const r = JSON.parse(env.DASHBOARD_LAST_REBUILD || 'null'); return r && typeof r === 'object' && typeof r.ok === 'boolean' ? r : null; }
  catch { return null; }
}
const v = (x) => String(x || 'the new version').slice(0, 40);

/** Put the old files back and leave a note for the next server. -> {ok, message}. */
async function restore(repoRoot, m, why, rebuild = null) {
  const r = await putBackUpdate(repoRoot, m);
  if (!r.ok) {
    return { ok: false, message: `OpenDash could not put the previous version (${v(m.from)}) back after the update to ${v(m.to)} (${r.error}). It was not started, so it never runs half updated: start it again in a moment.` };
  }
  await writeUpdateMarker(repoRoot, { step: 'restored', from: m.from, to: m.to, why, ...(rebuild ? { rebuild } : {}), at: new Date().toISOString() });
  return { ok: true, message: `${why[0].toUpperCase()}${why.slice(1)}.` };
}

/**
 * tools/migrate.mjs --auto, the launchers' first step (start-opendash.bat / .sh), before it loads any other app file.
 * -> {go: 'run'} | {go: 'rerun', message} (the previous version's files are back: run them instead) | {go: 'fail', message}
 */
export async function guardLaunch({ repoRoot, env = process.env } = {}) {
  if (env.DASHBOARD_REBUILD_STEP === '1') return { go: 'run' };   // a rebuild's own migrate step: the rebuild decides
  const m = await readUpdateMarker(repoRoot);
  if (!m) return { go: 'run' };
  if (m.step === 'install') {
    if (installerAlive(m)) return { go: 'run' };   // a server is writing it right now: never touched under it
    const r = await restore(repoRoot, m, `the update to ${v(m.to)} was cut off part-way, so ${v(m.from)} was put back`);
    return r.ok ? { go: 'rerun', message: r.message } : { go: 'fail', message: r.message };
  }
  if (m.step === 'rebuild' && m.mode !== 'git' && m.backup) {
    if (!m.tried) { await writeUpdateMarker(repoRoot, { ...m, tried: new Date().toISOString() }); return { go: 'run' }; }
    // An earlier start got this far and the update is still not finished (its migrations or its build failed).
    const r = await restore(repoRoot, m, `the update to ${v(m.to)} could not be finished, so ${v(m.from)} was put back`, { ok: false, step: 'start-up', code: 1, at: new Date().toISOString(), message: 'the update could not be finished at start-up' });
    return r.ok ? { go: 'rerun', message: r.message } : { go: 'fail', message: r.message };
  }
  return { go: 'run' };
}

/**
 * serve.mjs, before it loads any other app file. -> {go: 'start'} | {go: 'restart', message} (the previous version's files
 * are back: start them, not this) | {go: 'stop', message} (exit 78: nothing safe to start). May set DASHBOARD_LAST_STOP /
 * DASHBOARD_LAST_REBUILD in env, which the server then reports (Settings > Server, /api/health, the page's update toast).
 */
export async function guardServe({ repoRoot, argv = [], env = process.env } = {}) {
  const m = await readUpdateMarker(repoRoot);
  if (!m) return { go: 'start' };
  if (m.step === 'restored') {
    if (m.why) env.DASHBOARD_LAST_STOP = String(m.why).slice(0, 300);
    if (m.rebuild && typeof m.rebuild === 'object') env.DASHBOARD_LAST_REBUILD = JSON.stringify(m.rebuild);
    await clearUpdateMarker(repoRoot);
    return { go: 'start' };
  }
  if (m.step === 'install') {
    if (installerAlive(m)) return { go: 'stop', message: 'Another OpenDash is installing an update into this folder right now. Start it again once that has finished.' };
    // index.html is never part of an install, and no build ran since it started: the page there is the old one.
    const r = await restore(repoRoot, m, `the update to ${v(m.to)} was cut off part-way, so ${v(m.from)} was put back`);
    return r.ok ? { go: 'restart', message: r.message } : { go: 'stop', message: r.message };
  }
  if (m.step === 'rebuild') {
    const told = lastRebuildOf(env);
    const r = told || rebuildHere(repoRoot, argv, env);
    if (r.ok) { await clearUpdateMarker(repoRoot); return { go: 'start' }; }
    if (m.mode === 'git' || !m.backup) {
      return { go: 'stop', message: `The update to ${v(m.to)} is in place, but ${r.message || `its ${r.step} step failed`}, so OpenDash was not started (it never runs half updated). Fix the error above, or go back to ${v(m.from)} with git, then start it again.` };
    }
    const back = await restore(repoRoot, m, `the update to ${v(m.to)} did not build (the ${r.step || 'rebuild'} step failed), so ${v(m.from)} was put back`, r);
    if (!back.ok) return { go: 'stop', message: back.message };
    // A failed build writes no page (build.mjs), so after a failed rebuild the old page is still there. A plain start
    // may follow the launchers' own build of the new files: the page is built from the old files again then.
    if (!told) runNode(repoRoot, 'build.mjs', [], env);
    return { go: 'restart', message: back.message };
  }
  return { go: 'start' };
}
