// lib/relocate/record.mjs - this computer's record of data-folder moves, and
// the redirect every OpenDash process follows after one.
//
//   <deviceBase>/relocation.json = {version: 1, moves: [move, ...]}
//
// It lives in this computer's own folder (lib/devicedir.mjs deviceBase(),
// never in the data folder), because a move is this computer's business: a
// second computer that shares the old OneDrive folder must not follow it.
//
// A move: {id, phase, createdAt, host, from: {data, app}, to: {data, app},
// redirects: [{from, to}], renamed: {data?, app?}, refs: [...], manifest,
// finishedAt?, undoneAt?, error?}. Phases, in order:
//   copying      the copy is being made (a crash here is resumed: lib/relocate/index.mjs)
//   switching    the copy is complete and verified; the redirect is ON; the
//                references (start-up entries, MCP configs ...) are being re-pointed
//   switched     everything points at the new place; the old folder is still
//                to be renamed (once nothing uses it: the next start does it)
//   finished     the old folder is renamed '... (moved to ... on ...)' with a README
//   undoing      "Undo move" is running (the redirect is still on until it ends)
//   undone       back in the old place; the record stays as history
//   cancelled    a copy that was stopped before the switch (the old folder was never changed)
//
// resolveDataDir (lib/datadir.mjs) calls redirectDataDir(): a data folder that
// a live move left is replaced by its new place, so the launchers, the MCP
// server, tools/ and an old start-up entry all land in the new folder even
// before (or without) their own re-pointing.
//
// Synchronous on purpose (resolveDataDir is synchronous). Node stdlib only.

import { readFileSync, writeFileSync, renameSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { deviceBase } from '../devicedir.mjs';
import { samePath } from './paths.mjs';

export const RECORD_NAME = 'relocation.json';
export const REDIRECT_PHASES = Object.freeze(['switching', 'switched', 'finished', 'undoing']);
export const OPEN_PHASES = Object.freeze(['copying', 'switching', 'switched', 'undoing']);

/** Where the record is: opts.base (tests), else deviceBase() for that data folder. */
export function recordFile(opts = {}) {
  const base = opts.base ? opts.base : deviceBase({ env: opts.env || process.env, platform: opts.platform, home: opts.home, dataDir: opts.dataDir });
  return join(base, RECORD_NAME);
}

/** The record, or an empty one when there is none or it cannot be read (never throws). */
export function readRecord(opts = {}) {
  try {
    const t = readFileSync(recordFile(opts), 'utf8');
    const j = JSON.parse(t.charCodeAt(0) === 0xfeff ? t.slice(1) : t);
    if (j && Array.isArray(j.moves)) return { version: 1, moves: j.moves.filter(m => m && typeof m.id === 'string') };
  } catch { /* none yet */ }
  return { version: 1, moves: [] };
}

/** Write the record atomically (temp + rename). */
export function writeRecord(rec, opts = {}) {
  const f = recordFile(opts);
  mkdirSync(dirname(f), { recursive: true });
  const tmp = `${f}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`;
  writeFileSync(tmp, JSON.stringify({ version: 1, moves: rec.moves || [] }, null, 1) + '\n');
  try { renameSync(tmp, f); } catch (e) { try { unlinkSync(tmp); } catch { /* gone */ } throw e; }
  return f;
}

/** Replace (or add) one move in the record and save it. */
export function saveMove(move, opts = {}) {
  const rec = readRecord(opts);
  const i = rec.moves.findIndex(m => m.id === move.id);
  if (i >= 0) rec.moves[i] = move; else rec.moves.push(move);
  rec.moves = rec.moves.slice(-20);
  writeRecord(rec, opts);
  return move;
}

/** The move that is not settled yet (copying, switching, switched, undoing), newest first; or null. */
export function openMove(rec) {
  return [...(rec.moves || [])].reverse().find(m => OPEN_PHASES.includes(m.phase)) || null;
}

/** The newest move that can be undone (switched or finished), or null. */
export function undoableMove(rec) {
  const last = [...(rec.moves || [])].reverse().find(m => m.phase !== 'cancelled');
  return last && ['switched', 'finished'].includes(last.phase) ? last : null;
}

/**
 * The data folder to use instead of `dir` (a live move left it), following up
 * to 5 moves in a row; `dir` itself when none applies.
 */
export function redirectFrom(dir, rec, platform = process.platform) {
  let cur = dir;
  for (let hop = 0; hop < 5; hop++) {
    let next = null;
    for (const m of [...(rec.moves || [])].reverse()) {
      if (!REDIRECT_PHASES.includes(m.phase)) continue;
      const r = (m.redirects || []).find(x => x && samePath(x.from, cur, platform));
      if (r) { next = r.to; break; }
    }
    if (!next || samePath(next, cur, platform)) return cur;
    cur = next;
  }
  return cur;
}

/** For resolveDataDir: the redirected folder (reads this computer's record; never writes). */
export function redirectDataDir(dir, { env = process.env, platform = process.platform, home, base } = {}) {
  try {
    // Under the test runner an injected env without its own device folder still
    // reads the test device folder, never this computer's real one.
    const testing = !!(process.env.NODE_TEST_CONTEXT || process.execArgv.some(a => a === '--test' || a.startsWith('--test-')));
    const b = base || (!env.DASHBOARD_DEVICE_DIR && testing ? deviceBase({ env: process.env }) : undefined);
    const rec = readRecord({ env, platform, home, base: b, dataDir: dir });
    return rec.moves.length ? redirectFrom(dir, rec, platform) : dir;
  } catch { return dir; }
}
