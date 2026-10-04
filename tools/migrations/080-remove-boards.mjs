// 080-remove-boards - the brainstorm Boards feature (boards of ideas, the
// canvas) was retired. Generic, no plan.
//
// Everything it left in the state is first copied to
// <data>/backups/boards-archive-<stamp>.json, then taken out of the state:
//   - state.boards          the boards with their ideas and connections;
//   - state.boardCollapsed  per-board folding (UI);
//   - state.canvasConnect   an old canvas key (UI);
//   - board-kind tasks      deleted boards waiting in the bin (kind 'board'),
//                           and any in the task list;
//   - collapsedSidebar.boards and a 'board:<id>' view (-> Home);
//   - config.json features.boards (the old feature switch).
// What counts as boards data is lib/state-keys.mjs dropRetiredState(), which
// data imports and backup restores use too. Idempotent: a data folder without
// any of it is left alone (no archive, no write). Reports counts only.

import { join } from 'node:path';
import { runIfMain } from './_lib.mjs';
import { readJson, writeJson, withLock } from '../../lib/fsutil.mjs';
import { dropRetiredState, RETIRED_STATE_KEYS } from '../../lib/state-keys.mjs';

export const id = '080-remove-boards';
export const description = 'Remove the retired Boards feature from the state (boards, ideas, canvas keys, binned boards) and config.json (features.boards), after copying it to backups/boards-archive-<stamp>.json.';
export const auto = true;

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
const count = (x) => (Array.isArray(x) ? x.length : x && typeof x === 'object' ? Object.keys(x).length : 0);
const cfgHasBoards = (c) => !!(c && c.features && typeof c.features === 'object' && Object.prototype.hasOwnProperty.call(c.features, 'boards'));

export async function run(ctx) {
  const state = await ctx.state.read();
  const cfg = await readJson(ctx.paths.config, { fallback: null });
  const removed = (state && dropRetiredState(state)) || null;
  const cfgFlag = cfgHasBoards(cfg);
  if (!removed && !cfgFlag) return { changed: false, notes: [state ? 'no boards data: nothing to do' : 'no state file yet: nothing to do'] };
  const boards = removed && Array.isArray(removed.boards) ? removed.boards : [];
  const stats = {
    boards: boards.length,
    ideas: boards.reduce((n, b) => n + count(b && b.ideas), 0),
    connections: boards.reduce((n, b) => n + count(b && b.connections), 0),
    binnedBoards: count(removed && removed.binnedBoards),
    boardTasks: count(removed && removed.boardTasks),
    keys: removed ? RETIRED_STATE_KEYS.filter(k => k in removed) : [],
    configSwitch: cfgFlag,
  };
  const name = `boards-archive-${stamp()}.json`;
  const notes = [
    `boards: ${stats.boards} (${stats.ideas} ideas, ${stats.connections} connections); deleted boards in the bin: ${stats.binnedBoards}; board-kind tasks: ${stats.boardTasks}`,
    `state keys removed: ${stats.keys.join(', ') || 'none'}${removed && removed.collapsedSidebar ? '; the folded Boards sidebar heading' : ''}${removed && removed.view ? '; a board view (now Home)' : ''}`,
    `config.json features.boards: ${cfgFlag ? 'removed' : 'not set'}`,
    ctx.dryRun ? `would archive them to backups/${name}` : `archived to backups/${name}`,
  ];
  if (!ctx.dryRun) {
    // The archive first: the state and config are only written once the copy is safe.
    const archive = { id, archivedAt: new Date().toISOString(), ...(removed || {}) };
    if (cfgFlag) archive.config = { features: { boards: cfg.features.boards } };
    await writeJson(join(ctx.paths.backups, name), archive, { trailingNewline: true });
    if (removed) await ctx.state.write(state);
    if (cfgFlag) {
      await withLock(ctx.paths.config, async () => {
        const cur = await readJson(ctx.paths.config, { fallback: null });
        if (!cfgHasBoards(cur)) return;
        delete cur.features.boards;
        await writeJson(ctx.paths.config, cur, { trailingNewline: true });
      });
    }
  }
  return { changed: true, notes, stats, archive: ctx.dryRun ? null : name };
}

await runIfMain(import.meta.url, { id, description, auto, run });
