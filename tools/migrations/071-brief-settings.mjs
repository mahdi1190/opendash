// 071-brief-settings - Morning brief: set the town for the weather (and,
// optionally, the brief settings and scene keyword rules) from a seed file
// kept OUTSIDE the repo (it holds a personal place).
//
//   node tools/migrate.mjs 071-brief-settings --from <seed.json> [--dry-run]
//
// Seed file: { location: {name, admin, country, countryCode, lat, lon, timezone},
//              brief: {autoOpen, ai, model, eveningHour, animations, celebrate, units},
//              animRules: [{kw, type}] }
// All parts are optional. Without --from nothing happens (never part of --auto).
// Idempotent: a location that is already set is kept unless --replace-location;
// brief settings only fill keys that config.json does not have yet; rules are
// added when their keyword is new. Prints what changed, never the place itself.

import { readJson, writeJson, existsSync, runIfMain } from './_lib.mjs';
import { validateConfig } from '../../lib/datadir.mjs';
import { normLocation } from '../../lib/brief-config.mjs';
import { animTypes } from '../../lib/brief-logic.mjs';

export const id = '071-brief-settings';
export const description = 'Morning brief: the weather town (+ brief settings, scene keyword rules) from a seed file outside the repo (--from).';
export const auto = false;

export async function run(ctx) {
  const notes = [];
  const from = ctx.arg('--from');
  if (!from) return { changed: false, notes: ['no --from <seed.json> given: nothing to do'] };
  if (!existsSync(from)) throw new Error(`seed file not found: ${from}`);
  const seed = await readJson(from);
  if (!seed || typeof seed !== 'object') throw new Error('the seed file is not a JSON object');
  let changed = false;

  // config.json: location + brief
  const raw = await readJson(ctx.paths.config, { fallback: {} });
  const cur = validateConfig(raw).config;
  const next = JSON.parse(JSON.stringify(cur));
  if (seed.location !== undefined) {
    const loc = normLocation(seed.location);
    if (!loc) throw new Error('seed.location needs a name, lat and lon');
    const same = cur.location && cur.location.lat === loc.lat && cur.location.lon === loc.lon && cur.location.name === loc.name;
    if (same) notes.push('config: weather town already set (unchanged)');
    else if (cur.location && !ctx.argv.includes('--replace-location')) notes.push('config: a different weather town is already set; kept it (pass --replace-location to change it)');
    else { next.location = loc; notes.push(`config: weather town ${cur.location ? 'replaced' : 'set'}`); changed = true; }
  }
  if (seed.brief && typeof seed.brief === 'object') {
    const have = raw && typeof raw.brief === 'object' && raw.brief ? raw.brief : {};
    const add = Object.keys(seed.brief).filter(k => !(k in have));
    if (add.length) { next.brief = { ...cur.brief, ...Object.fromEntries(add.map(k => [k, seed.brief[k]])) }; notes.push(`config: brief settings filled (${add.length} key${add.length === 1 ? '' : 's'})`); changed = true; }
    else notes.push('config: brief settings already present (unchanged)');
  }
  if (changed) {
    const { config, errors } = validateConfig(next);
    if (errors.length) throw new Error('the seed makes an invalid config: ' + errors.join('; '));
    if (!ctx.dryRun) await writeJson(ctx.paths.config, config, { trailingNewline: true });
  }

  // state: scene keyword rules (Settings > Animations)
  const rules = Array.isArray(seed.animRules) ? seed.animRules.filter(r => r && typeof r.kw === 'string' && r.kw.trim() && animTypes().includes(r.type)) : [];
  if (rules.length) {
    const state = await ctx.state.read();
    if (!state) notes.push('state: no state file, keyword rules skipped');
    else {
      const prefs = state.animPrefs && typeof state.animPrefs === 'object' ? state.animPrefs : {};
      const list = Array.isArray(prefs.rules) ? prefs.rules.slice() : [];
      const known = new Set(list.map(r => String(r.kw).toLowerCase()));
      const fresh = rules.filter(r => !known.has(r.kw.trim().toLowerCase())).map(r => ({ kw: r.kw.trim().slice(0, 40), type: r.type }));
      if (fresh.length) {
        state.animPrefs = { ...prefs, rules: [...list, ...fresh] };
        await ctx.state.write(state);
        notes.push(`state: ${fresh.length} scene keyword rule${fresh.length === 1 ? '' : 's'} added`);
        changed = true;
      } else notes.push('state: scene keyword rules already there');
    }
  }
  return { changed, notes };
}

await runIfMain(import.meta.url, { id, description, auto, run });
