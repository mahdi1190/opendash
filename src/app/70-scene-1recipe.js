/* ============================================================
   SCENE ENGINE v2: recipes, the runtime half (docs/dev/SCENE_ENGINE_V2.md 16.1; builder A). PURE classic script.
   A v2 scene lives in its own file, src/app/71-scene-<pack>-r-<id>.js, as strict JSON between markers:
     typeof sceneAddRecipe === 'function' && sceneAddRecipe(<@recipe marker>{ "v": 2, "pack": ..., "meta": {...}, "scene": {...} }<@end marker>);
   The Node half (find, read, format, write) is tools/lib/scene-recipe.mjs (D). Private names: _scrc.

     sceneAddRecipe(rec)            registers the scene: sceneAdd(rec.pack, meta, () => sceneFromRecipe(rec.scene)); the item is
                                    marked recipe: true, recipeV: 2, and supersedes a v1 item of the same pack and id (14.3)
     sceneFromRecipe(scene, o)      the scene data with the defaults filled (v 2, the camera, view lat / lon, a rest surface, lists);
                                    o.freeze: a deep freeze (Node tests)
     sceneRecipeCheck(rec)          -> [{ rule, sev: 'error' | 'warn', path, msg }]: the v1 sceneValidate on the v1-form parts plus
                                    the v2 keys and types, the surface and water ids and kinds, and every reference (beside, on,
                                    flows' on, actors' on)
     sceneValidateV2(data)          the problems of v2 scene data as strings (what sceneValidate returns for v2 data)
   ============================================================ */
const SCENE_RECIPE_KEYS = Object.freeze(['v', 'pack', 'meta', 'scene']);
const SCENE_RECIPE_SCENE_KEYS = Object.freeze(['id', 'v', 'view', 'camera', 'layers', 'ground', 'surfaces', 'water', 'place', 'scatter', 'actors', 'flocks', 'flows', 'signs', 'signage', 'buildings', 'streets',
  'terrain', 'source', 'atmos', 'weather', 'cover', 'season', 'tropic', 'at', 'setting', 'palette', 'sky', 'particles', 'drive', 'kits', 'fx', 'meta']);
const _SCRC_ID_RE = /^[a-z0-9-]{1,40}$/, _SCRC_SURF_RE = /^[a-z0-9-]{1,30}$/;
function _scrcFreeze(o) { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const k of Object.keys(o)) _scrcFreeze(o[k]); } return o; }
const _scrcClone = (o) => JSON.parse(JSON.stringify(o));
/** The scene data of a recipe's scene, defaults filled (16.1): v 2, a camera, view lat / lon from the camera, a rest surface, empty lists. */
function sceneFromRecipe(scene, o) {
  o = o || {};
  const s = scene && typeof scene === 'object' ? _scrcClone(scene) : {};
  s.v = 2;
  s.camera = Object.assign({ eye: 1.65, fov: 66, horizon: 470 }, s.camera || {});
  s.view = Object.assign({}, s.view || {});
  if (!Number.isFinite(s.view.lat) && Number.isFinite(s.camera.lat)) s.view.lat = s.camera.lat;
  if (!Number.isFinite(s.view.lon) && Number.isFinite(s.camera.lon)) s.view.lon = s.camera.lon;
  if (!Array.isArray(s.surfaces)) s.surfaces = [];
  if (!s.surfaces.some(x => x && x.rest)) s.surfaces.unshift({ id: s.surfaces.some(x => x && x.id === 'land') ? 'land-rest' : 'land', kind: 'grass', rest: true });
  for (const k of ['water', 'place', 'scatter', 'actors', 'flocks', 'flows']) if (!Array.isArray(s[k])) s[k] = [];
  if (s.atmos == null) s.atmos = 'auto';
  if (s.weather == null) s.weather = 'live';
  if (s.cover == null) s.cover = 'auto';
  if (s.season == null) s.season = 'auto';
  if (s.particles == null) s.particles = 'season';
  return o.freeze ? _scrcFreeze(s) : s;
}
/** Register a recipe (16.1): an item of rec.pack that supersedes a v1 item of the same id (14.3). */
function sceneAddRecipe(rec) {
  if (!rec || typeof rec !== 'object' || !rec.meta || !rec.scene || typeof rec.pack !== 'string') return null;
  const meta = Object.assign({}, rec.meta), sc = rec.scene, cam = sc.camera || {}, view = sc.view || {};
  const lat = Number.isFinite(view.lat) ? view.lat : cam.lat, lon = Number.isFinite(view.lon) ? view.lon : cam.lon;
  if (!meta.liveSky && Number.isFinite(lat) && Number.isFinite(lon)) meta.liveSky = { lat, lon };
  let data = null;
  sceneAdd(rec.pack, meta, () => data || (data = sceneFromRecipe(Object.assign({ id: meta.id }, sc))));
  const list = typeof _scPacks === 'object' ? _scPacks[rec.pack] : null, it = list && list[list.length - 1];
  if (it) { it.recipe = true; it.recipeV = 2; if (meta.liveSky) it.liveSky = meta.liveSky; }
  return it || null;
}
/**
 * V2 14.3 for EVERY pack (integration, 8 Oct): area packs build their items from data tables, not through sceneItems, so a recipe
 * written by `scene migrate` for one of their items was never used. animRegisterPack calls this: each item of the pack that a
 * recipe of the same pack supersedes (the same id, or the region's county prefix + the recipe's id) takes the recipe's scene and
 * keeps its own id and fields (when, place, view, season, tags: pins, favourites and rotation are unchanged). Pure.
 */
function sceneRecipeSupersede(packId, items) {
  const list = typeof _scPacks === 'object' && _scPacks ? (_scPacks[packId] || []).filter(it => it && it.recipe) : [];
  if (!list.length || !Array.isArray(items)) return items;
  const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const SCENE_KEYS = ['scene', 'svg', 'composed', 'rich', 'full', 'recipe', 'recipeV', 'liveSky', 'reduced', 'slot'];
  return items.map(it => {
    if (!it || it.recipe || typeof it.id !== 'string') return it;
    const pre = slug(it.county) ? slug(it.county) + '-' : null;
    const r = list.find(q => q.id === it.id || (pre && pre + q.id === it.id));
    if (!r || r === it) return it;
    const out = Object.assign({}, it);
    for (const k of SCENE_KEYS) if (r[k] !== undefined) out[k] = r[k];
    out.supersedes = true;
    return out;
  });
}
/** The v1-form parts of v2 data, for the v1 validation: pixel placements, area scatter, pixel ground and water, actors with pixel paths. */
function _scrcV1View(d) {
  const v = Object.assign({}, d);
  delete v.camera;
  v.v = 1;
  v.layers = Array.isArray(d.layers) && d.layers.length ? d.layers.map(l => ({ id: l.id, depth: 0.5, haze: 0 })) : undefined;
  if (!v.layers) delete v.layers;
  v.ground = Array.isArray(d.ground) ? d.ground : [];
  v.water = (d.water || []).filter(w => w && w.d != null);
  v.scatter = (d.scatter || []).filter(r => r && r.area);
  v.actors = (d.actors || []).filter(a => a && Array.isArray(a.path));
  if (!Number.isFinite((v.view || {}).lat) && d.camera && Number.isFinite(d.camera.lat)) v.view = Object.assign({}, v.view, { lat: d.camera.lat, lon: d.camera.lon });
  return v;
}
/**
 * The problems of a v2 scene's data: [{ rule, sev, path, msg }]. The v1 checks (objects, layers, signs, the v1-form parts) plus the
 * v2 ones: the camera's numbers, surface ids, kinds and geometry, water regions, placements' forms and references, scatter rules,
 * flows' and actors' surfaces.
 */
function _scrcSceneProblems(s) {
  const p = [], err = (path, msg, rule) => p.push({ rule: rule || 'recipe', sev: 'error', path, msg }), warn = (path, msg, rule) => p.push({ rule: rule || 'recipe', sev: 'warn', path, msg });
  if (!s || typeof s !== 'object' || Array.isArray(s)) return [{ rule: 'recipe', sev: 'error', path: 'scene', msg: 'the scene is not an object' }];
  for (const k of Object.keys(s)) if (!SCENE_RECIPE_SCENE_KEYS.includes(k)) warn('scene.' + k, 'unknown scene key ' + k);
  if (typeof sceneValidate === 'function') for (const m of sceneValidate(_scrcV1View(s))) err('scene', m, 'v1');
  const c = s.camera;
  if (!c || typeof c !== 'object') err('scene.camera', 'a v2 scene needs a camera');
  else {
    const num = (k, lo, hi) => { if (c[k] != null && !(typeof c[k] === 'number' && isFinite(c[k]) && c[k] >= lo && c[k] <= hi)) err('scene.camera.' + k, `camera.${k} must be a number from ${lo} to ${hi}`); };
    num('eye', 0.2, 3000); num('fov', 10, 150); num('horizon', -1000, 880); num('heading', -360, 720); num('x0', -800, 2400); num('water', -50, 50); num('lat', -90, 90); num('lon', -180, 180); num('alt', -500, 9000);
    if (c.eye == null && c.horizon == null && c.fov == null && c.preset == null) err('scene.camera', 'the camera needs eye, fov, horizon or preset (else the scene is v1)');
  }
  const kinds = typeof SCENE_SURFACE_KINDS === 'object' ? SCENE_SURFACE_KINDS : null;
  const ids = new Set(), waterIds = new Set();
  const pts = (a) => Array.isArray(a) && a.every(q => Array.isArray(q) && q.length >= 2 && Number.isFinite(q[0]) && Number.isFinite(q[1]));
  let rests = 0;
  (Array.isArray(s.surfaces) ? s.surfaces : []).forEach((x, i) => {
    const P = `scene.surfaces[${i}]`;
    if (!x || typeof x !== 'object') return err(P, 'a surface is an object');
    if (!_SCRC_SURF_RE.test(String(x.id || ''))) err(P + '.id', `the id "${x.id}" must match [a-z0-9-]{1,30}`);
    else if (ids.has(x.id)) err(P + '.id', `the id ${x.id} is used twice`);
    ids.add(x.id);
    const kind = x.kind || (x.rest ? 'grass' : null);
    if (kinds && (!kinds[kind] || kind === 'water')) err(P + '.kind', `unknown surface kind ${x.kind}`);
    if (x.rest) { rests++; return; }
    const geo = (x.band ? 1 : 0) + (x.poly ? 1 : 0) + (x.path ? 1 : 0) + (x.beside ? 1 : 0);
    if (geo !== 1) err(P, 'give exactly one of rest, band, poly, path (+ width) or beside (+ width)');
    if (x.poly && (!pts(x.poly) || x.poly.length < 3)) err(P + '.poly', 'poly: at least 3 [x, d] points');
    if (x.path && (!pts(x.path) || x.path.length < 2)) err(P + '.path', 'path: at least 2 [x, d] points');
    if ((x.path || x.beside) && !(Number.isFinite(x.width) && x.width > 0)) err(P + '.width', 'a strip needs width > 0 (metres)');
    if (x.band && !(Array.isArray(x.band) && x.band.length === 2 && Number.isFinite(x.band[0]) && (x.band[1] === null || Number.isFinite(x.band[1])) && (x.band[1] === null || x.band[1] > x.band[0]))) err(P + '.band', 'band: [d0, d1] metres, d1 > d0 (null: to the horizon)');
    if (x.side != null && !['left', 'right'].includes(x.side)) err(P + '.side', "side: 'left' or 'right'");
  });
  if (rests > 1) err('scene.surfaces', 'at most one rest surface');
  (Array.isArray(s.water) ? s.water : []).forEach((w, i) => {
    const P = `scene.water[${i}]`;
    if (!w || typeof w !== 'object' || w.d != null) return;
    if (!_SCRC_SURF_RE.test(String(w.id || ''))) err(P + '.id', `the id "${w.id}" must match [a-z0-9-]{1,30}`);
    else if (ids.has(w.id)) err(P + '.id', `the id ${w.id} is used twice (surfaces and water share one name space)`);
    ids.add(w.id); waterIds.add(w.id);
    if (w.kind != null && !['canal', 'river', 'lake', 'pond', 'sea', 'harbour'].includes(w.kind)) err(P + '.kind', 'kind: canal river lake pond sea harbour');
    const geo = (w.band ? 1 : 0) + (w.poly ? 1 : 0) + (w.path ? 1 : 0);
    if (geo !== 1) err(P, 'give exactly one of path (+ width), poly or band');
    if (w.path && (!pts(w.path) || w.path.length < 2 || !(w.width > 0))) err(P + '.path', 'a channel: path [[x, d], ...] (2+) and width > 0');
    if (w.poly && (!pts(w.poly) || w.poly.length < 3)) err(P + '.poly', 'poly: at least 3 [x, d] points');
    if (w.banks) for (const side of Object.keys(w.banks)) { if (!['left', 'right'].includes(side)) err(P + '.banks', 'banks: left and right'); const b = w.banks[side]; if (b && b.surface && kinds && !kinds[b.surface]) err(P + '.banks.' + side, 'unknown bank surface ' + b.surface); }
    if (w.banks && !w.path) warn(P + '.banks', 'banks need a channel (path + width)');
  });
  // the banks' generated ids are surfaces too
  for (const w of (Array.isArray(s.water) ? s.water : [])) if (w && w.id && w.banks) for (const side of ['left', 'right']) if (w.banks[side]) { ids.add(w.id + '-' + side); ids.add(w.id + '-' + side + '-edge'); }
  (Array.isArray(s.surfaces) ? s.surfaces : []).forEach((x, i) => { if (x && x.beside && !ids.has(x.beside)) err(`scene.surfaces[${i}].beside`, `beside: no surface or water ${x.beside}`); });
  (Array.isArray(s.place) ? s.place : []).forEach((q, i) => {
    const P = `scene.place[${i}]`;
    if (!q || typeof q !== 'object') return err(P, 'a placement is an object');
    const ground = q.on != null || q.at != null, pixel = Number.isFinite(q.x) && Number.isFinite(q.y);
    if (!ground && !pixel) err(P, 'give on (+ d, u or along) or at: [x, d], or a pixel x, y');
    if (ground && pixel) err(P, 'a placement is either ground (on / at) or pixel (x, y), not both');
    if (q.on != null && !ids.has(q.on)) err(P + '.on', `on: no surface or water ${q.on}`);
    if (q.at != null && !(Array.isArray(q.at) && q.at.length === 2 && q.at.every(Number.isFinite) && q.at[1] > 0)) err(P + '.at', 'at: [x, d] metres, d > 0');
    if (q.d != null && !(Number.isFinite(q.d) && q.d > 0)) err(P + '.d', 'd: metres > 0');
    for (const k of ['u', 'along']) if (q[k] != null && !(Number.isFinite(q[k]) && q[k] >= 0 && q[k] <= 1)) err(P + '.' + k, k + ': 0 to 1');
    if (q.k != null && !(Number.isFinite(q.k) && q.k > 0.05 && q.k < 5)) err(P + '.k', 'k: a size factor, 0.05 to 5');
    if (q.face != null && !['left', 'right', 'away', 'toward'].includes(q.face)) err(P + '.face', "face: 'left' | 'right' | 'away' | 'toward'");
    if (q.dir != null && !['away', 'toward'].includes(q.dir)) err(P + '.dir', "dir: 'away' | 'toward'");
  });
  (Array.isArray(s.scatter) ? s.scatter : []).forEach((r, i) => {
    if (!r || r.area) return;
    const P = `scene.scatter[${i}]`;
    for (const k of ['on', 'avoid']) for (const x of [].concat(r[k] || [])) if (!ids.has(x) && !(kinds && kinds[x])) err(P + '.' + k, `${k}: ${x} is neither a surface id nor a kind`);
    if (r.d != null && !(Array.isArray(r.d) && r.d.length === 2 && r.d.every(Number.isFinite) && r.d[1] > r.d[0])) err(P + '.d', 'd: [d0, d1] metres');
    if (r.dist != null && !['ground', 'screen'].includes(r.dist)) err(P + '.dist', "dist: 'ground' | 'screen'");
    if (r.n != null && !(Number.isFinite(r.n) && r.n >= 0 && r.n <= 3000)) err(P + '.n', 'n: 0 to 3000');
    if (r.k != null && !(Array.isArray(r.k) && r.k.length === 2 && r.k.every(Number.isFinite))) err(P + '.k', 'k: [a, b]');
  });
  (Array.isArray(s.flows) ? s.flows : []).forEach((f, i) => { for (const x of [].concat((f && f.on) || [])) if (!ids.has(x)) err(`scene.flows[${i}].on`, `on: no surface or water ${x}`); });
  (Array.isArray(s.actors) ? s.actors : []).forEach((a, i) => {
    if (!a || Array.isArray(a.path)) return;
    if (a.on != null && !ids.has(a.on)) err(`scene.actors[${i}].on`, `on: no surface or water ${a.on}`);
    if (a.on == null && !(Array.isArray(a.ground) && a.ground.length >= 2 && pts(a.ground))) err(`scene.actors[${i}]`, 'an actor needs path (pixels), ground [[x, d], ...] or on');
  });
  if (s.cover != null && !(s.cover === 'auto' || s.cover === false || s.cover === 'none' || (typeof s.cover === 'object' && Number.isFinite(s.cover.density)))) err('scene.cover', "cover: 'auto' | false | { density }");
  if (s.terrain && s.terrain.ridges != null && !Array.isArray(s.terrain.ridges)) err('scene.terrain.ridges', 'ridges: a list');
  if (s.ground != null && !Array.isArray(s.ground) && typeof s.ground === 'object' && s.ground.relief) {
    const r = s.ground.relief;
    if (!(Array.isArray(r.h) && r.h.length === (r.nx | 0) * (r.nd | 0) && (r.nx | 0) >= 2 && (r.nd | 0) >= 2)) err('scene.ground.relief', 'relief: { x: [x0, x1], d: [d0, d1], nx, nd, h: nx * nd heights }');
  }
  return p;
}
/** The problems of a recipe (16.1): its shape (v, pack, meta, scene) and its scene's. -> [{ rule, sev, path, msg }] */
function sceneRecipeCheck(rec) {
  const p = [], err = (path, msg) => p.push({ rule: 'recipe', sev: 'error', path, msg });
  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return [{ rule: 'recipe', sev: 'error', path: '', msg: 'a recipe is an object { v, pack, meta, scene }' }];
  for (const k of Object.keys(rec)) if (!SCENE_RECIPE_KEYS.includes(k)) err(k, 'unknown recipe key ' + k);
  if (rec.v !== 2) err('v', 'v must be 2');
  if (!_SCRC_ID_RE.test(String(rec.pack || ''))) err('pack', 'pack: [a-z0-9-]{1,40}');
  const m = rec.meta;
  if (!m || typeof m !== 'object') err('meta', 'meta is an object');
  else {
    if (!_SCRC_ID_RE.test(String(m.id || ''))) err('meta.id', 'meta.id: [a-z0-9-]{1,40}');
    for (const k of ['label', 'site']) if (typeof m[k] !== 'string' || !m[k]) err('meta.' + k, 'meta.' + k + ' is required');
    if (!Array.isArray(m.tags)) err('meta.tags', 'meta.tags is a list');
    if (rec.scene && rec.scene.id != null && rec.scene.id !== m.id) err('scene.id', 'scene.id must equal meta.id');
  }
  try { JSON.stringify(rec); } catch (e) { err('', 'the recipe is not JSON'); }
  return p.concat(_scrcSceneProblems(rec.scene));
}
/** sceneValidate for v2 data (the core defers here): the error messages as strings. */
function sceneValidateV2(data) {
  return _scrcSceneProblems(data).filter(x => x.sev === 'error').map(x => (x.rule === 'v1' ? x.msg : x.path + ': ' + x.msg));
}
