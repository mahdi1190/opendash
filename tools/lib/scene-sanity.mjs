// The placement-sanity lint (docs/dev/SCENE_ENGINE_V2.md 15.1; builder D). Node >= 20, no dependencies, no I/O.
//
// The v1 lint measures RICHNESS (the bar); this measures SANITY: a car on grass, a canal drawn as a lake, ghost trees, floating
// objects, the wrong scale, too much haze, a cluttered window, a landmark hidden behind trees. It reads the COMPILED scene:
//   - v2 scenes (C.v === 2): the ground placements are exact (C.problems from A's compile: refused, snapped, view, viewSync; each
//     item's g.surf and C.surfaces kinds; the camera C.cam);
//   - v1 scenes and pixel placements: the same facts are INFERRED. A placement's anchor is hit-tested against the scene's own ground
//     and water paths (C.ground / C.water, in draw order); the fill's palette SLOT gives the kind (SLOT_KINDS); the camera is fitted
//     to the depth ladder (eye = 1.72 * (900 - horizon) / 132, the view's horizon and fov).
//
//   sanityRules(C, data, { E, thresholds, item, strict, v1 }) -> [Rule]   the group 'sanity', in the v1 rule format
//       Rule = { group: 'sanity', rule, ok, value, limit, message, warn?, sev, offenders: [{ i, place, obj, at, msg, fix }] }
//       A WARNING is ok with its text in `warn` (the v1 convention); an ERROR is ok false. strict (--strict-placement): every warning
//       is a failure. v1 scenes (not migrated): every finding is a warning unless strict (14.1: GOLD is kept until the pack migrates).
//   sanityFacts(C, data, { E }) -> { cam, items: [{ i, o, cls, x, y, layer, place, d, gx, kind, slot, surf, floating, hReal, hImplied, ... }] }
//   SLOT_KINDS, slotKind(slot) -> 'drive' | 'walk-hard' | 'walk' | 'soft' | 'water' | 'beach' | 'rail' | null (unknown: not judged)
//   slotOfPaint(paint) -> the first '@slot' of a ground fill (a string or a gradient's stops)
//   inferCamera(C, data) -> { eye, fov, horizon, x0, f, inferred }   (C.cam for v2)
//   classOf(def, E) -> the class of an object (A's sceneObjClass when loaded, else from the category, role and tags; V2 4.3)
//   pathContains(d, x, y) -> boolean   (SVG path data, non-zero fill, curves flattened; memoised per path)
//   SANITY_DEFAULTS                     the designed thresholds (tools/anim-quality.json composed.sanity overrides them)
import { scenePathBox } from './scene-svg.mjs';

export const SANITY_DEFAULTS = Object.freeze({
  designed: true,
  scale: { range: [0.7, 1.45], people: [0.85, 1.2] },
  scalePairs: { ratio: 1.3, within: 40 },
  landmarkOccluded: { max: 0.3, weights: { building: 1, structure: 0.9, landmark: 1, tree: 0.75, shrub: 0.6, cover: 0.6, person: 0.5, cyclist: 0.5, car: 0.9, bus: 0.9, tram: 0.9, train: 0.9, boat: 0.8, street: 0.4, rail: 0.6, rock: 0.9 } },
  ghost: { haze: 0.4, tall: 0.25, opacity: 0.7, area: 0.3 },
  stamp: { n: 4, tol: 0.05 },
  haze: { v2Mean: 0.12, v1Layer: 0.45, v1Mean: 0.25 },
  clutter: { n: 9, window: [400, 300], overlap: 0.5, salient: 40 },
  floating: { tol: 3 },
  view: { near: 30 },
});
/** The severity of each rule: [default, strict] (15.1). */
export const SANITY_SEV = Object.freeze({
  vehicleSurface: ['error', 'error'], boatSurface: ['error', 'error'], floating: ['error', 'error'], refused: ['error', 'error'],
  personSurface: ['warn', 'error'], plantSurface: ['warn', 'error'], snapped: ['warn', 'error'], scale: ['warn', 'error'], scalePairs: ['warn', 'error'],
  landmarkOccluded: ['warn', 'error'], ghost: ['warn', 'error'], stamp: ['warn', 'error'], haze: ['warn', 'error'], clutter: ['warn', 'error'],
  view: ['warn', 'warn'], viewSync: ['warn', 'error'],
});
const RULE_ORDER = Object.keys(SANITY_SEV);

/* ---------------------------------------------------------------------------------------------
   Surfaces of a v1 scene: the palette slot of a ground fill gives its kind
   --------------------------------------------------------------------------------------------- */
/** Slot words -> what can stand there (V2 15.1, plus cobble, quay, cinder, pasture, furrow, downs, marsh, reed from the corpus). */
export const SLOT_KINDS = Object.freeze({
  drive: ['road', 'tarmac', 'asphalt', 'street', 'lane'],
  'walk-hard': ['pave', 'kerb', 'plaza', 'square', 'platform', 'flag', 'sett', 'cobble', 'quay'],
  walk: ['path', 'gravel', 'towpath', 'track', 'cinder'],
  soft: ['grass', 'lawn', 'green', 'meadow', 'field', 'heath', 'bank', 'verge', 'turf', 'moss', 'pasture', 'furrow', 'downs', 'marsh', 'reed'],
  water: ['water', 'canal', 'river', 'lake', 'pond', 'sea', 'dock'],
  beach: ['sand', 'beach', 'shingle'],
  rail: ['rail', 'ballast', 'sleeper'],
});
const _slotMemo = new Map();
/**
 * The kind of a palette slot, by its HEAD word: of the keywords found in the slot (case-insensitive), the one that occurs LAST
 * wins (the head of an English compound: riverbank -> bank, parkingTarmac -> tarmac, towpath -> path), then the longest. null:
 * unknown, not judged (ground, far, hills, stone ...).
 */
export function slotKind(slot) {
  if (!slot) return null;
  const s = String(slot).toLowerCase();
  if (_slotMemo.has(s)) return _slotMemo.get(s);
  let best = null;
  for (const [kind, words] of Object.entries(SLOT_KINDS)) for (const w of words) {
    const at = s.lastIndexOf(w);
    if (at < 0) continue;
    if (!best || at > best.at || (at === best.at && w.length > best.w.length)) best = { at, w, kind };
  }
  const k = best ? best.kind : null;
  _slotMemo.set(s, k);
  return k;
}
/** The first '@slot' of a paint ('@road', '@road.1', or a gradient whose stops name slots). */
export function slotOfPaint(p) {
  if (!p) return null;
  if (typeof p === 'string') { const m = /^@([a-zA-Z0-9_-]+)/.exec(p); return m ? m[1] : null; }
  for (const st of (p.lin || p.rad || [])) { const m = /^@([a-zA-Z0-9_-]+)/.exec(String(st[1] || '')); if (m) return m[1]; }
  return null;
}
/** v2 surface kinds (V2 3.1) -> the v1 inference kinds. */
const V2_KIND = { road: 'drive', parking: 'drive', driveway: 'drive', tramway: 'drive', track: 'walk', pavement: 'walk-hard', plaza: 'walk-hard', platform: 'walk-hard', steps: 'walk-hard',
  bridge: 'walk-hard', path: 'walk', towpath: 'walk', cycleway: 'walk-hard', rail: 'rail', grass: 'soft', lawn: 'soft', park: 'soft', verge: 'soft', field: 'soft', meadow: 'soft', heath: 'soft',
  wood: 'soft', garden: 'soft', bank: 'soft', reedbed: 'soft', beach: 'beach', sand: 'beach', shingle: 'beach', rock: 'soft', mud: 'beach', edge: 'walk-hard', rooftop: 'walk-hard', plot: 'soft', water: 'water', puddle: 'walk-hard' };

/* ---------------------------------------------------------------------------------------------
   SVG paths: flatten and hit-test (non-zero, as the canvas fills)
   --------------------------------------------------------------------------------------------- */
const _polyMemo = new Map();
/** The subpaths of SVG path data as polygons (curves sampled, arcs converted), memoised per string. */
export function pathPolys(d) {
  const key = String(d || '');
  if (_polyMemo.has(key)) return _polyMemo.get(key);
  const tok = key.match(/[MLHVCSQTAZmlhvcsqtaz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || [];
  const polys = [];
  let cur = null, cx = 0, cy = 0, sx = 0, sy = 0, cmd = 'M', i = 0, lcx = 0, lcy = 0, lq = null;
  const N = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
  const lineTo = (x, y) => { if (!cur) { cur = [[cx, cy]]; polys.push(cur); } cur.push([x, y]); cx = x; cy = y; };
  const cubic = (x1, y1, x2, y2, x, y) => { const x0 = cx, y0 = cy; for (let k = 1; k <= 8; k++) { const t = k / 8, u = 1 - t; lineTo(u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x, u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y); } };
  const quad = (x1, y1, x, y) => { const x0 = cx, y0 = cy; for (let k = 1; k <= 6; k++) { const t = k / 6, u = 1 - t; lineTo(u * u * x0 + 2 * u * t * x1 + t * t * x, u * u * y0 + 2 * u * t * y1 + t * t * y); } };
  const arc = (rx, ry, phi, fa, fs, x, y) => {
    const x1 = cx, y1 = cy;
    if (!rx || !ry) { lineTo(x, y); return; }
    rx = Math.abs(rx); ry = Math.abs(ry);
    const p = phi * Math.PI / 180, cp = Math.cos(p), sp = Math.sin(p), dx = (x1 - x) / 2, dy = (y1 - y) / 2;
    const x1p = cp * dx + sp * dy, y1p = -sp * dx + cp * dy;
    const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
    const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p, den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
    const co = (fa === fs ? -1 : 1) * Math.sqrt(Math.max(0, num / (den || 1)));
    const cxp = co * rx * y1p / ry, cyp = -co * ry * x1p / rx, ccx = cp * cxp - sp * cyp + (x1 + x) / 2, ccy = sp * cxp + cp * cyp + (y1 + y) / 2;
    const ang = (ux, uy, vx, vy) => { const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
    const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
    const n = Math.max(4, Math.ceil(Math.abs(dt) / (Math.PI / 8)));
    for (let k = 1; k <= n; k++) { const t = t1 + dt * k / n; lineTo(ccx + rx * Math.cos(t) * cp - ry * Math.sin(t) * sp, ccy + rx * Math.cos(t) * sp + ry * Math.sin(t) * cp); }
    cx = x; cy = y;
  };
  while (i < tok.length) {
    if (/[A-Za-z]/.test(tok[i])) { cmd = tok[i++]; if (cmd === 'Z' || cmd === 'z') { if (cur) cur.push([sx, sy]); cx = sx; cy = sy; cur = null; lq = null; continue; } }
    const U = cmd.toUpperCase(), rel = cmd !== U, n = N[U];
    if (!n || i + n > tok.length) break;
    const a = tok.slice(i, i + n).map(Number); i += n;
    const ox = rel ? cx : 0, oy = rel ? cy : 0;
    let q = null;
    if (U === 'M') { cur = [[ox + a[0], oy + a[1]]]; polys.push(cur); cx = sx = ox + a[0]; cy = sy = oy + a[1]; cmd = rel ? 'l' : 'L'; }
    else if (U === 'L') lineTo(ox + a[0], oy + a[1]);
    else if (U === 'H') lineTo(ox + a[0], cy);
    else if (U === 'V') lineTo(cx, oy + a[0]);
    else if (U === 'C') { cubic(ox + a[0], oy + a[1], ox + a[2], oy + a[3], ox + a[4], oy + a[5]); lcx = ox + a[2]; lcy = oy + a[3]; }
    else if (U === 'S') { const rx1 = 2 * cx - lcx, ry1 = 2 * cy - lcy; cubic(rx1, ry1, ox + a[0], oy + a[1], ox + a[2], oy + a[3]); lcx = ox + a[0]; lcy = oy + a[1]; }
    else if (U === 'Q') { q = [ox + a[0], oy + a[1]]; quad(q[0], q[1], ox + a[2], oy + a[3]); }
    else if (U === 'T') { q = lq ? [2 * cx - lq[0], 2 * cy - lq[1]] : [cx, cy]; quad(q[0], q[1], ox + a[0], oy + a[1]); }
    else if (U === 'A') arc(a[0], a[1], a[2], a[3], a[4], ox + a[5], oy + a[6]);
    if (U !== 'C' && U !== 'S') { lcx = cx; lcy = cy; }
    lq = q;
  }
  const out = polys.filter(p => p.length >= 3);
  if (_polyMemo.size > 20000) _polyMemo.clear();
  _polyMemo.set(key, out);
  return out;
}
/** Is (x, y) inside the path (non-zero winding over every subpath, as a canvas fill)? */
export function pathContains(d, x, y) {
  let wn = 0;
  for (const poly of pathPolys(d)) {
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [x0, y0] = poly[j], [x1, y1] = poly[i];
      if (y0 <= y) { if (y1 > y && (x1 - x0) * (y - y0) - (x - x0) * (y1 - y0) > 0) wn++; }
      else if (y1 <= y && (x1 - x0) * (y - y0) - (x - x0) * (y1 - y0) < 0) wn--;
    }
  }
  return wn !== 0;
}

/* ---------------------------------------------------------------------------------------------
   Classes and real sizes (A's tables when loaded)
   --------------------------------------------------------------------------------------------- */
const tagsOf = (d) => (d && d.tags) || [];
/** The class of an object (V2 4.3): A's sceneObjClass when the engine has it, else from the category, role and tags. */
export function classOf(def, E) {
  if (!def) return null;
  if (E && typeof E.objClass === 'function') { try { const c = E.objClass(def.id); if (c) return c; } catch { /* fall through */ } }
  const t = tagsOf(def), has = (...w) => w.some(x => t.includes(x)), cls = t.find(x => x.startsWith('class:'));
  if (cls) return cls.slice(6);
  const anim = def.anim ? Object.keys(def.anim) : [];
  switch (def.category) {
    case 'vehicle': return has('role:sky', 'aircraft', 'sky', 'paraglider') ? 'air' : has('tram', 'light-rail') ? 'tram' : has('bus') ? 'bus' : has('train', 'railway') ? 'train' : has('tractor') ? 'tractor' : has('bike', 'cyclist') ? 'bike' : 'car';
    case 'rail': return has('role:vehicle') || has('train') ? 'train' : 'rail';
    case 'boat': return 'boat';
    case 'person': return has('kayak', 'rowing', 'rower', 'paddleboard', 'sailing', 'sailor', 'boat') ? 'boat' : has('cyclist', 'bike') ? 'cyclist' : 'person';
    case 'animal': return has('insect', 'butterfly', 'bee', 'dragonfly', 'damselfly') ? 'air' : has('fish', 'trout') ? 'bird-water' : has('dog') ? 'animal-dog' : has('grazing', 'sheep', 'cattle', 'pony', 'horse', 'deer', 'donkey') ? 'animal-graze' : 'animal';
    case 'bird': return has('water', 'duck', 'swan', 'goose', 'mallard', 'coot', 'moorhen', 'heron', 'egret') ? 'bird-water' : (anim.includes('flap') || has('flying', 'soaring', 'flight')) ? 'bird-air' : 'bird-ground';
    case 'tree': return 'tree';
    case 'plant': return has('role:ground') && !has('hedge', 'shrub', 'gorse', 'bush') ? 'cover' : 'shrub';
    case 'ground': return 'cover';
    case 'rock': return 'rock';
    case 'building': return 'building';
    case 'structure': return 'structure';
    case 'landmark': return 'landmark';
    case 'street': case 'prop': return 'street';
    case 'water': return 'float';
    case 'sky': return 'air';
    default: return null;
  }
}
const REAL_CLASS = { person: 1.72, cyclist: 1.75, car: 1.5, bus: 4.4, tram: 3.4, train: 3.8, tractor: 2.9, boat: 2, 'animal-graze': 1.2, 'animal-dog': 0.55, animal: 0.8, 'bird-water': 0.4 };
/** The real height of an object in metres and where it came from ('def' | 'table' | 'class'); null when nothing is known. */
function realOf(def, cls, E) {
  if (!def) return null;
  if (E && typeof E.real === 'function') { try { const r = E.real(def.id); if (r && r.h > 0) return { h: r.h, src: r.src || 'table' }; } catch { /* fall through */ } }
  if (def.real && def.real.h > 0) return { h: def.real.h, src: 'def' };
  if (E && typeof E.flowReal === 'function' && ['person', 'cyclist', 'car', 'bus', 'tram', 'train', 'tractor', 'boat', 'animal-graze', 'animal-dog', 'animal'].includes(cls)) { try { const r = E.flowReal(def.id); if (r && r.h > 0) return { h: r.h, src: 'class' }; } catch { /* fall through */ } }
  return REAL_CLASS[cls] ? { h: REAL_CLASS[cls], src: 'class' } : null;
}
/** Which inferred kinds a class may stand on (V2 4.4, in the v1 inference's terms). null: every kind (or not judged). */
const CLASS_KINDS = {
  car: ['drive'], bus: ['drive'], tram: ['drive', 'rail'], train: ['rail'], bike: ['drive', 'walk', 'walk-hard'], cyclist: ['drive', 'walk', 'walk-hard'], tractor: ['soft', 'walk', 'drive'],
  boat: ['water'], person: ['walk-hard', 'walk', 'soft', 'beach'], 'animal-graze': ['soft', 'walk'], 'animal-dog': ['walk-hard', 'walk', 'soft', 'beach'],
  tree: ['soft'], shrub: ['soft', 'walk'], cover: ['soft', 'walk', 'beach'],
};

/* ---------------------------------------------------------------------------------------------
   The camera (v2: C.cam; v1: fitted to the depth ladder)
   --------------------------------------------------------------------------------------------- */
export function inferCamera(C, data) {
  if (C && C.cam && C.cam.f) return Object.assign({ inferred: false }, C.cam);
  const v = (C && C.view) || (data && data.view) || {};
  const horizon = Number.isFinite(v.horizon) ? v.horizon : 560, fov = Number.isFinite(v.fov) ? v.fov : 80;
  const eye = 1.72 * (900 - horizon) / 132, f = 800 / Math.tan(fov * Math.PI / 360);
  return { eye, fov, horizon, x0: 800, f, inferred: true };
}
/** The core's sceneHash (FNV-1a 32), for the compile's default placement seeds. */
const fnv = (str) => { let h = 2166136261; const t = String(str); for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
/** Ground depth (metres) of a screen row, or null on or above the horizon. */
const depthOf = (cam, y) => (y - cam.horizon > 2 ? cam.f * cam.eye / (y - cam.horizon) : null);

/* ---------------------------------------------------------------------------------------------
   Facts per placement
   --------------------------------------------------------------------------------------------- */
const r2 = (v) => Math.round(v * 100) / 100, r1 = (v) => Math.round(v * 10) / 10;
function objFactsOf(E) {
  if (E._sanityFacts) return E._sanityFacts;
  const defs = new Map(), shapes = new Map();
  const def = (id) => { if (!defs.has(id)) { let d = null; try { d = E.obj(id) || null; } catch { d = null; } defs.set(id, d); } return defs.get(id); };
  const sh = (id, v, season) => { const k = id + '|' + v + '|' + season; if (!shapes.has(k)) { let R = null; try { R = E.shapes(id, v, season); } catch { R = null; } shapes.set(k, R); } return shapes.get(k); };
  E._sanityFacts = { def, sh };
  return E._sanityFacts;
}
/** The screen box of an item (its resolved box, scaled and flipped). */
function itemBox(it, R) {
  const b = (R && R.box) || [-20, -40, 20, 2], s = it.s || 1;
  return it.flip ? [it.x - b[2] * s, it.y + b[1] * s, it.x - b[0] * s, it.y + b[3] * s] : [it.x + b[0] * s, it.y + b[1] * s, it.x + b[2] * s, it.y + b[3] * s];
}
/**
 * The kind under a screen point of a v1 compiled scene: the ground and water paths of the item's own layer and the farther ones
 * (what is drawn before it: the last one that contains the anchor wins, water over ground); when none does, the nearest of the
 * nearer layers (its foot is then hidden by nearer ground). grounded: some path contains it (else it stands in the sky).
 * (V2 15.1 words it as "its own layer and nearer layers"; the nearer ground only HIDES the foot of a tree whose own band ends
 * below it, so the surface it stands on is the one drawn under it.)
 */
function surfaceAtV1(C, data, x, y, layer, tol) {
  y = Math.min(y, 899.5);   // an anchor on the bottom edge stands on the band that runs to the edge
  const groundSrc = (data && data.ground) || [], waterSrc = (data && data.water) || [];
  const entries = [];
  (C.ground || []).forEach((g, gi) => entries.push({ layer: g.layer, ord: 0, gi, d: g.d, kind: g.surf && C.surfaces ? (V2_KIND[(C.surfaces.find(s => s.id === g.surf) || {}).kind] || null) : slotKind(slotOfPaint(groundSrc[gi] && groundSrc[gi].fill)), slot: slotOfPaint(groundSrc[gi] && groundSrc[gi].fill) || g.surf || null }));
  (C.water || []).forEach((w, wi) => entries.push({ layer: w.layer, ord: 1, gi: wi, d: w.d, kind: 'water', slot: 'water' }));
  entries.sort((a, b) => a.layer - b.layer || a.ord - b.ord || a.gi - b.gi);
  const hit = (e) => pathContains(e.d, x, y) || (tol && pathContains(e.d, x, y + tol));
  let under = null, over = null;
  for (const e of entries) { if (!hit(e)) continue; if (e.layer <= layer) under = e; else if (!over) over = e; }
  return { surf: under || over, grounded: !!(under || over), own: !!under };
}
/**
 * The facts the rules judge, per compiled item (and per data.place index when it comes from a hand placement): its class, anchor,
 * layer, inferred ground position, the kind it stands on, whether it floats, its real and implied height.
 */
export function sanityFacts(C, data, { E, thresholds = {} } = {}) {
  const F = objFactsOf(E), S = Object.assign({}, SANITY_DEFAULTS, (thresholds.composed && thresholds.composed.sanity) || {});
  const cam = inferCamera(C, data), v2 = C.v === 2, items = C.items || [];
  // which data.place entry an item comes from: a pixel placement by (object, x, y); a ground placement (v2) by its seed (its own, or
  // the compile's default sceneHash(id | p | i) % 1e6) and its object (or one of that object's views: vehicle.car -> vehicle.car-front)
  const place = (data && data.place) || [], placeIdx = new Map(), bySeed = new Map();
  place.forEach((p, i) => {
    if (!p || p.obj == null) return;
    if (Number.isFinite(p.x) && Number.isFinite(p.y)) placeIdx.set(p.obj + '|' + Math.round(p.x) + '|' + Math.round(p.y), i);
    bySeed.set(p.seed != null ? p.seed : fnv((data && data.id) + '|p|' + i) % 1e6, i);
  });
  const fromSeed = (it) => { const i = bySeed.get(it.seed); if (i == null) return -1; const o = place[i].obj; return it.o === o || String(it.o).startsWith(o + '-') ? i : -1; };
  const layers = C.layers || [], horizonLayer = layers.length ? 0 : -1, frontLayer = layers.findIndex(l => l.id === 'front');
  const surfKind = new Map((C.surfaces || []).map(s => [s.id, s.kind]));
  const out = [];
  items.forEach((it, i) => {
    const def = F.def(it.o);
    if (!def) return;
    const cls = classOf(def, E), R = F.sh(it.o, it.v, it.season || C.season);
    const pk = it.o + '|' + Math.round(it.x) + '|' + Math.round(it.y);
    const pi = it.place != null ? it.place : it.cover ? -1 : placeIdx.has(pk) ? placeIdx.get(pk) : it.g ? fromSeed(it) : -1;
    const src = pi >= 0 ? place[pi] : null, pin = !!(src && src.pin) || !!it.pin;
    const f = { i, o: it.o, v: it.v, cls, def, R, x: it.x, y: it.y, s: it.s, layer: it.layer, place: pi, pin, flip: !!it.flip, haze: it.haze, tint: it.tint, box: itemBox(it, R), ground: !!it.g, strip: it.strip >= 0 };
    f.h = R && R.box ? (R.box[3] - R.box[1]) * (it.s || 1) : (def.size ? def.size[1] * (it.s || 1) : 0);
    // the ground position: exact (v2 ground placements), else inferred from the camera
    if (it.g && Number.isFinite(it.g.d)) { f.d = it.g.d; f.gx = it.g.x; f.surfId = it.g.surf || null; f.kind = f.surfId && surfKind.has(f.surfId) ? V2_KIND[surfKind.get(f.surfId)] || null : null; f.v2kind = surfKind.get(f.surfId) || null; f.snapped = it.g.snapped || 0; f.grounded = true; }
    else {
      f.d = Number.isFinite(it.dz) ? it.dz : depthOf(cam, it.y);
      f.gx = f.d != null ? (it.x - cam.x0) * f.d / cam.f : null;
      const sv = surfaceAtV1(C, data, it.x, it.y, it.layer, S.floating.tol);
      f.kind = sv.surf ? sv.surf.kind : null; f.slot = sv.surf ? sv.surf.slot : null; f.grounded = sv.grounded;
    }
    const real = realOf(def, cls, E);
    if (real) { f.hReal = real.h; f.realSrc = real.src; if (f.d != null && def.size) f.hImplied = r2((it.s || 1) * def.size[1] * f.d / cam.f); }
    f.cover = !!it.cover;   // A's seasonal ground cover (10): generated on allowed surfaces, judged as a whole, not one by one
    f.exempt = pin || f.cover || cls === 'air' || cls === 'bird-air' || cls === 'float' || it.layer === frontLayer || it.layer === horizonLayer && !v2 || it.y > 905 || it.x < -170 || it.x > 1770;
    out.push(f);
  });
  return { cam, items: out, v2 };
}

/* ---------------------------------------------------------------------------------------------
   The rules
   --------------------------------------------------------------------------------------------- */
const where = (f) => (f.ground && f.gx != null ? `at x ${r1(f.gx)} m, d ${r1(f.d)} m` : `at x ${Math.round(f.x)} y ${Math.round(f.y)}`);
const who = (f) => (f.place >= 0 ? `place[${f.place}]` : `item ${f.i}`) + ` ${f.o}`;
/** One offender: { i, place, obj, at, msg, fix }. */
const off = (f, msg, fix) => ({ i: f.i, place: f.place, obj: f.o, at: f.ground ? [r1(f.gx), r1(f.d)] : [Math.round(f.x), Math.round(f.y)], msg: `${who(f)} ${msg} ${where(f)}`, fix });
/** Overlap of two boxes (area). */
const inter = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));

/**
 * The sanity rules of one compiled scene. opts: { E, thresholds, item, strict, v1 (force the v1 leniency), L }.
 * Every rule is reported (PASS with its value, or WARN / FAIL with up to 6 offenders, each with its fix).
 */
export function sanityRules(C, data, { E, thresholds = {}, strict = false, v1 = null } = {}) {
  const S = Object.assign({}, SANITY_DEFAULTS, (thresholds.composed && thresholds.composed.sanity) || {});
  const facts = sanityFacts(C, data, { E, thresholds });
  const lenient = v1 != null ? !!v1 : !facts.v2;   // v1 scenes: findings are warnings until the pack migrates (V2 14.1)
  const found = Object.fromEntries(RULE_ORDER.map(r => [r, []])), values = {};
  const items = facts.items, cam = facts.cam, problems = Array.isArray(C.problems) ? C.problems : [];
  const isP = (f) => f.cls === 'person' || f.cls === 'cyclist';
  const slotNote = (f) => (f.slot ? ` (slot @${f.slot})` : f.v2kind ? ` (${f.v2kind})` : '');

  // surfaces: vehicles, boats, people, plants
  for (const f of items) {
    if (f.exempt || !f.kind) continue;
    const allowed = CLASS_KINDS[f.cls];
    if (['car', 'bus', 'tram', 'train', 'bike', 'tractor'].includes(f.cls) && allowed && !allowed.includes(f.kind)) {
      const on = f.cls === 'train' ? 'rail' : f.cls === 'tractor' ? 'field' : 'road';
      found.vehicleSurface.push(off(f, `stands on ${f.kind === 'soft' ? 'grass' : f.kind}${slotNote(f)}`, `move it onto the ${on} (on: '${on}'), or run scene migrate`));
    }
    if (f.cls === 'boat' && f.kind !== 'water' && !(tagsOf(f.def).includes('beached') && ['beach', 'soft'].includes(f.kind)))
      found.boatSurface.push(off(f, `is a boat off the water (${f.kind}${slotNote(f)})`, `put it on the water (on: '<water id>'), or tag it beached on a beach`));
    if (isP(f) && (f.kind === 'water' || f.kind === 'rail' || (f.kind === 'drive' && f.cls === 'person' && !(f.v2kind === 'road' && f.def && (C.surfaces || []).some(s => s.id === f.surfId && s.crossing)))))
      found.personSurface.push(off(f, `stands on ${f.kind === 'drive' ? 'the road' : f.kind}${slotNote(f)}`, f.kind === 'drive' ? 'move it onto the pavement, or put a crossing there (crossing: true) / cross: true' : 'move it onto walkable ground'));
    if (['tree', 'shrub', 'cover'].includes(f.cls)) {
      const t = tagsOf(f.def), edge = t.includes('role:edge') || t.includes('reed'), urban = t.includes('planter') || t.includes('pot') || (f.cls !== 'tree' && t.includes('kit:urban'));
      const src = f.place >= 0 && data && data.place ? data.place[f.place] : null, pit = !!(src && src.pit);
      const bad = f.kind === 'drive' || f.kind === 'rail' || (f.kind === 'walk-hard' && !pit && !urban) || (f.kind === 'water' && !edge);
      if (bad) found.plantSurface.push(off(f, `grows on ${f.kind === 'drive' ? 'the road' : f.kind}${slotNote(f)}`, f.kind === 'walk-hard' ? 'move it onto grass, or mark a street tree in a pit (pit: true)' : 'move it onto grass, a verge or a bank'));
    }
  }
  // floating: an anchor on no ground or water at all (in the sky)
  for (const f of items) if (!f.exempt && !f.ground && f.grounded === false && f.y > cam.horizon - 400) found.floating.push(off(f, 'stands on no ground or water (it floats in the sky)', 'move its anchor (the foot) onto the ground, or mark a sky object pin: true'));
  // the compile's own problems (v2): refused, snapped, view, viewSync
  const byRule = (r) => problems.filter(p => p && p.rule === r);
  for (const p of byRule('refused')) found.refused.push({ i: p.i, obj: p.obj, at: p.at, msg: `${p.obj || 'a placement'} (${p.i != null ? 'place[' + p.i + ']' : ''}) was refused: ${p.msg || 'no allowed surface within its snap radius'}`, fix: p.fix || 'move it onto a surface its class may stand on' });
  const SNAP = { person: 2, cyclist: 2, car: 3, bus: 3, tram: 3, boat: 3, 'animal-graze': 3, 'animal-dog': 3, animal: 3, shrub: 3, tree: 4, street: 1.5, building: 6, structure: 6 };
  for (const p of byRule('snapped')) {
    const fi = items.find(f => f.place === p.i) || null, rad = SNAP[(fi && fi.cls) || ''] || 3, m = Number(p.m != null ? p.m : p.dist != null ? p.dist : p.distance != null ? p.distance : (/(\d+(?:\.\d+)?)\s*m\b/.exec(p.msg || '') || [])[1]);
    if (!(m > rad * 0.5)) continue;
    found.snapped.push({ i: p.i, obj: p.obj, at: p.at, msg: `place[${p.i}] ${p.obj || ''} was moved ${r1(m)} m to an allowed surface${p.msg ? ': ' + p.msg : ''}`, fix: p.fix || `place it where it stands (within ${r1(rad * 0.5)} m)` });
  }
  for (const p of byRule('view')) if (!(p.d > S.view.near)) found.view.push({ i: p.i, obj: p.obj, at: p.at, msg: p.msg || `${p.obj} is drawn side on where its lane runs along the sightline`, fix: p.fix || 'add its front and rear views (70-scene-lib-vehicles-views.js), or turn the lane across the view' });
  for (const p of byRule('viewSync')) found.viewSync.push({ i: -1, obj: null, at: null, msg: p.msg || 'the camera and the view disagree', fix: p.fix || 'drop view.horizon / fov / heading: the camera fills them' });
  // flows: a vehicle lane nearer than 30 m that runs along the sightline, while the object has no front or rear view
  for (const flow of C.flows || []) {
    if (!['drive', 'tram', 'train', 'cycle', 'boat'].includes(flow.kind)) continue;
    const missing = Object.keys(flow.mix || {}).filter(o => !(typeof E.objViews === 'function' && E.objViews(o)));
    if (!missing.length) continue;
    let hit = null;
    for (const ln of flow.lanes || []) for (let k = 1; k < ln.path.length && !hit; k++) {
      const a = ln.path[k - 1], b = ln.path[k], d = (a[1] + b[1]) / 2;
      if (d > S.view.near) continue;
      const tx = b[0] - a[0], td = b[1] - a[1], l = Math.hypot(tx, td) || 1, x = (a[0] + b[0]) / 2, rl = Math.hypot(x, d) || 1;
      const across = Math.acos(Math.min(1, Math.abs((tx * x + td * d) / (l * rl)))) * 180 / Math.PI;
      if (across < 55) hit = { d, x };
    }
    if (hit) found.view.push({ i: -1, obj: missing[0], at: [r1(hit.x), r1(hit.d)], msg: `flow ${flow.id}: ${missing.join(', ')} drawn side on at d ${r1(hit.d)} m where the lane runs along the sightline`, fix: 'give the object front and rear views (SCENE_OBJ_VIEWS / views), or start the lane beyond 30 m' });
  }

  // scale: the implied real height against the object's real height
  const scaleBy = new Map();
  for (const f of items) {
    const movers = ['person', 'cyclist', 'car', 'bus', 'tram', 'train', 'boat', 'animal-graze', 'animal-dog', 'animal'];
    if (f.exempt || f.hImplied == null || !f.hReal || f.d == null || f.y - cam.horizon < 6) continue;
    if ((!facts.v2 || f.realSrc === 'class') && !movers.includes(f.cls)) continue;   // v1 (an inferred camera) and class guesses: the movers only
    const ratio = r2(f.hImplied / f.hReal), [lo, hi] = isP(f) ? S.scale.people : S.scale.range;
    if (ratio >= lo && ratio <= hi) continue;
    if (f.place >= 0) { found.scale.push(Object.assign(off(f, `is drawn ${f.hImplied} m tall at ${r1(f.d)} m (real ${f.hReal} m: x ${ratio})`, f.ground ? `set k nearer 1 (k ${ratio})` : `scale it to the depth (s about ${r2((f.s || 1) / ratio)}), or convert it to a ground placement (scene migrate)`), { ratio })); continue; }
    const g = scaleBy.get(f.o) || { f, n: 0, lo: Infinity, hi: -Infinity };
    g.n++; g.lo = Math.min(g.lo, ratio); g.hi = Math.max(g.hi, ratio); scaleBy.set(f.o, g);
  }
  for (const [o, g] of scaleBy) found.scale.push(Object.assign(off(g.f, `and ${g.n - 1} more scattered ${o} are drawn at x ${g.lo} to x ${g.hi} of their real height`, 'give the scatter rule k within 0.7 to 1.45 (the depth sizes them), or real: { h } on the object if its real size is wrong'), { ratio: g.hi, n: g.n }));
  // scale pairs: two people (or two cars) near one baseline whose heights disagree beyond perspective
  // the expected height at a row: v2 (a true camera) in proportion to the depth below the horizon; v1 the depth ladder (16 at the
  // horizon, 132 at the foot of the frame), so the perspective between two rows is never counted against them
  const expect = (y) => (facts.v2 ? y - cam.horizon : 16 + 116 * (y - cam.horizon) / Math.max(1, 900 - cam.horizon));
  for (const group of [['person', 'cyclist'], ['car']]) {
    const g = items.filter(f => !f.exempt && group.includes(f.cls) && f.y - cam.horizon > 6 && f.h > 0 && f.def && f.def.size);
    const flagged = new Set();
    for (let a = 0; a < g.length; a++) for (let b = a + 1; b < g.length; b++) {
      if (Math.abs(g[a].y - g[b].y) > S.scalePairs.within) continue;
      // the object's nominal height (size[1] x s: what stands for the real height), not its box (a raised arm, a dog)
      const na = g[a].def.size[1] * g[a].s / expect(g[a].y), nb = g[b].def.size[1] * g[b].s / expect(g[b].y), ratio = r2(Math.max(na, nb) / Math.min(na, nb));
      if (ratio <= S.scalePairs.ratio) continue;
      const big = na > nb ? g[a] : g[b], small = na > nb ? g[b] : g[a];
      if (flagged.has(big.i)) continue;
      flagged.add(big.i);
      found.scalePairs.push(Object.assign(off(big, `is ${ratio} x the size of ${who(small)} on the same baseline`, 'size both by the depth (the ladder, or ground placements)'), { ratio }));
    }
  }
  // landmark occluded: the share of a landmark's box covered by nearer placements (1/8 resolution, weighted by class)
  const W = S.landmarkOccluded.weights || {};
  for (const L of items.filter(f => f.def && (f.def.category === 'landmark' || tagsOf(f.def).includes('landmark') || tagsOf(f.def).includes('signature')))) {
    const b = L.box, cell = 8, nx = Math.max(1, Math.ceil((b[2] - b[0]) / cell)), ny = Math.max(1, Math.ceil((b[3] - b[1]) / cell)), cov = new Float32Array(nx * ny);
    const nearer = items.filter(f => f !== L && (f.layer > L.layer || (f.layer === L.layer && f.i > L.i)) && inter(f.box, b) > 0 && W[f.cls] > 0);
    for (const f of nearer) {
      const w = W[f.cls], x0 = Math.max(0, Math.floor((f.box[0] - b[0]) / cell)), x1 = Math.min(nx, Math.ceil((f.box[2] - b[0]) / cell)), y0 = Math.max(0, Math.floor((f.box[1] - b[1]) / cell)), y1 = Math.min(ny, Math.ceil((f.box[3] - b[1]) / cell));
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) cov[yy * nx + xx] = 1 - (1 - cov[yy * nx + xx]) * (1 - w);
    }
    let sum = 0; for (const c of cov) sum += c;
    const share = r2(sum / cov.length);
    values.landmarkOccluded = Math.max(values.landmarkOccluded || 0, share);
    if (share > S.landmarkOccluded.max) found.landmarkOccluded.push(Object.assign(off(L, `is ${Math.round(share * 100)} % hidden by nearer placements (${nearer.length})`, 'move the trees and buildings in front of it aside, or the landmark to a clear third'), { share }));
  }
  // ghosts: a big or near placement in thick haze; or an object drawn mostly see-through
  const frame = 900, nearBands = new Set((C.layers || []).filter(l => ['near', 'fore'].includes(l.id)).map(l => l.i));
  const seeThrough = new Map();
  for (const f of items) {
    if (f.exempt) continue;
    if (f.haze != null && f.haze >= S.ghost.haze && (f.h >= S.ghost.tall * frame || nearBands.has(f.layer))) found.ghost.push(off(f, `is ${Math.round(f.haze * 100)} % hazed while ${nearBands.has(f.layer) ? 'in the ' + (C.layers[f.layer] || {}).id + ' band' : Math.round(f.h) + ' units tall'}`, 'lower the layer haze (v2: haze comes from the depth), or move it into a farther layer'));
    if (!seeThrough.has(f.o + '|' + f.v)) {
      let area = 0, faint = 0;
      for (const p of (f.R && f.R.order) || []) { if (p === 'lit') continue; for (const sh of f.R.parts[p] || []) { if (sh.glow) continue; const bb = scenePathBox(sh.d, sh.m); if (!bb) continue; const a = Math.max(1, (bb[2] - bb[0]) * (bb[3] - bb[1])); area += a; if ((sh.op == null ? 1 : sh.op) < S.ghost.opacity) faint += a; } }
      seeThrough.set(f.o + '|' + f.v, area ? faint / area : 0);
      if (area && faint / area > S.ghost.area) found.ghost.push(off(f, `is drawn ${Math.round(faint / area * 100)} % see-through (shapes under ${S.ghost.opacity} opacity)`, 'give its main shapes full opacity (soft edges in a few small shapes only)'));
    }
  }
  // stamps: 4+ hand placements of one sprite, one size, evenly spaced on a line (rows tagged 'row' are fine)
  const hand = items.filter(f => f.place >= 0 && !tagsOf(f.def).includes('row'));
  const byKey = new Map();
  for (const f of hand) { const k = f.o + '|' + f.v; if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(f); }
  for (const [, list] of byKey) {
    if (list.length < S.stamp.n) continue;
    const pts = list.slice().sort((a, b) => a.x - b.x || a.y - b.y), tol = S.stamp.tol;
    for (let a = 0; a + S.stamp.n <= pts.length; a++) {
      const w = pts.slice(a, a + S.stamp.n), ss = w.map(f => f.s), steps = [];
      if (Math.max(...ss) / Math.min(...ss) > 1 + tol) continue;
      for (let k = 1; k < w.length; k++) steps.push([w[k].x - w[k - 1].x, w[k].y - w[k - 1].y]);
      const len = steps.map(s => Math.hypot(s[0], s[1])), mean = len.reduce((x, y) => x + y, 0) / len.length;
      if (!(mean > 0) || len.some(l => Math.abs(l - mean) > mean * tol)) continue;
      const ang = steps.map(s => Math.atan2(s[1], s[0]));
      if (ang.some(t => Math.abs(t - ang[0]) > 0.06)) continue;
      found.stamp.push(off(w[0], `and ${w.length - 1} more are one size, evenly spaced on a line (a stamp row)`, 'vary their spacing and sizes, or tag a real row (a fence, a terrace) \'row\'; a scatter rule spaces them naturally'));
      break;
    }
  }
  // haze: too much of it on what is not the horizon (v1: the layer haze; v2: the haze by depth)
  const wx = data && data.weather && typeof data.weather === 'object' ? data.weather.kind : null;
  if (!['fog', 'mist'].includes(wx)) {
    let area = 0, hz = 0, worst = null;
    for (const f of items) {
      const L0 = (C.layers || [])[f.layer];
      if (!L0 || L0.id === 'horizon' || f.layer === 0) continue;
      const a = Math.max(1, (f.box[2] - f.box[0]) * (f.box[3] - f.box[1])), h = f.haze != null ? f.haze : 0;
      area += a; hz += a * h;
    }
    const mean = area ? r2(hz / area) : 0;
    values.haze = mean;
    if (facts.v2) { if (mean > S.haze.v2Mean) found.haze.push({ i: -1, obj: null, at: null, msg: `the placements outside the horizon band are ${Math.round(mean * 100)} % hazed on average`, fix: 'atmos: \'clear\' (or a longer visibility); near things should carry no haze' }); }
    else {
      for (const L0 of C.layers || []) if (L0.i > 0 && L0.id !== 'horizon' && (L0.haze || 0) > S.haze.v1Layer && items.some(f => f.layer === L0.i)) worst = worst && worst.haze > L0.haze ? worst : L0;
      if (worst || mean > S.haze.v1Mean) found.haze.push({ i: -1, obj: null, at: null, msg: worst ? `layer ${worst.id} carries haze ${worst.haze} (more than ${S.haze.v1Layer} away from the horizon)` : `the placements outside the horizon band are ${Math.round(mean * 100)} % hazed on average`, fix: 'lower the layer haze (layers: [{ id, haze }]); migrate to v2 (haze by depth)' });
    }
  }
  // clutter: too many salient things in one window of the lower half, or salient boxes piled on each other
  const SALIENT = new Set(['building', 'structure', 'landmark', 'street', 'rail', 'car', 'bus', 'tram', 'train', 'tractor', 'bike', 'boat', 'person', 'cyclist', 'animal-graze', 'animal-dog', 'animal', 'rock']);
  const sal = items.filter(f => !f.exempt && !f.strip && f.h >= S.clutter.salient && SALIENT.has(f.cls) && f.y >= 450);
  let worstN = 0, worstAt = null;
  const [ww, wh] = S.clutter.window;
  for (let y = 450; y + wh <= 900 + 1; y += 50) for (let x = -100; x + ww <= 1700; x += 50) {
    let n = 0; for (const f of sal) if (f.x >= x && f.x < x + ww && f.y >= y && f.y < y + wh) n++;
    if (n > worstN) { worstN = n; worstAt = [x, y]; }
  }
  values.clutter = worstN;
  if (worstN > S.clutter.n) found.clutter.push({ i: -1, obj: null, at: worstAt, msg: `${worstN} salient placements (at least ${S.clutter.salient} units tall) in the ${ww} x ${wh} window at x ${worstAt[0]} y ${worstAt[1]} (at most ${S.clutter.n})`, fix: 'thin that window: fewer big props, move some into the distance, keep a clear foreground' });
  let ovA = 0, ovI = 0;
  for (let a = 0; a < sal.length; a++) { const A = (sal[a].box[2] - sal[a].box[0]) * (sal[a].box[3] - sal[a].box[1]); ovA += A; let cv = 0; for (let b = 0; b < sal.length; b++) if (a !== b) cv += inter(sal[a].box, sal[b].box); ovI += Math.min(A, cv); }
  const overlap = ovA ? r2(ovI / ovA) : 0;
  values.overlap = overlap;
  if (overlap > S.clutter.overlap && sal.length >= 4) found.clutter.push({ i: -1, obj: null, at: null, msg: `the salient placements overlap ${Math.round(overlap * 100)} % of their area (at most ${Math.round(S.clutter.overlap * 100)} %)`, fix: 'spread the big things out: a pile of overlapping props reads as clutter' });

  // the rules, one per name: PASS, or WARN (ok, the warning text) / FAIL with the offenders
  const out = [];
  for (const r of RULE_ORDER) {
    const list = found[r], [sevD, sevS] = SANITY_SEV[r];
    let sev = strict ? sevS : sevD;
    if (lenient && !strict && sev === 'error') sev = 'warn';
    const n = list.length, val = values[r] != null ? values[r] : n;
    const head = list.slice(0, 6).map(o => `${o.msg}: ${o.fix}`).join('; ') + (n > 6 ? `; ... (${n})` : '');
    const msg = n ? `${r}: ${head}` : '';
    const lim = r === 'landmarkOccluded' ? `<= ${S.landmarkOccluded.max}` : r === 'clutter' ? `<= ${S.clutter.n} per window` : r === 'haze' ? (facts.v2 ? `mean <= ${S.haze.v2Mean}` : `layers <= ${S.haze.v1Layer}`) : 'none';
    const ok = !n || sev !== 'error';
    const rule = { group: 'sanity', rule: r, ok, value: val, limit: lim, message: ok ? '' : msg, sev: n ? sev : 'ok', offenders: list };
    if (n && ok) rule.warn = msg;
    out.push(rule);
  }
  return out;
}
/** A short summary of sanity rules: { errors, warnings, byRule: { rule: n } }. */
export function sanitySummary(rules) {
  const s = { errors: 0, warnings: 0, byRule: {} };
  for (const r of rules || []) if (r.group === 'sanity' && r.offenders && r.offenders.length) { s.byRule[r.rule] = r.offenders.length; if (!r.ok) s.errors += r.offenders.length; else s.warnings += r.offenders.length; }
  return s;
}
