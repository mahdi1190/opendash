// tools/migrations/_plans.mjs - optional per-user "plans" for data migrations.
//
// Some clean-ups need facts about one person's data (who their colleagues
// are, which tags they settled on). Those facts are personal, so they never
// live in this repo: a plan is a JSON file in the user's data folder
//
//     <data>/migration-plans/<migration id>.json
//
// or any file passed with --plan <file>. A migration without a plan runs only
// its generic rules. Plans are read, never written.

import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readJson } from '../../lib/fsutil.mjs';
import { loadConfig, systemTimeZone } from '../../lib/datadir.mjs';

/** -> {plan, file} ({plan:null} when there is none). Throws if --plan points at a missing/broken file. */
export async function loadPlan(ctx, id) {
  const given = ctx.arg('--plan');
  const file = given ? resolve(given) : join(ctx.dataDir, 'migration-plans', `${id}.json`);
  if (!existsSync(file)) {
    if (given) throw new Error(`plan file not found: ${file}`);
    return { plan: null, file: null };
  }
  const plan = await readJson(file, { fallback: undefined });
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) throw new Error(`plan file is not a JSON object: ${file}`);
  return { plan, file };
}

/** Today's date (YYYY-MM-DD) in the user's time zone from config.json. */
export async function todayFor(ctx) {
  let tz = systemTimeZone();
  try { const cfg = await loadConfig(ctx.dataDir); if (cfg && cfg.timezone) tz = cfg.timezone; } catch { /* default */ }
  try { return new Date().toLocaleDateString('en-CA', { timeZone: tz }); }
  catch { return new Date().toISOString().slice(0, 10); }
}

/** An activity logger that writes into state.taskActivity like the page does (source: script). */
export function activityLogger(state, client) {
  let n = 0;
  const now = Date.now();
  state.taskActivity = state.taskActivity && typeof state.taskActivity === 'object' ? state.taskActivity : {};
  return (taskId, entry) => {
    if (!taskId) return;
    const list = state.taskActivity[taskId] = Array.isArray(state.taskActivity[taskId]) ? state.taskActivity[taskId] : [];
    list.push({ id: `a-${now}-${client}-${(n++).toString(36)}`, ts: now, ...entry, source: 'script', client });
  };
}

export const stableJson = (o) => JSON.stringify(o);
