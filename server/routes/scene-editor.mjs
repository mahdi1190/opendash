// server/routes/scene-editor.mjs - the scene editor's dev routes (docs/dev/SCENE_ENGINE_V2.md 23.1, 23.2; builder H).
//
// A DEVELOPER tool: every route answers 404 unless ALL of these hold when the server starts:
//   - the environment has OPENDASH_SCENE_EDITOR=1
//   - the app folder is a developer checkout (it has .git and src/app/), never a packaged release
// and each request has passed the router's guards (Host 421, same-origin 403, JSON 415, body limit 413).
//
//   GET  /api/scene-editor/status                    -> { enabled: true, version, api: 1, recipes: n }
//   GET  /api/scene-editor/recipe?ref=<pack>/<id>    -> { rec, version, file }   file: the repo-relative path, found ONLY by the
//                                                       marker scan of src/app/71-scene-*-r-*.js (never a client path).
//                                                       400 bad ref; 409 a v1 scene ("not a recipe: run scene migrate <ref> first"); 404 unknown
//   POST /api/scene-editor/recipe { ref, version, rec } (at most 256 KB)
//                                                    -> { ok, version, file, bytes }   validated, then written through the recipe
//                                                       module's writeRecipe with lib/fsutil.mjs's atomic write.
//                                                       400 bad ref / ref not matching rec.pack and rec.meta.id; 409 stale version;
//                                                       422 an unknown key, a bad value, an unknown object id or over the data budget
//   POST /api/scene-editor/lint { rec }              -> { ok, pass, gold, rules: [...], problems: [...] }   from a cached registry
//   POST /api/scene-editor/rebuild                   -> { ok, code, ms }   node build.mjs (server/lifecycle.mjs runNodeStep), one at a time
//
// Recipes are read and written ONLY through tools/lib/scene-recipe.mjs (builder D, V2 16.1). Until that module lands, a
// small private reader/writer with the same contract stands in (the marker scan, sha1 versions, a canonical block).
// Logs carry codes and counts only (never recipe text, labels or paths from the client).

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { HttpError } from '../http.mjs';
import { atomicWrite, isInside } from '../../lib/fsutil.mjs';
import { runNodeStep } from '../lifecycle.mjs';

export const SCENE_EDITOR_MAX_BODY = 256 * 1024;
export const SCENE_EDITOR_DATA_MAX = 24000;            // V2 16.1: the JSON block's budget
export const SCENE_EDITOR_API = 1;
const REF_RE = /^([a-z0-9][a-z0-9-]{0,39})\/([a-z0-9][a-z0-9-]{0,59})$/;
const RECIPE_FILE_RE = /^71-scene-[a-z0-9-]+-r-[a-z0-9-]+\.js$/;
const OPEN = '/*@recipe*/', CLOSE = '/*@end*/';
// The tools this server ships with (the lint, the registry loader): next to this file, whatever root the recipes live in.
const TOOLS_LIB = new URL('../../tools/lib/', import.meta.url).href;

// Tests swap these: the repo root, the environment, the recipe module, the registry, the build runner.
let hooks = {};
export function setSceneEditorHooks(h) { hooks = h || {}; _regMemo = null; _recipesMod = null; }

/** Is the editor on for this root and environment? (V2 23.1) */
export function sceneEditorEnabled({ env = process.env, root } = {}) {
  if (!env || env.OPENDASH_SCENE_EDITOR !== '1' || !root) return false;
  return existsSync(join(root, '.git')) && existsSync(join(root, 'src', 'app'));
}

/* ---------- the recipe module (D) or the stand-in ---------- */
let _recipesMod = null;
async function recipes(root) {
  if (hooks.recipes) return hooks.recipes;
  if (_recipesMod) return _recipesMod;
  const p = join(root, 'tools', 'lib', 'scene-recipe.mjs');
  if (existsSync(p)) {
    try {
      const m = await import(pathToFileURL(p).href);
      if (typeof m.findRecipes === 'function' && typeof m.readRecipe === 'function' && typeof m.writeRecipe === 'function') return (_recipesMod = m);
    } catch { /* a broken module: the stand-in keeps the editor usable */ }
  }
  return (_recipesMod = standInRecipes);
}
const sha1 = (s) => createHash('sha1').update(s).digest('hex');
function blockOf(text) {
  const a = text.indexOf(OPEN);
  if (a < 0) return null;
  const b = text.indexOf(CLOSE, a + OPEN.length);
  if (b < 0) return null;
  return { start: a + OPEN.length, end: b, block: text.slice(a + OPEN.length, b) };
}
const TOP_ORDER = ['v', 'pack', 'meta', 'scene'];
const SCENE_ORDER = ['id', 'view', 'camera', 'surfaces', 'water', 'buildings', 'streets', 'place', 'scatter', 'flows', 'actors', 'flocks', 'signs', 'signage',
  'layers', 'ground', 'ridges', 'relief', 'palette', 'sky', 'particles', 'fx', 'atmos', 'weather', 'cover', 'season', 'at', 'setting', 'source'];
const ordered = (o, order) => { const out = {}; for (const k of order) if (k in o) out[k] = o[k]; for (const k of Object.keys(o)) if (!(k in out)) out[k] = o[k]; return out; };
/** The stand-in's canonical block: fixed key order, each element of a list of objects on its own line. */
function standInFormat(rec) {
  const r = ordered(rec, TOP_ORDER), lines = ['{'];
  const tk = Object.keys(r);
  tk.forEach((k, i) => {
    const comma = i < tk.length - 1 ? ',' : '';
    if (k !== 'scene' || !r.scene || typeof r.scene !== 'object') { lines.push(JSON.stringify(k) + ':' + JSON.stringify(r[k]) + comma); return; }
    const s = ordered(r.scene, SCENE_ORDER), sk = Object.keys(s);
    lines.push('"scene":{');
    sk.forEach((q, j) => {
      const c2 = j < sk.length - 1 ? ',' : '', v = s[q];
      if (Array.isArray(v) && v.length && v.every(x => x && typeof x === 'object')) {
        lines.push(' ' + JSON.stringify(q) + ':[');
        v.forEach((x, n) => lines.push('  ' + JSON.stringify(x) + (n < v.length - 1 ? ',' : '')));
        lines.push(' ]' + c2);
      } else lines.push(' ' + JSON.stringify(q) + ':' + JSON.stringify(v) + c2);
    });
    lines.push('}' + comma);
  });
  lines.push('}');
  return lines.join('\n');
}
const standInRecipes = {
  standIn: true,
  findRecipes(root) {
    const app = join(root, 'src', 'app');
    if (!existsSync(app)) return [];
    const out = [];
    for (const f of readdirSync(app).filter(n => RECIPE_FILE_RE.test(n)).sort()) {
      const file = join(app, f), b = blockOf(readFileSync(file, 'utf8'));
      if (!b) continue;
      try { const rec = JSON.parse(b.block); if (rec && rec.pack && rec.meta && rec.meta.id) out.push({ ref: rec.pack + '/' + rec.meta.id, file, start: b.start, end: b.end }); } catch { /* not a valid block: skipped */ }
    }
    return out;
  },
  readRecipe(root, ref) {
    const hit = standInRecipes.findRecipes(root).find(r => r.ref === ref);
    if (!hit) return null;
    const b = blockOf(readFileSync(hit.file, 'utf8'));
    return { rec: JSON.parse(b.block), file: hit.file, version: sha1(b.block) };
  },
  formatRecipe: standInFormat,
  async writeRecipe(root, rec, { version, file, write } = {}) {
    const text = readFileSync(file, 'utf8'), b = blockOf(text);
    if (!b) throw Object.assign(new Error('the recipe markers are missing'), { status: 409, code: 'NO_BLOCK' });
    if (version && sha1(b.block) !== version) throw Object.assign(new Error('the recipe changed on disk'), { status: 409, code: 'STALE' });
    const block = standInFormat(rec);
    if (block === b.block) return { changed: false, version: sha1(block), file };
    await (write || atomicWrite)(file, text.slice(0, b.start) + block + text.slice(b.end));
    return { changed: true, version: sha1(block), file };
  },
};

/* ---------- the registry (loaded once, lazily) ---------- */
let _regMemo = null;
async function registry(root) {
  if (hooks.registry) return hooks.registry;
  if (_regMemo) return _regMemo;
  const { loadRegistry } = await import(TOOLS_LIB + 'anim-render.mjs');
  const { engineOf } = await import(TOOLS_LIB + 'scene-lint.mjs');
  const reg = loadRegistry(root);
  _regMemo = { reg, E: engineOf(reg), get: (n) => reg.R.get(n) };
  return _regMemo;
}

/* ---------- validation (V2 23.2) ---------- */
const META_KEYS = new Set(['id', 'label', 'site', 'tags', 'mood', 'colour', 'region', 'slot', 'theme', 'intensity', 'priority', 'ukRegion', 'ukPlace', 'county', 'sceneSeason', 'view', 'place', 'town', 'credit', 'unlock', 'weight']);
// the scene keys a recipe may hold: the runtime's own list (A's SCENE_RECIPE_SCENE_KEYS) when the registry has it, plus these
const SCENE_KEYS = new Set(SCENE_ORDER.concat(['v', 'layers', 'ground', 'terrain', 'tropic', 'drive', 'kits', 'meta', 'sky', 'particles']));
const ID_RE = /^[a-z0-9-]{1,60}$/;
/** Text that could end the marker block, open a comment, or close the page's <script> once built in. */
const UNSAFE_TEXT = /\*\/|\/\*|<\/|<!--|[\u0000-\u0008\u000b\u000c\u000e-\u001f]|[\p{Zl}\p{Zp}]/u;
function walkStrings(v, fn, path = '', depth = 0) {
  if (depth > 12) { fn(null, path, 'too deeply nested'); return; }
  if (typeof v === 'string') { fn(v, path); return; }
  if (typeof v === 'number') { if (!Number.isFinite(v)) fn(null, path, 'not a finite number'); return; }
  if (v === null || typeof v === 'boolean') return;
  if (Array.isArray(v)) { v.forEach((x, i) => walkStrings(x, fn, path + '[' + i + ']', depth + 1)); return; }
  if (typeof v === 'object') {
    if (Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null) { fn(null, path, 'not plain data'); return; }
    for (const k of Object.keys(v)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') { fn(null, path + '.' + k, 'a reserved key'); continue; }
      fn(k, path + '.' + k + '(key)');
      walkStrings(v[k], fn, path + '.' + k, depth + 1);
    }
    return;
  }
  fn(null, path, 'not JSON data');
}
/** Every object id a recipe draws: place, scatter, actors, flocks (a string, a list or a weight map) and the flows' mixes. */
export function recipeObjectIds(scene) {
  const ids = new Set();
  const add = (o) => { if (typeof o === 'string') ids.add(o); else if (Array.isArray(o)) o.forEach(add); else if (o && typeof o === 'object') Object.keys(o).forEach(k => ids.add(k)); };
  for (const k of ['place', 'scatter', 'actors', 'flocks']) for (const e of (Array.isArray(scene[k]) ? scene[k] : [])) if (e && typeof e === 'object') add(e.obj);
  for (const f of (Array.isArray(scene.flows) ? scene.flows : [])) if (f && f.mix && typeof f.mix === 'object') add(f.mix);
  return [...ids];
}
/**
 * The problems of a recipe the editor posts: [{ code, msg }] (empty: fine). The shape, safe text, the ref, the object ids and the
 * budget here; the engine's own check (sceneRecipeCheck, A) through the registry when it is loaded.
 */
export function recipeProblems(ref, rec, { E = null, get = () => undefined, format = standInFormat } = {}) {
  const p = [];
  const bad = (code, msg) => { if (p.length < 40) p.push({ code, msg }); };
  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return [{ code: 'SHAPE', msg: 'rec must be an object' }];
  for (const k of Object.keys(rec)) if (!TOP_ORDER.includes(k)) bad('KEY', 'unknown key ' + k.slice(0, 40));
  if (rec.v !== 2) bad('VALUE', 'v must be 2');
  if (typeof rec.pack !== 'string' || !ID_RE.test(rec.pack)) bad('VALUE', 'pack must match [a-z0-9-]');
  if (!rec.meta || typeof rec.meta !== 'object' || Array.isArray(rec.meta)) bad('SHAPE', 'meta must be an object');
  else {
    for (const k of Object.keys(rec.meta)) if (!META_KEYS.has(k)) bad('KEY', 'unknown meta key ' + k.slice(0, 40));
    if (typeof rec.meta.id !== 'string' || !ID_RE.test(rec.meta.id)) bad('VALUE', 'meta.id must match [a-z0-9-]');
  }
  const s = rec.scene;
  if (!s || typeof s !== 'object' || Array.isArray(s)) bad('SHAPE', 'scene must be an object');
  else {
    const engineKeys = get('SCENE_RECIPE_SCENE_KEYS');
    const known = Array.isArray(engineKeys) ? new Set(engineKeys) : SCENE_KEYS;
    for (const k of Object.keys(s)) if (!known.has(k)) bad('KEY', 'unknown scene key ' + k.slice(0, 40));
    if (rec.meta && s.id !== rec.meta.id) bad('VALUE', 'scene.id must equal meta.id');
    if (!s.camera || typeof s.camera !== 'object') bad('VALUE', 'a v2 recipe needs a camera');
    for (const k of ['place', 'scatter', 'surfaces', 'water', 'flows', 'actors', 'flocks', 'signs']) if (s[k] != null && !Array.isArray(s[k])) bad('VALUE', k + ' must be a list');
  }
  walkStrings(rec, (str, path, why) => {
    if (why) bad('VALUE', `${path.slice(0, 80)}: ${why}`);
    else if (str.length > 400) bad('VALUE', `${path.slice(0, 80)}: text over 400 characters`);
    else if (UNSAFE_TEXT.test(str)) bad('VALUE', `${path.slice(0, 80)}: text with a comment marker, "</" or a control character`);
  });
  const m = REF_RE.exec(ref || '');
  if (m && rec.pack && rec.meta && (m[1] !== rec.pack || m[2] !== rec.meta.id)) bad('REF', 'ref does not match rec.pack / rec.meta.id');
  if (p.length) return p;
  if (E && typeof E.obj === 'function') for (const id of recipeObjectIds(s)) if (!E.obj(id)) bad('OBJECT', 'unknown object ' + String(id).slice(0, 60));
  let bytes = 0;
  try { bytes = format(rec).length; } catch { bad('SHAPE', 'the recipe does not format'); }
  if (bytes > SCENE_EDITOR_DATA_MAX) bad('BUDGET', `the recipe is ${bytes} bytes (at most ${SCENE_EDITOR_DATA_MAX})`);
  const check = get('sceneRecipeCheck');
  if (typeof check === 'function' && !p.length) {
    let r = [];
    try { r = check(JSON.parse(JSON.stringify(rec))) || []; } catch (e) { r = ['the engine check failed: ' + String(e && e.message || e).slice(0, 120)]; }
    for (const x of r) {
      const sev = x && typeof x === 'object' ? x.sev : 'error';
      if (sev === 'info' || sev === 'warn') continue;
      bad('ENGINE', String(x && typeof x === 'object' ? (x.msg || x.message || x.rule) : x).slice(0, 200));
    }
  }
  return p;
}

const parseRef = (ref) => {
  if (typeof ref !== 'string' || ref.length > 101 || !REF_RE.test(ref)) throw new HttpError(400, 'ref must be <pack>/<id> (lower-case letters, digits and dashes)', { code: 'BAD_REF' });
  return ref;
};
const listed = (status, message, code, problems) => new HttpError(status, message, { code, toJSON: () => ({ error: message, code, problems: (problems || []).slice(0, 20) }) });

export default function register(app) {
  const { log } = app.ctx;
  const root = resolve(hooks.root || app.ctx.repoRoot || '.');
  const env = hooks.env || process.env;
  if (!sceneEditorEnabled({ env, root })) {
    // Off: the same answer for every path and method, whatever the request (nothing about the editor is revealed).
    app.route({ prefix: '/api/scene-editor/', method: '*', quiet: true, handler: (c) => c.json(404, { error: 'not found' }) });
    return;
  }
  const rel = (f) => relative(root, f).replace(/\\/g, '/');
  /** The file of a ref, ONLY from the marker scan (a path from the client is never used). */
  async function locate(ref) {
    const R = await recipes(root);
    const list = await R.findRecipes(root);
    const hit = list.find(r => r.ref === ref);
    if (!hit) return null;
    const file = resolve(root, hit.file);
    if (!isInside(join(root, 'src', 'app'), file) || !RECIPE_FILE_RE.test(basename(file))) return null;
    return { R, file };
  }
  async function isV1Scene(ref) {
    try {
      const { reg } = await registry(root);
      return !!reg.items().find(x => x.ref === ref && x.composed);
    } catch { return false; }
  }

  app.route({
    path: '/api/scene-editor/status', method: 'GET', methodError: 'GET only',
    handler: async (c) => {
      const R = await recipes(root);
      let n = 0; try { n = (await R.findRecipes(root)).length; } catch { /* counted as none */ }
      return { enabled: true, version: c.version, api: SCENE_EDITOR_API, recipes: n, standIn: !!R.standIn };
    },
  });

  app.route({
    path: '/api/scene-editor/recipe', method: ['GET', 'POST'], maxBody: SCENE_EDITOR_MAX_BODY, methodError: 'GET or POST only',
    handler: async (c) => {
      if (c.method === 'GET') {
        const ref = parseRef(c.query.get('ref'));
        const at = await locate(ref);
        if (!at) {
          if (await isV1Scene(ref)) throw new HttpError(409, `not a recipe: run scene migrate ${ref} first`, { code: 'NOT_RECIPE' });
          throw new HttpError(404, 'no such recipe', { code: 'NOT_FOUND' });
        }
        const r = await at.R.readRecipe(root, ref);
        if (!r) throw new HttpError(404, 'no such recipe', { code: 'NOT_FOUND' });
        return { rec: r.rec, version: r.version, file: rel(at.file) };
      }
      const b = await c.body();
      if (!b || typeof b !== 'object') throw new HttpError(400, 'a JSON body is required', { code: 'BAD_REQUEST' });
      const ref = parseRef(b.ref);
      if (typeof b.version !== 'string' || !/^[0-9a-f]{6,64}$/.test(b.version)) throw new HttpError(400, 'version is required (from GET recipe)', { code: 'BAD_REQUEST' });
      const at = await locate(ref);
      if (!at) throw new HttpError(404, 'no such recipe (new recipes are made by scene new, not the editor)', { code: 'NOT_FOUND' });
      let reg = null;
      try { reg = await registry(root); } catch (e) { log('warn', 'scene-editor: registry failed to load'); }
      const problems = recipeProblems(ref, b.rec, { E: reg && reg.E, get: reg ? reg.get : () => undefined, format: at.R.formatRecipe || standInFormat });
      if (problems.some(x => x.code === 'REF')) throw listed(400, 'ref does not match the recipe', 'BAD_REF', problems);
      if (problems.length) { log('info', `scene-editor save refused (${problems.length} problems: ${[...new Set(problems.map(x => x.code))].join(',')})`); throw listed(422, problems[0].msg, 'INVALID', problems); }
      let w;
      // the recipe module may call write() without awaiting it (a synchronous API): keep the promise and wait for it here
      let pending = null;
      const write = (f, text) => { pending = atomicWrite(f, text); return pending; };
      try { w = await at.R.writeRecipe(root, b.rec, { version: b.version, file: at.file, write }); if (pending) await pending; }
      catch (e) {
        const stale = e && (e.status === 409 || e.code === 'STALE' || /stale|changed|version/i.test(String(e.message)));
        if (stale) throw new HttpError(409, 'The recipe changed on disk since you opened it. Reload it, then make your change again.', { code: 'STALE' });
        if (e && (e.status === 422 || e.status === 404)) throw new HttpError(e.status, String(e.message || 'the recipe was refused').slice(0, 300), { code: e.code || (e.status === 404 ? 'NOT_FOUND' : 'INVALID') });
        throw e;
      }
      const after = await at.R.readRecipe(root, ref);
      const counts = ['place', 'surfaces', 'water', 'flows'].map(k => (b.rec.scene[k] || []).length).join('/');
      log('info', `scene-editor saved a recipe (${counts} place/surfaces/water/flows; ${w && w.changed === false ? 'unchanged' : 'written'})`);
      return { ok: true, version: after ? after.version : (w && w.version), file: rel(at.file), changed: !(w && w.changed === false), bytes: after ? JSON.stringify(after.rec).length : 0 };
    },
  });

  app.route({
    path: '/api/scene-editor/lint', method: 'POST', maxBody: SCENE_EDITOR_MAX_BODY, methodError: 'POST only',
    handler: async (c) => {
      const b = await c.body();
      if (!b || !b.rec || typeof b.rec !== 'object') throw new HttpError(400, 'rec is required', { code: 'BAD_REQUEST' });
      const ref = parseRef(b.rec && b.rec.pack && b.rec.meta ? `${b.rec.pack}/${b.rec.meta.id}` : '');
      const { E, get } = await registry(root);
      const shape = recipeProblems(ref, b.rec, { E, get });
      if (shape.length) return { ok: false, pass: false, gold: false, rules: shape.map(x => ({ group: 'data', rule: x.code.toLowerCase(), ok: false, message: x.msg })), problems: [] };
      const fromRecipe = get('sceneFromRecipe');
      const data = typeof fromRecipe === 'function' ? fromRecipe(JSON.parse(JSON.stringify(b.rec.scene))) : JSON.parse(JSON.stringify(b.rec.scene));
      const { lintScene } = await import(TOOLS_LIB + 'scene-lint.mjs');
      let thresholds = {};
      try { thresholds = JSON.parse(readFileSync(join(root, 'tools', 'anim-quality.json'), 'utf8')); } catch { /* the defaults */ }
      const item = typeof E.item === 'function' ? Object.assign(E.item(b.rec.meta, data), { ref, pack: b.rec.pack, id: b.rec.meta.id }) : null;
      const t0 = Date.now();
      const r = lintScene(data, thresholds, { E, item, ref, svg: false });
      const problems = (r.compiled && Array.isArray(r.compiled.problems) ? r.compiled.problems : []).slice(0, 200);
      const rules = (r.rules || []).map(x => ({ group: x.group, rule: x.rule, ok: !!x.ok, warn: !!x.warn, value: x.value, limit: x.limit, message: x.message || '', i: x.i, sev: x.sev }));
      log('info', `scene-editor lint ${r.pass ? 'pass' : 'fail'} (${rules.filter(x => !x.ok).length} failing, ${problems.length} problems) ${Date.now() - t0}ms`);
      return { ok: true, pass: !!r.pass, gold: !!r.gold, rules, problems };
    },
  });

  let building = null;
  app.route({
    path: '/api/scene-editor/rebuild', method: 'POST', maxBody: 1024, methodError: 'POST only',
    handler: async () => {
      if (building) throw new HttpError(409, 'a rebuild is already running', { code: 'BUSY' });
      const run = hooks.run || ((script, args) => runNodeStep(script, args, { cwd: root, echo: () => {} }));
      const t0 = Date.now();
      building = Promise.resolve().then(() => run('build.mjs', []));
      try {
        const r = await building;
        log(r.code === 0 ? 'info' : 'warn', `scene-editor rebuild exit ${r.code} ${Date.now() - t0}ms`);
        if (r.code !== 0) throw new HttpError(500, 'the build failed: run node build.mjs in a terminal to see why', { code: 'BUILD_FAILED' });
        return { ok: true, code: 0, ms: Date.now() - t0 };
      } finally { building = null; }
    },
  });

  app.route({ prefix: '/api/scene-editor/', method: '*', handler: (c) => c.json(404, { error: 'not found' }) });
}
