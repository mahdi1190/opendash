// scene compose: the auto-composer (docs/dev/SCENE_ENGINE_V2.md 20.3; builder G). Loaded by the `scene` command's delegation, or on its
// own: node tools/lib/scene-cmd/compose.mjs "Kelham Island, golden hour, across the river" --pack uk-area-sheffield
//
//   scene compose "<brief>" --pack <id> [--id <id>] [--at lat,lon] [--date ISO] [--candidates 24] [--critic] [--dry-run] [--osm-file overpass.json]
//                 [--seed N] [--out dir] [--offline] [--refresh]
//   1. parses the brief (keyword tables; unknown words are listed), 2. locates the place (--at, the offline gazetteer, or builder E's
//   geocoder), 3. gets the OpenStreetMap data (--osm-file <Overpass JSON>, or E's osmFetch with its cache) and searches a seeded ring of
//   viewpoints for the preset (visibility, the preset's needs, the composition rules, uniqueness against the pack), 4. builds the draft
//   recipe (E's osmProject when it is there; F's styles; region kits; flows; atmos auto; weather live unless the brief fixes it).
//   5. writes it through scene-recipe.mjs (builder D) as src/app/71-scene-<pack>-r-<id>.js, runs the lint with --strict-placement and the
//   contact sheet, and with --critic the critic. The report (brief, place, subject, the chosen viewpoint and the 2 alternatives, missing
//   objects, notes) goes to .anim-ref/compose/<pack>--<id>.report.json. Deterministic for a given cache and date; no model.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compose, gazetteer } from '../scene-compose.mjs';
/** A sibling module of tools/lib (resolved from this file), or null when it is not in this checkout. */
const tryImport = async (rel) => { try { return await import(new URL(rel, import.meta.url).href); } catch { return null; } };
import { packFingerprints } from '../scene-composition.mjs';
import { cmdLib, subPositionals, standalone, withChromeOrNull, renderSheet, momentsFor, sceneFacts, fileSafe } from '../scene-critic.mjs';

const NAME = 'compose';
const UK_KITS = ['temperate', 'london', 'urban', 'people', 'vehicles', 'boats', 'birds', 'water'];

/** A deterministic pick from sceneKitPick's weights: the heaviest, ties by id (the draft is a start; the author varies it). */
function picker(E, kits) {
  if (typeof E.kitPick !== 'function') return null;
  return (role, tags = [], { category = null } = {}) => {
    let w = null;
    try { w = E.kitPick(kits, role, { tags }); } catch { w = null; }
    const ids = Object.keys(w || {}).filter(id => !category || ((E.obj(id) || {}).category === category)).sort((a, b) => (w[b] - w[a]) || (a < b ? -1 : 1));
    return ids[0] || null;
  };
}
/** A library landmark for an OSM feature: one whose id or `place:` tag matches the feature's name words (17.5, rule 1). */
function landmarkMatcher(E) {
  const all = typeof E.objs === 'function' ? (E.objs() || []).map(o => (typeof o === 'string' ? E.obj(o) : o)).filter(Boolean) : [];
  const lms = all.filter(d => d.category === 'landmark' || String(d.id).startsWith('landmark.'));
  const words = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter(w => w.length > 2 && !['the', 'saint', 'church', 'of', 'and'].includes(w));
  return (f) => {
    if (!f.name) return null;
    const fw = words(f.name);
    let best = null, bestN = 1;
    for (const d of lms) {
      const idw = String(d.id).slice(9).split('-'), tagw = (d.tags || []).filter(t => t.startsWith('place:')).flatMap(t => t.slice(6).split('-'));
      const n = fw.filter(w => idw.includes(w) || tagw.includes(w)).length;
      if (n > bestN || (n === bestN && best && d.id < best.id && n > 1)) { best = d; bestN = n; }
    }
    return best ? best.id : null;
  };
}
const command = {
  summary: 'the auto-composer: a one-line brief ("Kelham Island, golden hour, across the river") becomes a well-composed v2 draft recipe from OpenStreetMap, the building generator, the library, flows and weather',
  usage: 'scene compose "<brief>" --pack <id> [--id <id>] [--at lat,lon] [--date ISO] [--candidates 24] [--critic] [--dry-run] [--osm-file overpass.json] [--seed N] [--out dir]',
  options: {
    pack: { type: 'string', multiple: true, help: 'compose: the pack the draft joins (its scenes are the siblings it must not repeat)' },
    id: { type: 'string', help: 'compose: the scene id (default from the place, the subject and the preset)' },
    at: { type: 'string', help: 'compose: lat,lon of the place (else the gazetteer, or the geocoder of builder E)' },
    date: { type: 'string', help: 'compose: the day (YYYY-MM-DD) for the sheet moments and the source date' },
    candidates: { type: 'string', help: 'compose: how many viewpoint candidates to keep (default 24)' },
    critic: { type: 'boolean', help: 'compose: run scene critique on the draft' },
    'dry-run': { type: 'boolean', help: 'compose: print the report, write nothing' },
    'osm-file': { type: 'string', help: 'compose: an Overpass JSON file to use instead of fetching (offline, tests)' },
    seed: { type: 'string', help: 'compose: the viewpoint ring seed (default from the subject and the preset)' },
    out: { type: 'string', help: 'compose: the report folder (default .anim-ref/compose/)' },
    offline: { type: 'boolean', help: 'compose: never fetch (the OSM cache or --osm only)' },
    refresh: { type: 'boolean', help: 'compose: re-fetch the OSM data' },
  },
  async run(args, ctx, lib0) {
    const root = ctx.root, pos = subPositionals(ctx, NAME);
    const brief = pos.join(' ').trim();
    if (!brief) throw new Error('scene compose needs a brief in quotes, e.g. "Kelham Island, golden hour, across the river"');
    const pack = [].concat(args.pack || [])[0];
    if (!pack || !/^[a-z0-9-]{1,40}$/.test(pack)) throw new Error('scene compose needs --pack <id> (lower case, digits and -)');
    if (args.id && !/^[a-z0-9-]{1,40}$/.test(args.id)) throw new Error('--id: lower case, digits and -');
    let at = null;
    if (args.at) { const m = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(args.at); if (!m) throw new Error('--at must be lat,lon'); at = [Number(m[1]), Number(m[2])]; }
    const lib = await cmdLib(lib0);
    const reg = lib.loadRegistry(root), E = lib.engineOf(reg);
    E.require('scene compose');
    // the other builders' pieces, when they are there (each optional; the report names what was missing)
    const osmFetchMod = await tryImport('../osm-fetch.mjs'), osmProjectMod = await tryImport('../osm-project.mjs'), terrainMod = await tryImport('../terrain.mjs');
    const notes = [];
    let osm = null, fetchedInfo = null;
    if (args['osm-file']) osm = JSON.parse(readFileSync(resolve(args['osm-file']), 'utf8'));
    const cacheDir = osmFetchMod && typeof osmFetchMod.cacheRoot === 'function' ? osmFetchMod.cacheRoot(root) : join(root, '.anim-ref', 'cache');
    const geoMod = await tryImport('../geo.mjs');
    // E's fetch: one Overpass request for a 1.5 km box about the place, cached under .anim-ref/cache (git-ignored)
    const fetchOsm = osm ? null : osmFetchMod && typeof osmFetchMod.osmFetch === 'function' && geoMod && typeof geoMod.circleBBox === 'function'
      ? async ({ lat, lon, radius }) => { const r = await osmFetchMod.osmFetch({ bbox: geoMod.circleBBox(lat, lon, radius), cacheDir, refresh: !!args.refresh, offline: !!args.offline, log: (s) => ctx.err(s) }); fetchedInfo = r; return r.data; } : null;
    if (!osm && !fetchOsm) notes.push('no OSM source: builder E\'s osm-fetch.mjs is not there and no --osm-file was given');
    const geocode = osmFetchMod && typeof osmFetchMod.nominatimSearch === 'function'
      ? async (name) => { const hits = await osmFetchMod.nominatimSearch(name, { cacheDir, offline: !!args.offline, refresh: !!args.refresh }); return hits && hits[0] ? { lat: hits[0].lat, lon: hits[0].lon } : null; } : null;
    // E's projection gets the library (landmark matches, real sizes) as `scene osm` gives it
    const objsFn = reg.R.get('sceneObjs'), realFn = reg.R.get('sceneObjReal');
    const library = typeof objsFn === 'function' ? (objsFn() || []).map(o => ({ id: o.id, category: o.category, tags: o.tags || [], size: o.size, real: o.real || null })) : null;
    const realOf = (id) => { try { const r = typeof realFn === 'function' ? realFn(id) : null; return r && r.h > 0 ? r.h : null; } catch { return null; } };
    const project = osmProjectMod && typeof osmProjectMod.osmProject === 'function'
      ? (data, cam) => osmProjectMod.osmProject(data, cam, { range: 700, library, realOf, fetched: fetchedInfo ? fetchedInfo.fetched : (args.date || null), hash: fetchedInfo ? fetchedInfo.hash : null }) : null;
    const styleFn = reg.R.get('sceneBuildingStyles');
    const styles = typeof styleFn === 'function' ? (styleFn() || []).map(s => s.id || s) : null;
    if (!styles) notes.push('builder F\'s building styles are not loaded: the style names are the spec\'s (19.3)');
    const kits = pack.startsWith('uk-') ? UK_KITS : ['temperate', 'urban', 'people', 'vehicles', 'boats', 'birds', 'water'];
    const known = new Set(reg.items().map(e => e.pack));
    const siblings = known.has(pack) ? packFingerprints(reg, pack, E) : [];
    const res = await compose(brief, {
      pack, id: args.id || null, at, date: args.date || null, candidates: args.candidates ? Number(args.candidates) : 24, seed: args.seed != null ? Number(args.seed) : undefined,
      places: gazetteer(reg), geocode, osm, fetchOsm, project,
      terrain: null, siblings, kits, pick: picker(E, kits), objects: landmarkMatcher(E), realOf, styles, region: pack.startsWith('uk-') ? ['GB-ENG'] : [], root,
      cameraModule: { SCENE_CAMERA_PRESETS: reg.R.get('SCENE_CAMERA_PRESETS'), sceneCameraPreset: reg.R.get('sceneCameraPreset') },
    });
    if (terrainMod) notes.push('terrain: run scene terrain --into the draft for the ridges (builder E)');
    const { recipe, report } = res;
    report.notes = notes.concat(report.notes);
    const id = recipe.meta.id, ref = `${pack}/${id}`;
    const outDir = resolve(args.out || join(root, '.anim-ref', 'compose'));
    // print the summary
    const b = report.brief;
    ctx.out(`brief: place ${report.place.name} (${report.place.src}), subject ${report.subject.name || report.subject.kind}, preset ${b.preset}${b.at ? ', ' + b.at : ''}${b.weather ? ', ' + b.weather : ''}${b.season ? ', ' + b.season : ''}`);
    if (b.unknown.length) ctx.out(`unknown words (not used): ${b.unknown.join(', ')}`);
    const c = report.chosen;
    ctx.out(`viewpoint: ${c.latlon.join(', ')} heading ${c.heading}, horizon ${c.horizon}, eye ${c.eye} m on ${c.standOn}; score ${c.score} (visibility ${c.parts.visibility}, ${b.preset} ${c.parts.needs}, composition ${c.parts.composition}, uniqueness ${c.parts.uniqueness}); the subject at ${Math.round(c.frame.xFrac * 100)} % of the width, ${Math.round(c.frame.size * 100)} % of the height, sky ${Math.round(c.frame.sky * 100)} %`);
    for (const a of report.alternatives) ctx.out(`  alternative: ${a.latlon.join(', ')} heading ${a.heading}, score ${a.score}`);
    for (const m of report.missing) ctx.out(`  missing: ${m.what}${m.name ? ` (${m.name})` : ''} at x ${m.at[0]} d ${m.at[1]}, ${m.h} m tall: no library object`);
    for (const n of report.notes) ctx.out(`  note: ${n}`);
    ctx.out(`draft: ${report.counts.surfaces} surfaces, ${report.counts.water} water, ${report.counts.buildings} buildings, ${report.counts.place} placements, ${report.counts.flows} flows; ${report.bytes} bytes`);
    if (args['dry-run']) { ctx.out(JSON.stringify(recipe.scene.camera)); return 0; }
    mkdirSync(outDir, { recursive: true });
    const repFile = join(outDir, `${fileSafe(pack)}--${id}.report.json`);
    // write the recipe: ONLY through scene-recipe.mjs (builder D); without it the recipe stays a JSON file next to the report
    let recipeFile = null;
    if (lib.recipes && typeof lib.recipes.newRecipeFile === 'function') {
      const have = typeof lib.recipes.findRecipes === 'function' ? lib.recipes.findRecipes(root).find(r => r.ref === ref) : null;
      if (have) throw new Error(`${ref} exists (${have.file}): give another --id, or edit it in the scene editor`);
      recipeFile = lib.recipes.newRecipeFile(root, recipe);
      ctx.out(`recipe: ${recipeFile && recipeFile.file ? recipeFile.file : recipeFile}`);
      // a NEW pack needs its pack file (V2 16.1); a composed pack starts gallery-only (when: false) until a person promotes its drafts
      const packFile = join(root, 'src', 'app', `72-anim-pack-${pack}.js`);
      if (!known.has(pack) && !existsSync(packFile)) {
        writeFileSync(packFile, `/* ============================================================\n   PACK ${pack}: composed v2 drafts (docs/dev/SCENE_ENGINE_V2.md 20.3, scene compose).\n   The recipe files 71-scene-${pack}-r-<id>.js call sceneAddRecipe; this registers them. Gallery only (when: false) until\n   the drafts are refined and promoted.\n   ============================================================ */\n(function () {\n  animRegisterPack({ id: '${pack}', name: '${pack.replace(/-/g, ' ')}', items: sceneItems('${pack}').map(it => Object.assign(it, { when: () => false })) });\n})();\n`);
        ctx.out(`pack: ${packFile} (new, gallery only)`);
      }
    } else {
      recipeFile = join(outDir, `${fileSafe(pack)}--${id}.recipe.json`);
      writeFileSync(recipeFile, JSON.stringify(recipe, null, 1) + '\n');
      ctx.out(`recipe (JSON only: tools/lib/scene-recipe.mjs, builder D, is not there to write the src/app file): ${recipeFile}`);
    }
    writeFileSync(repFile, JSON.stringify(report, null, 1) + '\n');
    ctx.out(`report: ${repFile}`);
    // lint (strict placement) and the sheet, on the draft's data
    const thresholds = lib.loadThresholds(root);
    const data = typeof reg.R.get('sceneFromRecipe') === 'function' ? reg.R.get('sceneFromRecipe')(recipe.scene) : recipe.scene;
    try {
      const L = lib.lintScene(data, thresholds, { E, ref, svg: false, strict: true });
      ctx.out(`lint --strict-placement: ${L.pass ? 'PASS' : `${L.failures.length} failure(s)`}${L.warnings.length ? `, ${L.warnings.length} warning(s)` : ''}`);
      for (const f of L.failures.slice(0, 12)) ctx.out(`  FAIL ${f.group}.${f.rule}: ${f.message}`);
    } catch (e) { ctx.out(`lint: ${e.message}`); }
    await withChromeOrNull(lib, args, async (chrome) => {
      if (!chrome) { ctx.err('compose: no Chrome or page harness: no sheet'); return; }
      const sc = { ref, data, registered: false };
      const r = await renderSheet(chrome, lib.harness, sc, { root, times: momentsFor(lib.times, data, args.date), outDir });
      ctx.out(`sheet: ${r.sheet}`);
    });
    if (args.critic) {
      if (!lib.recipes || !recipeFile || typeof recipeFile === 'string') ctx.out('critic: the draft is not registered (no recipe file in src/app): run scene critique on it once it is');
      else { const crit = (await import('./critique.mjs')).default; await crit.run({ apply: true }, Object.assign({}, ctx, { positionals: [ref] }), lib); }
    }
    return 0;
  },
};
export default command;
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) standalone(command, NAME).then(c => { process.exitCode = c; });
