// World engine v3, module F: the v2 / v1 -> v3 converter (docs/dev/WORLD_ENGINE.md 6). Node >= 20, no dependencies.
//
//   loadEngine({ root })                     evaluate the scene sources (70/71-scene, the packs, 79-world-*) in Node; returns the engine
//                                            names the tools need (sceneData, sceneCamera, sceneProject, sceneUnproject, worldValidate ...)
//   resolveRef(E, ref)                       a registry item by 'pack/id', by a bare id, or by a short alias ('fleet-canal-2') -> { ref, item }
//   convertData(data, meta, E, o)            v2 or v1 scene data -> { spec, meta, report }; pure apart from the engine functions in E
//   convertRef(ref, { root, E, critic })     resolve + convert + validate (worldValidate when loaded) + the critic against the source:
//                                            ok only when valid AND at least as rich as the source (U4, P7; out.critic { source, converted, ok })
//   sceneFileSource(meta, spec, report)      the text of src/app/79-world-zscene-<id>.js (worldAdd into the hidden pack 'world-test')
//
// What it keeps: the camera; surfaces as geometry and kind; water as geometry and kind only (the water lock); ground placements in
// metres with facing; flows and behaving actors as life populations; landmarks with a src; and everything else the v2 compile
// places (U4: kits, hedgerows, bank and edge planting, scatter): exact near the camera (< 35 m), clustered beyond, hedge pieces as
// hedgerow surfaces (one solid strip each). Without the compile, scatter becomes clustered entries.
// What it drops (listed in report.dropped, never kept): light, tint, shadow, reflect, layer, scale (s, k, sByY), flip, pixel paths,
// water colours / mirror / ripple. Pixel placements are unprojected at their foot row; what has no foot goes to backdrop.skyline or is
// dropped, and each one is listed under report.review. Converted scenes are NEW items (<id>-w3); the original is never touched.
import { loadScenes, repoRoot } from '../scene-page.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { worldNames, WORLD_FILE_RE } from './load.mjs';
import { worldCritic, criticOfRef } from './critic.mjs';

const ENGINE_NAMES = ['sceneData', 'sceneCamera', 'sceneProject', 'sceneUnproject', 'sceneObj', 'sceneObjClassOf', 'sceneItems', 'animItem',
  'worldObjectInfo', 'worldValidate', 'worldBuild', 'worldAdd', 'worldNavBuild', 'worldLifeInit', 'worldLifeTick', 'worldAgents', 'worldChunks',
  'worldFrameOrder', 'worldOrderCheck', 'worldBackdrop', 'worldCoverage', 'worldHostV2Data', 'worldHostWorld', 'worldHostSim', 'worldHostAgents',
  'worldHostOrderCheck', 'worldHostData', 'worldHostSpec', 'worldRendererFor', 'worldBrains', 'sceneCompile', 'sceneSvg', 'worldNavOk', 'worldNavLayer', 'worldAddProblems', 'worldSurfaceAt', 'worldLifeIsSpawn', 'worldHostViewOf', 'worldHostPlace',
  'sceneGroundHeight', 'sceneObjs', 'sceneObjReal', 'sceneSeason', 'sceneSnowCover', 'sceneFrostAt', 'almSunPosition', 'almMoonPosition', 'almSceneLight', 'sceneLightV2', 'sceneObjShapes'];

let _cache = null;
/** Evaluate the sources once per process (about 0.3 s). */
export function loadEngine({ root = repoRoot(), fresh = false } = {}) {
  if (_cache && !fresh && _cache.root === root) return _cache.E;
  // every top-level world* / WORLD_* name of the 79-world sources (each package adds its own; a missing one is undefined)
  let names = ENGINE_NAMES;
  try { const app = join(root, 'src', 'app'); names = [...new Set([...ENGINE_NAMES, ...worldNames(readdirSync(app).filter(f => WORLD_FILE_RE.test(f)).map(f => join(app, f)))])]; } catch (e) { /* the fixed list */ }
  const extra = 'globalThis.__worldEngine = { ' + names.map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ') +
    ", refs: typeof _animRefs === 'undefined' ? null : _animRefs, packs: typeof _scPacks === 'undefined' ? null : _scPacks };";
  loadScenes(root, { fixtures: false, extra });
  const E = globalThis.__worldEngine;
  delete globalThis.__worldEngine;
  E.root = root;
  _cache = { root, E };
  return E;
}

// the three test scenes of 8.8 by their short names
export const WORLD_ALIASES = Object.freeze({
  'fleet-canal-2': 'uk-south-east/hampshire-fleet-canal-2',
  'fleet-pond-2': 'uk-south-east/hampshire-fleet-pond-2',
  'sheffield-kelham-1': 'uk-north-sheffield-kelham/south-yorkshire-sheffield-kelham-1',
});
export const WORLD_TEST_REFS = Object.freeze(Object.keys(WORLD_ALIASES));

/** A registry item: 'pack/id' (animation registry, then scene packs), a bare id, or an alias. */
export function resolveRef(E, ref) {
  const want = WORLD_ALIASES[ref] || ref;
  if (E.refs && E.refs.get(want)) return { ref: want, item: E.refs.get(want) };
  const [pack, id] = want.includes('/') ? want.split('/') : [null, want];
  if (E.packs) for (const p of Object.keys(E.packs)) {
    if (pack && p !== pack) continue;
    const it = E.packs[p].find(i => i.id === id);
    if (it) return { ref: p + '/' + it.id, item: it };
  }
  if (E.refs) for (const [k, it] of E.refs) if (k.endsWith('/' + id) || k.endsWith('-' + id)) return { ref: k, item: it };
  return null;
}

/* ---------- helpers ---------- */
const r2 = (v) => Math.round(v * 100) / 100;
const r1 = (v) => Math.round(v * 10) / 10;
const SURF_V3 = { path: 'path', pavement: 'pavement', towpath: 'towpath', plaza: 'plaza', platform: 'plaza', cycleway: 'path', steps: 'path', track: 'path',
  parking: 'plaza', driveway: 'plaza', bridge: 'bridge-deck', road: 'road', tramway: 'tram', rail: 'rail', grass: 'grass', lawn: 'grass', park: 'grass',
  verge: 'grass', field: 'field', meadow: 'field', heath: 'heath', wood: 'grass', garden: 'grass', bank: 'grass', reedbed: 'reeds', beach: 'sand', sand: 'sand',
  shingle: 'sand', rock: 'heath', mud: 'sand', plot: 'plaza', rooftop: null, edge: null };
const WATER_V3 = { canal: 'canal', river: 'river', lake: 'lake', pond: 'pond', sea: 'sea', harbour: 'harbour', puddle: 'puddle' };
const FACE_DEG = { away: 0, right: 90, toward: 180, left: 270 };
const LOOK_FIELDS = ['x', 'y', 's', 'layer', 'flip', 'tint', 'shadow', 'reflect', 'light', 'k', 'sByY', 'pin', 'anim', 'lit', 'glow'];
// flow mixes -> life mix names (C's worldBrains classes)
const MIX_NAME = { 'person.walker': 'stroll', 'person.dog-walker': 'dog-walker', 'person.jogger': 'jogger', 'person.runner': 'jogger', 'person.couple': 'couple',
  'person.buggy-walker': 'buggy', 'person.elderly': 'elderly', 'person.child': 'child', 'person.cyclist': 'cyclist' };
// behaving actors' objects -> life `who`
const WHO_OF = [[/mallard|duck/, 'mallard'], [/swan/, 'mute-swan'], [/heron/, 'heron'], [/egret/, 'egret'], [/coot/, 'coot'], [/moorhen/, 'moorhen'],
  [/grebe/, 'grebe'], [/goosander/, 'goosander'], [/kingfisher/, 'kingfisher'], [/gull/, 'gull'], [/pigeon/, 'pigeon'], [/narrowboat|boat\./, 'narrowboat-cruising'],
  [/dog/, 'dog-walker'], [/cyclist|bike/, 'cyclist'], [/jogger|runner/, 'jogger'], [/person\./, 'stroll']];
const whoOf = (obj) => { for (const [re, w] of WHO_OF) if (re.test(obj)) return w; return null; };
// perspective pieces drawn for one camera (boats, walks, bridges, weirs cut to a view): screen art, never world objects
const PIECE_RE = /[.-](p-v\d|[a-z]*-view-|fpv-|wl-\d|wr-\d)|-(parapet|bough)$/;
const WATER_WHO = new Set(['mallard', 'mute-swan', 'heron', 'egret', 'coot', 'moorhen', 'grebe', 'goosander', 'kingfisher', 'narrowboat-cruising']);

/** A band polygon (v2 `band: [d0, d1]`) across the frustum. */
function bandPoly(cam, d0, d1) {
  const t = Math.tan((cam.fov || 66) * Math.PI / 360) * 1.25, a = Math.max(0.5, d0), b = Math.min(d1, 4000);
  return [[-a * t, a], [a * t, a], [b * t, b], [-b * t, b]].map(p => [r1(p[0]), r1(p[1])]);
}
/** The span of a polygon at depth z (min and max x of the crossings), or null. */
function polySpan(poly, z) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [x1, z1] = poly[i], [x2, z2] = poly[j];
    if ((z1 <= z && z2 > z) || (z2 <= z && z1 > z)) { const x = x1 + (z - z1) / (z2 - z1) * (x2 - x1); lo = Math.min(lo, x); hi = Math.max(hi, x); }
  }
  return lo <= hi ? [lo, hi] : null;
}
/** A point along a path at fraction f (or metres m), and its unit tangent. */
function alongPath(path, f, m) {
  const seg = []; let L = 0;
  for (let i = 1; i < path.length; i++) { const l = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); seg.push(l); L += l; }
  let s = m != null ? m : f * L;
  for (let i = 1; i < path.length; i++) {
    if (s <= seg[i - 1] || i === path.length - 1) { const t = Math.min(1, s / (seg[i - 1] || 1)), a = path[i - 1], b = path[i], l = seg[i - 1] || 1; return { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], tx: (b[0] - a[0]) / l, tz: (b[1] - a[1]) / l, L }; }
    s -= seg[i - 1];
  }
  return { p: path[0], tx: 0, tz: 1, L };
}
/** The point of a path strip at depth z (interpolated centreline), its tangent. */
function pathAtZ(path, z) {
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    if ((a[1] <= z && b[1] >= z) || (b[1] <= z && a[1] >= z)) { const t = (z - a[1]) / ((b[1] - a[1]) || 1), l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return { p: [a[0] + (b[0] - a[0]) * t, z], tx: (b[0] - a[0]) / l, tz: (b[1] - a[1]) / l }; }
  }
  return null;
}
const stripOf = (s) => s && (s.path ? { path: s.path, width: s.width || 2 } : null);

/** The heading (world degrees, 0 = away, 90 = right) of a tangent. */
const headingOf = (tx, tz) => ((Math.round(Math.atan2(tx, tz) * 180 / Math.PI) % 360) + 360) % 360;
/** The headline URL or listing reference in a scene source file's header comment (the `src` of its landmarks). */
function headerSrc(root, id) {
  try {
    const app = join(root, 'src', 'app');
    for (const f of readdirSync(app)) {
      if (!/^7[01]-scene-/.test(f)) continue;
      const t = readFileSync(join(app, f), 'utf8');
      if (!t.includes(`'${id}'`) && !t.includes(`"${id}"`)) continue;
      const head = t.slice(0, 3000), m = head.match(/https?:\/\/[^\s)'"]+/);
      if (m) return m[0];
      const os = head.match(/OS (Explorer|Landranger)[^\n]*/);
      if (os) return os[0].trim();
    }
  } catch (e) { /* no source */ }
  return null;
}

/* ---------- the converter ---------- */
/**
 * v2 (or v1) scene data -> a v3 spec. meta: the item's registry meta (id, label, site, tags, liveSky). E: loadEngine().
 * o: { ref, root }. Returns { spec, meta, report: { ref, from, id, counts, dropped, review, notes } }.
 */
export function convertData(data, meta, E, o = {}) {
  const report = { ref: o.ref || null, from: data && data.v === 2 ? 'v2' : 'v1', id: null, counts: {}, dropped: [], review: [], notes: [] };
  const drop = (path, field, why) => report.dropped.push({ path, field, why });
  const review = (path, msg) => report.review.push({ path, msg });
  const v2 = !!(data && data.v === 2);
  const view = (data && data.view) || {};
  // 1. the camera (v1: synthesised from the view, eye 1.65)
  let camIn;
  if (v2) camIn = Object.assign({}, data.camera || {});
  else {
    camIn = { eye: 1.65, fov: view.fov || 66, horizon: view.horizon || 470, heading: view.heading == null ? 180 : view.heading };
    report.notes.push('v1 scene: camera synthesised from the view (eye 1.65); every placement unprojected (review each)');
  }
  const cam = E.sceneCamera ? E.sceneCamera(Object.assign({}, v2 ? data : {}, { camera: camIn, view })) : null;
  const camera = {};
  for (const k of ['eye', 'fov', 'horizon', 'heading', 'x0', 'water']) if (camIn[k] != null && Number.isFinite(camIn[k])) camera[k] = camIn[k];
  if (camera.eye == null) camera.eye = 1.65;
  for (const k of ['preset']) if (camIn[k] != null) drop('camera.' + k, k, 'presets are resolved: the numbers are kept');
  const lat = camIn.lat != null ? camIn.lat : view.lat, lon = camIn.lon != null ? camIn.lon : view.lon;
  const place = {};
  if (lat != null) place.lat = Math.round(lat * 1e4) / 1e4;
  if (lon != null) place.lon = Math.round(lon * 1e4) / 1e4;
  if (camIn.alt != null) place.alt = camIn.alt;
  if (meta && (meta.county || meta.region)) place.region = meta.county || meta.region;
  // look and engine-only data keys
  for (const k of ['at', 'season', 'atmos', 'weather', 'cover', 'particles', 'palette', 'sky', 'signage', 'setting', 'kits', 'ground', 'arch'])
    if (data && data[k] !== undefined) drop(k, k, k === 'ground' ? 'relief: v3 reads the terrain from the place (review the waterline if the ground is not flat)' : 'the engine derives it (live sky, season, weather, kits)');

  // 2. surfaces and water
  const surfaces = [], byId = new Map();
  const addSurf = (s) => { surfaces.push(s); byId.set(s.id, s); };
  let rest = null;
  for (const [i, s] of ((v2 && data.surfaces) || []).entries()) {
    const path = `surfaces[${i}]`;
    if (!s || !s.id) continue;
    const kind = SURF_V3[s.kind];
    if (kind === undefined || kind === null) { review(path, `surface kind '${s.kind}' has no v3 kind: dropped`); continue; }
    if (s.kind !== kind) report.notes.push(`${path} ${s.id}: kind ${s.kind} -> ${kind}`);
    for (const k of Object.keys(s)) if (!['id', 'kind', 'poly', 'path', 'width', 'rest', 'band', 'beside', 'side', 'gap', 'over', 'tracks', 'markings', 'crossing', 'kerb', 'crop'].includes(k)) drop(path, k, 'not a world field');
    for (const k of ['markings', 'kerb', 'crop', 'tracks']) if (s[k] !== undefined) drop(path, k, 'drawn by the engine from the kind');
    const out = { id: s.id, kind };
    if (s.rest) { rest = { id: s.id, kind }; continue; }
    if (Array.isArray(s.poly)) out.poly = s.poly.map(p => [r2(p[0]), r2(p[1])]);
    else if (Array.isArray(s.path)) { out.path = s.path.map(p => [r2(p[0]), r2(p[1])]); out.width = s.width || 2; }
    else if (Array.isArray(s.band) && cam) out.poly = bandPoly(cam, s.band[0], s.band[1]);
    else if (s.beside) {
      const par = byId.get(s.beside);
      if (par && par.path) {
        const sign = s.side === 'left' ? -1 : 1, off = (par.width / 2 + (s.gap || 0) + (s.width || 2) / 2) * sign;
        out.path = par.path.map((p, j) => { const a = par.path[Math.max(0, j - 1)], b = par.path[Math.min(par.path.length - 1, j + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [r2(p[0] + off * dz / l), r2(p[1] - off * dx / l)]; });
        out.width = s.width || 2;
      } else { review(path, `surface ${s.id} beside '${s.beside}': the parent has no centreline; dropped`); continue; }
    } else { review(path, `surface ${s.id} has no geometry; dropped`); continue; }
    addSurf(out);
  }
  if (cam) {
    // the rest surface: a frustum polygon first in the list (later surfaces override it), so no ground is left without a kind
    const r = rest || { id: 'land', kind: 'grass' };
    surfaces.unshift({ id: byId.has(r.id) ? r.id + '-rest' : r.id, kind: r.kind, poly: bandPoly(cam, Math.max(0.5, cam.dMin * 0.9), Math.min(cam.dMax || 3000, 3000)) });
    byId.set(surfaces[0].id, surfaces[0]);
  }
  for (const [i, w] of ((v2 && data.water) || []).entries()) {
    const path = `water[${i}]`;
    if (!w || !w.id) continue;
    const out = { id: w.id, kind: 'water', water: WATER_V3[w.kind] || 'pond' };
    if (Array.isArray(w.poly)) out.poly = w.poly.map(p => [r2(p[0]), r2(p[1])]);
    else if (Array.isArray(w.path)) { out.path = w.path.map(p => [r2(p[0]), r2(p[1])]); out.width = w.width || 8; }
    else if (Array.isArray(w.band) && cam) out.poly = bandPoly(cam, w.band[0], Number.isFinite(w.band[1]) ? w.band[1] : 4000);
    else { review(path, `water ${w.id} has no geometry; dropped`); continue; }
    out.shallow = out.water === 'canal' ? 0.6 : out.water === 'river' ? 1 : 1.5;
    for (const k of Object.keys(w)) if (!['id', 'kind', 'poly', 'path', 'width', 'band'].includes(k)) drop(path, k, 'water look comes from the kind only (the water lock)');
    addSurf(out);
  }
  const waterIds = surfaces.filter(s => s.kind === 'water').map(s => s.id);
  const walkIds = surfaces.filter(s => ['path', 'pavement', 'towpath', 'plaza', 'boardwalk', 'bridge-deck'].includes(s.kind)).map(s => s.id);
  const surfAt = (x, z) => { for (let i = surfaces.length - 1; i >= 0; i--) { const s = surfaces[i]; if (s.poly) { const sp = polySpan(s.poly, z); if (sp && x >= sp[0] && x <= sp[1]) return s; } else if (s.path) { const q = pathAtZ(s.path, z); if (q && Math.abs(q.p[0] - x) <= s.width / 2) return s; } } return null; };

  // 3. placements
  const entities = [], landmarks = [], skyline = [];
  const info = (id) => (E.worldObjectInfo ? E.worldObjectInfo(id) : undefined);   // undefined: A not loaded (unverified)
  const placeEntity = (path, obj, at, facing, extra) => {
    const d = info(obj);
    if (d === null) { review(path, `${obj}: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object`); return; }
    if (d && (d.attachOk || [])[0] === 'air' && !(d.attachOk || []).includes('ground')) { review(path, `${obj}: a flyer with no perch; dropped (the life sim flies birds)`); return; }
    const e = Object.assign({ obj, at: [r2(at[0]), r2(at[1])] }, extra || {});
    if (e.variant != null && d && Number.isFinite(d.variants) && !(Number.isInteger(e.variant) && e.variant < d.variants)) { review(path, `${obj}: variant ${e.variant} does not exist; dropped the variant`); delete e.variant; }
    if (facing != null) e.facing = facing;
    const s = surfAt(at[0], at[1]);
    if (s && s.kind === 'water' && (!d || (d.attachOk || []).includes('water'))) e.attach = 'water';
    if (/^landmark\./.test(obj) || (extra && extra.fix)) { delete e.fix; e.src = o.src || 'converted from ' + (o.ref || 'v2') + ': check the listing'; landmarks.push(e); if (!o.src) review(path, `landmark ${obj}: src is a placeholder; give the listing or map reference`); return; }
    if (e.fix !== undefined) delete e.fix;
    entities.push(e);
  };
  for (const [i, p] of ((data && data.place) || []).entries()) {
    const path = `place[${i}]`;
    if (!p || !p.obj) continue;
    const extra = {};
    if (p.variant != null) extra.variant = p.variant;
    if (p.id) extra.id = p.id;
    if (p.fix) extra.fix = true;
    for (const k of LOOK_FIELDS) if (p[k] !== undefined && !(k === 'x' || k === 'y') && !(k === 's' && p.x != null)) drop(path, k, 'derived by the engine');
    let at = null, facing = p.face != null ? FACE_DEG[p.face] : null;
    if (Array.isArray(p.at)) at = p.at;
    else if (p.on && byId.get(p.on)) {
      const s = byId.get(p.on), u = p.u == null ? 0.5 : p.u;
      if (p.along != null || p.alongM != null) {
        const st = stripOf(s);
        if (st) { const q = alongPath(st.path, p.along, p.alongM); at = [q.p[0] + q.tz * (u - 0.5) * st.width, q.p[1] - q.tx * (u - 0.5) * st.width]; if (facing == null) facing = headingOf(q.tx, q.tz); }
      } else if (p.d != null) {
        if (s.poly) { const sp = polySpan(s.poly, p.d); if (sp) at = [sp[0] + (sp[1] - sp[0]) * u, p.d]; }
        else if (s.path) { const q = pathAtZ(s.path, p.d); if (q) { at = [q.p[0] + (u - 0.5) * s.width, p.d]; if (facing == null && p.dir) facing = headingOf(q.tx, q.tz) + (p.dir === 'toward' ? 180 : 0); } }
      }
      if (!at) { review(path, `${p.obj} on '${p.on}' at d ${p.d}: no span there; dropped`); continue; }
    } else if (p.x != null && p.y != null) {
      // a pixel placement: unproject its foot row; sky and horizon art (no foot) -> the skyline or dropped
      const g = cam && E.sceneUnproject ? E.sceneUnproject(cam, p.x, p.y) : null;
      drop(path, 'x,y,s', 'pixel placement');
      if (p.pin && v2 && !/^landmark\./.test(p.obj) && (info(p.obj) === null || PIECE_RE.test(p.obj))) { review(path, `${p.obj}: pinned perspective art (screen-drawn, not a world object); dropped. Place the real library object (a boat, a bridge, a walk) instead`); continue; }
      if (!g || p.layer === 'sky' || p.layer === 'horizon' || g.d > 2500) {
        if (/^(landmark|structure|building)\./.test(p.obj) && cam) {
          const bearing = Math.round(((cam.heading + Math.atan2(p.x - cam.x0, cam.f) * 180 / Math.PI) % 360 + 360) % 360);
          if (info(p.obj) !== null) skyline.push({ obj: p.obj, bearing, dist: g ? Math.round(g.d) : 3000, src: o.src || 'converted: check the listing' });
          review(path, `${p.obj}: horizon art (no foot) -> backdrop.skyline at bearing ${bearing}; check the object and the distance`);
        } else review(path, `${p.obj}: sky or horizon art with no foot; dropped`);
        continue;
      }
      at = [g.x, g.d];
      review(path, `${p.obj}: pixel placement unprojected to [${r1(g.x)}, ${r1(g.d)}] m${p.pin ? ' (was pinned perspective art: check it is a real object at this spot)' : ''}`);
    } else { review(path, `${p.obj}: no position; dropped`); continue; }
    if (facing == null && p.flip) facing = 270;
    placeEntity(path, p.obj, at, facing, extra);
  }
  // buildings (v2 19): one entity per footprint, the library building of its style
  for (const [i, b] of ((data && data.buildings) || []).entries()) {
    const path = `buildings[${i}]`;
    if (!b || !Array.isArray(b.foot) || b.foot.length < 3) continue;
    const cx = b.foot.reduce((s, p) => s + p[0], 0) / b.foot.length, cz = b.foot.reduce((s, p) => s + p[1], 0) / b.foot.length;
    const a = b.foot[0], c = b.foot[1];
    placeEntity(path, 'building.' + (b.style || 'house'), [cx, cz], (headingOf(c[0] - a[0], c[1] - a[1]) + 270) % 360, {});
    review(path, `building footprint (${b.style}, ${b.storeys || '?'} storeys) -> one 'building.${b.style}' entity at its centre: the library size replaces the authored footprint`);
    drop(path, 'foot,storeys,seed', 'size comes from the descriptor');
  }
  // scatter -> clusters (world metres); with the compile (3b) the scatter's real result is carried instead
  const carrying = o.carry !== false && !!E.sceneCompile;
  for (const [i, s] of ((data && data.scatter) || []).entries()) {
    const path = `scatter[${i}]`;
    if (!s || !s.obj) continue;
    if (carrying) { drop(path, 'scatter', 'carried from the compiled scene (what the scatter placed: exact near the camera, clusters beyond)'); continue; }
    const ons = [].concat(s.on || []).flatMap(k => (byId.has(k) ? [k] : surfaces.filter(x => x.kind === SURF_V3[k] || x.kind === k).map(x => x.id)));
    if (!ons.length) { review(path, `scatter of ${typeof s.obj === 'string' ? s.obj : Object.keys(s.obj).join('+')} on ${JSON.stringify(s.on)}: no surface; dropped`); continue; }
    const objs = typeof s.obj === 'string' ? [s.obj] : Object.keys(s.obj).filter(k => s.obj[k] > 0);
    const known = objs.filter(id => info(id) !== null);
    if (known.length < objs.length) review(path, `scatter objects without a descriptor dropped: ${objs.filter(id => !known.includes(id)).join(', ')}`);
    if (!known.length) continue;
    // one cluster per object and surface (n split by the weights), each legal on its surface
    const wsum = known.reduce((t, k) => t + (typeof s.obj === 'string' ? 1 : s.obj[k]), 0);
    for (const on of ons) for (const k of known) {
      const n = Math.max(1, Math.round((s.n || 20) / ons.length * (typeof s.obj === 'string' ? 1 : s.obj[k]) / wsum));
      const d = info(k), sk = byId.get(on).kind;
      if (d && !(d.attachOk || []).includes(sk === 'water' ? 'water' : 'ground')) { review(path, `${k} cannot stand on ${on} (${sk}); dropped`); continue; }
      const e = { cluster: k, on, n, seed: (s.seed || i + 1) };
      if (sk === 'water' || /reed|bulrush/.test(k)) e.edge = true;
      entities.push(e);
    }
    for (const k of ['d', 'dist', 'cluster', 'k', 'tint', 'anim', 'shadow', 'gap', 'avoid', 'minGap', 'mask', 'species', 'variant']) if (s[k] !== undefined) drop(path, k, k === 'd' ? 'the depth range: the cluster fills its surface' : 'derived by the engine');
  }

  // 3b. carry everything else that is visible (U4, P7): the v2 compile places items the data above does not name (kits,
  // hedgerows, bank and edge planting, auto dressing, scatter that expanded beyond its n). Per object and surface, the shortfall
  // between the compiled items and what the spec already holds is carried: 4 or more as a cluster, fewer as entities.
  if (o.carry !== false && E.sceneCompile) carryCompiled(data, E, { surfaces, byId, entities, landmarks, surfAt, info, report, rest: surfaces[0] });

  // 4. life: flows and behaving actors
  const life = [];
  for (const [i, f] of ((data && data.flows) || []).entries()) {
    const path = `flows[${i}]`;
    if (!f) continue;
    const on = [].concat(f.on || [])[0];
    const sp = Array.isArray(f.speed) ? (f.speed[0] + f.speed[1]) / 2 : 1.3;
    const every = f.timetable && f.timetable.every;
    if (f.kind === 'train' || f.kind === 'tram') { life.push({ who: f.kind, on, every: (every || 4) + 'min' }); }
    else if (f.kind === 'boat') life.push({ who: 'narrowboat-cruising', on, every: (every || 6) + 'min' });
    else {
      // density: agents per 100 m of lane at the peak -> arrivals per minute at one edge: density * speed * 60 / 100 (x 2 both ways)
      const perMin = Math.max(0.2, (f.density || 1) * sp * 0.6 * (f.both ? 2 : 1));
      const who = f.kind === 'cycle' ? 'cyclists' : f.kind === 'drive' ? 'traffic' : f.kind === 'graze' ? 'grazers' : 'walkers';
      const e = { who, on, rate: (perMin >= 1 ? Math.round(perMin) : '1/' + Math.round(1 / perMin)) + '/min' };
      if (e.rate.startsWith('1/')) e.rate = '1/' + Math.round(1 / perMin) + 'min';
      if (f.mix && typeof f.mix === 'object') { const m = {}; let tot = 0; for (const [k, w] of Object.entries(f.mix)) { const n = MIX_NAME[k] || k.replace(/^[a-z]+\./, ''); m[n] = (m[n] || 0) + w; tot += w; } for (const k in m) m[k] = Math.round(m[k] / tot * 100) / 100; e.mix = m; }
      life.push(e);
      if ([].concat(f.on || []).length > 1) review(path, `flow on ${JSON.stringify(f.on)}: one population per surface is better; kept on '${on}' only`);
    }
    for (const k of ['profile', 'max', 'lanes', 'speed', 'bus', 'seed', 'density', 'timetable', 'both']) if (f[k] !== undefined) drop(path, k, 'life rates and speeds come from the brains and the time of day');
  }
  const counts = new Map();
  for (const [i, a] of ((data && data.actors) || []).entries()) {
    const path = `actors[${i}]`;
    if (!a || !a.obj) continue;
    const who = whoOf(a.obj);
    if (!who) { review(path, `actor ${a.obj}: no life class; dropped`); continue; }
    counts.set(who, (counts.get(who) || 0) + 1);
    drop(path, a.ground ? 'ground' : 'path', 'hand paths: the life sim moves it');
  }
  for (const [who, n] of counts) {
    const on = WATER_WHO.has(who) ? waterIds[0] : walkIds[0];
    if (!on) { review('actors', `${n} x ${who}: no ${WATER_WHO.has(who) ? 'water' : 'walk'} surface; dropped`); continue; }
    const e = who === 'narrowboat-cruising' ? { who, on, every: '6min' } : WATER_WHO.has(who) ? { who, count: n, on } : { who: 'visit', mix: { [who]: 1 }, rate: '1/' + Math.max(1, Math.round(6 / n)) + 'min', on };
    if (who === 'heron' || who === 'egret') e.state = 'stalk';
    if (who === 'mute-swan' && n >= 2) e.group = 'pair';
    life.push(e);
  }
  for (const k of ['flocks', 'particles']) if (data && data[k] && data[k].length) drop(k, k, 'sky birds and particles come from the engine and the season');

  // 5. the backdrop (required): a preset from the place and the water
  const wk = surfaces.filter(s => s.kind === 'water').map(s => s.water);
  const city = (data && (data.setting === 'urban' || (data.buildings && data.buildings.length)));
  let style = wk.includes('sea') || wk.includes('harbour') ? 'coast' : city ? (lat > 53.3 && lat < 53.45 && lon > -1.6 && lon < -1.35 ? 'city-sheffield-hills' : lat > 53.4 && lat < 53.55 && lon > -2.35 && lon < -2.15 ? 'city-manchester-towers' : 'town-low')
    : wk.includes('canal') ? 'canal-wooded' : wk.includes('lake') || wk.includes('pond') ? 'woodland' : 'farmland';
  const backdrop = { style };
  if (skyline.length) backdrop.skyline = skyline;
  review('backdrop', `backdrop style '${style}' chosen from the place and the water; check it against the real view`);

  const id = ((meta && meta.id) || (data && data.id) || 'scene').replace(/^[a-z-]*?(fleet|sheffield)/, '$1') + '-w3';
  const spec = { v: 3, place, camera, surfaces, entities, landmarks, life, backdrop, seed: (data && data.seed) || 1 };
  if (!landmarks.length) delete spec.landmarks;
  report.id = id;
  report.counts = { surfaces: surfaces.length, entities: entities.filter(e => e.obj).length, clusters: entities.filter(e => e.cluster).length, landmarks: landmarks.length, life: life.length, skyline: skyline.length, dropped: report.dropped.length, review: report.review.length };
  const m2 = { id, label: (meta && meta.label) || id, site: (meta && meta.site) || '', tags: [].concat((meta && meta.tags) || [], ['world-v3']), liveSky: place.lat != null ? { lat: place.lat, lon: place.lon } : true };
  if (meta && meta.mood) m2.mood = meta.mood;
  if (meta && meta.colour) m2.colour = meta.colour;
  return { spec, meta: m2, report };
}

/** Hedge pieces into chains: each piece joins the chain whose end is within 7 m, else starts one; each chain ordered along its
 *  main axis and thinned to a point every 2 m or more. */
function hedgeChains(pieces) {
  const chains = [];
  for (const p of pieces.slice().sort((a, b) => a.z - b.z || a.x - b.x)) {
    let best = null, bd = 7;
    for (const c of chains) for (const q of c) { const d = Math.hypot(q.x - p.x, q.z - p.z); if (d < bd) { bd = d; best = c; } }
    if (best) best.push(p); else chains.push([p]);
  }
  return chains.map(c => {
    if (c.length < 3) return c;
    const mx = c.reduce((s, p) => s + p.x, 0) / c.length, mz = c.reduce((s, p) => s + p.z, 0) / c.length;
    let sxx = 0, szz = 0, sxz = 0;
    for (const p of c) { sxx += (p.x - mx) ** 2; szz += (p.z - mz) ** 2; sxz += (p.x - mx) * (p.z - mz); }
    const a = 0.5 * Math.atan2(2 * sxz, sxx - szz), ux = Math.cos(a), uz = Math.sin(a);
    const s = c.slice().sort((p, q) => (p.x * ux + p.z * uz) - (q.x * ux + q.z * uz)), out = [s[0]];
    for (const p of s.slice(1)) if (Math.hypot(p.x - out[out.length - 1].x, p.z - out[out.length - 1].z) >= 2) out.push(p);
    return out.length >= 2 ? out : s.slice(0, 2);
  });
}
/** Compiled items nearer than this (metres) are carried at their exact place; farther ones as clusters. */
const CARRY_EXACT_M = 35;
/** A small stable hash (cluster seeds). */
const hashOf = (s) => { let h = 2166136261 >>> 0; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return (h % 9973) + 1; };
/**
 * Carry the compiled v2 items the spec does not hold yet (3b). Mutates entities; adds report.counts.carried and a note.
 * Items beyond 400 m are the backdrop's (the style's bands); items with no ground record (sky art) were reviewed above.
 */
function carryCompiled(data, E, { surfaces, byId, entities, landmarks, surfAt, info, report, rest }) {
  let C;
  try { C = E.sceneCompile(data, { season: 'summer' }); } catch (e) { report.notes.push('carry: the v2 compile threw (' + e.message + '); nothing carried'); return; }
  const restId = rest ? rest.id : null, groups = new Map();
  for (const it of C.items || []) {
    const g = it.g;
    if (!g || !Number.isFinite(g.x) || !Number.isFinite(g.d) || g.d <= 0.5 || g.d > 400) continue;
    // perspective pieces are screen art (boats, walks, bridges cut to one view); plants and ground cover from those libraries are real
    if ((PIECE_RE.test(it.o) && !/^(plant|ground|tree|water|flower)\./.test(it.o)) || /^(landmark|sky|bird-air)\./.test(it.o)) continue;
    let on = g.surf && byId.has(g.surf) ? g.surf : null;
    if (!on) { const s = surfAt(g.x, g.d); on = s ? s.id : restId; }
    if (!on) continue;
    const k = it.o + '|' + on;
    if (!groups.has(k)) groups.set(k, { obj: it.o, on, items: [] });
    groups.get(k).items.push(it);
  }
  // hedgerows: a run of hedge pieces becomes a hedge surface along its line (one solid strip, never overlapping pieces)
  const hedges = [];
  for (const [k, grp] of groups) {
    const d = info(grp.obj);
    if (!d || d.cls !== 'hedge') continue;
    groups.delete(k);
    hedges.push(...grp.items.map(it => ({ obj: grp.obj, x: it.g.x, z: it.g.d, w: d.size && d.size.d ? d.size.d : 1.2 })));
  }
  let nh = 0;
  const byObj = new Map(); for (const h of hedges) { if (!byObj.has(h.obj)) byObj.set(h.obj, []); byObj.get(h.obj).push(h); }
  for (const chain of [...byObj.values()].flatMap(hedgeChains)) {
    if (chain.length < 2) { entities.push({ obj: chain[0].obj, at: [r2(chain[0].x), r2(chain[0].z)] }); continue; }
    const id = 'hedgerow-' + (++nh), obj = chain[Math.floor(chain.length / 2)].obj;
    const s = { id, kind: 'hedge', path: chain.map(p => [r2(p.x), r2(p.z)]), width: r2(Math.max(0.8, chain[0].w)), obj };
    surfaces.push(s); byId.set(id, s);
  }
  if (nh) report.notes.push(`carried ${hedges.length} hedge piece(s) as ${nh} hedgerow surface(s) (kind hedge: one solid strip each)`);
  // what the spec already holds per object and surface
  const have = new Map(), add = (k, n) => have.set(k, (have.get(k) || 0) + n);
  for (const e of entities.concat(landmarks)) {
    if (e.cluster) add(e.cluster + '|' + e.on, e.n || 0);
    else if (e.obj && Array.isArray(e.at)) { const s = surfAt(e.at[0], e.at[1]); add(e.obj + '|' + (s ? s.id : restId), 1); }
  }
  let clusters = 0, singles = 0, items = 0;
  for (const [k, grp] of groups) {
    const need = grp.items.length - (have.get(k) || 0);
    if (need <= 0) continue;
    const d = info(grp.obj);
    if (d === null) continue;
    if (d && (d.attachOk || [])[0] === 'air' && !(d.attachOk || []).includes('ground')) continue;
    const sk = byId.get(grp.on) ? byId.get(grp.on).kind : 'grass';
    if (d && !(d.attachOk || []).includes(sk === 'water' ? 'water' : 'ground')) continue;
    // the near ground (what the eye reads first) keeps its composition: those items are carried exactly; the rest as a cluster
    const ordered = grp.items.slice().sort((a, b) => a.g.d - b.g.d), near = ordered.filter(it => it.g.d < CARRY_EXACT_M).slice(0, need), rest = need - near.length;
    for (const it of near) entities.push({ obj: grp.obj, at: [r2(it.g.x), r2(it.g.d)] });
    singles += near.length;
    if (rest >= 4) {
      const e = { cluster: grp.obj, on: grp.on, n: rest, seed: hashOf(k) };
      if (sk === 'water' || /reed|bulrush|sedge|rush/.test(grp.obj)) e.edge = true;
      entities.push(e); clusters++;
    } else if (rest > 0) {
      for (const it of ordered.slice(-rest)) entities.push({ obj: grp.obj, at: [r2(it.g.x), r2(it.g.d)] });
      singles += rest;
    }
    items += need;
  }
  report.counts.carried = items;
  if (items) report.notes.push(`carried ${items} compiled item(s) the data did not name (kits, hedgerows, edge planting, scatter): ${clusters} cluster(s), ${singles} entit${singles === 1 ? 'y' : 'ies'}`);
}

/** Resolve, convert and validate one ref. Returns { ok, ref, spec, meta, report, validation }. */
export function convertRef(ref, { root = repoRoot(), E = null, critic = true } = {}) {
  E = E || loadEngine({ root });
  const hit = resolveRef(E, ref);
  if (!hit) throw new Error(`unknown scene '${ref}'`);
  const data = E.sceneData ? E.sceneData(hit.item) : hit.item.scene;
  if (!data) throw new Error(`'${hit.ref}' has no scene data`);
  if (data.v === 3) throw new Error(`'${hit.ref}' is already v3`);
  const src = headerSrc(root, data.id || hit.item.id);
  const out = convertData(data, hit.item, E, { ref: hit.ref, root, src });
  out.validation = repairSpec(out.spec, out.report, E);
  out.report.validation = out.validation;
  out.ok = out.validation.ok;
  out.ref = hit.ref;
  // U4, P7: the converted scene must be at least as rich as its source (the critic's box measure on both sides)
  if (critic && E.worldBuild && E.sceneCompile) {
    try {
      const v3 = worldCritic(E, out.spec, {}), source = criticOfRef(E, hit.ref, {}, resolveRef);
      out.critic = { source: source.score, converted: v3.score, ok: v3.score + 0.5 >= source.score, bands: { source: source.richness, converted: v3.richness } };
    } catch (e) { out.critic = { source: null, converted: null, ok: false, error: e.message }; }
    out.report.critic = out.critic;
    if (!out.critic.ok) out.report.review.push({ path: 'critic', msg: `richness ${out.critic.converted} is below the source's ${out.critic.source} (P7, U4): carry or add the missing dressing before it ships` });
    out.ok = out.ok && out.critic.ok;
  }
  return out;
}

// the rules a converted entry is removed for (never moved silently): each removal is listed under review
const REPAIR_RULES = new Set(['overlap', 'blocksPath', 'badAttach', 'unknownSize', 'unknownVariant', 'unreachable', 'unknownWho', 'unknownSurface', 'missingField', 'landmarkSrc']);
/** Validate; remove what the validator refuses (entities, clusters, life entries, skyline), each one listed; repeat (at most 6 rounds). */
export function repairSpec(spec, report, E = {}) {
  let v = validateSpec(spec, E);
  for (let round = 0; round < 6 && !v.ok; round++) {
    const kill = new Map();
    for (const er of v.errors) {
      if (!REPAIR_RULES.has(er.rule)) continue;
      const m = /^(entities|landmarks|life|backdrop\.skyline)\[(\d+)\](\.variant)?/.exec(er.path || '');
      if (!m) continue;
      const key = m[1] === 'backdrop.skyline' ? 'skyline' : m[1];
      const list = key === 'skyline' ? spec.backdrop.skyline : spec[key];
      const item = list && list[+m[2]];
      if (!item) continue;
      if (m[3] && er.rule === 'unknownVariant') { delete item.variant; report.review.push({ path: er.path, msg: 'repair: ' + er.msg + ' (variant dropped)' }); continue; }
      if (!kill.has(list)) kill.set(list, new Set());
      if (!kill.get(list).has(+m[2])) report.review.push({ path: er.path, msg: `repair: removed (${er.rule}) ${er.msg}` });
      kill.get(list).add(+m[2]);
    }
    if (!kill.size && !v.errors.some(er => er.rule === 'unknownVariant')) break;
    for (const [list, set] of kill) { const keep = list.filter((x, i) => !set.has(i)); list.length = 0; list.push(...keep); }
    if (spec.backdrop && spec.backdrop.skyline && !spec.backdrop.skyline.length) delete spec.backdrop.skyline;
    if (spec.landmarks && !spec.landmarks.length) delete spec.landmarks;
    v = validateSpec(spec, E);
  }
  report.counts.entities = spec.entities.filter(e => e.obj).length; report.counts.clusters = spec.entities.filter(e => e.cluster).length; report.counts.life = spec.life.length;
  report.counts.review = report.review.length;
  return v;
}

const SCREEN_OR_LOOK = new Set(['X', 'Y', 'px', 's', 'scale', 'layer', 'flip', 'tint', 'shadow', 'reflect', 'light', 'grade', 'mirror', 'ripple', 'glint', 'clarity', 'colour', 'exposure', 'ambient']);
/**
 * A's worldValidate when loaded; otherwise the structural part of 5.2 this module can check on its own (closed top-level keys,
 * no screen or look field anywhere, metres on every entity, a backdrop style, surfaces with geometry). { ok, errors, by }.
 */
export function validateSpec(spec, E = {}) {
  if (E.worldValidate) {
    try { const r = E.worldValidate(spec); return { ok: !!r.ok, errors: r.errors || [], by: 'worldValidate' }; } catch (e) { return { ok: false, errors: [{ path: '', rule: 'crash', msg: String(e && e.message || e), fix: 'see A' }], by: 'worldValidate' }; }
  }
  const errors = [], err = (path, rule, msg, fix) => errors.push({ path, rule, msg, fix });
  const TOP = new Set(['v', 'place', 'camera', 'surfaces', 'entities', 'landmarks', 'life', 'backdrop', 'seed']);
  for (const k of Object.keys(spec)) if (!TOP.has(k)) err(k, 'unknownKey', `unknown key ${k}`, 'remove it');
  if (spec.v !== 3) err('v', 'version', 'v must be 3', 'set v: 3');
  const walk = (o, path) => {
    if (Array.isArray(o)) return o.forEach((x, i) => walk(x, `${path}[${i}]`));
    if (!o || typeof o !== 'object') return;
    for (const k of Object.keys(o)) { if (SCREEN_OR_LOOK.has(k)) err(`${path}.${k}`, 'screenOrLookField', `${k} is derived by the engine`, 'remove it'); walk(o[k], `${path}.${k}`); }
  };
  walk(spec.entities, 'entities'); walk(spec.landmarks, 'landmarks'); walk(spec.surfaces, 'surfaces'); walk(spec.life, 'life');
  for (const [i, e] of (spec.entities || []).entries()) {
    if (e.cluster) { if (!(spec.surfaces || []).some(s => s.id === e.on)) err(`entities[${i}].on`, 'unknownSurface', `cluster on '${e.on}'`, 'name a surface id'); continue; }
    if (!Array.isArray(e.at) || !e.at.every(Number.isFinite)) err(`entities[${i}].at`, 'noPosition', 'at: [x, z] in metres is required', 'give at');
    else if (!(e.at[1] > 0)) err(`entities[${i}].at`, 'behindCamera', 'z must be > 0', 'move it in front of the camera');
    if (e.y != null && e.attach !== 'air' && !/^wall:/.test(e.attach || '')) err(`entities[${i}].y`, 'screenOrLookField', 'y on a grounded entity', 'remove y');
  }
  for (const [i, s] of (spec.surfaces || []).entries()) if (!s.poly && !s.path) err(`surfaces[${i}]`, 'noGeometry', `${s.id}: poly or path required`, 'give poly or path + width');
  for (const [i, l] of (spec.landmarks || []).entries()) if (!l.src) err(`landmarks[${i}].src`, 'noSrc', 'landmarks carry a src', 'give the listing or map reference');
  if (!spec.backdrop || !spec.backdrop.style) err('backdrop', 'emptyBackground', 'backdrop.style is required', 'pick a preset');
  return { ok: errors.length === 0, errors, by: 'structural' };
}

/** The scene file of a converted spec: src/app/79-world-zscene-<id>.js (registered in the hidden pack 'world-test'). */
export function sceneFileSource(meta, spec, report) {
  const rv = (report && report.review) || [];
  const head = [
    '/* ============================================================',
    `   WORLD SCENE (format v3) world-test / ${meta.id}: converted by \`node tools/world.mjs convert ${report && report.ref || ''}\`.`,
    '   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.',
    `   Review (${rv.length}):`,
    ...rv.slice(0, 40).map(r => `     - ${r.path}: ${r.msg}`.replace(/\*\//g, '* /')),
    ...(rv.length > 40 ? [`     ... and ${rv.length - 40} more (node tools/world.mjs convert --report)`] : []),
    '   PURE. Hidden dev pack until approved; the original scene is untouched.',
    '   ============================================================ */',
  ];
  return head.join('\n') + '\n(function () {\n  if (typeof worldAdd !== \'function\') return;\n  worldAdd(\'world-test\', ' + JSON.stringify(meta) + ',\n' + JSON.stringify(spec, null, 1).replace(/\n\s*(-?[\d.]+,?)(?=\n)/g, ' $1').replace(/\[\s+/g, '[').replace(/\s+\]/g, ']') + ');\n})();\n';
}

