// 002-config - make sure config.json, connections.json and migrations.json
// exist, and fill config.userName for an existing user.
//
// userName comes from --user-name <name> if given; otherwise from the state:
// the person marked self:true, or whose name ends in "(you)". That person is
// marked self:true so the app can recognise "you" without a hard-coded id.
// Never overwrites a userName that is already set.

import { ensureDataDir, readJson, writeJson, runIfMain } from './_lib.mjs';
import { validateConfig } from '../../lib/datadir.mjs';

export const id = '002-config';
export const description = 'Create config.json/connections.json if missing; set userName from --user-name or the "(you)" person.';
export const auto = true;

const YOU = /\s*\((you|me)\)\s*$/i;
const slug = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function run(ctx) {
  const notes = [];
  let changed = false;
  if (!ctx.dryRun) await ensureDataDir(ctx.dataDir);
  const cfg = validateConfig(await readJson(ctx.paths.config, { fallback: {} })).config;
  const state = await ctx.state.read();

  let name = (ctx.arg('--user-name') || '').trim();
  let self = null;
  const people = Array.isArray(state?.people) ? state.people : [];
  self = people.find(p => p && p.self === true)
    || people.find(p => p && typeof p.name === 'string' && YOU.test(p.name))
    || (name ? people.find(p => p && (p.id === slug(name) || p.name === name)) : null)
    || (cfg.userName ? people.find(p => p && (p.id === slug(cfg.userName) || p.name === cfg.userName)) : null);
  if (!name && self) name = String(self.name).replace(YOU, '').trim();

  if (!cfg.userName && name) {
    cfg.userName = name.slice(0, 60);
    notes.push('config: userName set');
    if (!ctx.dryRun) await writeJson(ctx.paths.config, cfg, { trailingNewline: true });
    changed = true;
  } else {
    notes.push(cfg.userName ? 'config: userName already set' : 'config: no userName found (set it in Settings or pass --user-name)');
  }

  if (state && self && self.self !== true) {
    self.self = true;
    notes.push('state: marked 1 person as you (self:true)');
    await ctx.state.write(state);
    changed = true;
  }
  return { changed, notes };
}

await runIfMain(import.meta.url, { id, description, auto, run });
