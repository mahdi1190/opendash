// lib/relocate/index.mjs - "Move my data out of OneDrive": move the data
// folder (and, if it is in a synced folder too, the app folder) to a place
// that belongs to this computer only, with nothing lost and everything
// reversible. Settings > Data (server/routes/relocate.mjs) and
// tools/relocate.mjs both use it.
//
// THE STEPS of run():
//   1. checks       nobody else has the folder open (lib/hosts.mjs), the new place is
//                   empty, on this computer, not in a synced folder, and the drive
//                   has room; a plan made a moment ago must still be the same
//   2. writes stop  (opts.gate: the server's move gate answers 423 MOVING)
//   3. copy         every file copied and verified by SHA-256 (lib/relocate/copy.mjs),
//                   resumable after a crash; files that change during the copy
//                   are copied again
//   4. switch       this computer's record (lib/relocate/record.mjs) redirects the old
//                   folder to the new one: every OpenDash program now uses the new place
//   5. re-point     start-up entries, MCP configs, skills, shortcuts
//                   (lib/relocate/refs.mjs), each only if it is still as found
//   6. finish       (after the server stopped, so nothing has the old folder open)
//                   the old folder is renamed '<name> (moved to <where> on <date>)'
//                   and gets a README. It is NEVER deleted: that is the user's choice.
//
// undo() reverses it: files changed since the move are copied back first (the
// old versions they replace are kept in <old>/backups/before-undo-<stamp>/),
// the old folder gets its name back, every reference that still looks as the
// move left it is put back, and the redirect ends.
//
// Everything that touches the operating system comes in through `adapters`
// (lib/relocate/adapters.mjs realAdapters() by default), so tests use fakes
// and a future app can bring its own.

import { existsSync, statSync, readdirSync, readFileSync, writeFileSync, promises as fsp } from 'node:fs';
import { join, dirname, basename, resolve, relative, sep } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { homedir, tmpdir, hostname as osHostname } from 'node:os';
import { deviceBase } from '../devicedir.mjs';
import { othersLive as hostsOthersLive } from '../hosts.mjs';
import { samePath, isUnder, syncedFolderKind, movedFolderName, freeName, localDate, mapText } from './paths.mjs';
import { scanTree, copyTree, copyFiles, hashFile } from './copy.mjs';
import { readRecord, saveMove, openMove, undoableMove, OPEN_PHASES } from './record.mjs';
import { discoverRefs, applyRef, undoRef, publicRef } from './refs.mjs';
import { realAdapters, underTestRunner } from './adapters.mjs';

export const MARKER = '.opendash-move.json';
export const README = 'README - this folder was moved.txt';
export const NEW_README = 'README - this folder is not used.txt';
const MARGIN = (n) => Math.round(n * 0.05) + 64 * 1024 * 1024;   // room to spare on the new drive

/** Data-folder entries that belong to this computer's running server, not to the data. */
const DATA_SKIP = (rel, isDir) => {
  if (isDir) return rel === 'hosts';
  const name = rel.split('/').pop();
  return rel === 'runtime.json' || rel === MARKER || /\.lock$/i.test(name) || /\.tmp-/i.test(name) || /\.odmove-\d+-/.test(name);
};
const mayChange = (rel) => rel.startsWith('logs/');
const OLD_DATA_RE = /^data \(moved to .+ on \d{4}-\d{2}-\d{2}\)( \d+)?$/;

export class RelocateError extends Error {
  constructor(code, message, status = 409, extra = {}) { super(message); this.code = code; this.status = status; Object.assign(this, extra); }
}

const human = (n) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n >= 1e6 ? `${Math.round(n / 1e6)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);
const isEmptyDir = (p) => { try { return readdirSync(p).length === 0; } catch { return false; } };
const readMarker = (dir) => { try { return JSON.parse(readFileSync(join(dir, MARKER), 'utf8')); } catch { return null; } };

/**
 * createRelocator(opts) -> {status, plan, run, resume, cancel, finish, undoPlan, undo}
 * opts: {dataDir, appDir, platform, env, home, hostname, base (this computer's
 * folder for the record; default deviceBase), adapters, othersLive() -> [],
 * now(), log(level, msg)}
 */
export function createRelocator(opts = {}) {
  const platform = opts.platform || process.platform;
  // Under the test runner, a caller that brings no home and environment of its own
  // (a test server's route) never looks at this computer's real settings files.
  const testing = underTestRunner();
  const env = opts.env || (testing ? { NODE_TEST_CONTEXT: process.env.NODE_TEST_CONTEXT || 'child', ...(process.env.DASHBOARD_DEVICE_DIR ? { DASHBOARD_DEVICE_DIR: process.env.DASHBOARD_DEVICE_DIR } : {}) } : process.env);
  const home = opts.home || (testing ? join(tmpdir(), 'opendash-test-home') : homedir());
  const host = opts.hostname || osHostname();
  const now = opts.now || (() => Date.now());
  const log = opts.log || (() => {});
  const dataDir = resolve(opts.dataDir);
  const appDir = opts.appDir ? resolve(opts.appDir) : null;
  const base = opts.base || deviceBase({ env, platform, home, dataDir });
  const rec = { base };                    // record options
  const ad = opts.adapters || realAdapters({ env, platform, home });
  const others = opts.othersLive || (() => hostsOthersLive(dataDir));
  const free = ad.freeBytes || (() => null);

  /** Where things go by default: <this computer's OpenDash folder>/Data and /App (a free name). */
  function suggested() {
    const pick = (name) => freeName(join(base, name), (p) => existsSync(p) && !isEmptyDir(p) && !(readMarker(p) && readMarker(p).from && samePath(readMarker(p).from.data, dataDir, platform)));
    return { data: pick('Data'), app: pick('App') };
  }

  function status() {
    const r = readRecord(rec);
    const open = openMove(r);
    const undoable = undoableMove(r);
    const last = r.moves.length ? r.moves[r.moves.length - 1] : null;
    const dataSynced = syncedFolderKind(dataDir, env), appSynced = appDir ? syncedFolderKind(appDir, env) : null;
    let liveOthers = [];
    try { liveOthers = others() || []; } catch { liveOthers = []; }
    return {
      dataDir, appDir, synced: { data: dataSynced, app: appSynced }, dataInsideApp: !!appDir && isUnder(dataDir, appDir, platform),
      suggested: suggested(), recommendApp: !!appSynced,
      move: open || last ? publicMove(open || last) : null, open: !!open, canUndo: !!undoable,
      others: liveOthers.map(h => ({ hostname: h.hostname, lastSeenMs: h.lastSeenMs })),
    };
  }

  // ─── The plan (read-only; this IS the dry run) ─────────────────────────
  async function plan({ to, toApp, moveApp } = {}) {
    const problems = [], warnings = [];
    const sug = suggested();
    const target = resolve(to || sug.data);
    const wantApp = moveApp === undefined ? !!(appDir && syncedFolderKind(appDir, env)) : !!moveApp;
    const appTarget = wantApp && appDir ? resolve(toApp || sug.app) : null;
    const from = { data: dataDir, app: appDir };
    const dest = { data: target, app: appTarget };

    // what is there to move
    if (!existsSync(dataDir)) problems.push({ code: 'NO_DATA', text: `The data folder is not there: ${dataDir}` });
    const r = readRecord(rec);
    const open = openMove(r);
    if (open && open.phase !== 'copying') problems.push({ code: 'BUSY', text: 'A move is not finished yet. Finish it (or undo it) first.' });
    // nobody else has it open
    let live = [];
    try { live = others() || []; } catch { live = []; }
    if (live.length) problems.push({ code: 'OTHER_COMPUTER', text: `OpenDash is open on ${live[0].hostname || 'another computer'} with this data folder. Close it there first, then try again.` });
    // the destination(s)
    for (const [kind, p] of [['data', target], ['app', appTarget]]) {
      if (!p) continue;
      const label = kind === 'data' ? 'The new data folder' : 'The new app folder';
      const cloud = syncedFolderKind(p, env);
      if (cloud) problems.push({ code: 'SYNCED', text: `${label} would be inside ${cloud}. Choose a folder that is only on this computer.` });
      if (isUnder(p, dataDir, platform) || isUnder(dataDir, p, platform)) problems.push({ code: 'NESTED', text: `${label} cannot be inside the data folder, or hold it.` });
      if (kind === 'data' && appDir && !appTarget && isUnder(p, appDir, platform)) problems.push({ code: 'NESTED', text: 'The new data folder cannot be inside the app folder.' });
      if (kind === 'app' && (isUnder(p, appDir, platform) || isUnder(appDir, p, platform))) problems.push({ code: 'NESTED', text: 'The new app folder cannot be inside the old one, or hold it.' });
      if (existsSync(p)) {
        let st; try { st = statSync(p); } catch { st = null; }
        const m = readMarker(p);
        const ours = m && m.from && samePath(m.from[kind === 'data' ? 'data' : 'app'], kind === 'data' ? dataDir : appDir, platform);
        if (!st || !st.isDirectory()) problems.push({ code: 'NOT_A_FOLDER', text: `${label} path is a file, not a folder: ${p}` });
        else if (!ours && !isEmptyDir(p)) problems.push({ code: 'NOT_EMPTY', text: `${p} already has files in it. Choose an empty or new folder.` });
        else if (ours) warnings.push({ code: 'RESUME', text: `An earlier copy into ${p} was not finished; it will be completed (files already copied are checked, not copied again).` });
      }
      if (platform === 'win32' && !/^[A-Za-z]:\\/.test(p)) problems.push({ code: 'PATH', text: `${label} must be on a drive with a letter (like C:\\...).` });
      if (/["%!^&|<>\r\n\t]/.test(p)) problems.push({ code: 'PATH', text: `${label} path has a character (" % ! ^ & | < >) that start-up commands cannot use.` });
    }
    if (appTarget && samePath(appTarget, target, platform)) problems.push({ code: 'NESTED', text: 'The app and the data need two different folders.' });
    if (appTarget && (isUnder(target, appTarget, platform) || isUnder(appTarget, target, platform))) problems.push({ code: 'NESTED', text: 'Keep the new app folder and the new data folder side by side, not one inside the other.' });

    // sizes and room
    let dataScan = { files: [], bytes: 0 }, appScan = { files: [], bytes: 0 };
    if (existsSync(dataDir)) dataScan = await scanTree(dataDir, { skip: DATA_SKIP });
    const appSkip = appSkipper();
    if (appTarget) appScan = await scanTree(appDir, { skip: appSkip });
    const needData = dataScan.bytes + MARGIN(dataScan.bytes), needApp = appTarget ? appScan.bytes + MARGIN(appScan.bytes) : 0;
    const sameDrive = !appTarget || (platform === 'win32' ? target.slice(0, 2).toLowerCase() === appTarget.slice(0, 2).toLowerCase() : true);
    const freeData = free(target), freeApp = appTarget ? free(appTarget) : null;
    const checkRoom = (have, need, where) => { if (have != null && have < need) problems.push({ code: 'NO_SPACE', text: `There is not enough free space on the drive for ${where}: it needs about ${human(need)}, ${human(have)} is free. Free up some space, or choose another drive.` }); };
    if (sameDrive) checkRoom(freeData, needData + needApp, 'the move');
    else { checkRoom(freeData, needData, 'the data'); checkRoom(freeApp, needApp, 'the app'); }
    if (freeData == null) warnings.push({ code: 'SPACE_UNKNOWN', text: 'The free space on the new drive could not be read; make sure there is room for about ' + human(needData + needApp) + '.' });

    // the references (read-only)
    const mappings = mappingsFor(from, dest);
    let refs = [];
    try { refs = await discoverRefs({ mappings, from, to: dest, platform, env, home, adapters: ad }); }
    catch (e) { warnings.push({ code: 'REFS', text: `Some settings could not be checked (${e.message}).` }); }
    const internal = internalRefs(from, dest);
    if (dataSynced(dataDir) && !appTarget && appDir && syncedFolderKind(appDir, env)) warnings.push({ code: 'APP_SYNCED', text: `The app folder stays in ${syncedFolderKind(appDir, env)}. Moving it too is recommended.` });
    for (const r2 of refs) if (r2.note) warnings.push({ code: 'NOTE', text: `${r2.label}: ${r2.note}` });
    if (refs.some(r2 => ['claude-code', 'desktop-json', 'codex', 'gemini'].includes(r2.kind))) {
      warnings.push({ code: 'CLOSE_ASSISTANTS', text: 'Close Claude Code, Claude Desktop, Codex and Gemini CLI if they are open, and open them again after the move: until they restart, their OpenDash tools still look for the old place (they say so; they never write there).' });
    }

    const id = createHash('sha256').update(JSON.stringify({ from, dest, refs: refs.map(x => [x.id, x.how, x.before, x.after]) })).digest('hex').slice(0, 16);
    return {
      id, ok: problems.length === 0, problems, warnings,
      from, to: dest, moveApp: !!appTarget,
      data: { files: dataScan.files.length, bytes: dataScan.bytes, size: human(dataScan.bytes) },
      app: appTarget ? { files: appScan.files.length, bytes: appScan.bytes, size: human(appScan.bytes) } : null,
      free: { data: freeData, app: freeApp, needed: needData + needApp },
      oldName: renamedTarget(appTarget && isUnder(dataDir, appDir, platform) ? appDir : dataDir, appTarget && isUnder(dataDir, appDir, platform) ? appTarget : target, now()),
      refs: refs.map(publicRef), internal,
      counts: { auto: refs.filter(x => x.how === 'auto').length, manual: refs.filter(x => x.how === 'manual').length, info: refs.filter(x => x.how === 'info').length },
      _refs: refs,
    };
  }
  const dataSynced = (p) => !!syncedFolderKind(p, env);

  function appSkipper() {
    const relData = appDir && isUnder(dataDir, appDir, platform) ? relative(appDir, dataDir).split(sep).join('/') : null;
    let gitIsFile = false;
    try { gitIsFile = statSync(join(appDir, '.git')).isFile(); } catch { gitIsFile = false; }
    // (an earlier move's renamed data folder inside the app folder is not copied again)
    return (rel, isDir) => (relData && rel === relData) || (isDir && !rel.includes('/') && OLD_DATA_RE.test(rel)) ||(rel === '.git' && !isDir && gitIsFile) || rel === MARKER || /\.odmove-\d+-/.test(rel.split('/').pop());
  }

  function mappingsFor(from, dest) {
    const m = [{ from: from.data, to: dest.data }];
    if (dest.app && from.app) m.push({ from: from.app, to: dest.app });
    return m;
  }

  /** Paths inside the NEW copy that name the old place (config.json financeDir, a .env file). */
  function internalRefs(from, dest) {
    const out = [];
    const mappings = mappingsFor(from, dest);
    for (const rel of ['config.json', '.env']) {
      const f = join(from.data, rel);
      let t; try { t = readFileSync(f, 'utf8'); } catch { continue; }
      const m = mapText(t, mappings, platform);
      if (m.count) out.push({ rel, label: rel === 'config.json' ? 'Settings (a folder you chose, such as the finance folder)' : 'The .env file', count: m.count });
    }
    return out;
  }

  function renamedTarget(oldPath, newPath, at) {
    const parent = dirname(oldPath);
    const name = movedFolderName(basename(oldPath), newPath, localDate(at), { home, platform });
    return join(parent, freeName(name, (n) => existsSync(join(parent, n))).split(/[\\/]/).pop());
  }

  // ─── Run ───────────────────────────────────────────────────────────────
  async function run(input = {}, { onProgress = () => {}, gate = null, expectId = null } = {}) {
    const p = await plan(input);
    if (expectId && p.id !== expectId) throw new RelocateError('PLAN_CHANGED', 'Something changed since you looked at the plan. Please look at it again.', 409, { plan: stripPlan(p) });
    if (!p.ok) throw new RelocateError(p.problems[0].code, p.problems.map(x => x.text).join(' '), 409, { plan: stripPlan(p) });
    const r = readRecord(rec);
    const resumed = openMove(r);
    const move = resumed && resumed.phase === 'copying' && samePath(resumed.from.data, dataDir, platform) && samePath(resumed.to.data, p.to.data, platform)
      ? resumed
      : {
        id: `${new Date(now()).toISOString().replace(/[-:]/g, '').slice(0, 15)}-${randomBytes(3).toString('hex')}`,
        phase: 'copying', createdAt: new Date(now()).toISOString(), host, from: p.from, to: p.to,
        redirects: [], renamed: {}, refs: [], internal: p.internal,
      };
    if (resumed && resumed !== move) { resumed.phase = 'cancelled'; resumed.cancelledAt = new Date(now()).toISOString(); saveMove(resumed, rec); }
    move.refs = p._refs.map(x => ({ ...x }));
    move.redirects = redirectsFor(move);
    if (gate && gate.pause) gate.pause();
    try {
      saveMove(move, rec);
      return await carryOn(move, { onProgress });
    } catch (e) {
      if (move.phase === 'copying' && gate && gate.resume) gate.resume();   // nothing switched: back to normal
      throw e;
    }
  }

  function redirectsFor(move) {
    const out = [{ from: move.from.data, to: move.to.data }];
    // The new app copy has no data/ folder: its default place leads to the new data folder.
    if (move.to.app) out.push({ from: join(move.to.app, 'data'), to: move.to.data });
    return out;
  }

  async function writeMarker(dir, move) {
    await fsp.mkdir(dir, { recursive: true });
    if (!existsSync(join(dir, MARKER))) writeFileSync(join(dir, MARKER), JSON.stringify({ id: move.id, from: move.from, startedAt: move.createdAt, host }, null, 1) + '\n');
  }

  /** Continue a move from wherever it stopped (copying -> switching -> switched). */
  async function carryOn(move, { onProgress = () => {} } = {}) {
    if (move.phase === 'copying') {
      await writeMarker(move.to.data, move);
      const d = await copyTree(move.from.data, move.to.data, {
        skip: DATA_SKIP, mayChange,
        onProgress: (x) => onProgress({ step: 'copy-data', ...x }),
        onFile: opts.onFile ? (rel, how) => opts.onFile('data', rel, how) : undefined,
      });
      if (d.busy.length) throw new RelocateError('BUSY_FILE', `Some files kept changing while they were copied (${d.busy.slice(0, 3).join(', ')}). Close other programs that use them and try again; nothing was switched.`);
      let a = null;
      if (move.to.app) {
        await writeMarker(move.to.app, move);
        a = await copyTree(move.from.app, move.to.app, {
          skip: appSkipper(), onProgress: (x) => onProgress({ step: 'copy-app', ...x }),
          onFile: opts.onFile ? (rel, how) => opts.onFile('app', rel, how) : undefined,
        });
        if (a.busy.length) throw new RelocateError('BUSY_FILE', `Some app files kept changing (${a.busy.slice(0, 3).join(', ')}). Try again; nothing was switched.`);
      }
      // Paths inside the new copy (config.json financeDir, .env) point at the new place.
      const mappings = mappingsFor(move.from, move.to);
      const rewritten = new Set();
      for (const it of move.internal || []) {
        const f = join(move.to.data, it.rel);
        try { const t = readFileSync(f, 'utf8'); const m = mapText(t, mappings, platform); if (m.count) { await fsp.writeFile(f, m.text, 'utf8'); rewritten.add(it.rel); } } catch { /* left as copied */ }
      }
      // A record of every file in the new folder as the move left it (for "Undo": what changed since).
      const manifest = join(base, 'moves', `${move.id}.json`);
      await fsp.mkdir(dirname(manifest), { recursive: true });
      const stamped = [];
      for (const f of d.files) {
        const full = join(move.to.data, ...f.rel.split('/'));
        const st = await fsp.stat(full).catch(() => null);
        stamped.push({ ...f, ...(rewritten.has(f.rel) && st ? { size: st.size, sha256: await hashFile(full) } : {}), mtimeMs: st ? st.mtimeMs : null });
      }
      await fsp.writeFile(manifest, JSON.stringify({ id: move.id, data: stamped, app: a ? a.files.length : 0 }) + '\n');
      move.copied = { files: d.files.length, bytes: d.bytes, appFiles: a ? a.files.length : 0, at: new Date(now()).toISOString() };
      move.manifest = manifest;
      move.phase = 'switching';                    // the redirect is on from here
      saveMove(move, rec);
      log('note', `move: copied ${d.files.length} data files${a ? ` and ${a.files.length} app files` : ''}, verified; switched to ${move.to.data}`);
    }
    if (move.phase === 'switching') {
      for (const ref of move.refs) {
        if (ref.status && ref.status !== 'planned') continue;
        onProgress({ step: 'repoint', label: ref.label });
        await applyRef(ref, ad);
        saveMove(move, rec);
      }
      move.phase = 'switched';
      move.switchedAt = new Date(now()).toISOString();
      saveMove(move, rec);
    }
    return { move: publicMove(move), restart: { appDir: move.to.app || move.from.app, dataDir: move.to.data } };
  }

  async function resume(o = {}) {
    const m = openMove(readRecord(rec));
    if (!m) return null;
    if (m.phase === 'undoing') return undoCarryOn(m, o);
    return carryOn(m, o);
  }

  /** Stop an unfinished copy: nothing was switched; the partial copy is kept (a later move into it finishes it). */
  function cancel() {
    const m = openMove(readRecord(rec));
    if (!m || m.phase !== 'copying') throw new RelocateError('NOT_COPYING', 'There is no unfinished copy to stop.');
    m.phase = 'cancelled'; m.cancelledAt = new Date(now()).toISOString();
    saveMove(m, rec);
    return publicMove(m);
  }

  // ─── Finish: rename the old folder (once nothing uses it) ───────────────
  async function finish() {
    const r = readRecord(rec);
    const out = [];
    for (const m of r.moves.filter(x => x.phase === 'switched')) {
      const appToo = !!m.to.app;
      const targets = appToo && isUnder(m.from.data, m.from.app, platform) ? [['app', m.from.app, m.to.app]]
        : appToo ? [['data', m.from.data, m.to.data], ['app', m.from.app, m.to.app]] : [['data', m.from.data, m.to.data]];
      try {
        for (const [kind, oldPath, newPath] of targets) {
          if (m.renamed[kind]) continue;
          if (!existsSync(oldPath)) throw new Error(`the old folder is not there any more (${oldPath})`);
          const dst = renamedTarget(oldPath, newPath, Date.parse(m.switchedAt || m.createdAt) || now());
          await renameWithRetry(oldPath, dst);
          m.renamed[kind] = dst;
          saveMove(m, rec);
          writeFileSync(join(dst, README), readmeText(m, kind, oldPath, newPath));
        }
        for (const d of [m.to.data, m.to.app].filter(Boolean)) { try { await fsp.unlink(join(d, MARKER)); } catch { /* gone */ } }
        m.phase = 'finished'; m.finishedAt = new Date(now()).toISOString(); delete m.finishError;
        log('note', `move: the old folder is kept as "${basename(Object.values(m.renamed)[0] || '')}"`);
      } catch (e) {
        m.finishError = `${e.code || ''} ${e.message}`.trim().slice(0, 200);
        log('warn', `move: the old folder could not be renamed yet (${m.finishError}); trying again at the next start`);
      }
      saveMove(m, rec);
      out.push(publicMove(m));
    }
    return out;
  }

  function readmeText(m, kind, oldPath, newPath) {
    const when = new Date(Date.parse(m.switchedAt || m.createdAt) || now());
    return [
      `OpenDash moved this ${kind === 'app' ? 'app' : 'data'} folder on ${when.toDateString()} at ${when.toTimeString().slice(0, 5)} (computer: ${host}).`,
      '',
      `It now lives here:  ${newPath}`,
      `This folder was:    ${oldPath}`,
      '',
      'Nothing in this folder is used any more. It is kept exactly as it was, as a safety copy.',
      '',
      '- To go back: open OpenDash, then Settings > Data > Undo move.',
      '- When you are sure everything works (after a week or two, say), you can delete this folder yourself.',
      '  OpenDash never deletes it.',
      '',
      `(move ${m.id})`,
      '',
    ].join('\r\n');
  }

  // ─── Undo ──────────────────────────────────────────────────────────────
  async function changedSinceMove(m) {
    let manifest = { data: [] };
    try { manifest = JSON.parse(await fsp.readFile(m.manifest, 'utf8')); } catch { /* none: everything counts as changed */ }
    const known = new Map((manifest.data || []).map(f => [f.rel, f]));
    const now2 = await scanTree(m.to.data, { skip: (rel, isDir) => DATA_SKIP(rel, isDir) || rel === 'logs' || rel === NEW_README });
    const changed = [];
    for (const f of now2.files) {
      const k = known.get(f.rel);
      if (!k) { changed.push(f.rel); continue; }
      if (k.size === f.size && k.mtimeMs === f.mtimeMs) continue;
      if (k.size !== f.size || (await hashFile(join(m.to.data, ...f.rel.split('/')))) !== k.sha256) changed.push(f.rel);
    }
    return changed;
  }

  /** Where the old folder is now (renamed, or still under its name). */
  function oldPlaces(m) {
    const appToo = !!m.to.app, dataInApp = appToo && isUnder(m.from.data, m.from.app, platform);
    const places = [];
    if (dataInApp) places.push({ kind: 'app', original: m.from.app, now: m.renamed.app || m.from.app });
    else {
      places.push({ kind: 'data', original: m.from.data, now: m.renamed.data || m.from.data });
      if (appToo) places.push({ kind: 'app', original: m.from.app, now: m.renamed.app || m.from.app });
    }
    // the old data folder as it is now
    const oldData = dataInApp ? join(places[0].now, relative(m.from.app, m.from.data)) : places[0].now;
    return { places, oldData };
  }

  async function undoPlan() {
    const m = undoableMove(readRecord(rec)) || (() => { const o = openMove(readRecord(rec)); return o && o.phase === 'undoing' ? o : null; })();
    if (!m) return { ok: false, problems: [{ code: 'NOTHING', text: 'There is no move to undo.' }] };
    const problems = [];
    let live = [];
    try { live = others() || []; } catch { live = []; }
    if (live.length) problems.push({ code: 'OTHER_COMPUTER', text: `OpenDash is open on ${live[0].hostname || 'another computer'}. Close it there first.` });
    const { places, oldData } = oldPlaces(m);
    for (const p of places) {
      if (!existsSync(p.now)) problems.push({ code: 'OLD_GONE', text: `The old folder is not there any more (${p.now}), so the move cannot be undone. Your data is safe in ${m.to.data}.` });
      else if (p.now !== p.original && existsSync(p.original)) problems.push({ code: 'NAME_TAKEN', text: `A folder called "${basename(p.original)}" is back in ${dirname(p.original)}. Rename or move it, then try again.` });
    }
    const changed = existsSync(m.to.data) && existsSync(oldData) ? await changedSinceMove(m) : [];
    const refs = m.refs.filter(r => r.status === 'done').map(r => ({ id: r.id, label: r.label, where: r.where, changes: (r.changes || []).map(c => ({ what: c.what, before: c.after, after: c.before })) }));
    return { ok: problems.length === 0, problems, moveId: m.id, from: m.to, to: m.from, changedFiles: changed.length, changedSample: changed.slice(0, 10), refs, places: places.map(p => ({ now: p.now, back: p.original })) };
  }

  async function undo({ onProgress = () => {}, gate = null } = {}) {
    const u = await undoPlan();
    if (!u.ok) throw new RelocateError(u.problems[0].code, u.problems.map(x => x.text).join(' '), 409, { plan: u });
    const r = readRecord(rec);
    const m = r.moves.find(x => x.id === u.moveId);
    if (gate && gate.pause) gate.pause();
    m.phase = 'undoing'; m.undoStartedAt = new Date(now()).toISOString();
    saveMove(m, rec);
    return undoCarryOn(m, { onProgress });
  }

  async function undoCarryOn(m, { onProgress = () => {} } = {}) {
    const { places, oldData } = oldPlaces(m);
    // 1. what changed since the move goes back into the old folder (old versions kept)
    if (!m.undoCopied) {
      const changed = await changedSinceMove(m);
      if (changed.length) {
        const keepName = `before-undo-${new Date(now()).toISOString().replace(/[:.]/g, '-')}`;
        const keep = join(oldData, 'backups', keepName);
        onProgress({ step: 'copy-back', total: changed.length });
        await copyFiles(m.to.data, oldData, changed, { keepDir: keep });
        m.undoKept = join(m.from.data, 'backups', keepName);   // where it is once the old folder has its name back
        // config.json / .env name the new place in the new folder: back in the old folder they name the old one
        const back = mappingsFor(m.from, m.to).map(x => ({ from: x.to, to: x.from }));
        for (const rel of changed.filter(r => r === 'config.json' || r === '.env')) {
          const f = join(oldData, rel);
          try { const t = readFileSync(f, 'utf8'); const mm = mapText(t, back, platform); if (mm.count) await fsp.writeFile(f, mm.text, 'utf8'); } catch { /* left as copied */ }
        }
      }
      m.undoCopied = { files: changed.length, at: new Date(now()).toISOString() };
      saveMove(m, rec);
    }
    // 2. the README out, the old name back
    for (const p of places) {
      try { const t = readFileSync(join(p.now, README), 'utf8'); if (t.includes(`(move ${m.id})`)) await fsp.unlink(join(p.now, README)); } catch { /* none */ }
      if (p.now !== p.original && existsSync(p.now)) { await renameWithRetry(p.now, p.original); delete m.renamed[p.kind]; saveMove(m, rec); }
    }
    // 3. every reference back (the ones nobody changed since)
    for (const ref of [...m.refs].reverse()) {
      if (ref.undo) continue;
      onProgress({ step: 'repoint', label: ref.label });
      await undoRef(ref, ad);
      saveMove(m, rec);
    }
    // 4. the redirect ends; the new folder says it is not used
    m.phase = 'undone'; m.undoneAt = new Date(now()).toISOString();
    saveMove(m, rec);
    for (const d of [m.to.data, m.to.app].filter(Boolean)) {
      try { await fsp.unlink(join(d, MARKER)); } catch { /* gone */ }
      try { writeFileSync(join(d, NEW_README), `OpenDash moved back to ${d === m.to.app ? m.from.app : m.from.data} on ${new Date(now()).toDateString()}.\r\nThis folder is not used any more. You can delete it yourself when you are sure you do not need it.\r\n`); } catch { /* read-only */ }
    }
    log('note', `move undone: back in ${m.from.data}${m.undoCopied && m.undoCopied.files ? ` (${m.undoCopied.files} changed files copied back)` : ''}`);
    return { move: publicMove(m), restart: { appDir: m.from.app, dataDir: m.from.data } };
  }

  return { status, plan: async (o) => stripPlan(await plan(o)), planFull: plan, run, resume, cancel, finish, undoPlan, undo, base };
}

async function renameWithRetry(a, b) {
  for (let i = 0; ; i++) {
    try { return await fsp.rename(a, b); }
    catch (e) { if (!['EPERM', 'EBUSY', 'EACCES'].includes(e.code) || i >= 12) throw e; await new Promise(r => setTimeout(r, 250 * (i + 1))); }
  }
}

/** The plan without the full reference objects (texts) the run keeps for itself. */
export function stripPlan(p) { const { _refs, ...rest } = p; return rest; }

/** A move as the page shows it (no file texts). */
export function publicMove(m) {
  if (!m) return null;
  const refs = (m.refs || []).map(r => { const x = publicRef(r); delete x.beforeHash; delete x.afterHash; return x; });
  return { ...m, refs, open: OPEN_PHASES.includes(m.phase) };
}
