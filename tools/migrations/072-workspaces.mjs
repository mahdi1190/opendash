// 072-workspaces - seed the auto-linker's WORKSPACE FOLDERS (Settings > Files &
// auto-link, <data>/index/settings.json) from a list the user keeps OUTSIDE the
// repo (it holds their own paths).
//
// The list is read from, in order:
//   --from <file.json>  |  --plan <file.json>
//   <data>/seed-workspaces.json
//   <data>/migration-plans/072-workspaces.json
// Without one, nothing happens.
//
// List format:
//   { "version": 1, "enabled"?: true,
//     "folders": [ { "path": "<absolute folder>", "depth"?: 1, "container"?: true } ],
//     "namesOnly": [ "<absolute folder or a folder name>" ],      // contents never read
//     "autoApply"?: true, "threshold"?: 0.85 }
//
// Rules: a folder is only added when it EXISTS here (checked now); folders that
// are already listed keep their settings; names-only entries are only ever
// added. "enabled", "autoApply" and "threshold" are only taken when the
// settings file does not exist yet (a later choice in Settings is never
// overwritten). Nothing is indexed here: the dashboard does that in the
// background (or Settings > Files & auto-link > Index now). Idempotent; counts
// only in the output, never paths.

import { existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readJson, runIfMain } from './_lib.mjs';
import { indexPaths, loadSettings, normalizeSettings, saveSettings } from '../../lib/workspace-index.mjs';
import { rsrcIsLocalPath, rsrcNormPath } from '../../lib/resources.mjs';

export const id = '072-workspaces';
export const description = 'Auto-linking: add workspace folders and names-only folders from a list kept outside the repo (--from <file> or <data>/seed-workspaces.json); only folders that exist here.';
export const auto = false;

async function loadSeed(ctx) {
  const given = ctx.arg('--from') || ctx.arg('--plan');
  const cands = given ? [resolve(given)] : [join(ctx.dataDir, 'seed-workspaces.json'), join(ctx.dataDir, 'migration-plans', `${id}.json`)];
  const file = cands.find(f => existsSync(f));
  if (!file) {
    if (given) throw new Error('seed file not found (--from)');
    return null;
  }
  const doc = await readJson(file, { fallback: undefined });
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.folders)) throw new Error('the seed file must be {"folders":[...], "namesOnly":[...]}');
  return doc;
}
const isDir = (p) => { try { return statSync(p).isDirectory(); } catch { return false; } };

export async function run(ctx) {
  const seed = await loadSeed(ctx);
  if (!seed) return { changed: false, notes: ['no seed list (--from <file>, <data>/seed-workspaces.json): nothing to do'] };
  const fresh = !existsSync(indexPaths(ctx.dataDir).settings);
  const cur = await loadSettings(ctx.dataDir);
  const next = normalizeSettings(cur);
  const n = { listed: seed.folders.length, added: 0, already: 0, missing: 0, bad: 0, namesOnlyAdded: 0, namesOnlyMissing: 0 };
  const have = new Set(next.folders.map(f => f.path.toLowerCase()));
  for (const f of seed.folders) {
    const p = rsrcNormPath(typeof f === 'string' ? f : f && f.path);
    if (!rsrcIsLocalPath(p)) { n.bad++; continue; }
    if (!isDir(p)) { n.missing++; continue; }
    if (have.has(p.toLowerCase())) { n.already++; continue; }
    have.add(p.toLowerCase());
    next.folders.push({ path: p, ...(f && f.depth != null ? { depth: f.depth } : {}), ...(f && f.container ? { container: true } : {}) });
    n.added++;
  }
  const names = new Set(next.namesOnly.map(x => x.toLowerCase()));
  for (const e of Array.isArray(seed.namesOnly) ? seed.namesOnly : []) {
    const raw = String(e || '').trim();
    if (!raw) continue;
    const asPath = rsrcNormPath(raw);
    const value = rsrcIsLocalPath(asPath) ? asPath : raw;
    if (rsrcIsLocalPath(asPath) && !isDir(asPath)) { n.namesOnlyMissing++; continue; }
    if (names.has(value.toLowerCase())) continue;
    names.add(value.toLowerCase());
    next.namesOnly.push(value);
    n.namesOnlyAdded++;
  }
  let firstTime = 0;
  if (fresh) {
    if (seed.enabled === true) { next.enabled = true; firstTime++; }
    if (typeof seed.autoApply === 'boolean') { next.autoApply = seed.autoApply; firstTime++; }
    if (typeof seed.threshold === 'number') { next.threshold = seed.threshold; firstTime++; }
  }
  const changed = n.added > 0 || n.namesOnlyAdded > 0 || firstTime > 0;
  if (changed && !ctx.dryRun) await saveSettings(ctx.dataDir, next);
  return {
    changed,
    notes: [
      `workspace folders: ${n.listed} listed, ${n.added} added, ${n.already} already there, ${n.missing} not on this computer${n.bad ? `, ${n.bad} not absolute local paths` : ''}`,
      `names-only folders: ${n.namesOnlyAdded} added${n.namesOnlyMissing ? `, ${n.namesOnlyMissing} not on this computer` : ''}`,
      fresh ? `first set-up: auto-linking ${next.enabled ? 'on' : 'off'}, auto-attach ${next.autoApply ? 'on' : 'off'} at ${next.threshold}` : 'settings existed: on/off and threshold left as they are',
      `total: ${next.folders.length} workspace folder${next.folders.length === 1 ? '' : 's'}`,
    ],
  };
}

await runIfMain(import.meta.url, { id, description, auto, run });
