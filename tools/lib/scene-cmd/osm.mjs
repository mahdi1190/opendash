// node tools/anim-pack.mjs scene osm ...   real layouts from OpenStreetMap (docs/dev/SCENE_ENGINE_V2.md 17; builder E)
//
//   scene osm --at <lat,lon> --heading <deg> [--fov 66] [--eye 1.65] [--horizon 470] [--range 700]
//             [--place "<name>"] [--into <pack>/<id> | --out file.json] [--preview dir] [--refresh] [--offline] [--dry-run] [--json]
//
// Fetches the view's OSM data through Overpass (one request, cached 30 days in .anim-ref/cache/osm/), projects it into the scene's
// ground grid (osm-project.mjs) and writes the sections as plain data. Authoring time only: the app never fetches. Every import
// carries the ODbL credit (17.6): the recipe header line and scene.source.osm, shown by sceneCredits in the gallery.
// Also runnable on its own: node tools/lib/scene-cmd/osm.mjs --at ... (the same options).
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { wedgeBBox, circleBBox } from '../geo.mjs';
import { osmFetch, nominatimSearch, cacheRoot } from '../osm-fetch.mjs';
import { osmProject, osmMerge, osmHeadings, osmPreviewScene, OSM_DEFAULTS } from '../osm-project.mjs';

export const ODBL_LINE = 'Contains OpenStreetMap data, (c) OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright).';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/* ---------- helpers shared with scene-cmd/terrain.mjs ---------- */
export function numOpt(args, k, def, { min = -Infinity, max = Infinity } = {}) {
  const v = args[k];
  if (v == null || v === '') return def;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`--${k} must be a number from ${min} to ${max}`);
  return n;
}
export function latLonOpt(v, what = '--at') {
  if (v == null || v === '') return null;
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(String(v));
  if (!m || Math.abs(+m[1]) > 90 || Math.abs(+m[2]) > 180) throw new Error(`${what} must be "lat,lon" in degrees (e.g. 53.3801,-1.4699)`);
  return [+m[1], +m[2]];
}
/** The recipe module (builder D, V2 16.1); --into needs it. */
export async function recipesModule(lib) {
  if (lib && lib.recipes) return lib.recipes;
  try { return await import(pathToFileURL(join(ROOT, 'tools', 'lib', 'scene-recipe.mjs')).href); }
  catch (e) { if (e && e.code === 'ERR_MODULE_NOT_FOUND') throw new Error('--into needs tools/lib/scene-recipe.mjs (the recipe reader and writer, V2 16.1): use --out file.json for now'); throw e; }
}
/** Read the recipe of pack/id, or start a new one (written with newRecipeFile). */
export async function openRecipe(root, ref, lib) {
  const m = /^([a-z0-9-]{1,40})\/([a-z0-9-]{1,60})$/.exec(ref || '');
  if (!m) throw new Error('--into needs <pack>/<id> (lower case, digits, dashes)');
  const R = await recipesModule(lib);
  const found = (await R.findRecipes(root)).find(x => x.ref === ref);
  if (found) { const r = await R.readRecipe(root, ref); return { R, rec: r.rec, version: r.version, file: r.file, isNew: false }; }
  const label = m[2].replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
  const rec = { v: 2, pack: m[1], meta: { id: m[2], label, site: label, tags: ['composed', 'v2', 'osm', 'real-place', 'live-sky', 'seasons'], mood: 'calm', colour: 'teal' }, scene: { id: m[2] } };
  return { R, rec, version: null, file: null, isNew: true };
}
/** Write it through the recipe module (V2 16.1): a new file, or the block of the existing one (refused when it changed meanwhile). */
export async function saveRecipe(root, o) {
  const r = o.isNew ? await o.R.newRecipeFile(root, o.rec) : await o.R.writeRecipe(root, o.rec, { version: o.version, file: o.file });
  return (r && (r.rel || r.file)) || '';
}
/** The library the import matches against: [{ id, category, tags, size }] and real heights (A's sceneObjReal when present). */
export async function libraryOf(root, lib) {
  try {
    const { loadScenes } = await import(pathToFileURL(join(root, 'tools', 'lib', 'scene-page.mjs')).href);
    const key = '__sceneOsmLib' + process.pid;
    loadScenes(root, { fixtures: false, extra: `globalThis[${JSON.stringify(key)}] = { objs: typeof sceneObjs === 'function' ? sceneObjs() : [], real: typeof sceneObjReal === 'function' ? sceneObjReal : null };` });
    const got = globalThis[key]; delete globalThis[key];
    const objs = (got && got.objs || []).map(o => ({ id: o.id, category: o.category, tags: o.tags || [], size: o.size, real: o.real || null }));
    const byId = new Map(objs.map(o => [o.id, o]));
    const realOf = (id) => { if (got && got.real) { try { const r = got.real(id); if (r && r.h > 0) return r.h; } catch { /* A's table not there */ } } const o = byId.get(id); return o && o.real && o.real.h > 0 ? o.real.h : null; };
    return { objs, realOf, sizeOf: (id) => (byId.get(id) || {}).size || null };
  } catch (e) { return { objs: null, realOf: () => null, sizeOf: () => null, error: e.message }; }
}

const pad = (s, n) => String(s).padEnd(n);
function printSummary(ctx, res, { cam, fetchInfo }) {
  const r = res.report, s = res.sections;
  ctx.out(`OpenStreetMap layout: ${cam.lat.toFixed(5)},${cam.lon.toFixed(5)} looking ${Math.round(cam.heading)} deg, fov ${cam.fov}, eye ${cam.eye} m, horizon ${cam.horizon}, range ${r.range} m${r.urban ? ' (built up)' : ''}`);
  if (fetchInfo) ctx.out(`  data: fetched ${fetchInfo.fetched}${fetchInfo.cached ? ' (cache)' : ''}, hash ${fetchInfo.hash}, ${fetchInfo.data.elements.length} elements`);
  const by = (list) => { const m = {}; for (const e of list) m[e.kind] = (m[e.kind] || 0) + 1; return Object.entries(m).map(([k, n]) => `${k} ${n}`).join(', ') || 'none'; };
  ctx.out(`  surfaces: ${s.surfaces.length} (${by(s.surfaces)})`);
  ctx.out(`  water:    ${s.water.length} (${by(s.water)})`);
  ctx.out(`  buildings: ${s.buildings.length}${r.counts.hiddenBuildings ? ` (+${r.counts.hiddenBuildings} hidden behind nearer ones, dropped)` : ''}; styles: ${by(s.buildings.map(b => ({ kind: b.style })))}`);
  ctx.out(`  place:    ${s.place.length} (${by(s.place.map(p => ({ kind: p.fix ? 'landmark' : p.obj.split('.')[0] })))}); scatter rules: ${s.scatter.length}`);
  ctx.out(`  data: ${r.bytes} bytes of ${r.budget}${r.rounds ? `, simplified ${r.rounds} time(s); features beyond ${r.dCut} m dropped` : ''}`);
  if (r.named.length) { ctx.out('  nearest named features (report only, never drawn):'); for (const n of r.named.slice(0, 8)) ctx.out(`    ${pad(n.name, 34)} ${pad(n.what, 12)} ${n.d} m${n.x < -5 ? ' left' : n.x > 5 ? ' right' : ''}`); }
  if (r.missing.length) { ctx.out('  missing from the library (the object backlog):'); for (const m of r.missing.slice(0, 12)) ctx.out(`    ${m.msg}${m.name ? ` (${m.name})` : ''}`); }
  for (const p of r.problems.filter(p => p.rule !== 'missing')) ctx.out(`  ${p.sev}: ${p.rule}: ${p.msg}${p.fix ? ` (${p.fix})` : ''}`);
  ctx.out('  credit: (c) OpenStreetMap contributors, ODbL 1.0');
}

async function previewPngs(root, rec, dir, { lib: L, times, log }) {
  const { launchChrome } = await import(pathToFileURL(join(root, 'tools', 'release-chrome.mjs')).href);
  const { sceneRenderPng } = await import(pathToFileURL(join(root, 'tools', 'lib', 'scene-page.mjs')).href);
  const data = osmPreviewScene(rec, { realOf: L.realOf, sizeOf: L.sizeOf });
  mkdirSync(dir, { recursive: true });
  const chrome = await launchChrome();
  const out = [];
  try {
    for (const [name, at] of times) {
      const file = join(dir, `osm-preview-${name}.png`);
      await sceneRenderPng(chrome, { root, data, at, still: true, mode: name === 'night' ? 'dark' : 'light' }, file);
      out.push(file); log(file);
    }
  } finally { await chrome.close(); }
  return out;
}

const cmd = {
  summary: 'osm: a real layout from OpenStreetMap (roads, pavements, paths, water, parks, rails, buildings, landmarks) projected into the scene\'s ground grid, as recipe data',
  usage: 'scene osm --at <lat,lon> --heading <deg> [--fov 66] [--eye 1.65] [--horizon 470] [--range 700] [--place "<name>"] [--into <pack>/<id> | --out file.json] [--preview dir] [--refresh] [--offline] [--dry-run] [--json]',
  options: {
    at: { type: 'string', help: 'osm / terrain: the camera position, lat,lon (sheet / capture: an ISO moment)' },
    heading: { type: 'string', help: 'which way the view looks (degrees from north); osm without it lists the named features in the 8 compass directions' },
    fov: { type: 'string', help: 'osm / terrain: the horizontal field of view in degrees (default 66)' },
    eye: { type: 'string', help: 'osm / terrain: the eye height above the ground in metres (default 1.65)' },
    horizon: { type: 'string', help: 'osm / terrain: the screen row of eye level (default 470)' },
    range: { type: 'string', help: 'osm: how far to import in metres (default 700); terrain: how far to sample (default 25000)' },
    place: { type: 'string', help: 'osm: geocode a place name with Nominatim (cached 90 days) instead of --at' },
    into: { type: 'string', help: 'osm / terrain: merge into the recipe <pack>/<id> (created when missing); re-imports keep hand entries and hand edits' },
    preview: { type: 'string', help: 'osm: render the import with the v1 renderer at noon, golden hour and night into this folder (a quick look; the v2 compile draws the real thing)' },
    refresh: { type: 'boolean', help: 'osm / terrain: ignore the cache and fetch again' },
    offline: { type: 'boolean', help: 'osm / terrain: never fetch; use the cache (an error when the view is not cached)' },
    overpass: { type: 'string', help: 'osm: another Overpass API endpoint (default https://overpass-api.de/api/interpreter)' },
    budget: { type: 'string', help: 'osm: the most bytes the imported sections may take (default 20000; a recipe block is at most 24000)' },
    'dry-run': { type: 'boolean', help: 'print the summary (counts by kind, nearest named features, data size, problems, missing objects); write nothing' },
    json: { type: 'boolean', help: 'machine-readable output' },
    out: { type: 'string', help: 'osm / terrain: write the sections as JSON to this file' },
    date: { type: 'string', help: 'osm --preview: the day of the noon, golden hour and night renders (YYYY-MM-DD, default today)' },
  },
  notes: [
    'Authoring time only: the imported geometry is plain data in the recipe; the app never fetches. Overpass is asked once per run; the answer is cached 30 days in .anim-ref/cache/osm/ (git-ignored).',
    'Credit: a recipe with OSM geometry is derived from the OpenStreetMap database: (c) OpenStreetMap contributors, ODbL 1.0 (THIRD_PARTY_NOTICES.md). Names, brands and operators never reach drawn text.',
    'Re-import with --into is safe: it replaces only entries with "src": "osm" that are unchanged since the last import; hand entries and hand-edited imports ("src": "osm*") are kept.',
  ],
  async run(args, ctx, lib) {
    const root = ctx.root || ROOT, err = ctx.err || (() => {}), out = ctx.out;
    const fetchFn = ctx.fetch || globalThis.fetch;
    const cacheDir = ctx.cacheDir || cacheRoot(root);
    let target = null;
    if (args.into) target = await openRecipe(root, args.into, lib);
    const rc = target && target.rec.scene && (target.rec.scene.camera || {});
    let at = latLonOpt(args.at);
    if (!at && args.place) {
      const hits = await nominatimSearch(args.place, { fetch: fetchFn, cacheDir, refresh: args.refresh, offline: args.offline });
      if (!hits.length) throw new Error(`Nominatim found nothing for "${args.place}"`);
      at = [hits[0].lat, hits[0].lon];
      err(`--place: ${hits[0].label} -> ${at[0].toFixed(5)},${at[1].toFixed(5)}`);
    }
    if (!at && rc && Number.isFinite(rc.lat)) at = [rc.lat, rc.lon];
    if (!at && target && target.rec.scene.view && Number.isFinite(target.rec.scene.view.lat)) at = [target.rec.scene.view.lat, target.rec.scene.view.lon];
    if (!at) throw new Error('scene osm needs --at lat,lon (or --place "<name>", or --into a recipe with a camera)');
    const range = numOpt(args, 'range', OSM_DEFAULTS.range, { min: 50, max: 3000 });
    const heading = args.heading != null ? numOpt(args, 'heading', 0, { min: -360, max: 720 }) : rc && Number.isFinite(rc.heading) ? rc.heading : null;
    if (heading == null) {
      const res = await osmFetch({ bbox: circleBBox(at[0], at[1], range), fetch: fetchFn, cacheDir, refresh: args.refresh, offline: args.offline, overpass: args.overpass, log: err, sleep: ctx.sleep });
      const dirs = osmHeadings(res.data, { lat: at[0], lon: at[1], range });
      if (args.json) { out(JSON.stringify({ at, headings: dirs }, null, 1)); return 0; }
      out(`No --heading: what lies in each direction from ${at[0].toFixed(5)},${at[1].toFixed(5)} (within ${range} m). Choose one and run again with --heading <deg>.`);
      for (const d of dirs) out(`  ${pad(d.heading, 4)} ${pad(d.name, 3)} ${d.features.map(f => `${f.name} (${f.what}, ${f.d} m)`).join('; ') || '-'}`);
      return 0;
    }
    const cam = {
      lat: at[0], lon: at[1], heading: ((heading % 360) + 360) % 360,
      fov: numOpt(args, 'fov', rc && rc.fov || OSM_DEFAULTS.fov, { min: 20, max: 120 }),
      eye: numOpt(args, 'eye', rc && rc.eye || OSM_DEFAULTS.eye, { min: 0.3, max: 400 }),
      horizon: numOpt(args, 'horizon', rc && rc.horizon != null ? rc.horizon : OSM_DEFAULTS.horizon, { min: 80, max: 860 }),
    };
    const bbox = wedgeBBox(cam, range, { fov: cam.fov });
    const fetched = await osmFetch({ bbox, fetch: fetchFn, cacheDir, refresh: args.refresh, offline: args.offline, overpass: args.overpass, log: err, sleep: ctx.sleep });
    const L = ctx.library || await libraryOf(root, lib);
    if (L.error) err(`note: the object library did not load (${L.error}); landmarks are matched by kind only`);
    const res = osmProject(fetched.data, cam, { range, library: L.objs, realOf: L.realOf, fetched: fetched.fetched, hash: fetched.hash, bbox, budget: numOpt(args, 'budget', OSM_DEFAULTS.budget, { min: 2000, max: 24000 }) });
    const sectionsOut = Object.assign({ camera: res.camera }, res.sections, { source: res.source });
    if (args.json && !args.into && !args.out) out(JSON.stringify(Object.assign(sectionsOut, { report: res.report }), null, 1));
    else printSummary(ctx, res, { cam, fetchInfo: fetched });
    if (args['dry-run']) return 0;
    if (args.out) { mkdirSync(dirname(resolve(args.out)), { recursive: true }); writeFileSync(resolve(args.out), JSON.stringify(sectionsOut, null, 1) + '\n'); out(`wrote ${resolve(args.out)}`); }
    if (target) {
      const sc = target.rec.scene;
      const merged = osmMerge(sc, res);
      merged.scene.camera = Object.assign({}, sc.camera || {}, res.camera);
      const rp = repointLists(sc, merged.scene);
      if (rp) err(`flows and scatter: ${rp} surface reference(s) re-pointed to the new import (same kinds)`);
      merged.scene.view = Object.assign({}, sc.view || {}, { lat: sc.view && Number.isFinite(sc.view.lat) ? sc.view.lat : cam.lat, lon: sc.view && Number.isFinite(sc.view.lon) ? sc.view.lon : cam.lon });
      target.rec.scene = merged.scene;
      if (target.isNew && res.report.site.length) target.rec.meta.site = res.report.site[0];
      const file = await saveRecipe(root, target);
      out(`${target.isNew ? 'wrote' : 'updated'} ${args.into}${file ? ` (${file})` : ''}: ${merged.stats.added} imported, ${merged.stats.replaced} replaced, ${merged.stats.kept} hand entries kept, ${merged.stats.edited} hand-edited imports kept (src osm*), ${merged.stats.skipped} skipped`);
    }
    if (args.preview) {
      const { sceneTimesFor } = await import(pathToFileURL(join(root, 'tools', 'lib', 'scene-times.mjs')).href);
      const day = args.date || new Date().toISOString().slice(0, 10), T = sceneTimesFor(cam.lat, cam.lon, day);
      const times = ['noon', 'golden', 'night'].map(k => [k, T[k]]).filter(x => x[1]);
      const rec = Object.assign({ camera: res.camera }, target ? target.rec.scene : res.sections);
      await previewPngs(root, rec, resolve(args.preview), { lib: L, times, log: out });
    }
    return 0;
  },
};
export default cmd;

/**
 * After a re-import the imported surface and water ids change (a new viewpoint gives new pieces). Flows (`on`) and scatter rules
 * (`on`, `avoid`) that named the old pieces would then point at nothing: each list keeps the ids that still exist and gains every
 * new imported id of a kind that one of its vanished ids had. Returns how many lists changed. Hand-named ids that survive are kept.
 */
export function repointLists(oldScene, scene) {
  // kind per id ('water' for every water region: a boat flow sails the basin and the channels alike); imported: src osm
  const kindOf = (sc) => { const m = new Map(); for (const s of (sc.surfaces || [])) if (s && s.id) m.set(s.id, s.kind); for (const w of (sc.water || [])) if (w && w.id) m.set(w.id, 'water'); return m; };
  const before = kindOf(oldScene || {}), now = kindOf(scene);
  const imported = [...(scene.surfaces || []), ...(scene.water || [])].filter(e => e && e.id && e.src === 'osm').map(e => e.id);
  const wasImported = new Set([...(oldScene.surfaces || []), ...(oldScene.water || [])].filter(e => e && e.id && /^osm/.test(e.src || '')).map(e => e.id));
  let changed = 0;
  // a list that named imported pieces now names EVERY imported piece of those kinds (stable over repeated re-imports);
  // hand-made ids are kept as they are
  const fix = (list) => {
    if (!Array.isArray(list) && typeof list !== 'string') return list;
    const ids = [].concat(list);
    const fromImport = ids.filter(id => wasImported.has(id) && before.has(id));
    if (!fromImport.length) return list;
    const kinds = new Set(fromImport.map(id => before.get(id)));
    const out = [...new Set(ids.filter(id => !wasImported.has(id) && (now.has(id) || !before.has(id))).concat(imported.filter(id => kinds.has(now.get(id)))))];
    if (out.length === ids.length && out.every((id, k) => id === ids[k])) return list;
    changed++;
    return out;
  };
  for (const f of scene.flows || []) if (f && f.on != null) f.on = fix(f.on);
  for (const r of scene.scatter || []) { if (r && r.on != null) r.on = fix(r.on); if (r && r.avoid != null) r.avoid = fix(r.avoid); }
  return changed;
}

// on its own: node tools/lib/scene-cmd/osm.mjs --at ... --heading ...
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const { values, positionals } = parseArgs({ options: Object.fromEntries(Object.entries(cmd.options).map(([k, v]) => [k, { type: v.type }])), allowPositionals: true });
  cmd.run(values, { root: ROOT, positionals, out: (s) => process.stdout.write(s + '\n'), err: (s) => process.stderr.write(s + '\n') })
    .then(code => { process.exitCode = code || 0; }, e => { process.stderr.write('scene osm: ' + e.message + '\n'); process.exitCode = 1; });
}
