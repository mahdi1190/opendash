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
// Lossless since 23 Oct (each loss below was a review line or a silent drop before):
//   - the v2 generator's buildings (data.buildings with a foot or at/frontage/depth, and every house of data.streets rules) come
//     through as v3 `buildings` exactly as the compile drew them: { foot (front edge first), front: 0, storeys | h, style, seed,
//     roof, party, shop, crown }, never as 'building.<style>' entities (unknownSize) or 'building.gen-direct' placeholders
//   - drive flows become `cars` with their mix of vehicle ids, and f.bus a `buses` population every N min (not 'traffic')
//   - one life population per surface of a flow (a flow on two pavements is two populations)
//   - overlap / blocksPath: the placement solver settles the entry (one build; a move of at most NUDGE_MAX_M, logged) before
//     anything is removed
//   - a city (buildings, streets, setting urban) takes a city backdrop before the coast does
//   - a pinned v2 drawing with no real size of its own is drawn 1:1: h = drawn height x anchor depth / f on its pinned corner's
//     footprint, registered with worldSizeAutoDefine and written to the generated src/app/79-world-zdata-sizes.js (report.sizes)
//   - `pit: true` on a placement becomes a 2 x 2 m soil pit surface under it (kind grass, the enriched scenes' convention)
//   - the scene file is compact: one line per surface, entity, building or population
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
  'sceneGroundHeight', 'sceneObjs', 'sceneObjReal', 'sceneSeason', 'sceneSnowCover', 'sceneFrostAt', 'almSunPosition', 'almMoonPosition', 'almSceneLight', 'sceneLightV2', 'sceneObjShapes', 'sceneAnimPose',
  'sceneStreetExpand', 'sceneHash', 'SCENE_REAL_SIZE'];

/** Private helpers of render (5frame), the checker (9inv) and traffic (2traffic) that the preflight's route sweeps call, so a sweep
 *  runs the gate's own geometry and never a copy of it (tools/lib/world/preflight.mjs). On E.priv; a missing one is undefined. */
export const PRIVATE_NAMES = Object.freeze(['_wfrRec', '_wfrAgentEnt', '_wfrAgentFoot', '_wfrAbsent', '_wivContext', '_wivSolids', '_wivPen', '_wivPolyDist',
  '_wivRelated', '_wivDisjointLong', '_wivRadiusOf', '_wivCls', '_wivSolidity', '_wivFootOf', '_wtrFramedOffset', '_wtrParkedOn', '_wtrTrips']);

let _cache = null;
/** Evaluate the sources once per process (about 0.9 s). */
export function loadEngine({ root = repoRoot(), fresh = false } = {}) {
  if (_cache && !fresh && _cache.root === root) return _cache.E;
  // every top-level world* / WORLD_* name of the 79-world sources (each package adds its own; a missing one is undefined)
  let names = ENGINE_NAMES;
  try { const app = join(root, 'src', 'app'); names = [...new Set([...ENGINE_NAMES, ...worldNames(readdirSync(app).filter(f => WORLD_FILE_RE.test(f)).map(f => join(app, f)))])]; } catch (e) { /* the fixed list */ }
  const extra = 'globalThis.__worldEngine = { ' + names.map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ') +
    ", refs: typeof _animRefs === 'undefined' ? null : _animRefs, packs: typeof _scPacks === 'undefined' ? null : _scPacks, priv: { " +
    PRIVATE_NAMES.map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ') + ' } };';
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
// Pinned perspective pieces that are PARTS of one real library object seen close (the hero boat of a canal view in a dozen slices, the
// willow fronds and the bough that frame it): carried over as that object, framing the view, at the world position the pieces'
// feet unproject to. Dropping them (the first converter) lost the composition of every canal view (QP3: the big near narrowboat,
// the fronds hanging from the top corner).
const PIECE_FAMILY = {
  'boat.canal-view-boat': { key: 'boat', obj: 'boat.narrowboat' },
  'structure.canal-view-bridge': { key: 'bridge', obj: 'structure.bridge-brick' },
  'plant.canal-view-fronds': { key: 'frame-tree', obj: 'tree.canal-willow' },
  'plant.canal-view-bough': { key: 'frame-tree', obj: 'tree.canal-oak' },
};
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
  const report = { ref: o.ref || null, from: data && data.v === 2 ? 'v2' : 'v1', id: null, counts: {}, dropped: [], review: [], notes: [], sizes: [] };
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
    // a v2 walkway laid over the water (bridge, over: 'water') keeps saying so: a jetty, pier or landing stage is not a boardwalk across a lake
    if (s.over === 'water' && ['boardwalk', 'bridge-deck', 'deck', 'platform'].includes(kind)) out.over = 'water';
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

  // the v2 compile, once (what the v2 renderer draws): generated buildings, kits, hedgerows, scatter
  let compiled = null;
  if (data && E.sceneCompile) { try { compiled = E.sceneCompile(data, { season: 'summer' }); } catch (e) { report.notes.push('carry: the v2 compile threw (' + e.message + '); nothing carried and no generated buildings'); } }

  // 3. placements
  const entities = [], landmarks = [], skyline = [], pits = [];
  const info = (id) => (E.worldObjectInfo ? E.worldObjectInfo(id) : undefined);   // undefined: A not loaded (unverified)
  // 3a. pinned v2 drawings with no real size of their own: their 1:1 size at their anchor (before any is placed or judged)
  if (v2 && cam) pinnedSizes(data, cam, E, { report, review, info, ref: o.ref });
  const placeEntity = (path, obj, at, facing, extra) => {
    const d = info(obj);
    if (d === null) { review(path, `${obj}: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object`); return; }
    if (d && (d.attachOk || [])[0] === 'air' && !(d.attachOk || []).includes('ground')) { review(path, `${obj}: a flyer with no perch; dropped (the life sim flies birds)`); return; }
    const pit = !!(extra && extra.$pit);
    if (extra) delete extra.$pit;
    if (pit) pits.push({ path, obj, at: [r2(at[0]), r2(at[1])] });
    const e = Object.assign({ obj, at: [r2(at[0]), r2(at[1])] }, extra || {});
    if (e.variant != null && d && Number.isFinite(d.variants) && !(Number.isInteger(e.variant) && e.variant < d.variants)) { review(path, `${obj}: variant ${e.variant} does not exist; dropped the variant`); delete e.variant; }
    if (facing != null) e.facing = facing;
    const s = surfAt(at[0], at[1]);
    if (s && s.kind === 'water' && (!d || (d.attachOk || []).includes('water'))) e.attach = 'water';
    if (/^landmark\./.test(obj) || (extra && extra.fix)) { delete e.fix; e.src = o.src || 'converted from ' + (o.ref || 'v2') + ': check the listing'; landmarks.push(e); if (!o.src) review(path, `landmark ${obj}: src is a placeholder; give the listing or map reference`); return; }
    if (e.fix !== undefined) delete e.fix;
    entities.push(e);
  };
  const pieceGroups = {};
  for (const [i, p] of ((data && data.place) || []).entries()) {
    const path = `place[${i}]`;
    if (!p || !p.obj) continue;
    const extra = {};
    if (p.variant != null) extra.variant = p.variant;
    if (p.id) extra.id = p.id;
    if (p.fix) extra.fix = true;
    if (p.pit) extra.$pit = true;
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
      if (p.pin && v2 && !/^landmark\./.test(p.obj) && (info(p.obj) === null || PIECE_RE.test(p.obj))) {
        const fam = PIECE_FAMILY[p.obj];
        if (fam && cam) {
          // a hull stands in the water: its foot row is the waterline, which lies below the ground plane the unprojection assumes
          const lvl = fam.key === 'boat' && Number.isFinite(cam.water) ? cam.water : 0, dd = p.y > cam.horizon + 1e-6 ? cam.f * (cam.eye - lvl) / (p.y - cam.horizon) : null;
          (pieceGroups[p.obj] = pieceGroups[p.obj] || { fam, items: [] }).items.push({ p, g: dd ? { x: (p.x - cam.x0) * dd / cam.f, d: dd } : g, path });
          continue;
        }
        review(path, `${p.obj}: pinned perspective art (screen-drawn, not a world object); dropped. Place the real library object (a boat, a bridge, a walk) instead`); continue;
      }
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
  // the pieces of one real object seen close: one entity of it (see PIECE_FAMILY)
  {
    const watr = surfaces.find(q => q.kind === 'water'), strip = watr && (watr.path ? { path: watr.path } : null);
    const half = (d) => d * (cam.x0 || 800) / cam.f;
    for (const [src, grp] of Object.entries(pieceGroups)) {
      const { fam, items } = grp, ok = items.filter(it => it.g && it.g.d > 0.5 && it.g.d < 800);
      if (fam.key === 'boat' && ok.length) {
        // the slices of a hull run down the screen in order: a gap of more than 8 m in depth (or a span past one hull) starts the next boat
        const sorted = ok.slice().sort((a, b) => a.g.d - b.g.d), clusters = [], di = info(fam.obj), len = di && di.size && di.size.w ? di.size.w : 18;
        for (const it of sorted) { const c = clusters[clusters.length - 1]; if (c && it.g.d - c[c.length - 1].g.d <= 8 && it.g.d - c[0].g.d <= len + 6) c.push(it); else clusters.push([it]); }
        clusters.forEach((c, k) => {
          const near = c[0], far = c[c.length - 1], dx = far.g.x - near.g.x, dz = far.g.d - near.g.d, L = Math.hypot(dx, dz), long = L > 3;
          const dir = long ? [dx / L, dz / L] : (() => { const q = strip ? pathAtZ(strip.path, near.g.d) : null; return q ? [q.tx, q.tz] : [0, 1]; })();
          // the hull's near end is where the nearest slice stands: its middle is half a hull along from there (at most as far as the last slice)
          const run = long ? Math.min(L, len) : len, half2 = Math.max(run, len) / 2;
          const at = [near.g.x + dir[0] * half2, near.g.d + dir[1] * half2], facing = headingOf(dir[0], dir[1]);
          const e = { obj: fam.obj, at: [r2(at[0]), r2(at[1])], facing, attach: 'water', id: 'conv-boat-' + (k + 1), framed: near.g.d < 16 };
          entities.push(e);
          review(`place[${c[0].path}]`, `${src}: ${c.length} perspective pieces of one hull -> ${fam.obj} at [${r1(at[0])}, ${r1(at[1])}] m, facing ${facing}${e.framed ? ', a framing element (near the eye)' : ''}`);
        });
      } else if (fam.key === 'bridge' && ok.length) {
        const low = ok.reduce((a, b) => (b.p.y > a.p.y ? b : a));
        const q = strip ? pathAtZ(strip.path, low.g.d) : null, facing = q ? (headingOf(q.tx, q.tz) + 90) % 360 : 90;
        entities.push({ obj: fam.obj, at: [r2(q ? q.p[0] : low.g.x), r2(low.g.d)], facing, attach: 'water', id: 'conv-bridge' });
        review(`place[${items[0].path}]`, `${src}: ${items.length} perspective pieces of a bridge -> one ${fam.obj} across the water at ${r1(low.g.d)} m`);
      } else if (fam.key === 'frame-tree') {
        // fronds and boughs pinned at a top corner: the tree they hang from stands just outside the frame on that side, near the eye
        for (const it of items) {
          const side = it.p.x < (cam.x0 || 800) ? -1 : 1, d = 9;
          entities.push({ obj: fam.obj, at: [r2(side * half(d) * 1.12), d], framed: true, id: 'conv-frame-' + (side < 0 ? 'l' : 'r') });
          review(it.path, `${src}: pinned at the ${side < 0 ? 'left' : 'right'} top corner -> a ${fam.obj} just outside the frame at ${d} m, a framing element`);
        }
      } else for (const it of items) review(it.path, `${src}: pinned perspective art with no foot on the ground; dropped`);
    }
  }
  // buildings (v2 19): the generator's own records, as the compile drew them (data.buildings and the houses of data.streets)
  const buildings = v2 ? buildingsOf(data, E, compiled, { report, review, drop, ref: o.ref }) : [];
  // scatter -> clusters (world metres); with the compile (3b) the scatter's real result is carried instead
  const carrying = o.carry !== false && !!compiled;
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
  if (o.carry !== false && compiled) carryCompiled(compiled, E, { surfaces, byId, entities, landmarks, surfAt, info, report, rest: surfaces[0] });
  // 3c. a placement's tree pit (v2 `pit: true`): a 2 x 2 m soil pit under it (a tree on bare paving is off its habitat). After the
  // carry, which matches the compile's items to the spec's by surface: a pit there would split a tree from its compiled self
  // (ids clear of the source's own: a v2 scene may already name a surface pit-1)
  let pitN = 0;
  const pitId = () => { let id; do id = 'tree-pit-' + (++pitN); while (byId.has(id)); return id; };
  pits.forEach((q) => surfaces.push({ id: pitId(), kind: 'grass', poly: [[q.at[0] - 1, q.at[1] - 1], [q.at[0] + 1, q.at[1] - 1], [q.at[0] + 1, q.at[1] + 1], [q.at[0] - 1, q.at[1] + 1]].map(p => [r2(p[0]), r2(p[1])]) }));
  if (pits.length) review('place', `${pits.length} placement(s) with pit: true keep their pit: a 2 x 2 m soil square under each (${[...new Set(pits.map(q => q.obj))].join(', ')})`);

  // 4. life: flows and behaving actors
  const life = [];
  for (const [i, f] of ((data && data.flows) || []).entries()) {
    const path = `flows[${i}]`;
    if (!f) continue;
    // one population per surface of the flow (each surface gets the flow's own density)
    const ons = [].concat(f.on || []).filter(x => x != null);
    const drive = f.kind === 'drive';
    const sp = Array.isArray(f.speed) ? (f.speed[0] + f.speed[1]) / 2 : drive ? 8 : 1.3;
    const every = f.timetable && f.timetable.every;
    // density: agents per 100 m of lane at the peak -> arrivals per minute at one edge: density * speed * 60 / 100 (x 2 both ways)
    const perMin = Math.max(0.2, (f.density || 1) * sp * 0.6 * (f.both ? 2 : 1));
    const rate = perMin >= 1 ? Math.round(perMin) + '/min' : '1/' + Math.round(1 / perMin) + 'min';
    for (const on of ons.length ? ons : [undefined]) {
      if (f.kind === 'train' || f.kind === 'tram') { life.push({ who: f.kind, on, every: (every || 4) + 'min' }); continue; }
      if (f.kind === 'boat') { life.push({ who: 'narrowboat-cruising', on, every: (every || 6) + 'min' }); continue; }
      if (drive) {
        // cars with the flow's own vehicles (their ids are the life mix), and its buses as a timetabled population
        const e = { who: 'cars', on, rate };
        if (f.mix && typeof f.mix === 'object') {
          const m = {};
          for (const [k, w] of Object.entries(f.mix)) { if (!(w > 0)) continue; if (info(k) === null) { review(path, `flow vehicle ${k}: no world descriptor; left out of the cars' mix`); continue; } m[k] = w; }
          if (Object.keys(m).length) e.mix = m;
        }
        life.push(e);
        if (f.bus && typeof f.bus === 'object') {
          const b = { who: 'buses', on, every: (Number.isFinite(f.bus.every) && f.bus.every > 0 ? f.bus.every : 6) + 'min' };
          if (f.bus.obj && info(f.bus.obj) !== null) b.mix = { [f.bus.obj]: 1 };
          else if (f.bus.obj) review(path, `bus ${f.bus.obj}: no world descriptor; the default bus runs instead`);
          life.push(b);
          if (f.bus.stops) drop(path, 'bus.stops', 'buses stop at the bus stops the world has (a bus-stop object beside the lane)');
        }
        continue;
      }
      const who = f.kind === 'cycle' ? 'cyclists' : f.kind === 'graze' ? 'grazers' : 'walkers';
      const e = { who, on, rate };
      if (f.mix && typeof f.mix === 'object') { const m = {}; let tot = 0; for (const [k, w] of Object.entries(f.mix)) { const n = MIX_NAME[k] || k.replace(/^[a-z]+\./, ''); m[n] = (m[n] || 0) + w; tot += w; } for (const k in m) m[k] = Math.round(m[k] / tot * 100) / 100; e.mix = m; }
      life.push(e);
    }
    if (ons.length > 1) report.notes.push(`${path}: a flow on ${ons.length} surfaces -> one population on each (${ons.join(', ')})`);
    for (const k of ['profile', 'max', 'lanes', 'speed', 'seed', 'density', 'timetable', 'both']) if (f[k] !== undefined) drop(path, k, 'life rates and speeds come from the brains and the time of day');
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
  // a city first: a dock or a quay in a city (Salford Quays, a harbour basin) is a city view with water, not a coast
  const city = !!(data && (data.setting === 'urban' || (data.buildings && data.buildings.length) || (data.streets && data.streets.length) || buildings.length));
  let style = city ? (lat > 53.3 && lat < 53.45 && lon > -1.6 && lon < -1.35 ? 'city-sheffield-hills' : lat > 53.4 && lat < 53.55 && lon > -2.35 && lon < -2.15 ? 'city-manchester-towers' : 'town-low')
    : wk.includes('sea') || wk.includes('harbour') ? 'coast' : wk.includes('canal') ? 'canal-wooded' : wk.includes('lake') || wk.includes('pond') ? 'woodland' : 'farmland';
  const backdrop = { style };
  if (skyline.length) backdrop.skyline = skyline;
  review('backdrop', `backdrop style '${style}' chosen from the place and the water; check it against the real view`);

  const id = ((meta && meta.id) || (data && data.id) || 'scene').replace(/^[a-z-]*?(fleet|sheffield)/, '$1') + '-w3';
  const spec = { v: 3, place, camera, surfaces, buildings, entities, landmarks, life, backdrop, seed: (data && data.seed) || 1 };
  if (!landmarks.length) delete spec.landmarks;
  if (!buildings.length) delete spec.buildings;
  report.id = id;
  report.counts = Object.assign({ surfaces: surfaces.length, buildings: buildings.length, entities: entities.filter(e => e.obj).length, clusters: entities.filter(e => e.cluster).length, landmarks: landmarks.length, life: life.length, skyline: skyline.length, dropped: report.dropped.length, review: report.review.length }, report.counts);
  const m2 = { id, label: (meta && meta.label) || id, site: (meta && meta.site) || '', tags: [].concat((meta && meta.tags) || [], ['world-v3']), liveSky: place.lat != null ? { lat: place.lat, lon: place.lon } : true };
  if (meta && meta.mood) m2.mood = meta.mood;
  if (meta && meta.colour) m2.colour = meta.colour;
  return { spec, meta: m2, report };
}

// what a v2 building record carries into a v3 building (the rest is listed under report.dropped)
const BUILDING_KEEP = new Set(['foot', 'at', 'frontage', 'depth', 'front', 'storeys', 'h', 'style', 'roof', 'seed', 'party', 'shop', 'crown', 'subject', 'src', 'i', 'along', 'id']);
/**
 * The v2 generator's buildings as v3 `buildings` (19; sceneGenExpand): the records it drew (data.buildings, seeded as it seeds them,
 * and the houses of every data.streets rule), kept when the compile drew them (a direct item of that key), each on the footprint the
 * compile drew (its front edge first: front 0) with its storeys (or h), style, seed, roof, party walls, shop and crown. Without the
 * compile: data.buildings as written. -> [building]
 */
function buildingsOf(data, E, C, { report, review, drop, ref }) {
  const nB = (data.buildings || []).length, nS = (data.streets || []).length, out = [];
  if (!nB && !nS) return out;
  const recs = new Map();
  (data.buildings || []).forEach((b, i) => { if (b && typeof b === 'object') recs.set('b' + i, Object.assign({ seed: E.sceneHash ? E.sceneHash(String(data.id) + '|b|' + i) % 1e6 : i + 1 }, b, { $path: `buildings[${i}]` })); });
  (data.streets || []).forEach((rule, ri) => {
    let list = [];
    if (E.sceneStreetExpand) { try { list = E.sceneStreetExpand(Object.assign({ index: ri }, rule), null, data.camera, data) || []; } catch (e) { review(`streets[${ri}]`, 'the street rule threw: ' + e.message); } }
    for (const b of list) recs.set('s' + ri + '.' + b.i, Object.assign({}, b, { $path: `streets[${ri}]` }));
  });
  const direct = C ? (C.items || []).filter(it => it && it.direct && it.gen != null) : null;
  const kept = direct ? direct.map(it => ({ key: String(it.gen), d: it.direct })) : [...recs.keys()].map(key => ({ key, d: null }));
  const dropped = new Set();
  for (const { key, d } of kept) {
    const rec = recs.get(key) || {};
    const foot = d && Array.isArray(d.foot) && d.foot.length >= 3 ? d.foot : Array.isArray(rec.foot) && rec.foot.length >= 3 ? rec.foot : null;
    if (!foot) { review(rec.$path || key, 'a generated building with no footprint: dropped'); continue; }
    const b = { id: 'gen-' + key.replace(/\./g, '-'), foot: foot.map(p => [r2(p[0]), r2(p[1])]) };
    if (Number.isInteger(rec.storeys) && rec.storeys >= 1 && rec.storeys <= 100) b.storeys = rec.storeys;
    else if (Number.isFinite(rec.h) && rec.h > 0) b.h = r2(rec.h);
    else if (d && Number.isFinite(d.eave) && d.eave > 0) b.h = r2(d.eave);
    b.style = (d && d.style) || rec.style || 'victorian-terrace';
    if (typeof rec.roof === 'string') b.roof = rec.roof;
    const seed = Number.isFinite(Number(rec.seed)) ? Number(rec.seed) >>> 0 : d && Number.isFinite(d.seed) ? d.seed >>> 0 : null;
    if (seed != null) b.seed = seed;
    // the compile's footprint starts at the edge it drew the door on; without it the record's own front (or the generator's choice)
    if (d) b.front = 0; else if (Number.isInteger(rec.front) && rec.front >= 0 && rec.front < b.foot.length) b.front = rec.front;
    if (typeof rec.party === 'string' && rec.party !== 'none') b.party = rec.party;
    if (rec.shop && typeof rec.shop === 'object' && typeof rec.shop.kind === 'string') b.shop = { kind: rec.shop.kind }; else if (rec.shop === false) b.shop = false;
    if (typeof rec.crown === 'string') b.crown = rec.crown;
    if (rec.subject) b.landmark = true;
    b.src = 'v2 ' + (rec.$path || key);
    for (const k of Object.keys(rec)) if (k !== '$path' && !BUILDING_KEEP.has(k) && !dropped.has(k)) { dropped.add(k); drop('buildings', k, 'not a v3 building field (the style draws it)'); }
    out.push(b);
  }
  report.counts.v2Buildings = direct ? direct.length : recs.size;
  const fromS = out.filter(b => /^v2 streets/.test(b.src)).length;
  review('buildings', `${out.length} of the v2 compile's ${report.counts.v2Buildings} generated building(s) carried as v3 buildings (${out.length - fromS} footprint(s), ${fromS} house(s) of ${nS} street rule(s)): foot, front, storeys, style and seed as v2 drew them`);
  return out;
}
/**
 * The 1:1 size of each pinned v2 drawing that has no real size of its own (no def.real, no SCENE_REAL_SIZE or WORLD_SIZE_GAPS
 * entry, no descriptor size): h = its drawn height (size[1] x s) x its anchor depth / f, on the footprint of its pinned corner
 * (2 x 1.2 m: a drawing pinned at one corner of what it shows must not reach into its neighbours). Only a drawing with ONE anchor
 * (every placement of it within 10 % of one height, here and in any earlier conversion); one whose library size is within 25 % keeps
 * it. Each is registered (E.worldSizeAutoDefine) and listed in report.sizes for the generated size file.
 */
function pinnedSizes(data, cam, E, { report, review, info, ref }) {
  if (typeof E.worldSizeAutoDefine !== 'function' || !E.sceneUnproject || !E.sceneObj || !(cam.f > 0)) return;
  const by = new Map();
  for (const [i, p] of ((data && data.place) || []).entries()) {
    if (!p || !p.pin || !p.obj || p.x == null || p.y == null || p.layer === 'sky' || p.layer === 'horizon') continue;
    if (PIECE_RE.test(p.obj) || PIECE_FAMILY[p.obj] || /^(sky|bird|bird-air|person|animal|vehicle|boat)\./.test(p.obj)) continue;
    const def = E.sceneObj(p.obj);
    if (!def || !Array.isArray(def.size) || !(def.size[1] > 0)) continue;
    let kb = null; try { kb = E.worldKb ? E.worldKb(p.obj) : null; } catch { kb = null; }
    const own = (def.real && def.real.h > 0) || (E.SCENE_REAL_SIZE && E.SCENE_REAL_SIZE[p.obj]) || (E.WORLD_SIZE_GAPS && E.WORLD_SIZE_GAPS[p.obj]) || (kb && kb.size && Number.isFinite(kb.size.l));
    if (own) continue;
    let g = null; try { g = E.sceneUnproject(cam, p.x, p.y); } catch { g = null; }
    if (!g || !(g.d > 0.5 && g.d < 2500)) continue;
    const h = def.size[1] * (Number.isFinite(p.s) && p.s > 0 ? p.s : 1) * g.d / cam.f;
    if (!(h > 0.2 && h < 400)) continue;
    if (!by.has(p.obj)) by.set(p.obj, []);
    by.get(p.obj).push({ i, h, d: g.d });
  }
  for (const [id, L] of by) {
    const hs = L.map(x => x.h).sort((a, b) => a - b), h = r2(hs[Math.floor(hs.length / 2)]), path = `place[${L[0].i}]`;
    if (hs[hs.length - 1] > hs[0] * 1.1) { review(path, `${id}: a pinned drawing at ${L.length} depths (${L.map(x => r1(x.d)).join(', ')} m): no single 1:1 height; its library size stays`); continue; }
    const have = E.WORLD_SIZE_AUTO && E.WORLD_SIZE_AUTO[id];
    if (have && Math.abs(have.h / h - 1) > 0.1) { review(path, `${id}: pinned at another depth in ${have.from || 'another view'} (1:1 there: ${have.h} m, here ${h} m): no single 1:1 height; the first stays`); continue; }
    const cur = info(id);
    if (!have && cur && Math.abs(cur.size.h / h - 1) <= 0.25) continue;
    const s = { h, l: 2, w: 1.2, from: `${ref || 'v2'}: pinned at ${r1(L[0].d)} m, f ${r1(cam.f)}` };
    if (!have) E.worldSizeAutoDefine(id, s);
    report.sizes.push(Object.assign({ id }, have || s));
    review(path, `${id}: a pinned drawing with no real size, drawn 1:1: ${h} m tall at its anchor ${r1(L[0].d)} m away (the generated size file), on its pinned corner's footprint (2 x 1.2 m)`);
  }
}
/** The generated size file (src/app/79-world-zdata-sizes.js): one worldSizeAutoDefine per id, sorted. sizes: { id: { h, l, w, from } }. */
export function sizeFileSource(sizes) {
  const ids = Object.keys(sizes).sort();
  return ['/* ============================================================',
    '   WORLD ENGINE: GENERATED sizes of pinned v2 drawings, drawn 1:1 (tools/lib/world/convert.mjs pinnedSizes; WORLD_ENGINE.md 6).',
    '   h = the drawing\'s height x its anchor depth / f in its own camera; the footprint is its pinned corner. Written by',
    '   `node tools/world.mjs convert <ref> --out` (and the batch conversions): do not edit by hand. A WORLD_SIZE_GAPS entry wins.',
    '   ============================================================ */',
    '(function () {',
    "  if (typeof worldSizeAutoDefine !== 'function') return;",
    ...ids.map(id => { const s = sizes[id]; return `  worldSizeAutoDefine(${JSON.stringify(id)}, ${JSON.stringify({ h: s.h, l: s.l, w: s.w, from: s.from || null })});`; }),
    '})();', ''].join('\n');
}
/** The sizes a generated size file holds (its worldSizeAutoDefine lines). */
export function sizeFileRead(text) {
  const out = {};
  for (const m of String(text || '').matchAll(/worldSizeAutoDefine\(("(?:[^"\\]|\\.)*"), (\{[^\n]*\})\);/g)) { try { out[JSON.parse(m[1])] = JSON.parse(m[2]); } catch { /* skip */ } }
  return out;
}
export const SIZE_FILE = '79-world-zdata-sizes.js';

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
function carryCompiled(C, E, { surfaces, byId, entities, landmarks, surfAt, info, report, rest }) {
  const restId = rest ? rest.id : null, groups = new Map();
  for (const it of C.items || []) {
    const g = it.g;
    if (!g || !Number.isFinite(g.x) || !Number.isFinite(g.d) || g.d <= 0.5 || g.d > 400) continue;
    // a generated building is a direct item with an invisible placeholder object ('building.gen-direct', op 0): it comes through as a
    // v3 building (buildingsOf), never as that placeholder
    if (it.direct || it.gen != null || it.o === 'building.gen-direct') continue;
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
// overlap and blocksPath are the placement solver's to settle (the validator leaves them to it: 0core `place`): the converter takes
// its move when it is at most this far (the p90 of the overlaps the first bulk conversion removed), and only removes the rest
export const NUDGE_MAX_M = 1.2;
const SOLVER_RULES = new Set(['overlap', 'blocksPath']);
/**
 * One build of the spec: every entity or landmark the placement solver moved for an overlap or a blocked path (its log), by at most
 * NUDGE_MAX_M, gets the solver's position (and facing) in the spec, each listed under review. -> the set of moved entries.
 */
function solverNudges(spec, errs, report, E) {
  const moved = new Set();
  if (!E.worldBuild || !errs.length) return moved;
  // two entries of the SAME object overlapping are one thing twice (a placed lamp and the compile's copy of it a few cm off): a
  // duplicate to merge (repairSpec removes one), never two things to push apart (23 Oct, Ancoats: a nudge kept a second lamppost)
  const dup = new Set();
  for (const er of errs) {
    if (er.rule !== 'overlap') continue;
    const a = /^(entities|landmarks)\[(\d+)\]/.exec(er.path || ''), b = /^(\S+) overlaps (\S+) \((entities|landmarks)\[(\d+)\]\)/.exec(String(er.msg));
    if (!a || !b || b[1] !== b[2]) continue;
    const ia = spec[a[1]] && spec[a[1]][+a[2]], ib = spec[b[3]] && spec[b[3]][+b[4]];
    if (ia) dup.add(ia); if (ib) dup.add(ib);
  }
  if (dup.size) report.notes.push(`repair: ${dup.size} entr${dup.size === 1 ? 'y overlaps' : 'ies overlap'} another of the same object: duplicates, merged (not nudged)`);
  // every entry gets a name for the one build (the solver's log names entries by id); the names go again after it
  const tags = [];
  for (const key of ['entities', 'landmarks']) (spec[key] || []).forEach((it, i) => { if (it && Array.isArray(it.at)) { const had = it.id; if (had == null) it.id = `$nudge:${key}:${i}`; tags.push({ key, i, it, id: it.id, had, at: it.at.slice(), facing: it.facing }); } });
  let w = null;
  try { w = E.worldBuild(JSON.parse(JSON.stringify(spec)), { season: 'summer' }); } catch (e) { report.notes.push('repair: the solver build threw (' + e.message + '): nothing nudged'); }
  for (const t of tags) if (t.had == null) delete t.it.id;
  if (!w) return moved;
  const log = Array.isArray(w.log) ? w.log : [], byId = new Map((w.entities || []).map(e => [String(e.id), e]));
  const why = new Map();
  for (const l of log) if (l && SOLVER_RULES.has(l.rule) && (l.action === 'move' || l.action === 'rotate')) { const k = String(l.id); if (!why.has(k)) why.set(k, []); why.get(k).push(l); }
  for (const t of tags) {
    const L = why.get(String(t.id)), e = byId.get(String(t.id));
    if (!L || !e || !Number.isFinite(e.x) || !Number.isFinite(e.z) || dup.has(t.it)) continue;
    const d = Math.hypot(e.x - t.at[0], e.z - t.at[1]);
    if (d > NUDGE_MAX_M) continue;
    t.it.at = [r2(e.x), r2(e.z)];
    const turned = L.some(l => l.action === 'rotate') && Number.isFinite(e.facing);
    if (turned) t.it.facing = Math.round(e.facing);
    moved.add(t.it);
    const reason = String(L[0].reason).replace(/\$nudge:(entities|landmarks):(\d+)/g, '$1[$2]');
    // one review line for them all (repairSpec), each in the notes (--report)
    (report.$nudges = report.$nudges || []).push({ path: `${t.key}[${t.i}]`, obj: t.it.obj, d: r2(d) });
    report.notes.push(`${t.key}[${t.i}] ${t.it.obj}: nudged ${r2(d)} m by the placement solver${turned ? ' and turned' : ''} (${[...new Set(L.map(l => l.rule))].join(', ')}: ${reason})`);
  }
  report.counts.nudged = (report.counts.nudged || 0) + moved.size;
  return moved;
}
/** Validate; let the solver settle overlaps and blocked paths (solverNudges); remove what the validator still refuses (entities,
 *  clusters, life entries, skyline), each one listed; repeat (at most 6 rounds). */
export function repairSpec(spec, report, E = {}) {
  let v = validateSpec(spec, E);
  for (let round = 0; round < 6 && !v.ok; round++) {
    // 1. the solver first: what it moves within NUDGE_MAX_M stays, at the solver's spot (one build per round)
    const solverErrs = v.errors.filter(er => SOLVER_RULES.has(er.rule) && /^(entities|landmarks)\[\d+\]/.test(er.path || ''));
    const moved = round < 3 ? solverNudges(spec, solverErrs, report, E) : new Set();
    if (moved.size) { v = validateSpec(spec, E); if (v.ok) break; }
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
      // a landmark that overlaps a plain entity keeps its place: the entity goes (the Town Hall is not lost to a lamppost)
      let L = list, k = +m[2], msg = `repair: removed (${er.rule}) ${er.msg}`, path = er.path;
      const pm = er.rule === 'overlap' && key === 'landmarks' ? /\(entities\[(\d+)\]\)/.exec(String(er.msg)) : null;
      if (pm && spec.entities && spec.entities[+pm[1]] && spec.entities[+pm[1]].obj) { L = spec.entities; k = +pm[1]; path = `entities[${k}]`; msg = `repair: removed (overlap) ${L[k].obj} (${path}): it overlaps the landmark ${item.obj}, which stays (${er.msg})`; }
      if (!kill.has(L)) kill.set(L, new Set());
      if (!kill.get(L).has(k)) report.review.push({ path, msg });
      kill.get(L).add(k);
    }
    if (!kill.size && !v.errors.some(er => er.rule === 'unknownVariant')) break;
    for (const [list, set] of kill) { const keep = list.filter((x, i) => !set.has(i)); list.length = 0; list.push(...keep); }
    if (spec.backdrop && spec.backdrop.skyline && !spec.backdrop.skyline.length) delete spec.backdrop.skyline;
    if (spec.landmarks && !spec.landmarks.length) delete spec.landmarks;
    v = validateSpec(spec, E);
  }
  const N = report.$nudges || [];
  delete report.$nudges;
  if (N.length) {
    const ds = N.map(n => n.d);
    report.review.push({ path: 'entities', msg: `${N.length} entr${N.length === 1 ? 'y' : 'ies'} kept where the placement solver settled ${N.length === 1 ? 'it' : 'them'} (overlap, blocksPath; ${Math.min(...ds)}-${Math.max(...ds)} m, at most ${NUDGE_MAX_M} m; each in the notes): ${N.slice(0, 10).map(n => `${n.path} ${n.obj} ${n.d} m`).join(', ')}${N.length > 10 ? ', ...' : ''}` });
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
  const TOP = new Set(['v', 'place', 'camera', 'surfaces', 'buildings', 'entities', 'landmarks', 'life', 'backdrop', 'seed']);
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
  return head.join('\n') + '\n(function () {\n  if (typeof worldAdd !== \'function\') return;\n  worldAdd(\'world-test\', ' + JSON.stringify(meta) + ',\n' + compactJson(spec) + ');\n})();\n';
}
/** A spec as compact JSON: one line per top-level value, and one line per entry of each list (a surface, a building, an entity, a
 *  population), so an edit or a re-conversion touches the lines of what changed, not hundreds of one-number lines. */
export function compactJson(spec) {
  const keys = Object.keys(spec), lines = ['{'];
  keys.forEach((k, ki) => {
    const v = spec[k], end = ki < keys.length - 1 ? ',' : '';
    if (Array.isArray(v) && v.length) { lines.push(` ${JSON.stringify(k)}: [`); v.forEach((x, i) => lines.push('  ' + JSON.stringify(x) + (i < v.length - 1 ? ',' : ''))); lines.push(' ]' + end); }
    else lines.push(` ${JSON.stringify(k)}: ${JSON.stringify(v)}${end}`);
  });
  lines.push('}');
  return lines.join('\n');
}

