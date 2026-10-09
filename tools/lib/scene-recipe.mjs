// Scene recipes, the Node half (docs/dev/SCENE_ENGINE_V2.md 16.1; builder D). Node >= 20, no dependencies.
//
// A v2 scene lives in its OWN file, src/app/71-scene-<pack>-r-<id>.js, as STRICT JSON between two markers:
//     typeof sceneAddRecipe === 'function' && sceneAddRecipe(/*@recipe*/{ ...JSON... }/*@end*/);
// The runtime half (sceneAddRecipe, sceneFromRecipe, sceneRecipeCheck) is src/app/70-scene-1recipe.js (A). Every tool that writes
// a recipe (scene new and migrate (D), scene osm --into (E), scene street --into (F), scene compose (G), the editor route (H)) goes
// through THIS module, so the format stays canonical: a save that changes nothing changes no bytes, and a diff shows one line per
// changed placement.
//
//   findRecipes(root)                        -> [{ ref, pack, id, file, start, end }]   every recipe block in src/app/71-scene-*-r-*.js
//   readRecipe(root, ref)                    -> { rec, ref, file, version, start, end, text }   version: the sha1 of the block
//   formatRecipe(rec)                        -> the canonical text of the block (the JSON between the markers)
//   recipeVersion(blockText)                 -> sha1 hex of a block's text
//   writeRecipe(root, rec, { version, file, write, force }) -> { file, version, changed }
//       replaces ONLY the block; refuses with a 409-style error (err.status 409, err.code 'STALE') when the block on disk is not
//       `version` (force skips the check); writes atomically (write(file, text): the editor route passes lib/fsutil.mjs's writer)
//   newRecipeFile(root, rec, { write, force }) -> { file, text, version }   the file with its header (and the OpenStreetMap line
//       when rec.scene.source.osm); refuses to overwrite unless force
//   recipeFileName(pack, id)                 -> 'src/app/71-scene-<pack>-r-<id>.js'
//   parseRecipeBlock(text)                   -> { rec, start, end, block } | null   (the first block of a file's text)
//   recipeProblems(rec)                      -> [string]   the shape checks the tools make before writing (ids, strict JSON, budget)
//   RECIPE_START, RECIPE_END, RECIPE_MAX_BYTES (24,000: the data budget, V2 25)
import { readFileSync, writeFileSync, readdirSync, existsSync, renameSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { createHash } from 'node:crypto';

export const RECIPE_START = '/*@recipe*/', RECIPE_END = '/*@end*/', RECIPE_MAX_BYTES = 24000;
const FILE_RE = /^71-scene-[a-z0-9-]+-r-[a-z0-9-]+\.js$/;
const ID_RE = /^[a-z0-9-]{1,60}$/, PACK_RE = /^[a-z0-9-]{1,40}$/;
/** The key order of a recipe and of its scene (the runtime half's SCENE_RECIPE_SCENE_KEYS); unknown keys follow, sorted. */
const TOP_KEYS = ['v', 'pack', 'meta', 'scene'];
const SCENE_KEYS = ['id', 'v', 'view', 'camera', 'layers', 'ground', 'surfaces', 'water', 'place', 'scatter', 'actors', 'flocks', 'flows', 'signs', 'signage', 'buildings', 'streets',
  'terrain', 'source', 'atmos', 'weather', 'cover', 'season', 'tropic', 'at', 'setting', 'palette', 'sky', 'particles', 'drive', 'kits', 'fx', 'meta'];
const META_KEYS = ['id', 'label', 'site', 'tags', 'mood', 'colour', 'region', 'county', 'ukPlace', 'intensity', 'priority', 'slot', 'theme'];

export const recipeFileName = (pack, id) => `src/app/71-scene-${pack}-r-${id}.js`;
export const recipeVersion = (block) => createHash('sha1').update(String(block)).digest('hex');

/* ---------------------------------------------------------------------------------------------
   Rounding: metres to 0.1 (a placement's own position to 0.01), screen rows and columns to 1, factors to 0.01 (V2 16.1), so the text is stable
   --------------------------------------------------------------------------------------------- */
/** Keys whose numbers are ground METRES (positions and lengths along the ground): 0.1. */
const METRE_KEYS = new Set(['path', 'poly', 'polyM', 'dMax', 'band', 'width', 'gap', 'lanes', 'ground', 'x', 'h']);
/** A placement's own ground position (at: [x, d], d, alongM): 0.01 m, so a near placement lands within a unit of where it was put. */
const PLACE_KEYS = new Set(['at', 'd', 'alongM']);
/** Keys whose numbers are screen units (rows, columns): 1. */
const SCREEN_KEYS = new Set(['horizon', 'x0', 'y0', 'y1', 'X', 'Y', 'area', 'rect']);
/** Keys that keep more precision: lat / lon (1e-5), the camera's eye and water level and a kerb (0.01), scales and size factors (0.001), seeds (whole). */
const FINE = { lat: 1e5, lon: 1e5, eye: 100, water: 100, kerb: 100, alt: 10, s: 1000, sByY: 1000, k: 1000, seed: 1 };
const round = (v, k) => { const r = Math.round(v * k) / k; return Object.is(r, -0) ? 0 : r; };
/**
 * The number rule for a value under a key path: pixel placements (with x, y and s) keep their screen units; inside the scene,
 * ground positions are metres. `ctx` carries the nearest named key and whether the object is a pixel placement.
 */
function roundNum(v, key, ctx) {
  if (!Number.isFinite(v)) return null;   // strict JSON: Infinity (a band to the horizon) is written null; the runtime reads null as open
  if (FINE[key]) return round(v, FINE[key]);
  if (ctx.pixel && (key === 'x' || key === 'y')) return round(v, 10);
  if (SCREEN_KEYS.has(key) || (ctx.pixelPath && key === 'path')) return round(v, 1);
  if (PLACE_KEYS.has(key)) return round(v, 100);
  if (METRE_KEYS.has(key)) return round(v, 10);
  if (key === 'heading' || key === 'fov') return round(v, 10);
  return round(v, 100);
}
/** A deep copy with numbers rounded by their keys, keys of known objects in their canonical order, undefined dropped. */
function canon(v, key, ctx, depth) {
  if (v == null) return v === undefined ? undefined : null;
  if (typeof v === 'number') return roundNum(v, key, ctx);
  if (typeof v === 'string' || typeof v === 'boolean') return v;
  if (Array.isArray(v)) return v.map(x => canon(x, key, ctx, depth + 1)).map(x => (x === undefined ? null : x));
  if (typeof v === 'object') {
    const pixel = Number.isFinite(v.x) && Number.isFinite(v.y) && ('s' in v || 'obj' in v) && !('d' in v) && !('on' in v);
    const c2 = Object.assign({}, ctx, { pixel, pixelPath: ctx.pixelPath || (key === 'actors' && !('ground' in v) && !('on' in v)) || (key === 'water' && 'd' in v) });
    const order = depth === 0 ? TOP_KEYS : key === 'scene' ? SCENE_KEYS : key === 'meta' ? META_KEYS : null;
    const keys = Object.keys(v), out = {};
    const sorted = order ? order.filter(k => keys.includes(k)).concat(keys.filter(k => !order.includes(k)).sort()) : keys;
    for (const k of sorted) { const x = canon(v[k], k, c2, depth + 1); if (x !== undefined) out[k] = x; }
    return out;
  }
  return undefined;   // functions and symbols are not data
}
const isPrim = (x) => x === null || typeof x !== 'object';

/**
 * The canonical text of a recipe block: the top level and the scene one key per line; a list of objects one element per line (each
 * compact JSON); runs of plain values (strings, numbers) on one line. Numbers rounded (metres 0.1, rows 1, factors 0.01).
 */
export function formatRecipe(rec) {
  const c = canon(rec, '', { pixel: false }, 0);
  const lines = ['{'], top = Object.keys(c);
  top.forEach((k, ti) => {
    const last = ti === top.length - 1, v = c[k];
    if (k !== 'scene' || !v || typeof v !== 'object' || Array.isArray(v)) { lines.push(`${JSON.stringify(k)}:${JSON.stringify(v)}${last ? '' : ','}`); return; }
    lines.push(`${JSON.stringify(k)}:{`);
    const sk = Object.keys(v), parts = [];
    let run = [];
    const flush = () => { if (run.length) { parts.push(' ' + run.join(',')); run = []; } };
    for (const key of sk) {
      const val = v[key], kv = JSON.stringify(key) + ':';
      if (isPrim(val)) { run.push(kv + JSON.stringify(val)); continue; }
      flush();
      if (Array.isArray(val) && val.length && val.every(x => x && typeof x === 'object')) parts.push(' ' + kv + '[\n' + val.map(x => '  ' + JSON.stringify(x)).join(',\n') + '\n ]');
      else parts.push(' ' + kv + JSON.stringify(val));
    }
    flush();
    lines.push(parts.join(',\n'));
    lines.push('}' + (last ? '' : ','));
  });
  lines.push('}');
  return lines.join('\n');
}
/** The first recipe block of a file's text: { rec, start, end, block } (start / end: the block's offsets, inside the markers). */
export function parseRecipeBlock(text) {
  const s = String(text), a = s.indexOf(RECIPE_START);
  if (a < 0) return null;
  const start = a + RECIPE_START.length, b = s.indexOf(RECIPE_END, start);
  if (b < 0) throw new Error(`a recipe block opens (${RECIPE_START}) and never closes (${RECIPE_END})`);
  const block = s.slice(start, b);
  let rec;
  try { rec = JSON.parse(block); } catch (e) { throw new Error(`the recipe block is not strict JSON: ${e.message}`); }
  return { rec, start, end: b, block };
}
/** The ref of a recipe: <pack>/<meta.id or scene.id>. */
const refOf = (rec) => `${rec.pack}/${(rec.meta && rec.meta.id) || (rec.scene && rec.scene.id)}`;

/** Every recipe block in src/app/71-scene-*-r-*.js (other files are ignored, even with markers in them). */
export function findRecipes(root) {
  const app = join(root, 'src', 'app');
  if (!existsSync(app)) return [];
  const out = [];
  for (const f of readdirSync(app).filter(n => FILE_RE.test(n)).sort()) {
    const file = join(app, f), text = readFileSync(file, 'utf8');
    let p;
    try { p = parseRecipeBlock(text); } catch (e) { out.push({ ref: null, pack: null, id: null, file, start: -1, end: -1, error: e.message }); continue; }
    if (!p) continue;
    out.push({ ref: refOf(p.rec), pack: p.rec.pack, id: (p.rec.meta && p.rec.meta.id) || (p.rec.scene && p.rec.scene.id), file, start: p.start, end: p.end });
  }
  return out;
}
/** One recipe by ref: { rec, ref, file, version, start, end, text }. Throws (err.status 404) when there is none. */
export function readRecipe(root, ref) {
  const hit = findRecipes(root).find(r => r.ref === ref);
  if (!hit) { const e = new Error(`no recipe ${ref} (recipes live in src/app/71-scene-<pack>-r-<id>.js)`); e.status = 404; e.code = 'NOT_FOUND'; throw e; }
  const text = readFileSync(hit.file, 'utf8'), p = parseRecipeBlock(text);
  return { rec: p.rec, ref, file: hit.file, version: recipeVersion(p.block), start: p.start, end: p.end, text };
}
/** Write a file atomically (a temp file in the same folder, then a rename). */
function atomicWrite(file, text) {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = join(dirname(file), `.${basename(file)}.${process.pid}.${Date.now()}.tmp`);
  writeFileSync(tmp, text);
  try { renameSync(tmp, file); } catch (e) { try { unlinkSync(tmp); } catch { /* gone */ } throw e; }
}
/** The shape checks before a write: ids, strict JSON (no NaN, no functions; Infinity is written null), the 24,000-byte budget. */
export function recipeProblems(rec) {
  const p = [];
  if (!rec || typeof rec !== 'object') return ['the recipe is not an object'];
  if (rec.v !== 2) p.push('v must be 2');
  if (!PACK_RE.test(rec.pack || '')) p.push(`pack must match ${PACK_RE} (got ${JSON.stringify(rec.pack)})`);
  if (!rec.meta || !ID_RE.test(rec.meta.id || '')) p.push(`meta.id must match ${ID_RE}`);
  if (!rec.scene || typeof rec.scene !== 'object') p.push('scene must be an object');
  else if (rec.scene.id != null && rec.meta && rec.scene.id !== rec.meta.id) p.push(`scene.id (${rec.scene.id}) and meta.id (${rec.meta && rec.meta.id}) differ`);
  const bad = [];
  const walk = (v, path) => {
    if (typeof v === 'number' && Number.isNaN(v)) bad.push(path);   // Infinity (an open band) is written null; NaN is a bug
    else if (typeof v === 'function') bad.push(path + ' (a function)');
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, path + '.' + k);
  };
  walk(rec, 'recipe');
  if (bad.length) p.push(`not strict JSON: ${bad.slice(0, 4).join(', ')}${bad.length > 4 ? ' ...' : ''}${bad.some(b => !/function/.test(b)) ? ' (NaN)' : ''}`);
  const bytes = formatRecipe(rec).length;
  if (bytes > RECIPE_MAX_BYTES) p.push(`the block is ${bytes} bytes (at most ${RECIPE_MAX_BYTES}): simplify (scatter rules instead of hand placements, fewer surface points)`);
  return p;
}
/**
 * Replace the block of an existing recipe file with rec's canonical text. opts.version: the sha1 the caller read (a stale version is
 * refused, 409); opts.file: the file (default: found by ref); opts.write(file, text): the writer (default: atomic rename);
 * opts.force: skip the version check. Returns { file, version, changed }.
 */
export function writeRecipe(root, rec, { version = null, file = null, write = null, force = false } = {}) {
  const probs = recipeProblems(rec).filter(x => !/^the block is/.test(x));   // over the data budget is the lint's business, never a lost save
  if (probs.length) { const e = new Error(`recipe ${refOf(rec)}: ${probs.join('; ')}`); e.status = 422; e.code = 'INVALID'; throw e; }
  const target = file || (findRecipes(root).find(r => r.ref === refOf(rec)) || {}).file;
  if (!target || !existsSync(target)) { const e = new Error(`no recipe file for ${refOf(rec)} (newRecipeFile makes one)`); e.status = 404; e.code = 'NOT_FOUND'; throw e; }
  const text = readFileSync(target, 'utf8'), p = parseRecipeBlock(text);
  if (!p) { const e = new Error(`${target} has no recipe block`); e.status = 422; e.code = 'INVALID'; throw e; }
  const now = recipeVersion(p.block);
  if (!force && version !== now) { const e = new Error(`recipe ${refOf(rec)} changed on disk (version ${now.slice(0, 8)}, yours ${String(version || 'none').slice(0, 8)}): read it again`); e.status = 409; e.code = 'STALE'; throw e; }
  const block = '\n' + formatRecipe(rec) + '\n';
  if (block === p.block) return { file: target, version: now, changed: false };
  const out = text.slice(0, p.start) + block + text.slice(p.end);
  (write || atomicWrite)(target, out);
  return { file: target, version: recipeVersion(block), changed: true };
}
/** The header comment of a recipe file (and the OpenStreetMap line when the scene holds OSM data). */
function headerOf(rec) {
  const osm = rec.scene && rec.scene.source && rec.scene.source.osm;
  const lines = [`/* Scene recipe v2: ${refOf(rec)} (docs/dev/SCENE_ENGINE_V2.md 16).`,
    '   Data only. Edit with the scene editor or by hand; tools rewrite the block between the markers.'];
  if (osm) lines.push('   Contains OpenStreetMap data, (c) OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright).');
  lines[lines.length - 1] += ' */';
  return lines.join('\n');
}
/** The whole text of a new recipe file. */
export function recipeFileText(rec) {
  return `${headerOf(rec)}\ntypeof sceneAddRecipe === 'function' && sceneAddRecipe(${RECIPE_START}\n${formatRecipe(rec)}\n${RECIPE_END});\n`;
}
/** Write a new recipe file (src/app/71-scene-<pack>-r-<id>.js). Refuses to overwrite unless force. Returns { file, text, version }. */
export function newRecipeFile(root, rec, { write = null, force = false } = {}) {
  const probs = recipeProblems(rec).filter(x => !/^the block is/.test(x));
  if (probs.length) { const e = new Error(`recipe ${refOf(rec)}: ${probs.join('; ')}`); e.status = 422; e.code = 'INVALID'; throw e; }
  const rel = recipeFileName(rec.pack, rec.meta.id), file = join(root, rel);
  if (existsSync(file) && !force) { const e = new Error(`${rel} exists (edit it, or pass force)`); e.status = 409; e.code = 'EXISTS'; throw e; }
  const text = recipeFileText(rec);
  (write || atomicWrite)(file, text);
  return { file, rel, text, version: recipeVersion('\n' + formatRecipe(rec) + '\n') };
}
