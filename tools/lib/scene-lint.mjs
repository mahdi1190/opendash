// The `composed` lint profile, the object lint and the new standard (docs/dev/SCENE_ENGINE.md sections 2.6, 8.5, 10.2 and 15).
// Node >= 20, no dependencies, no I/O. Everything here reads the scene engine through `E` (engineOf(reg): the registry bundle's
// sceneCompile, sceneObj, sceneObjShapes ...), so the rules judge exactly what the renderers draw: the COMPILED scene (section 4).
//
//   engineOf(reg)                                  -> E: the engine functions of a loaded registry (E.ready false without the core)
//   lintScene(dataOrItem, thresholds, { E, item, perf, ref, gpu, svg, strict, reg, pack }) -> { ref, profile: 'composed', pass, gold, rules: [Rule], failures, warnings, metrics, compiled }
//       (svg: false skips rendering the SVG fallback for its byte and text rules: a batch checks it on a sample of rows)
//       the rule groups of the profile: DATA (and PERF when `perf` is given), the BAR (15.2), placement VARIETY (10.2), CARE (8.5),
//       SANITY (docs/dev/SCENE_ENGINE_V2.md 15.1, tools/lib/scene-sanity.mjs) and COMPOSITION (V2 20.4, tools/lib/scene-composition.mjs
//       when it is in the checkout: imported dynamically). strict (--strict-placement): every sanity and composition WARNING is a
//       failure. GOLD also needs no sanity error and no refused placement (V2 15.2); v1 scenes keep their tier: their sanity findings
//       are warnings until the pack migrates (V2 14.1), unless strict.
//       Rule = { group, rule, ok, value, limit, message, warn? }; a failing rule's message says how far off it is and the fix.
//   barMetrics(C, data, { E, thresholds })        -> { depthLayers, groundCover, coverItems, movers, travellers, motionKinds, signature, ... }
//   placementVariety(C, { E, thresholds })        -> { objects: [...], categories: [...], stacked: [...], fails: [Rule] }
//   careCheck(C, data, item, { E, thresholds })   -> [Rule]   people, crowd, silhouettes, signs (8.3, 8.5)
//   perfRules(perf, thresholds, { gpu })          -> [Rule]   dynMs / drawMs / p95 / first bake against the budget (x swFactor in software)
//   lintObject(id, { E, thresholds })             -> { id, pass, rules: [Rule], stats }    the object rules (2.6)
//   retroCheck(markup, { classes })               -> [Rule]   the retrofit overlay (7.4): at most SCENE_RETRO_MAX_BYTES, classes defined
//   svgTextCheck(markup, signs)                   -> [Rule]   <text> only inside g.sc-sign, and only a sign's own escaped text (8.3)
//   standardOf(entry, lint, perf)                 -> 'gold' | 'composed' | 'upgrading' | 'rich' | 'legacy' | null (small items)
//   SIGN_DENY / signTextCheck(text)                the signage rule when the core's sceneSignText is not loaded
import { scenePathBox, scenePathPts } from './scene-svg.mjs';
import { sanityRules } from './scene-sanity.mjs';

/** G's composition lint (V2 20.4), when the checkout has it: a dynamic import, never a static one (a missing builder removes its group only). */
let COMPOSITION = null;
try { COMPOSITION = await import('./scene-composition.mjs'); } catch { COMPOSITION = null; }

/* ---------------------------------------------------------------------------------------------
   The engine of a loaded registry
   --------------------------------------------------------------------------------------------- */
const ENGINE_NAMES = {
  compile: 'sceneCompile', obj: 'sceneObj', objs: 'sceneObjs', shapes: 'sceneObjShapes', data: 'sceneData', svg: 'sceneSvg', validate: 'sceneValidate',
  signText: 'sceneSignText', archetype: 'sceneArchetype', table: 'sceneTable', tableDefine: 'sceneTableDefine', batch: 'sceneBatch', fromArchetype: 'sceneFromArchetype',
  kitPick: 'sceneKitPick', item: 'sceneItem', scaleBucket: 'sceneScaleBucket', light: 'sceneLight', colour: 'sceneColour', line: 'sceneLine',
  index: 'SCENE_ARCHETYPE_INDEX', regionKits: 'SCENE_REGION_KITS', regionParams: 'SCENE_REGION_PARAMS', kits: 'SCENE_KITS', roles: 'SCENE_ROLES', categories: 'SCENE_CATEGORIES',
  retroMax: 'SCENE_RETRO_MAX_BYTES', dups: 'sceneObjDups',
  // scene engine v2 (each optional: a builder that has not landed leaves its name undefined)
  real: 'sceneObjReal', objClass: 'sceneObjClass', placeRules: 'SCENE_PLACE_RULES', surfaceKinds: 'SCENE_SURFACE_KINDS', camera: 'sceneCamera', hazeAt: 'sceneHazeAt',
  objViews: 'sceneObjViews', flowReal: '_scflReal', flowViewOf: 'sceneFlowViewOf', flowStats: 'sceneFlowStats', flowCompile: 'sceneFlowCompile', compositionOf: 'sceneCompositionOf',
};
export function engineOf(reg) {
  const get = (reg && reg.R && typeof reg.R.get === 'function') ? reg.R.get : () => undefined;
  const E = {};
  for (const [k, n] of Object.entries(ENGINE_NAMES)) E[k] = get(n);
  E.ready = typeof E.compile === 'function' && typeof E.obj === 'function' && typeof E.shapes === 'function';
  E.require = (what) => { if (!E.ready) throw new Error(`${what} needs the scene engine (src/app/70-scene-0core.js: sceneCompile, sceneObj, sceneObjShapes), which this checkout does not load yet`); };
  return E;
}

/* ---------------------------------------------------------------------------------------------
   Small helpers
   --------------------------------------------------------------------------------------------- */
const r2 = (v) => Math.round(v * 100) / 100;
const pct = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)))] : 0);
const median = (a) => { const s = [...a].sort((x, y) => x - y); return pct(s, 0.5); };
const hexRgb = (c) => { const s = String(c || '').replace('#', ''); const n = parseInt(s.length === 3 ? s.replace(/./g, '$&$&') : s, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const firstHex = (p) => (typeof p === 'string' ? p : p && (p.lin || p.rad) ? (p.lin || p.rad)[0][1] : null);
/** sRGB -> CIE Lab (D65). */
export function lab([r, g, b]) {
  const f = (u) => { u /= 255; return u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4; };
  const R = f(r), G = f(g), B = f(b);
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, Y = R * 0.2126 + G * 0.7152 + B * 0.0722, Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const h = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * h(Y) - 16, 500 * (h(X) - h(Y)), 200 * (h(Y) - h(Z))];
}
export const deltaE = (a, b) => { const A = lab(a), B = lab(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
const rule = (group, name, ok, value, limit, message, extra = {}) => ({ group, rule: name, ok: !!ok, value, limit, message: ok ? '' : message, ...extra });

/** Object facts memoised per engine: def, category, tags, height, glow counts and mean colour per (v, season). */
function objFacts(E) {
  if (E._facts) return E._facts;
  const defs = new Map(), shp = new Map();
  const def = (id) => { if (!defs.has(id)) defs.set(id, E.obj(id) || null); return defs.get(id); };
  const shapes = (id, v, season) => {
    const k = id + '|' + v + '|' + season;
    if (!shp.has(k)) {
      let R = null; try { R = E.shapes(id, v, season); } catch { R = null; }
      let glow = 0, area = 0, sum = [0, 0, 0], n = 0;
      const all = [];
      if (R) for (const p of R.order || Object.keys(R.parts || {})) for (const s of (R.parts[p] || [])) {
        all.push(s); n++;
        if (s.glow) glow++;
        const hex = firstHex(s.f);
        if (hex && p !== 'lit' && !s.glow) { const b = scenePathBox(s.d, s.m); if (b) { const a = Math.max(1, (b[2] - b[0]) * (b[3] - b[1])) * (s.op == null ? 1 : s.op); const c = hexRgb(hex); area += a; sum = sum.map((x, i) => x + c[i] * a); } }
      }
      const lit = !!(R && R.parts && R.parts.lit && R.parts.lit.length);
      shp.set(k, { R, n, glow, lit, area, mean: area ? sum.map(x => x / area) : null, box: R && R.box });
    }
    return shp.get(k);
  };
  E._facts = { def, shapes };
  return E._facts;
}
const tagsOf = (d) => (d && d.tags) || [];
const heightOf = (d) => (d && Array.isArray(d.size) ? d.size[1] : 100);

/** The scene data of an item or a thunk; data objects pass through. */
export function dataOf(x, E) {
  if (!x) return null;
  if (typeof x === 'function') return x();
  if (x.composed || x.scene) return E && typeof E.data === 'function' ? E.data(x) : (typeof x.scene === 'function' ? x.scene() : x.scene);
  return x;
}

/* ---------------------------------------------------------------------------------------------
   Data rules
   --------------------------------------------------------------------------------------------- */
/** The bake groups the canvas renderer makes (6.3): the sky, plus a new land bitmap at a layer boundary after a layer with animated content. */
export function bakeBitmaps(C) {
  const dyn = new Set(), stat = new Set();
  for (const g of C.ground || []) stat.add(g.layer);
  for (const w of C.water || []) { stat.add(w.layer); if (w.shimmer || w.lightPath) dyn.add(w.layer); }
  for (const it of C.items || []) { if (it.strip >= 0 || (it.anim && it.anim.length)) dyn.add(it.layer); if (!(it.anim && it.anim.length) || it.strip >= 0) stat.add(it.layer); }
  for (const a of C.actors || []) dyn.add(a.layer);
  for (const f of C.flocks || []) dyn.add(f.layer);
  for (const s of C.strips || []) dyn.add(s.layer);
  for (const s of C.signs || []) stat.add(s.layer);
  const pan = C.camera && C.camera.pan > 0;
  let groups = 0, open = false, lastDepth = null;
  for (const L of C.layers || []) {
    if (pan && lastDepth != null && L.depth !== lastDepth) open = false;
    if (stat.has(L.i) && !open) { groups++; open = true; lastDepth = L.depth; }
    if (dyn.has(L.i)) open = false;
  }
  return 1 + groups;
}
/** The sprite memory of a scene at dpr 2, in MB (each distinct sprite: its box at its scale bucket, 4 bytes a pixel). */
function spriteMB(C, E, dpr = 2) {
  const F = objFacts(E), seen = new Set(), bucket = E.scaleBucket || ((s) => 2 ** (Math.round(Math.log2(s) * 4) / 4));
  let bytes = 0;
  const add = (o, v, season, s, haze, tint) => {
    const key = [o, v, season, haze, tint, bucket(s)].join('|');
    if (seen.has(key)) return;
    seen.add(key);
    const f = F.shapes(o, v, season), b = f.box || [-50, -100, 50, 2];
    bytes += Math.max(1, (b[2] - b[0]) * bucket(s) * dpr + 4) * Math.max(1, (b[3] - b[1]) * bucket(s) * dpr + 4) * 4;
  };
  for (const it of C.items || []) add(it.o, it.v, it.season || C.season, it.s, Math.round((it.haze || 0) * 10), it.tint ? it.tint[1] : 0);
  for (const a of C.actors || []) add(a.o, a.v || 0, C.season, a.s || 1, 0, 0);
  for (const f of C.flocks || []) add(f.o, 0, C.season, f.s || 1, 0, 0);
  return { mb: r2(bytes / 1048576), distinct: seen.size };
}
function dataRules(C, data, item, { E, thresholds, svg = true }) {
  const T = (thresholds.composed && thresholds.composed.data) || {};
  const st = C.stats || {}, out = [];
  const max = (name, value, fix) => { const t = T[name] || {}; const ok = t.max == null || value <= t.max; const warn = t.warnMax != null && value > t.warnMax && ok; out.push(rule('data', name, ok, value, t.max != null ? `<= ${t.max}` : '', `${name} ${value} > ${t.max}: ${fix}`, warn ? { warn: `${name} ${value} > ${t.warnMax} (warn): ${fix}` } : {})); };
  max('placements', st.placements || 0, 'static placements are free per frame but bound the bake and the memory: thin the densest scatter rule (n or density)');
  max('animatedDraws', st.animatedDraws || 0, 'the sprites drawn per frame: move swaying plants into wind strips (anim: \'strip\'), switch hooks off on small or far placements (anim: false), fewer flock birds');
  max('actors', st.actors || 0, 'fewer actors: a flock or a hook (bob, turn) gives life for less');
  max('flockBirds', st.flockBirds || 0, 'fewer birds per flock');
  max('particles', (C.particles && C.particles.n) || 0, 'fewer particles');
  const layers = (C.layers || []).length, used = st.layersUsed || 0, lt0 = T.layersUsed || { min: 5, max: 8 };
  // v2: only the depth bands the camera sees can hold content (a raised eye puts the fore band below the frame)
  const lt = Object.assign({}, lt0, { min: Math.min(lt0.min || 0, v2VisibleBands(C)) });
  out.push(rule('data', 'layersUsed', used >= (lt.min || 0) && layers <= (lt.max || 8), used, `${lt.min} to ${lt.max}`, used < lt.min ? `only ${used} layers hold ground, water or placements (at least ${lt.min}): put something in the horizon, far, mid, near AND fore layers` : `${layers} layers: at most ${lt.max}`));
  max('bitmaps', bakeBitmaps(C), 'too many bake groups: keep the animated content (shimmer water, strips, actors) in fewer layers, or merge layers');
  const sm = spriteMB(C, E);
  max('distinctSprites', st.distinctSprites != null ? st.distinctSprites : sm.distinct, 'too many distinct sprites: fewer tint buckets, haze steps or scale spreads per object, or fewer objects');
  max('spriteMB', sm.mb, 'the sprite cache estimate at dpr 2 is too large: fewer large distinct sprites (big objects at many scale buckets)');
  const arch = data && data.arch;
  const dataBytes = arch ? JSON.stringify({ params: arch.params || {}, patch: arch.patch || {} }).length : JSON.stringify(data, (k, v) => (typeof v === 'function' ? undefined : v)).length;
  max('dataBytes', dataBytes, 'the scene data is too large: use scatter rules instead of hand placements, or an archetype');
  if (arch && T.rowBytes) max('rowBytes', JSON.stringify(arch.params || {}).length, 'an archetype row (its params) is too large');
  // v2 (V2 15.2): the flows' agents at most 60; the compile's errors (refused placements, bad flows) must be none for GOLD
  if (C.v === 2 || (C.flows && C.flows.length)) {
    const fm = (C.stats && C.stats.v2 && C.stats.v2.flowMax != null) ? C.stats.v2.flowMax : (C.flows || []).reduce((n, f) => n + (f.max || 0), 0);
    max('flowMax', fm, 'at most 60 agents across the flows: lower their max (or density)');
  }
  if (C.v === 2) {
    const errs = (C.problems || []).filter(p => p && p.sev === 'error');
    out.push(rule('data', 'problems', !errs.length, errs.length, '0 errors', `the compile reports ${errs.length} error(s): ${errs.slice(0, 4).map(p => `${p.rule}: ${p.msg}`).join('; ')}${errs.length > 4 ? ' ...' : ''}`));
  }
  if (svg && typeof E.svg === 'function') {
    let fill = '', tile = '';
    try {
      fill = E.svg(data, { size: 'fill' }) || ''; tile = E.svg(data, { size: 'lg' }) || '';
      // an auto-season scene is a tile in every season: the budget holds for the heaviest one (spring blossom, autumn leaves)
      if ((data.season === 'auto' || data.season == null) && !(data.view && Math.abs(data.view.lat) < 23.5)) for (const season of ['spring', 'autumn', 'winter']) { const t = E.svg(data, { size: 'lg', season }) || ''; if (t.length > tile.length) tile = t; }
    } catch (e) { out.push(rule('data', 'svg', false, 'error', 'renders', `sceneSvg threw: ${e.message}`)); }
    if (fill) { max('svgFillBytes', fill.length, 'the SVG still at fill is too large: fewer distinct sprites'); max('svgTileBytes', tile.length, 'the SVG still at tile size is too large'); out.push(...svgTextCheck(fill, data.signs || [])); }
  }
  return out;
}

/* ---------------------------------------------------------------------------------------------
   The bar (15.2)
   --------------------------------------------------------------------------------------------- */
const COVER = { natural: ['plant', 'ground', 'rock', 'tree'], urban: ['plant', 'ground', 'rock', 'tree', 'street', 'rail', 'person', 'vehicle'] };
const MOVER_HOOKS = new Set(['bob', 'paddle', 'turn', 'walk', 'flap']);
const SHADOW_CATS = new Set(['tree', 'building', 'person', 'vehicle', 'structure', 'landmark', 'animal']);
const LIGHT_CATS = new Set(['building', 'street', 'structure', 'landmark', 'vehicle']);
const REGION_ARCHS = new Set(['skyline-water', 'river-city', 'harbour', 'historic-street', 'plaza', 'temple-mountain', 'temple-water', 'desert', 'beach-coast', 'mountain-lake', 'park', 'snow-town', 'plains', 'basic']);

/** The anchor of an actor at t = 0 (its path at its offset). */
function actorAt(a) {
  const p = a.path || [[0, 0]];
  if (p.length < 2) return p[0];
  const segs = []; let len = 0;
  for (let i = 1; i < p.length; i++) { const l = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); segs.push(l); len += l; }
  let d = ((a.offset || 0) % 1) * len;
  for (let i = 0; i < segs.length; i++) { if (d <= segs[i]) { const t = segs[i] ? d / segs[i] : 0; return [p[i][0] + (p[i + 1][0] - p[i][0]) * t, p[i][1] + (p[i + 1][1] - p[i][1]) * t]; } d -= segs[i]; }
  return p[p.length - 1];
}
/** The area-weighted mean colour of the nature fills (tree, plant, ground placements and the ground paints) of a compiled scene. */
function natureMean(C, E) {
  const F = objFacts(E); let area = 0, sum = [0, 0, 0];
  for (const it of C.items || []) {
    const d = F.def(it.o); if (!d || !['tree', 'plant', 'ground'].includes(d.category)) continue;
    const f = F.shapes(it.o, it.v, it.season || C.season); if (!f.mean) continue;
    const a = f.area * it.s * it.s; area += a; sum = sum.map((x, i) => x + f.mean[i] * a);
  }
  for (const g of C.ground || []) {
    const hex = firstHex(g.fill), b = scenePathBox(g.d); if (!hex || !b) continue;
    const a = Math.max(1, (b[2] - b[0]) * (Math.min(900, b[3]) - b[1])), c = hexRgb(hex); area += a; sum = sum.map((x, i) => x + c[i] * a);
  }
  return area ? sum.map(x => x / area) : null;
}
/** v2: how many depth bands (not 'front') reach past the bottom of the frame (the ground at dMin); v1: Infinity (no cap). */
export function v2VisibleBands(C) {
  if (!C || C.v !== 2 || !C.cam || !Array.isArray(C.cam.bands)) return Infinity;
  return C.cam.bands.filter(b => b.id !== 'front' && b.d0 != null && (b.d1 == null || b.d1 > (C.cam.dMin || 0))).length;
}
export function barMetrics(C, data, { E, thresholds = {} } = {}) {
  const F = objFacts(E), B = (thresholds.composed && thresholds.composed.bar) || {};
  const setting = C.setting || (data && data.setting) || 'natural';
  const items = C.items || [], actors = C.actors || [], flocks = C.flocks || [];
  const m = { setting };
  // depth
  m.depthLayers = (C.stats && C.stats.layersUsed) || new Set([...items.map(i => i.layer), ...(C.ground || []).map(g => g.layer), ...(C.water || []).map(w => w.layer)]).size;
  // ground cover: the band from the horizon + 35 % of the land down to y 900, in 40-unit columns
  const horizon = (C.view && C.view.horizon) || (data && data.view && data.view.horizon) || 500;
  const bandY0 = horizon + 0.35 * (900 - horizon);
  const cats = new Set(setting === 'urban' ? COVER.urban : COVER.natural);
  const cols = new Array(40).fill(0), water = new Array(40).fill(false);
  let coverItems = 0;
  for (const it of items) {
    if (it.y < bandY0 || it.y > 900 || it.x < 0 || it.x >= 1600) continue;
    const d = F.def(it.o); if (!d) continue;
    const isCover = cats.has(d.category) || (setting === 'urban' && tagsOf(d).includes('role:ground'));
    if (!isCover) continue;
    coverItems++; cols[Math.floor(it.x / 40)]++;
  }
  for (const w of C.water || []) { const b = scenePathBox(w.d); if (!b || b[3] < bandY0) continue; for (let c = 0; c < 40; c++) if (b[2] > c * 40 && b[0] < (c + 1) * 40) water[c] = true; }
  m.landShare = 1;
  // v2 (integration, 8 Oct): the cover rules ask for plants and props on SOFT ground only. The engine knows what each point of the
  // lower band is (the surfaces in ground metres): water, and hard surfaces (a plaza's setts, a pavement, a road with its markings
  // and wet sheen) are finished ground, like v1's water columns; landShare is the share of the band that is soft ground.
  const needs = new Array(40).fill(true);
  if (C.v === 2 && C.cam && Number.isFinite(C.cam.f)) {
    const cam = C.cam, rows = 12, step = (900 - bandY0) / rows;
    const inP = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
    const surfs = (C.surfaces || []).filter(q => Array.isArray(q.polyM) && q.polyM.length >= 3), waters = (C.water || []).map(w => w.v2 && w.v2.polyM).filter(P => P && P.length >= 3);
    const FINISHED = new Set(['road', 'parking', 'driveway', 'pavement', 'plaza', 'platform', 'cycleway', 'steps', 'bridge', 'rail', 'tramway', 'edge', 'rooftop', 'rock', 'plot']);   // plot: built-up yards and forecourts (no plants may stand there)
    let soft = 0, all = 0;
    const colSoft = new Array(40).fill(0);
    for (let r = 0; r < rows; r++) for (let c = 0; c < 40; c++) {
      const X = c * 40 + 20, Y = bandY0 + (r + 0.5) * step, d = Y > cam.horizon ? cam.f * cam.eye / (Y - cam.horizon) : Infinity, x = (X - cam.x0) * d / cam.f;
      all++;
      if (!Number.isFinite(d) || waters.some(P => inP(x, d, P))) continue;
      let kind = null;
      for (const q of surfs) if (inP(x, d, q.polyM)) kind = q.kind;   // the last one that holds the point is on top
      if (kind && FINISHED.has(kind)) continue;
      soft++; colSoft[c]++;
    }
    m.landShare = r2(soft / Math.max(1, all));
    for (let c = 0; c < 40; c++) needs[c] = colSoft[c] >= 3;
  }
  m.groundCover = r2(cols.filter((n, i) => n >= 3 || water[i] || !needs[i]).length / 40);
  m.coverItems = coverItems;
  // life
  const hooked = items.filter(it => it.strip < 0 && (it.anim || []).some(a => MOVER_HOOKS.has(a.kind))).length;
  const flockBirds = flocks.reduce((n, f) => n + (f.n || 0), 0);
  // v2: each flow counts its max agents (at most 15 per flow) as movers, and as travellers
  const flowAgents = (C.flows || []).reduce((n, f) => n + Math.min(15, f.max || 0), 0);
  m.movers = actors.length + flockBirds + hooked + flowAgents;
  m.travellers = actors.length + flockBirds + flowAgents;
  m.flowAgents = flowAgents;
  const kinds = new Set();
  for (const it of items) for (const a of it.anim || []) kinds.add(a.kind);
  for (const a of actors) for (const h of a.anim || []) kinds.add(h.kind);
  for (const f of flocks) { const fx = F.shapes(f.o, 0, C.season); for (const h of (fx.R && fx.R.anim) || []) kinds.add(h.kind); }
  if (actors.length || flocks.length || flowAgents) kinds.add('travel');
  for (const f of C.flows || []) if (f.kind === 'walk' || f.kind === 'cycle') kinds.add('walk');
  if ((C.strips || []).length || kinds.has('sway')) { kinds.delete('sway'); kinds.add('wind'); }
  m.motionKinds = kinds.size;
  m.motionKindList = [...kinds].sort();
  // signature
  const front = (C.layers || []).find(l => l.id === 'front');
  const minH = (B.signature && B.signature.minHeight) || 180;
  const sig = items.filter(it => { const d = F.def(it.o); const t = tagsOf(d); return d && (t.includes('landmark') || t.includes('signature') || d.category === 'landmark') && (!front || it.layer !== front.i) && it.s * heightOf(d) >= minH; });
  // v2: the scene's subject drawn by the building generator (a real mill, a station) is its landmark (integration, 8 Oct)
  const subj = C.v === 2 ? items.filter(it => it.direct && it.subject && (!front || it.layer !== front.i) && Array.isArray(it.direct.box) && it.direct.box[3] - it.direct.box[1] >= minH) : [];
  m.signature = sig.length + subj.length;
  m.signatureIds = [...new Set(sig.map(i => i.o).concat(subj.map(i => 'building:' + (i.gen || 'subject'))))];
  // live sky and seasons
  const v = (data && data.view) || {};
  const sky = data ? data.sky : C.sky;
  const live = [];
  if (!Number.isFinite(v.lat) || !Number.isFinite(v.lon)) live.push('view.lat / view.lon');
  if (sky === false && setting !== 'interior') live.push('sky: false (only an interior may close the sky)');
  if (data && data.season != null && data.season !== 'auto') live.push(`season '${data.season}' (use 'auto': the season by date)`);
  if (data && data.weather != null && data.weather !== 'live') live.push(`weather '${data.weather}' (use 'live')`);
  if (data && data.particles != null && data.particles !== 'season') live.push(`particles ${JSON.stringify(data.particles)} (use 'season')`);
  m.liveSky = live;
  m.sun = !!(C.sky && C.sky.sunR > 0) || sky === false;
  // shadows (mid to fore)
  const midFore = new Set((C.layers || []).filter(l => l.depth >= 0.4 && l.depth <= 1.0).map(l => l.i));
  const casters = items.filter(it => midFore.has(it.layer) && SHADOW_CATS.has((F.def(it.o) || {}).category));
  m.shadows = C.v === 2 ? 1 : casters.length ? r2(casters.filter(it => it.shadow).length / casters.length) : 1;   // v2: every object casts (the shadow pass)
  m.shadowCasters = casters.length;
  // reflections
  const waters = C.water || [];
  if (!waters.length) m.reflections = null;
  else if (C.v === 2 && waters.every(w => w.v2)) m.reflections = { areas: waters.length, reflecting: waters.length, near: 0, nearOk: 0, share: 1, auto: true };   // v2 water mirrors by itself
  else {
    const refl = waters.filter(w => w.reflect);
    let near = 0, nearOk = 0;
    for (const w of refl) {
      const b = scenePathBox(w.d); if (!b) continue;
      const top = w.y0 != null ? w.y0 : b[1];
      for (const it of items) { const d = F.def(it.o); if (!d || d.category === 'ground') continue; if (it.x < b[0] - 40 || it.x > b[2] + 40 || Math.abs(it.y - top) > 40) continue; near++; if (it.reflect) nearOk++; }
    }
    m.reflections = { areas: waters.length, reflecting: refl.length, near, nearOk, share: near ? r2(nearOk / near) : 1 };
  }
  // night lights
  let lights = 0, lightSources = 0;
  for (const it of items) {
    // v2: a projected building's windows light by the window share after dusk (its direct glow shapes; its placeholder has none)
    if (it.direct) { lights += Math.min(40, (it.direct.shapes || []).filter(s => s && s.glow).length); continue; }
    const d = F.def(it.o); if (!d) continue; if (LIGHT_CATS.has(d.category)) lightSources++; const f = F.shapes(it.o, it.v, it.season || C.season); lights += it.glowOn ? it.glowOn.length : f.glow; if (f.lit) lights++;
  }
  for (const a of actors) { const d = F.def(a.o); if (!d) continue; if (LIGHT_CATS.has(d.category)) lightSources++; const f = F.shapes(a.o, a.v || 0, C.season); lights += f.glow + (f.lit ? 1 : 0); }
  m.nightLights = lights + (C.v === 2 ? (C.lights || []).length : 0);   // v2: plus the light sources (lamps, spill)
  m.needsLights = lightSources > 0 || setting === 'urban';
  return m;
}
/** The season rule: every seasonal object placed has four seasons, and away from the tropics the nature colours change (delta E). */
function seasonRule(data, C, E, T) {
  const F = objFacts(E), lat = data && data.view ? data.view.lat : null;
  const missing = [];
  for (const o of new Set((C.items || []).map(i => i.o))) {
    const d = F.def(o); if (!d || d.seasonal === false) continue;
    const pal = d.palette || {};
    if (!d.shapeBySeason && !d.fromKit && !['spring', 'summer', 'autumn', 'winter'].every(s => pal[s])) missing.push(o);
  }
  const out = { missing, tropic: !Number.isFinite(lat) || Math.abs(lat) < 23.5, dWinter: null, dAutumn: null };
  if (!out.tropic && data && (data.season == null || data.season === 'auto')) {
    const at = (season) => natureMean(E.compile(data, { season, lod: 1, L: null }), E);
    const su = at('summer'), wi = at('winter'), au = at('autumn');
    if (su && wi) out.dWinter = r2(deltaE(su, wi));
    if (su && au) out.dAutumn = r2(deltaE(su, au));
  }
  return out;
}
function barRules(C, data, { E, thresholds }) {
  const B = (thresholds.composed && thresholds.composed.bar) || {};
  const m = barMetrics(C, data, { E, thresholds });
  const out = [], min = (k, d) => (B[k] && B[k].min != null ? B[k].min : d);
  const setting = m.setting;
  const dlMin = Math.min(min('depthLayers', 5), v2VisibleBands(C));
  out.push(rule('bar', 'depthLayers', m.depthLayers >= dlMin, m.depthLayers, `>= ${dlMin}`, `depthLayers ${m.depthLayers} of ${dlMin}: give the horizon, far, mid, near and fore layers each their own ground, water or placements (haze between them is free)`));
  if (setting !== 'interior') {
    const gc = (B.groundCover && B.groundCover[setting]) != null ? B.groundCover[setting] : setting === 'urban' ? 0.75 : 0.85;
    const ci0 = (B.coverItems && B.coverItems[setting]) != null ? B.coverItems[setting] : setting === 'urban' ? 120 : 300;
    const ci = m.landShare < 1 ? Math.round(ci0 * m.landShare) : ci0;   // v2: asked of the land only (landShare)
    out.push(rule('bar', 'groundCover', m.groundCover >= gc, m.groundCover, `>= ${gc} (${setting})`, `groundCover ${m.groundCover} of ${gc}: the lower ground has bare columns: add a dense scatter rule of ground cover (role ground, ${setting === 'urban' ? 'planters, hedges, street furniture' : 'grass, heather, reeds'}) across the whole width of the near and fore layers`));
    out.push(rule('bar', 'coverItems', m.coverItems >= ci, m.coverItems, `>= ${ci} (${setting})`, `coverItems ${m.coverItems} of ${ci}: more cover placements in the lower band (static placements cost nothing per frame: raise n of the ground scatter)`));
  }
  out.push(rule('bar', 'movers', m.movers >= min('movers', 15), m.movers, `>= ${min('movers', 15)}`, `movers ${m.movers} of ${min('movers', 15)}: add a flock (flocks[]), boats on the water, walkers or vehicles (actors[]), or birds and animals with a bob / turn hook`));
  out.push(rule('bar', 'travellers', m.travellers >= min('travellers', 6), m.travellers, `>= ${min('travellers', 6)}`, `travellers ${m.travellers} of ${min('travellers', 6)}: things must CROSS the scene: actors on paths or a flock`));
  out.push(rule('bar', 'motionKinds', m.motionKinds >= min('motionKinds', 4), m.motionKinds, `>= ${min('motionKinds', 4)}`, `motionKinds ${m.motionKinds} (${m.motionKindList.join(', ') || 'none'}) of ${min('motionKinds', 4)}: mix travel, wind, bob, turn, flap, walk, flicker`));
  out.push(rule('bar', 'signature', m.signature >= min('signature', 1), m.signature, `>= ${min('signature', 1)} (at least ${(B.signature && B.signature.minHeight) || 180} units tall, not in front)`, `signature ${m.signature}: place the scene's landmark or a signature object (tagged landmark / signature) in the mid or far layers, big enough to read (s x size.h >= ${(B.signature && B.signature.minHeight) || 180})`));
  out.push(rule('bar', 'liveSky', !m.liveSky.length, m.liveSky.length ? 'no' : 'yes', 'view lat/lon, open sky, season auto, weather live, particles season', `liveSky: fix ${m.liveSky.join('; ')}`));
  const sr = seasonRule(data, C, E, B), dmin = min('seasonDeltaE', 6);
  const sOk = !sr.missing.length && (sr.tropic || ((sr.dWinter == null || sr.dWinter >= dmin) && (sr.dAutumn == null || sr.dAutumn >= dmin)));
  out.push(rule('bar', 'seasons', sOk, sr.tropic ? 'tropic' : `dE ${sr.dWinter} / ${sr.dAutumn}`, sr.tropic ? 'four seasons per object' : `summer-winter and summer-autumn dE >= ${dmin}`, sr.missing.length ? `seasons: ${sr.missing.join(', ')} lack palettes for all four seasons` : `seasons: the nature colours barely change (summer to winter dE ${sr.dWinter}, to autumn ${sr.dAutumn}; at least ${dmin}): give the ground and the trees seasonal palettes`));
  if (data && data.sky !== false) out.push(rule('bar', 'sun', m.sun, m.sun ? 'yes' : 'no', 'sky.sunR > 0', 'sun: the sky has no sun disc (sky.sunR 0): leave sky.sunR at its default'));
  out.push(rule('bar', 'shadows', m.shadows >= min('shadows', 0.6), m.shadows, `>= ${min('shadows', 0.6)} of ${m.shadowCasters} casters`, `shadows ${m.shadows}: trees, buildings, people and vehicles in the mid to fore layers cast a shadow along the live sun: give their objects shadow: {rx, ry, h}`));
  if (m.reflections) out.push(rule('bar', 'reflections', m.reflections.reflecting >= 1 && m.reflections.share >= 0.8, `${m.reflections.reflecting} of ${m.reflections.areas} areas, ${m.reflections.nearOk}/${m.reflections.near} edge objects`, 'a reflecting water area; objects at its edge reflect', m.reflections.reflecting ? `reflections: only ${m.reflections.nearOk} of ${m.reflections.near} objects at the water's edge have reflect: true` : 'reflections: set reflect: true on the water area'));
  if (m.needsLights) out.push(rule('bar', 'nightLights', m.nightLights >= min('nightLights', 12), m.nightLights, `>= ${min('nightLights', 12)}`, `nightLights ${m.nightLights} of ${min('nightLights', 12)}: windows and lamps that light at real dusk: glow shapes on buildings, lamps and vehicles, or a lit part`));
  return { rules: out, metrics: Object.assign(m, { seasons: sr }) };
}

/* ---------------------------------------------------------------------------------------------
   Placement variety (10.2): reuse is GOOD, stamps and rows are not
   --------------------------------------------------------------------------------------------- */
/** Nearest-neighbour distance of every point (a sweep over x; fine for a few thousand). */
function nnDistances(pts) {
  const p = pts.map((q, i) => [q[0], q[1], i]).sort((a, b) => a[0] - b[0]), out = new Array(p.length).fill(Infinity);
  for (let i = 0; i < p.length; i++) {
    let best = Infinity;
    for (let j = i + 1; j < p.length && p[j][0] - p[i][0] < best; j++) best = Math.min(best, Math.hypot(p[j][0] - p[i][0], p[j][1] - p[i][1]));
    for (let j = i - 1; j >= 0 && p[i][0] - p[j][0] < best; j--) best = Math.min(best, Math.hypot(p[j][0] - p[i][0], p[j][1] - p[i][1]));
    out[p[i][2]] = best;
  }
  return out;
}
export function placementVariety(C, { E, thresholds = {} } = {}) {
  const V = (thresholds.composed && thresholds.composed.variety) || {};
  const F = objFacts(E), items = C.items || [];
  const minPlaced = V.minPlaced || 6, bucket = E && E.scaleBucket || ((s) => 2 ** (Math.round(Math.log2(s) * 4) / 4));
  const byObj = new Map();
  // v2: projected buildings (each its own model) and the engine's seasonal cover are not stamps the author placed
  for (const it of items) { if (it.direct || it.cover) continue; if (!byObj.has(it.o)) byObj.set(it.o, []); byObj.get(it.o).push(it); }
  const objects = [], fails = [];
  const fail = (name, value, limit, message) => fails.push(rule('variety', name, false, value, limit, message));
  for (const [o, list] of byObj) {
    if (list.length < minPlaced) continue;
    const d = F.def(o) || {}, t = tagsOf(d), row = t.includes('row');
    const s = list.map(i => i.s).sort((a, b) => a - b), med = pct(s, 0.5) || 1;
    const rec = { o, n: list.length, scaleSpread: r2((pct(s, 0.9) - pct(s, 0.1)) / med) };
    const minSpread = (V.scaleSpread && V.scaleSpread.min) != null ? V.scaleSpread.min : 0.25;
    if (!row && rec.scaleSpread < minSpread) fail('scaleSpread', rec.scaleSpread, `>= ${minSpread}`, `${o}: ${list.length} placements all about one size (spread ${rec.scaleSpread}): give the rule s: [a, b] and sByY so near ones are bigger`);
    if (d.flippable !== false) {
      rec.flipShare = r2(list.filter(i => i.flip).length / list.length);
      const fs = V.flipShare || { min: 0.2, max: 0.8 };
      if (!row && (rec.flipShare < fs.min || rec.flipShare > fs.max)) fail('flipShare', rec.flipShare, `${fs.min} to ${fs.max}`, `${o}: ${Math.round(rec.flipShare * 100)} % mirrored: mirror about half (flip: 0.5)`);
    }
    rec.variants = new Set(list.map(i => i.v)).size;
    const needV = Math.min(d.variants || 1, 2);
    if (rec.variants < needV) fail('variantUse', rec.variants, `>= ${needV}`, `${o}: only variant ${list[0].v} is used of ${d.variants}: variant: 'random'`);
    if (list.length >= (V.tintUseAt || 20)) {
      rec.tints = new Set(list.map(i => (i.tint ? i.tint[1] : 0))).size;
      if (rec.tints < 2) fail('tintUse', rec.tints, '>= 2', `${o}: ${list.length} placements in one colour: a tint rule (tint: { col, k: [0, 0.16] }) breaks up the stamp`);
    }
    if (!row && list.length >= minPlaced) {
      const nn = nnDistances(list.map(i => [i.x, i.y])).filter(Number.isFinite), m = median(nn);
      rec.grid = m > 0 ? r2(nn.filter(x => Math.abs(x - m) <= m * 0.05).length / nn.length) : 0;
      const gmax = (V.grid && V.grid.max) != null ? V.grid.max : 0.5;
      if (rec.grid > gmax) fail('grid', rec.grid, `<= ${gmax}`, `${o}: ${Math.round(rec.grid * 100)} % of the gaps are the same: a row or a stamp grid. Scatter with a mask (noise) and minGap, or tag a real row (a terrace, a fence) 'row'`);
    }
    objects.push(rec);
  }
  const byCat = new Map();
  for (const it of items) { if (it.direct || it.cover) continue; const c = (F.def(it.o) || {}).category || '?'; if (!byCat.has(c)) byCat.set(c, new Map()); const m = byCat.get(c); m.set(it.o, (m.get(it.o) || 0) + 1); }
  const categories = [];
  for (const [c, m] of byCat) {
    const n = [...m.values()].reduce((a, b) => a + b, 0);
    if (n < (V.categoryAt || 15)) continue;
    const top = Math.max(...m.values()), rec = { category: c, n, species: m.size, topShare: r2(top / n) };
    categories.push(rec);
    const sp = (V.species && V.species.min) || 2, ts = (V.topShare && V.topShare.max) || 0.8;
    if (rec.species < sp) fail('species', rec.species, `>= ${sp}`, `${c}: ${n} placements of ONE object: mix at least ${sp} species (obj: { a: 3, b: 1 })`);
    else if (rec.topShare > ts) fail('topShare', rec.topShare, `<= ${ts}`, `${c}: one object is ${Math.round(rec.topShare * 100)} % of ${n} placements: weight the others up`);
  }
  // stacked: the same sprite within a few units of another
  const gap = V.stackedGap || 6, keyOf = (i) => [i.o, i.v, i.flip ? 1 : 0, bucket(i.s)].join('|'), groups = new Map(), stacked = [];
  for (const it of items) { if (it.direct) continue; const k = keyOf(it); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(it); }
  for (const [k, list] of groups) {
    if (list.length < 2) continue;
    const nn = nnDistances(list.map(i => [i.x, i.y]));
    const n = nn.filter(x => x < gap).length;
    if (n) stacked.push({ key: k, n });
  }
  if (stacked.length) fail('stacked', stacked.reduce((a, s) => a + s.n, 0), `none within ${gap}`, `${stacked.slice(0, 3).map(s => s.key.split('|')[0]).join(', ')}: identical sprites stacked within ${gap} units (they read as one blob): raise minGap or vary the scale`);
  return { objects, categories, stacked, fails };
}

/* ---------------------------------------------------------------------------------------------
   Care (8.5): tiny anonymous people, no crowds, signs only where allowed
   --------------------------------------------------------------------------------------------- */
export const SIGN_DENY = Object.freeze(['underground', 'tfl', 'transport for london', 'johnston', 'mind the gap', 'oyster', 'roundel', 'london overground', 'elizabeth line', 'docklands light railway']);
export function signTextCheck(s) {
  const text = String(s == null ? '' : s).trim().replace(/\s+/g, ' ');
  if (!text || text.length > 40) return { ok: false, text, problem: `1 to 40 characters (got ${text.length})` };
  if (!/^[\p{L}\p{N} '&.,()\-/]+$/u.test(text)) return { ok: false, text, problem: 'letters, digits, spaces and \' & . , ( ) - / only' };
  const low = text.toLowerCase(), hit = SIGN_DENY.find(w => low.includes(w));
  if (hit) return { ok: false, text, problem: `"${hit}" is a protected mark or line name (8.4): line names are colour bars only` };
  return { ok: true, text, problem: '' };
}
export function careCheck(C, data, item, { E, thresholds = {} } = {}) {
  const K = (thresholds.composed && thresholds.composed.care) || {}, F = objFacts(E), out = [];
  const archId = (C.arch && C.arch.id) || (data && data.arch && data.arch.id) || null;
  const station = archId === 'station' || !!(data && data.signage);
  const people = [];
  for (const it of C.items || []) { const d = F.def(it.o); if (d && d.category === 'person') people.push({ o: it.o, x: it.x, y: it.y, h: it.s * heightOf(d) }); }
  for (const a of C.actors || []) { const d = F.def(a.o); if (d && d.category === 'person') { const [x, y] = actorAt(a); const sMax = Math.max(a.s || 1, ...((a.sByY || []).map(p => (a.s || 1) * p[1]))); people.push({ o: a.o, x, y, h: sMax * heightOf(d) }); } }
  const maxP = station ? ((K.people && K.people.station) || 10) : ((K.people && K.people.max) || 8);
  out.push(rule('care', 'people', people.length <= maxP, people.length, `<= ${maxP}${station ? ' (station)' : ''}`, `people ${people.length} > ${maxP}: life comes from animals, birds, boats and vehicles; people are a few anonymous silhouettes for scale`));
  const cn = (K.crowd && K.crowd.n) || 4, cw = (K.crowd && K.crowd.within) || 120;
  const crowded = people.filter(p => people.filter(q => q !== p && Math.hypot(q.x - p.x, q.y - p.y) <= cw).length >= cn - 1);
  out.push(rule('care', 'crowd', !crowded.length, crowded.length, `no ${cn} people within ${cw}`, `crowd: ${crowded.length} people stand in a group of ${cn} or more within ${cw} units: spread them out (no crowds, 8.5)`));
  const maxShapes = (K.personShapes && K.personShapes.max) || 180, maxH = (K.personHeight && K.personHeight.max) || 150;
  const badObj = [...new Set(people.map(p => p.o))].filter(o => { const d = F.def(o); const f = F.shapes(o, 0, C.season); return !tagsOf(d).includes('silhouette') || f.n > maxShapes; });
  out.push(rule('care', 'silhouettes', !badObj.length, badObj.length ? badObj.join(', ') : 'ok', `person objects tagged silhouette, <= ${maxShapes} shapes`, `${badObj.join(', ')}: people are anonymous silhouettes (tag 'silhouette', at most ${maxShapes} shapes, no faces)`));
  const tall = people.filter(p => p.h > maxH);
  out.push(rule('care', 'personHeight', !tall.length, tall.length ? Math.round(Math.max(...tall.map(p => p.h))) : people.length ? Math.round(Math.max(...people.map(p => p.h))) : 0, `<= ${maxH} units`, `${tall.length} people drawn taller than ${maxH} units: size them with the depth ladder (scenePersonScale; at most ${maxH} in the near foreground), a scale cue, not a portrait`));
  const signs = (data && data.signs) || [];
  const regionUpgrade = !!(item && item.upgrade) || (archId && REGION_ARCHS.has(archId) && !(data && data.signage));
  const sMax = (thresholds.composed && thresholds.composed.data && thresholds.composed.data.signs && thresholds.composed.data.signs.max) || 6;
  let signOk = true, msg = '';
  if (signs.length && (!data.signage || regionUpgrade)) { signOk = false; msg = regionUpgrade ? 'signs: a region scene has NO signs (the region care rules forbid text; 8.5)' : 'signs: only a scene with signage: true (an archetype that declares signs: true) may carry signs (8.3)'; }
  else if (signs.length > sMax) { signOk = false; msg = `signs: ${signs.length} > ${sMax}`; }
  else for (const s of signs) {
    const r = typeof E.signText === 'function' ? E.signText(s.text) : signTextCheck(s.text);
    if (!r.ok) { signOk = false; msg = `sign "${s.text}": ${r.problem}`; break; }
    if ((s.style && !['board', 'fascia', 'totem'].includes(s.style))) { signOk = false; msg = `sign style ${s.style}: board, fascia or totem only (no rings, discs or line diagrams)`; break; }
  }
  out.push(rule('care', 'signs', signOk, signs.length, data && data.signage ? `<= ${sMax}, safe text` : 'none (signage: false)', msg));
  return out;
}

/** <text> appears only as a direct child of g.sc-sign, holding exactly a sign's escaped text (8.3). */
export function svgTextCheck(markup, signs = []) {
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const allowed = new Set(signs.map(s => esc(String(s.text || '').trim().replace(/\s+/g, ' '))));
  const bad = [];
  for (const m of String(markup).matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)) {
    const before = markup.slice(0, m.index), open = before.lastIndexOf('<g'), tag = open >= 0 ? before.slice(open, before.indexOf('>', open) + 1) : '';
    const between = before.slice(open >= 0 ? before.indexOf('>', open) + 1 : 0);
    const directChild = /class="[^"]*\bsc-sign\b/.test(tag) && !/<g\b/.test(between);
    if (!directChild || !allowed.has(m[1])) bad.push(m[1].slice(0, 30));
  }
  return [rule('data', 'svgText', !bad.length, bad.length, 'text only in g.sc-sign, a sign\'s own text', `the SVG draws text outside a sign, or text that is not a sign's: ${bad.join(', ')}`)];
}

/* ---------------------------------------------------------------------------------------------
   Perf (scene perf, or scene lint --perf)
   --------------------------------------------------------------------------------------------- */
export function perfRules(perf, thresholds = {}, { gpu = false } = {}) {
  const P = (thresholds.composed && thresholds.composed.perf) || {};
  const k = gpu ? 1 : (P.swFactor || 1.75), lim = (name, d) => r2(((P[name] && P[name].max) != null ? P[name].max : d) * k);
  const out = [];
  if (!perf) return out;
  if (perf.skipped) return [rule('perf', 'perf', true, 'skipped', '', '', { note: perf.skipped })];
  const g = (o, f) => (o && o[f] != null ? r2(o[f]) : null);
  const dyn = g(perf.dynMs, 'median'), draw = g(perf.drawMs, 'median'), p95 = g(perf.drawMs, 'p95'), bake = perf.firstBakeMs != null ? r2(perf.firstBakeMs) : null;
  out.push(rule('perf', 'dynMs', dyn != null && dyn <= lim('dynMs', 6), dyn, `<= ${lim('dynMs', 6)} ms`, `dynMs median ${dyn} ms > ${lim('dynMs', 6)}: the ANIMATED part of the frame is too slow: fewer animated draws (strips instead of per-plant sway, fewer flock birds and particles); never a lower frame rate`));
  out.push(rule('perf', 'drawMs', draw != null && draw <= lim('drawMs', 8), draw, `<= ${lim('drawMs', 8)} ms`, `drawMs median ${draw} ms > ${lim('drawMs', 8)}: the whole frame is too slow: fewer bake bitmaps (blits) or animated draws`));
  out.push(rule('perf', 'drawP95', p95 != null && p95 <= lim('drawP95', 12), p95, `<= ${lim('drawP95', 12)} ms`, `drawMs p95 ${p95} ms > ${lim('drawP95', 12)}: frames spike: look for re-bakes in the frame or large sprite builds`));
  if (bake != null) {
    const warn = r2(((P.firstBakeMs && P.firstBakeMs.warnMax) || 300) * k), max = lim('firstBakeMs', 600);
    out.push(rule('perf', 'firstBakeMs', bake <= max, bake, `<= ${max} ms`, `firstBakeMs ${bake} > ${max}: the first bake is too slow: fewer distinct sprites or placements`, bake > warn && bake <= max ? { warn: `firstBakeMs ${bake} > ${warn} (warn)` } : {}));
  }
  return out;
}

/* ---------------------------------------------------------------------------------------------
   The whole profile
   --------------------------------------------------------------------------------------------- */
export function lintScene(input, thresholds, { E, item = null, perf = null, ref = '', gpu = false, season = null, svg = true, strict = false, reg = null, pack = null, siblings = null } = {}) {
  if (!E || !E.ready) throw new Error('lintScene needs the scene engine (engineOf(reg))');
  const it = item || (input && (input.composed || input.scene) ? input : null);
  const data = dataOf(input, E);
  if (!data) throw new Error(`${ref || 'scene'}: no scene data`);
  const problems = typeof E.validate === 'function' ? E.validate(data) : [];
  const rules = [];
  if (problems && problems.length) rules.push(rule('data', 'validate', false, problems.length, 'no problems', `sceneValidate: ${problems.slice(0, 4).join('; ')}${problems.length > 4 ? ` ... (${problems.length})` : ''}`));
  const C = E.compile(data, { season: season || (data.season && data.season !== 'auto' ? data.season : 'summer'), lod: 1, L: null });
  rules.push(...dataRules(C, data, it, { E, thresholds, svg }));
  const bar = barRules(C, data, { E, thresholds });
  rules.push(...bar.rules);
  const variety = placementVariety(C, { E, thresholds });
  rules.push(variety.fails.length ? variety.fails[0] : rule('variety', 'variety', true, `${variety.objects.length} objects, ${variety.categories.length} categories`, 'scale, flip, variants, tints, no grids, no stacks', ''));
  for (const f of variety.fails.slice(1)) rules.push(f);
  rules.push(...careCheck(C, data, it, { E, thresholds }));
  rules.push(...placementSanity(C, data, { E, thresholds, strict }));
  rules.push(...compositionGroup(C, data, { E, thresholds, strict, reg, pack, siblings, ref }));
  rules.push(...perfRules(perf, thresholds, { gpu }));
  const failures = rules.filter(r => !r.ok), warnings = rules.filter(r => r.ok && r.warn).map(r => r.warn);
  const pass = !failures.length;
  const refused = (C.problems || []).some(p => p && p.rule === 'refused');
  const sanity = { errors: rules.filter(r => r.group === 'sanity' && !r.ok).length, warnings: rules.filter(r => r.group === 'sanity' && r.ok && r.warn).length };
  return { ref, profile: 'composed', v: C.v === 2 ? 2 : 1, strict: !!strict, pass, gold: pass && !refused && !!perf && !perf.skipped, rules, failures, warnings, metrics: { stats: C.stats, bar: bar.metrics, variety: { objects: variety.objects, categories: variety.categories, stacked: variety.stacked }, sanity }, compiled: C, data };
}

/** The sanity group (V2 15.1): a broken check never breaks the lint (it reports itself as one failing rule). */
function placementSanity(C, data, { E, thresholds, strict }) {
  try { return sanityRules(C, data, { E, thresholds, strict }); }
  catch (e) { return [rule('sanity', 'sanity', false, 'error', 'runs', `the sanity lint threw: ${e.message}`)]; }
}
/**
 * The composition group (V2 20.4, builder G) when tools/lib/scene-composition.mjs is in the checkout. Its warnings are ok (the text in
 * warn) unless strict; for a v1 scene a composition finding never fails without strict (v1 keeps its tier, 14.1).
 */
function compositionGroup(C, data, { E, thresholds, strict, reg, pack, siblings, ref }) {
  if (!COMPOSITION || typeof COMPOSITION.compositionRules !== 'function') return [];
  let rs = [];
  try { rs = COMPOSITION.compositionRules(C, data, { E, thresholds, strict, reg, pack, siblings, ref }) || []; }
  catch (e) { return [rule('composition', 'composition', !strict, 'error', 'runs', `the composition lint threw: ${e.message}`, strict ? {} : { warn: `composition: the lint threw: ${e.message}` })]; }
  return rs.map(r => {
    const x = Object.assign({ group: 'composition' }, r);
    if (!x.ok && !strict && C.v !== 2) { x.ok = true; x.warn = x.warn || x.message; x.message = ''; }
    if (x.ok && x.warn && strict) { x.ok = false; x.message = x.message || x.warn; }
    return x;
  });
}

/* ---------------------------------------------------------------------------------------------
   Objects (2.6)
   --------------------------------------------------------------------------------------------- */
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const ID_RE = /^[a-z]+\.[a-z0-9-]{1,40}$/;
/** A ring with a filled bar across its centre spanning > 80 % of its diameter (8.4): circle-like closed subpaths, then a bar through the centre. */
function roundelLike(shapes) {
  const rings = [], bars = [];
  for (const s of shapes) {
    const b = scenePathBox(s.d, s.m); if (!b) continue;
    const w = b[2] - b[0], h = b[3] - b[1];
    const arcs = (String(s.d).match(/[aA]/g) || []).length;
    if (arcs >= 2 && w > 6 && Math.abs(w - h) / Math.max(w, h) < 0.25 && (s.s || (String(s.d).match(/[mM]/g) || []).length >= 2)) rings.push({ cx: (b[0] + b[2]) / 2, cy: (b[1] + b[3]) / 2, d: Math.max(w, h) });
    if (s.f && w > 3 * h && h > 0) bars.push({ cx: (b[0] + b[2]) / 2, cy: (b[1] + b[3]) / 2, w });
  }
  return rings.some(r => bars.some(b => Math.abs(b.cy - r.cy) < r.d * 0.12 && Math.abs(b.cx - r.cx) < r.d * 0.15 && b.w > r.d * 0.8));
}
export function lintObject(id, { E, thresholds = {} } = {}) {
  E.require('object lint');
  const O = thresholds.object || {}, d = E.obj(id), rules = [];
  const add = (name, ok, value, limit, message) => rules.push(rule('object', name, ok, value, limit, message));
  if (!d) return { id, pass: false, rules: [rule('object', 'identity', false, id, 'a defined object', `no object ${id}`)], stats: {} };
  const cats = E.categories || ['tree', 'plant', 'ground', 'rock', 'water', 'bird', 'animal', 'person', 'vehicle', 'boat', 'building', 'street', 'rail', 'structure', 'prop', 'sky', 'landmark'];
  add('identity', ID_RE.test(id) && cats.includes(d.category) && id.split('.')[0] === d.category, id, '<category>.<name>, a known category', `${id}: the id must be <category>.<name> (${cats.join(' ')}) and match its category (${d.category})`);
  const dupes = typeof E.dups === 'function' ? E.dups().filter(x => x === id).length : 0;
  add('unique', !dupes, dupes ? `defined ${dupes + 1} times` : 'once', 'one definition', `${id} is defined ${dupes + 1} times (the last definition wins and hides the others): keep one, in its own 70-scene-lib-* file`);
  const [smin, smax] = O.size || [4, 2000];
  const size = Array.isArray(d.size) ? d.size : null;
  add('size', size && size.every(v => v >= smin && v <= smax), size ? size.join(' x ') : 'none', `${smin} to ${smax}`, `size [w, h] within ${smin} to ${smax} units`);
  const variants = d.variants || 1, seasons = d.seasonal === false ? ['summer'] : SEASONS;
  const stats = { variants, shapes: 0, pathKB: 0, glow: 0, lit: false, buildMs: 0, parts: [], anim: [] };
  let boxOk = true, determ = true, palOk = true, content = '', worstMs = 0, maxShapes = 0, maxKB = 0;
  const means = {};
  for (let v = 0; v < variants; v++) for (const season of seasons) {
    let R, t0 = performance.now();
    try { R = E.shapes(id, v, season); } catch (e) { palOk = false; content = content || `build(${v}, ${season}) throws: ${e.message}`; continue; }
    worstMs = Math.max(worstMs, performance.now() - t0);
    const all = [];
    for (const p of R.order || Object.keys(R.parts)) for (const s of R.parts[p] || []) all.push([p, s]);
    maxShapes = Math.max(maxShapes, all.length);
    const kb = all.reduce((n, [, s]) => n + String(s.d || '').length, 0) / 1024;
    maxKB = Math.max(maxKB, kb);
    if (v === 0 && season === 'summer') { stats.shapes = all.length; stats.glow = all.filter(([, s]) => s.glow).length; stats.lit = !!(R.parts.lit && R.parts.lit.length); stats.parts = R.order || Object.keys(R.parts); stats.anim = (R.anim || []).map(a => a.kind); stats.box = R.box; }
    const box = d.box ? R.box || d.box : null;   // a DECLARED box must cover every shape (a computed one does by construction)
    for (const [, s] of all) {
      const paints = [s.f, s.s].filter(Boolean);
      for (const p of paints) { const hexes = typeof p === 'string' ? [p] : (p.lin || p.rad || []).map(x => x[1]); for (const h of hexes) if (!/^#[0-9a-f]{6}$/i.test(String(h))) content = content || `a non-hex colour ${h} (v ${v}, ${season})`; }
      if (/url\(|<text|<image/i.test(String(s.d))) content = content || 'url(), text or an image in a path';
      if (box) { const b = scenePathBox(s.d, s.m); const tol = 2 + 0.02 * Math.max(box[2] - box[0], box[3] - box[1]); if (b && (b[0] < box[0] - tol || b[1] < box[1] - tol || b[2] > box[2] + tol || b[3] > box[3] + tol)) boxOk = false; }
    }
    // determinism: build again (bypassing the memo when the definition is reachable)
    if (typeof d.build === 'function' && !d.fromKit) {
      try { const a = JSON.stringify(d.build(v, mkRnd(id, v), { season, v, id })), b = JSON.stringify(d.build(v, mkRnd(id, v), { season, v, id })); if (a !== b) determ = false; } catch { /* reported by the build above */ }
    }
    if (v === 0) { const f = objFacts(E).shapes(id, 0, season); means[season] = f.mean; }
  }
  stats.buildMs = r2(worstMs); stats.maxShapes = maxShapes; stats.pathKB = r2(maxKB);
  add('box', boxOk, d.box ? (boxOk ? 'covers' : 'too small') : 'computed', 'a declared box covers every shape', 'the declared box does not cover every shape: widen box, or leave it out (the core computes it)');
  add('determinism', determ, determ ? 'same' : 'differs', 'build twice = same', 'build() gives a different result for the same (v, season): draw with the rnd it is given (never Math.random or the clock)');
  const shapesMax = (O.shapes && O.shapes.max) || 600, kbMax = (O.pathKB && O.pathKB.max) || 60, msMax = (O.buildMs && O.buildMs.max) || 25;
  add('shapes', maxShapes <= shapesMax, maxShapes, `<= ${shapesMax} per variant`, `${maxShapes} shapes: at most ${shapesMax} per variant (merge same-colour shapes into one path)`);
  add('pathKB', maxKB <= kbMax, r2(maxKB), `<= ${kbMax} KB`, `${r2(maxKB)} KB of path data: at most ${kbMax}`);
  add('buildMs', worstMs <= msMax * 4, r2(worstMs), `<= ${msMax} ms (x4 slack in the tool)`, `build took ${r2(worstMs)} ms: at most ${msMax} per (v, season)`);
  add('content', palOk && !content, content || 'clean', 'hex colours, no url(), text or images', content || 'a build failed');
  if (d.seasonal !== false && means.summer) {
    const dw = means.winter ? r2(deltaE(means.summer, means.winter)) : 0, da = means.autumn ? r2(deltaE(means.summer, means.autumn)) : 0;
    add('seasonal', dw > 0.5 && da > 0.5, `dE ${dw} / ${da}`, 'summer differs from autumn and winter', `a seasonal object must change between summer and autumn and between summer and winter (dE ${dw} / ${da}): give it seasonal palettes, or seasonal: false`);
  }
  const R0 = (() => { try { return E.shapes(id, 0, 'summer'); } catch { return null; } })();
  if (R0) {
    const bad = (R0.anim || []).filter(a => { const parts = a.parts || (a.part && a.part !== '*' ? [a.part] : []); const box = R0.box || [-1e9, -1e9, 1e9, 1e9]; const pv = a.pivot || [0, 0]; return parts.some(p => !R0.parts[p]) || pv[0] < box[0] - 2 || pv[0] > box[2] + 2 || pv[1] < box[1] - 2 || pv[1] > box[3] + 2; });
    add('anim', !bad.length, bad.length ? bad.map(a => a.kind + ':' + (a.part || a.parts)).join(', ') : (R0.anim || []).length, 'every hook\'s part exists, its pivot inside the box', 'a hook names a missing part or pivots outside the box');
    const all = (R0.order || Object.keys(R0.parts)).flatMap(p => R0.parts[p] || []);
    if (['street', 'rail', 'building'].includes(d.category)) add('noRoundel', !roundelLike(all), roundelLike(all) ? 'ring + bar' : 'none', 'no ring with a bar across it (8.4)', 'a ring with a bar across its centre reads as the TfL roundel: never draw it (8.4)');
  }
  const t = tagsOf(d), kits = E.kits || [], roles = E.roles || [];
  if (d.category !== 'landmark') {
    const kitTags = t.filter(x => x.startsWith('kit:')), roleTags = t.filter(x => x.startsWith('role:'));
    const kitOk = kitTags.length >= 1 && (!kits.length || kitTags.every(k => kits.includes(k.slice(4))));
    const roleOk = roleTags.length === 1 && (!roles.length || roles.includes(roleTags[0].slice(5)));
    add('tags', kitOk && roleOk, `${kitTags.join(' ') || 'no kit'} ${roleTags.join(' ') || 'no role'}`, 'at least one kit:<kit>, exactly one role:<role>', `tags: at least one kit:<kit> from SCENE_KITS and exactly one role:<role> from SCENE_ROLES (2.7)`);
  } else {
    const minS = (O.landmarkShapes && O.landmarkShapes.min) || 80, minG = (O.landmarkGlow && O.landmarkGlow.min) || 10;
    add('landmarkShapes', stats.shapes >= minS, stats.shapes, `>= ${minS}`, `a landmark is refined: at least ${minS} shapes (real structure, window grids, lit and shaded sides)`);
    add('landmarkNight', t.includes('natural') || stats.lit || stats.glow >= minG, stats.lit ? 'lit part' : stats.glow, `a lit part or >= ${minG} glow shapes (natural: exempt)`, 'a landmark needs its night look: a lit part (floodlights, crown lights) or window glow');
    add('landmarkTags', t.includes('landmark') && t.some(x => /^place:[a-z0-9-]+\/.+/.test(x)), t.join(' '), 'landmark, place:<region>/<key>', 'tags landmark and place:<region>/<key>');
    add('landmarkFlip', d.flippable === false, String(d.flippable !== false), 'flippable: false', 'a landmark is never mirrored: flippable: false');
  }
  if (['building', 'vehicle'].includes(d.category) && !t.includes('unlit')) add('glow', stats.glow >= ((O.glow && O.glow.min) || 4), stats.glow, `>= ${(O.glow && O.glow.min) || 4} (or tag unlit)`, 'windows lit at real dusk: at least 4 shapes with glow (or tag the object unlit)');
  return { id, pass: rules.every(r => r.ok), rules, stats };
}
/** The rnd an object's build gets (the core's: sceneRnd(sceneHash(id | v))); used only to rebuild for the determinism check. */
function mkRnd(id, v) {
  let h = 2166136261; const s = id + '|' + v; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  let a = h >>> 0 || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* ---------------------------------------------------------------------------------------------
   The retrofit overlay (7.4) and the standard (15.3)
   --------------------------------------------------------------------------------------------- */
export function retroCheck(markup, { classes = null, maxBytes = 6000 } = {}) {
  const s = String(markup), i = s.indexOf('<g class="sr-retro"');
  if (i < 0) return [];
  const backOpen = s.indexOf('<g class="sr-back"', i);
  let overlay = s.length - i;
  if (backOpen >= 0) { // the art inside sr-back is not the overlay: find its matching close
    let depth = 0, j = backOpen;
    const re = /<g\b|<\/g>/g; re.lastIndex = backOpen;
    for (let m; (m = re.exec(s));) { depth += m[0] === '</g>' ? -1 : 1; if (!depth) { j = m.index + 4; break; } }
    overlay -= (j - backOpen);
  }
  const out = [rule('retro', 'retroBytes', overlay <= maxBytes, overlay, `<= ${maxBytes}`, `the retrofit overlay is ${overlay} bytes (at most ${maxBytes})`)];
  if (classes) {
    const used = new Set([...s.slice(i).matchAll(/class="([^"]*)"/g)].flatMap(m => m[1].split(/\s+/)).filter(c => /^(sr-|x-sr)/.test(c)));
    const missing = [...used].filter(c => !classes.has(c));
    out.push(rule('retro', 'retroClasses', !missing.length, missing.length, 'every sr-* class defined', `retrofit classes with no css: ${missing.join(', ')} (src/styles/76-scene.css)`));
  }
  return out;
}
/**
 * The tier of a registry entry (15.3): 'gold' (composed, passes the whole composed profile, perf included when measured), 'composed'
 * (composed, failing a bar or perf rule), 'upgrading' (a legacy scene with a DRAFT upgrade), 'rich' (the hand-drawn Yateley and Fleet
 * views), 'legacy' (every other full scene). Small items are not scenes: null.
 */
export function standardOf(entry, lint, perf) {
  const it = (entry && entry.item) || entry || {};
  if (!(entry && entry.full != null ? entry.full : it.full)) return null;
  if (it.composed) { const ok = lint ? (lint.pass != null ? lint.pass : !(lint.failures || []).length) : false; const perfOk = !perf || perf.skipped || perf.pass !== false; return ok && perfOk ? 'gold' : 'composed'; }
  if (it.upgrade && it.upgrade.state === 'draft') return 'upgrading';
  if (it.rich) return 'rich';
  return 'legacy';
}
export const TIERS = Object.freeze(['gold', 'composed', 'upgrading', 'rich', 'legacy']);
