/* ============================================================
   SCENE ENGINE v2 + v3 SYSTEMS: world sense at compile time (package "sense"; docs/dev/WORLD_ENGINE.md 12, ported into v2).
   PURE classic script: constants and functions only, no DOM, nothing runs at load. Loaded by the browser build and by the
   Node registry (tools/lib/anim-sources.mjs SCENE_FILE_RE). Private names: _scx / SCENE_X_SENSE. Every call into another
   module goes through a typeof guard; nothing here calls a world* function (v3 is ported, never called at runtime).

   The user's principle (SCENE_LESSONS G): the engine itself must KNOW what is weird, whatever the scene says, and an author
   error can make a scene plainer, never wrong. The v2 compile places what it is told; this pass, run at the END of
   sceneCompile for v2 data (70-scene-0core.js), looks at every compiled placement, scatter item and pixel placement (pixel
   ones unprojected to ground metres with the scene camera) and applies the knowledge ported from v3:

     sceneXSenseProbe(S, x, d)   -> { x, d, surface, kind, inWater, water, level, waterDist, bankDist, bankDir }: what is at a
                                  ground point (S: a compiled scene C or the compile context G). Adapted from worldPlaceProbe
                                  (79-world-1place.js): waterDist < 0 inside water (how far to the nearest REAL bank: the
                                  frame's cuts and seams between regions are no bank), > 0 on land (how far to water); bankDir
                                  the bank's direction there in degrees (0 = along d, 90 = along x), 0..180.
     sceneXSenseMarginOk(S, x, d, o) -> true | false: is (x, d) in the water margin band (water side within o.in metres of a
                                  bank, land side within o.out of the water)? The scatter clips edge: true rules with it.
     sceneXSense(C, data, o)     -> log: the rules below, logged and (unless report-only) applied to C. o: { x (opt.x), mode }.
     sceneXSenseReport(C, data)  -> log: the same rules in report-only mode, for v1 data too (v1 compiles never change, V2 14.1).
     sceneXSenseNote(it, q, src) the core tells the pass where a compiled item came from (its resolved placement q: pixel, pin,
                                  framing, keep) without touching the compiled form (a WeakMap).
     sceneXSenseMode(o)          -> 'apply' | 'report' | 'off': opt.x.sense, window.__sceneOpts.x.sense, env SCENE_X / SCENE_X_SENSE.

   The rules (each logged { i, obj, action: 'snap' | 'rotate' | 'drop' | 'clip' | 'warn', rule, reason, from, to, by: 'sense' }
   into C.sense and C.problems as rule 'sense<Rule>'):
     senseBoat    a boat's whole footprint (sceneObjReal length x beam, along its drawn heading) lies in water. A pixel boat
                  with more than a quarter of it on land is clearly wrong: snapped to the nearest spot where it is all in water
                  within max(2 m, half its length) (the spiral of _wplSpiral), else dropped; less, or a ground placement (the
                  compile already put it on the water inset by half its beam; only its drawn length can reach a bank, along a
                  heading the sprite merely implies): a warning. Samples beyond the frame's cuts do not count. A moored boat (hull edge
                  within 1.5 m of a bank) lies alongside: parallel to the bank within 20 degrees, its hull 0.2 to 0.5 m off it
                  (warnings: a side-view sprite cannot be turned, and a mooring gap is the author's composition).
     senseFloat   floaters (water birds, lilies, fish rings) are on water at its level: above the level, it is lowered onto
                  it; a lily or ring on land, or a water bird on ground it may not graze (a path, a road) within reach of the
                  water, is snapped into the water; one with no ground at all (in the sky, not pinned) is dropped. A water
                  bird on its bank (grass, beach, mud) within 3 m of the water grazes there: legal (kb's alt.graze).
     senseReed    reeds and reedmace stand in the margin (_wplHabFallback 'margin'): water side up to 2.5 m from the bank,
                  land side up to 1 m from the water or on wet ground (bank, reedbed, mud, marsh). More than 3 m into open
                  water is clearly wrong: snapped back into the margin within reach, else dropped; the rest are warnings.
     senseOrphan  hanging things (boughs, fronds, branches, lamp heads, leads) need a parent in reach (worldKbParentOk: a
                  tree on the same side within its reach; fronds a willow) or a frame edge on their side (a framing bough
                  reaching in off the edge is legal). An orphan is dropped.
     senseGround  trees and ground props never stand on water or hover above the horizon (warnings: v2 snaps ground
                  placements at load, so only pixel placements can, and those are the author's to convert).

   THE REPAIR POLICY (the hard rule: good scenes look the same or better). Only clear errors are applied (above); a move
   larger than max(2 m, half the thing's size) is never made (a drop for clear errors, else a warning); framing elements
   (pinned pixel placements in the front layer, placement framing: true, data.framing) and anything in the view's keep list
   (placement keep: true, data.keep: [place index | object id]) are never moved or dropped: they only get warnings. Pinned
   perspective pieces (boat.canal-view-boat) are judged as their whole boat and never moved.
   ============================================================ */
const SCENE_X_SENSE = Object.freeze({
  boatLand: 0.25,            // the share of a boat's footprint on land above which it is clearly wrong (applied)
  moorReach: 1.5,            // a hull edge this close to a bank: moored
  moorGap: [0.2, 0.5],       // the hull edge of a moored boat off its bank (m)
  moorTol: 20,               // degrees: alongside (v3 _WPL_ORIENT boat: ['bank', 20])
  reedIn: 2.5,               // the margin's water side (m from the bank)
  reedInClear: 3,            // a reed more than this into open water is clearly wrong (applied)
  reedOut: 1,                // the margin's land side (m from the water)
  bankNear: 3,               // a water bird on land this close to the water is on its bank (v3: !inWater && waterDist <= 3 -> 'bank')
  levelTol: 0.05,            // m a floater may sit above its water level
  edge: 2,                   // units: a hanging thing whose box reaches this close to the frame edge hangs in from off frame
  reachMin: 2,               // m: the smallest move radius (max(2 m, half its size))
});
/** The classes of v3's habitat table (_WPL_HAB, 79-world-1place.js) that the v2 rules use, by v2 class or object id. */
const _SCX_WADER = /heron|egret|stork|crane|wader|curlew|kingfisher|sandpiper/;
const _SCX_LILY = /(^|[.-])(lily|lilies|lily-pad|fish-ring|ring|rings|crowfoot)(-|$)/;
const _SCX_REED = /(^|[.-])(reed|reeds|bulrush|bulrushes|reedmace|typha)(-|$)/;
const _SCX_NOT_REED = /reedbed|reed-island|reed-bed|reedy-bank/;
const _SCX_HANG = /(^|[.-])(bough|boughs|frond|fronds|branch|branches|lamp-head|leash|lead-line)(-|$)/;
/** Parents (K4), from 79-world-0kb.js (bough, frond, lead) and _WPL_PARENT: the classes, an id match, the reach (m). */
const _SCX_PARENT = Object.freeze({
  bough: { cls: ['tree'], reach: 12, side: 'same' },
  frond: { cls: ['tree'], match: /willow/, reach: 10, side: 'same' },
  'lamp-head': { cls: ['street'], match: /lamp|post|column/, reach: 1 },
  lead: { cls: ['person', 'animal-dog'], reach: 2.5 },
});
/** Ground a water bird may graze on (v3 kb duck / swan alt.graze: bank, grass, water-margin; v2 SCENE_PLACE_RULES 'bird-water'). */
const _SCX_GRAZE = Object.freeze(['bank', 'reedbed', 'mud', 'beach', 'sand', 'shingle', 'grass', 'lawn', 'park', 'edge', 'meadow', 'heath', 'verge']);
/** Wet ground where a reed stands away from open water (a reedbed, a marsh). */
const _SCX_WET = Object.freeze(['bank', 'reedbed', 'mud', 'marsh', 'bog', 'wet']);
const _SCX_DEG = Math.PI / 180;
const _scxR1 = v => Math.round(v * 10) / 10, _scxR2 = v => Math.round(v * 100) / 100;
const _scxNotes = new WeakMap(), _scxReports = new WeakMap();

/* ---------- the switch ---------- */
/** 'apply' | 'report' | 'off' (o: the compile's options; the browser's window.__sceneOpts.x; env SCENE_X=off | sense=off | sense=report, SCENE_X_SENSE). */
function sceneXSenseMode(o) {
  const pick = v => (v === false || v === 'off' ? 'off' : v === 'report' ? 'report' : v === true || v === 'apply' || v === 'on' ? 'apply' : null);
  const ox = o && o.x;
  if (ox === false) return 'off';
  if (ox && typeof ox === 'object' && pick(ox.sense)) return pick(ox.sense);
  if (o && pick(o.mode)) return pick(o.mode);
  try {
    if (typeof window !== 'undefined' && window && window.__sceneOpts && window.__sceneOpts.x) {
      const wx = window.__sceneOpts.x;
      if (wx === false) return 'off';
      if (pick(wx.sense)) return pick(wx.sense);
    }
  } catch (e) { /* no window */ }
  try {
    if (typeof process !== 'undefined' && process && process.env) {
      const e = String(process.env.SCENE_X || ''), s = String(process.env.SCENE_X_SENSE || '');
      if (pick(s)) return pick(s);
      if (e === 'off' || /(^|,)sense=off(,|$)/.test(e)) return 'off';
      if (/(^|,)sense=report(,|$)/.test(e)) return 'report';
    }
  } catch (e) { /* no process */ }
  return 'apply';
}
/** The core records where a compiled item came from: q (the resolved placement, with $v2: pixel, pin), src: { place: i } | { scatter: ri } | { cover: true }. */
function sceneXSenseNote(it, q, src) { if (it && typeof it === 'object') _scxNotes.set(it, { q: q || null, src: src || null }); }

/* ---------- geometry (ported from 79-world-0core.js / 1place.js, adapted to v2's ground metres x, d) ---------- */
function _scxInPoly(P, x, d) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > d) !== (b[1] > d) && x < (b[0] - a[0]) * (d - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
function _scxSegDist(x, d, a, b) { const vx = b[0] - a[0], vd = b[1] - a[1], l2 = vx * vx + vd * vd, u = l2 ? Math.max(0, Math.min(1, ((x - a[0]) * vx + (d - a[1]) * vd) / l2)) : 0; return Math.hypot(x - a[0] - vx * u, d - a[1] - vd * u); }
function _scxBoxOf(P) { let a = Infinity, b = Infinity, c = -Infinity, e = -Infinity; for (const p of P) { if (p[0] < a) a = p[0]; if (p[1] < b) b = p[1]; if (p[0] > c) c = p[0]; if (p[1] > e) e = p[1]; } return [a, b, c, e]; }
/** The direction (degrees, 0..180: 0 along d, 90 along x) of segment a-b. */
const _scxDir = (a, b) => ((Math.atan2(b[0] - a[0], b[1] - a[1]) / _SCX_DEG) % 180 + 180) % 180;
/** The smallest angle between two undirected directions (0..90). */
const _scxAngDiff = (a, b) => { const t = Math.abs(((a - b) % 180 + 180) % 180); return Math.min(t, 180 - t); };
function _scxHash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
/** The nearest point of a polyline: { d (distance), off (signed: + to the left of the direction of travel), dir }. */
function _scxLineNear(path, x, d) {
  let best = null;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], vx = b[0] - a[0], vd = b[1] - a[1], l2 = vx * vx + vd * vd;
    if (!l2) continue;
    const u = Math.max(0, Math.min(1, ((x - a[0]) * vx + (d - a[1]) * vd) / l2)), px = a[0] + vx * u, pd = a[1] + vd * u, m = Math.hypot(x - px, d - pd);
    if (!best || m < best.d) { const l = Math.sqrt(l2), side = (vx * (d - a[1]) - vd * (x - a[0])) / l; best = { d: m, off: side, dir: _scxDir(a, b) }; }
  }
  return best;
}

/* ---------- the water regions of a compiled scene or compile context, with their real banks ---------- */
const _scxWaterMemo = new WeakMap();
/**
 * The water regions [{ id, level, poly, box, path, width, banks: [[a, b], ...] }]. A bank is an edge of the region's
 * polygon that is neither a frame cut (the camera's side lines, the near clip, the far limit: _scgrNearBank's onCut) nor a
 * seam with another region (the other side is water too: v3 _wplBankSegs). A channel (path + width) keeps its centreline.
 */
function _scxWaters(S) {
  const hit = _scxWaterMemo.get(S), n = (S && S.water || []).length;
  if (hit && hit.n === n) return hit.list;
  const cam = S && S.cam, list = [];
  if (cam) for (const w of S.water || []) {
    const v = w && w.v2;
    if (!v || !Array.isArray(v.polyM) || v.polyM.length < 3) continue;
    list.push({ id: v.id, level: Number.isFinite(v.level) ? v.level : (cam.water || 0), poly: v.polyM, box: _scxBoxOf(v.polyM), path: v.path || null, width: v.width || 0, banks: [] });
  }
  const xl = cam ? (-200 - cam.x0) / cam.f : 0, xr = cam ? (1800 - cam.x0) / cam.f : 0, dn = cam ? cam.dMin * 0.9 : 0, dmax = typeof SCENE_DMAX === 'number' ? SCENE_DMAX : 20000;
  const onCut = p => Math.abs(p[0] - xl * p[1]) < 0.02 * Math.max(1, p[1]) || Math.abs(p[0] - xr * p[1]) < 0.02 * Math.max(1, p[1]) || Math.abs(p[1] - dn) < 0.02 || p[1] >= dmax * 0.999;
  for (const g of list) {
    const P = g.poly;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const a = P[j], b = P[i];
      if (onCut(a) && onCut(b)) continue;
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (!(L > 1e-6)) continue;
      // a seam: the midpoint's outer side lies in another region
      const mx = (a[0] + b[0]) / 2, md = (a[1] + b[1]) / 2, nx = -(b[1] - a[1]) / L, nd = (b[0] - a[0]) / L;
      const s = _scxInPoly(P, mx + nx * 0.25, md + nd * 0.25) ? -1 : 1, ox = mx + nx * 0.3 * s, od = md + nd * 0.3 * s;
      if (list.some(o => o !== g && _scxInPoly(o.poly, ox, od))) continue;
      g.banks.push([a, b]);
    }
  }
  _scxWaterMemo.set(S, { n, list });
  return list;
}
/** The water region containing (x, d), or null (bridges and boardwalks over it do not hide it). */
function _scxWaterAt(S, x, d) { for (const g of _scxWaters(S)) if (x >= g.box[0] && x <= g.box[2] && d >= g.box[1] && d <= g.box[3] && _scxInPoly(g.poly, x, d)) return g; return null; }
/** The nearest real bank of a region: { m, dir }. A channel: its offset lines (width / 2 off the centreline). */
function _scxBankNear(g, x, d) {
  if (g.path && g.width) { const n = _scxLineNear(g.path, x, d); if (n) return { m: Math.abs(g.width / 2 - Math.abs(n.off)), dir: n.dir }; }
  let best = null;
  for (const [a, b] of g.banks) { const m = _scxSegDist(x, d, a, b); if (!best || m < best.m) best = { m, dir: _scxDir(a, b) }; }
  return best || { m: Infinity, dir: null };
}
/**
 * What is at a ground point (adapted from worldPlaceProbe, 79-world-1place.js): { x, d, surface, kind, inWater, water, level,
 * waterDist (< 0 in water: minus the distance to its nearest real bank; > 0 on land: the distance to the nearest water), bankDist,
 * bankDir }. S: a compiled v2 scene or the compile context (surfaces and water); the surface lookup is sceneSurfaceAt's.
 */
function sceneXSenseProbe(S, x, d) {
  const s = typeof sceneSurfaceAt === 'function' ? sceneSurfaceAt(S, x, d) : null;
  const g = _scxWaterAt(S, x, d);
  let waterDist = Infinity, bankDir = null, level = null;
  if (g) { const b = _scxBankNear(g, x, d); waterDist = -b.m; bankDir = b.dir; level = g.level; }
  else for (const w of _scxWaters(S)) {
    if (x < w.box[0] - 60 || x > w.box[2] + 60 || d < w.box[1] - 60 || d > w.box[3] + 60) continue;
    const b = _scxBankNear(w, x, d);
    if (b.m < waterDist) { waterDist = b.m; bankDir = b.dir; }
  }
  return { x, d, surface: s ? s.id : null, kind: s ? s.kind : null, inWater: !!g, water: g ? g.id : null, level, waterDist, bankDist: Math.abs(waterDist), bankDir };
}
/** Is (x, d) inside the water margin band: in water within o.in (2.5 m) of a bank, or on land within o.out (1 m) of the water? */
function sceneXSenseMarginOk(S, x, d, o) {
  o = o || {};
  const p = sceneXSenseProbe(S, x, d), inM = o.in != null ? o.in : SCENE_X_SENSE.reedIn, outM = o.out != null ? o.out : SCENE_X_SENSE.reedOut;
  return p.inWater ? -p.waterDist <= inM : p.waterDist <= outM;
}
/** The nearest spot within radius R that passes test(x, d), a spiral over rings, 8 or 12 angles each (_wplSpiral, 79-world-1place.js). */
function _scxSpiral(x0, d0, R, seed, test) {
  const rings = [];
  for (let r = 0.25; r <= R + 1e-9; r = r < 1 ? r + 0.25 : r < 4 ? r + 0.5 : r + 1) rings.push(r);
  const start = _scxHash(seed) % 12;
  for (const r of rings) {
    const n = r < 1 ? 8 : 12;
    for (let k = 0; k < n; k++) {
      const a = ((k + start) / n) * Math.PI * 2, x = x0 + Math.cos(a) * r, d = d0 + Math.sin(a) * r;
      if (!(d > 0.2)) continue;
      const ok = test(x, d);
      if (ok) return { x, d, m: r };
    }
  }
  return null;
}
/** Sample points of a footprint: the corners, edge points every <= 2.5 m and the centre (_wplSamples). */
function _scxSamples(foot, x, d) {
  const out = [[x, d]];
  for (let i = 0; i < foot.length; i++) {
    const a = foot[i], b = foot[(i + 1) % foot.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 2.5));
    for (let k = 0; k < n; k++) { const t = k / n, q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; out.push([q[0] + (x - q[0]) * 0.002, q[1] + (d - q[1]) * 0.002]); }
  }
  return out;
}
/** A rectangle footprint: centre (x, d), length l along heading hd (degrees: 0 along d, 90 along x), beam w. */
function _scxRect(x, d, l, w, hd) {
  const a = hd * _SCX_DEG, ux = Math.sin(a), ud = Math.cos(a), vx = ud, vd = -ux, hl = l / 2, hw = w / 2;
  return [[x - ux * hl - vx * hw, d - ud * hl - vd * hw], [x + ux * hl - vx * hw, d + ud * hl - vd * hw], [x + ux * hl + vx * hw, d + ud * hl + vd * hw], [x - ux * hl + vx * hw, d - ud * hl + vd * hw]];
}

/* ---------- items ---------- */
/** The screen box of a compiled item (scene units; _scgrItemBox's rule). */
function _scxItemBox(it) {
  if (it.direct && it.direct.box) return it.direct.box;
  const sh = typeof sceneObjShapes === 'function' ? sceneObjShapes(it.o, it.v, it.season) : null;
  if (!sh || !sh.box) return null;
  const b = sh.box, s = it.s || 1;
  return it.flip ? [it.x - b[2] * s, it.y + b[1] * s, it.x - b[0] * s, it.y + b[3] * s] : [it.x + b[0] * s, it.y + b[1] * s, it.x + b[2] * s, it.y + b[3] * s];
}
/** What a compiled item is to the sense rules: 'boat' | 'float' | 'reed' | 'hang' | 'ground' | null, and its sub kind. */
function _scxKindOf(it) {
  const o = String(it.o || ''), cls = it.cls || (typeof sceneObjClass === 'function' ? sceneObjClass(o) : '');
  if (it.backdrop || it.direct || it.cover) return null;
  if (_SCX_HANG.test(o)) { const m = _SCX_HANG.exec(o)[2]; return { k: 'hang', sub: /frond/.test(m) ? 'frond' : m === 'lamp-head' ? 'lamp-head' : /lead|leash/.test(m) ? 'lead' : 'bough', cls }; }
  if (cls === 'boat') return { k: 'boat', cls };
  if (cls === 'bird-water' && !_SCX_WADER.test(o)) return { k: 'float', sub: _SCX_LILY.test(o) ? 'lily' : 'bird', cls };
  if (_SCX_REED.test(o) && !_SCX_NOT_REED.test(o)) return { k: 'reed', cls };
  if (cls === 'tree' || cls === 'street') return { k: 'ground', cls };
  return null;
}
/** Is a placement protected (framing or keep)? -> 'keep' | 'framing' | null. */
function _scxProtect(C, data, it, note) {
  const q = note && note.q, src = note && note.src, keep = (data && Array.isArray(data.keep)) ? data.keep : [], frm = (data && Array.isArray(data.framing)) ? data.framing : [];
  const pi = src && Number.isInteger(src.place) ? src.place : null, hitList = L => L.some(k => k === it.o || (pi != null && k === pi));
  if ((q && q.keep) || hitList(keep)) return 'keep';
  if ((q && q.framing) || hitList(frm)) return 'framing';
  const pin = q && q.$v2 && q.$v2.pin, front = C.layers && C.layers[it.layer] && C.layers[it.layer].id === 'front';
  if (pin && front) return 'framing';
  return null;
}
/** The real size of an object: { h, l, w } (sceneObjReal / the class default). */
function _scxReal(o) {
  let r = null;
  if (typeof sceneObjReal === 'function') { try { r = sceneObjReal(o); } catch (e) { r = null; } }
  if (!(r && r.h > 0) && typeof _scgrReal === 'function') { try { r = _scgrReal(o); } catch (e) { r = null; } }
  return r && r.h > 0 ? r : { h: 1, l: 1, w: 1 };
}
/** The ground heading a drawn view implies (degrees, 0 along d, 90 along x): side-on runs across the screen. */
const _scxHeadingOf = (it) => (it.view === 'front' || it.view === 'back' || it.view === 'rear' ? 0 : it.view === 'q-front' || it.view === 'q-back' || it.view === 'q' ? (it.flip ? 135 : 45) : 90);

/* ---------- the canal views' perspective boats (pinned pieces of one boat each; 70-scene-lib-canal-views.js) ---------- */
/** The whole-boat footprint of a boat.canal-view-boat piece: { key, foot, len, beam, heading } or null (the view library is not loaded). */
function _scxCanalBoat(it) {
  if (it.o !== 'boat.canal-view-boat' || typeof SCENE_CANAL_VIEWS !== 'object' || !SCENE_CANAL_VIEWS) return null;
  try {
    const CV = SCENE_CANAL_VIEWS, pc = CV.boatPieces[it.v], V = pc && CV.views[pc.id], B = V && V.boats[pc.bi];
    if (!B) return null;
    const F = CV.boatFrame(V, B), hb = F.beam / 2, P = (a, b) => { const g = F.P(a, b, 0); return [g[0], g[1]]; };
    const foot = [P(0, -hb), P(B.len, -hb), P(B.len, hb), P(0, hb)];
    return { key: pc.id + '|' + pc.bi, foot, len: B.len, beam: F.beam, heading: _scxDir(P(0, 0), P(B.len, 0)), c: P(B.len / 2, 0) };
  } catch (e) { return null; }
}

/* ---------- the pass ---------- */
/**
 * World sense on a compiled v2 scene (see the head of this file). o: { x: the compile's opt.x, mode }. Returns the log (also
 * C.sense). In 'report' mode nothing changes but C.sense and C.problems; v1 data (C.v !== 2) is never changed: use
 * sceneXSenseReport for it.
 */
function sceneXSense(C, data, o) {
  o = o || {};
  const mode = sceneXSenseMode(o);
  if (mode === 'off' || !C || !Array.isArray(C.items)) return [];
  if (C.v !== 2 || !C.cam) return sceneXSenseReport(C, data);
  const log = _scxRun(C, data, mode === 'apply');
  C.sense = log;
  if (Array.isArray(C.problems)) for (const e of log) C.problems.push({ rule: 'sense' + e.rule[0].toUpperCase() + e.rule.slice(1), sev: e.action === 'warn' ? 'warn' : 'info', i: e.i, obj: e.obj, at: e.from && e.from.length === 2 ? e.from : null, msg: `${e.obj}: ${e.reason} (${e.action})`, fix: e.fix || '', sense: e });
  if (C.stats && C.stats.v2) {
    const by = {};
    for (const e of log) by[e.action] = (by[e.action] || 0) + 1;
    C.stats.v2.sense = by;
  }
  return log;
}
/** The rules in report-only mode (v1 data too, from its inferred camera and its pixel water). Memoised per compiled scene. */
function sceneXSenseReport(C, data) {
  if (!C || !Array.isArray(C.items)) return [];
  if (_scxReports.has(C)) return _scxReports.get(C);
  let log = [];
  try { log = C.v === 2 && C.cam ? (C.sense && C.sense.length ? C.sense.slice() : _scxRun(C, data, false)) : _scxRunV1(C, data); } catch (e) { log = [{ i: null, obj: null, action: 'warn', rule: 'sense', reason: 'the sense report failed: ' + String(e && e.message).slice(0, 120), from: null, to: null, by: 'sense' }]; }
  _scxReports.set(C, log);
  return log;
}

/** Run every rule on a v2 compiled scene; apply the clear repairs when apply is set. -> the log. */
function _scxRun(C, data, apply) {
  const cam = C.cam, log = [], drops = new Set(), moved = new Set(), W = SCENE_X_SENSE;
  // report mode: what WOULD be done is logged as a warning that names it (would: 'snap' | 'drop'), and nothing changes
  const entry = (i, it, action, rule, reason, from, to, fix) => {
    const e = { i, obj: it ? it.o : null, action, rule, reason, from: from ? from.map(_scxR2) : null, to: to ? to.map(_scxR2) : null, by: 'sense' };
    if (fix) e.fix = fix;
    if (!apply && action !== 'warn') { e.would = action; e.action = 'warn'; }
    log.push(e);
  };
  const drop = i => { if (apply) drops.add(i); };
  // a sample point counts only inside the view (beyond the frame's side cuts and the near clip the water region is cut, not banked)
  const inView = (x, d) => { if (!(d >= cam.dMin * 0.9)) return false; const X = cam.x0 + cam.f * x / d; return X >= -200 && X <= 1800; };
  const landShare = (S) => { const v = S.filter(p => inView(p[0], p[1])); return v.length ? v.filter(p => !_scxWaterAt(C, p[0], p[1])).length / v.length : 0; };
  const gp = it => (it.g && Number.isFinite(it.g.x) && Number.isFinite(it.g.d) ? it.g : null);
  const reachOf = (it, size) => Math.max(W.reachMin, size / 2);
  // a move of an item to ground (x, d) at height h: screen position, scale (by depth), draw-order key; the layer stays
  const moveTo = (it, x, d, h, surf) => {
    if (!apply) return;
    const g = gp(it), P = typeof sceneProject === 'function' ? sceneProject(cam, x, d, h) : { X: cam.x0 + cam.f * x / d, Y: cam.horizon + cam.f * (cam.eye - h) / d };
    if (g && g.d > 0) it.s = Math.max(0.001, Math.round(it.s * g.d / d * 1000) / 1000);
    it.x = _scxR1(P.X); it.y = _scxR1(P.Y);
    it.g = Object.assign({}, it.g || {}, { x: _scxR2(x), d: _scxR2(d), h: _scxR2(h), surf: surf != null ? surf : (it.g && it.g.surf) || null, snapped: _scxR2(((it.g && it.g.snapped) || 0) + (g ? Math.hypot(x - g.x, d - g.d) : 0)), sense: true });
    it.dz = _scxR2(d);
    it.z = _scxR2(cam.horizon + cam.f * cam.eye / Math.max(0.01, d));
  };
  const items = C.items;
  // the canal views' boats: one judgement per whole boat
  const canal = new Map();
  items.forEach((it, i) => { const b = _scxCanalBoat(it); if (b) { const e = canal.get(b.key) || Object.assign({ idx: [] }, b); e.idx.push(i); canal.set(b.key, e); } });
  // the hulls on the water (v3 _WPL_NOT_INSIDE: nothing that floats or grows is put inside a hull): no snap ends inside one
  const hulls = [...canal.values()].map(b => b.foot);
  items.forEach(it => { const g = gp(it); if (g && (it.cls === 'boat') && it.o !== 'boat.canal-view-boat') { const r = _scxReal(it.o), l = Math.max(0.5, r.l || r.h || 2); hulls.push(_scxRect(g.x, g.d, l, Math.max(0.3, Math.min(r.w || l * 0.3, l)), _scxHeadingOf(it))); } });
  const hullBoxes = hulls.map(_scxBoxOf);
  const inHull = (x, d, pad) => hulls.some((P, k) => { const B = hullBoxes[k], m = pad || 0; return x >= B[0] - m && x <= B[2] + m && d >= B[1] - m && d <= B[3] + m && (_scxInPoly(P, x, d) || (m > 0 && P.some((q, j) => _scxSegDist(x, d, P[(j + P.length - 1) % P.length], q) <= m))); });
  for (const b of canal.values()) {
    const it0 = items[b.idx[0]], land = landShare(_scxSamples(b.foot, b.c[0], b.c[1]));
    if (land > 0) {
      const clear = land > W.boatLand;
      if (clear && !_scxProtect(C, data, it0, _scxNotes.get(it0)) && land > 0.5) { for (const i of b.idx) drop(i); entry(b.idx[0], it0, 'drop', 'boat', `a pinned perspective boat (${b.idx.length} pieces) with ${Math.round(land * 100)} % of its footprint on land`, b.c, null, 'move the boat in the view library'); }
      else entry(b.idx[0], it0, 'warn', 'boat', `a pinned perspective boat with ${Math.round(land * 100)} % of its footprint on land (pinned pieces are never moved)`, b.c, null, 'move the boat in the view library');
      continue;
    }
    const m = sceneXSenseProbe(C, b.c[0], b.c[1]), gap = Math.max(0, -m.waterDist - b.beam / 2);
    if (gap < W.moorReach && m.bankDir != null && _scxAngDiff(m.bankDir, b.heading) > W.moorTol) entry(b.idx[0], it0, 'warn', 'boatMoor', `moored ${_scxR1(gap)} m off the bank but ${Math.round(_scxAngDiff(m.bankDir, b.heading))} degrees off its line`, b.c, null, 'lay it alongside');
  }
  items.forEach((it, i) => {
    if (drops.has(i)) return;
    const K = _scxKindOf(it);
    if (!K || it.o === 'boat.canal-view-boat') return;
    const note = _scxNotes.get(it), q = note && note.q, pixel = !!(q && q.$v2 && q.$v2.pixel), pin = !!(q && q.$v2 && q.$v2.pin);
    const prot = _scxProtect(C, data, it, note), g = gp(it), real = _scxReal(it.o);
    const canApply = !prot;
    const protNote = prot ? ` (${prot}: never moved)` : '';
    // ---- boats
    if (K.k === 'boat') {
      if (!g || pin) return;
      const l = Math.max(0.5, real.l || real.h || 2), w = Math.max(0.3, Math.min(real.w || l * 0.3, l)), hd = _scxHeadingOf(it);
      const share = (x, d) => landShare(_scxSamples(_scxRect(x, d, l, w, hd), x, d));
      const land = share(g.x, g.d);
      if (land > 0) {
        const R = reachOf(it, l), from = [g.x, g.d];
        // a ground placement is already on the water, inset by half its beam (the compile's snap, V2 4.5): only its drawn length
        // can reach the bank, along a heading the sprite only implies, so it is never moved (fleet-pond-4: a dinghy on its trolley
        // at the club's slipway reads 29 % on land and is right as drawn). Pixel boats are the author's guess: those are repaired.
        if (land > W.boatLand && canApply && pixel) {
          const spot = _scxSpiral(g.x, g.d, R, (C.id || '') + '|' + i, (x, d) => share(x, d) === 0);
          if (spot) {
            const wa = _scxWaterAt(C, spot.x, spot.d);
            moveTo(it, spot.x, spot.d, wa ? wa.level : (g.h || 0), wa ? wa.id : null); moved.add(i);
            entry(i, it, 'snap', 'boat', `${Math.round(land * 100)} % of its ${_scxR1(l)} x ${_scxR1(w)} m footprint was on land: moved ${_scxR2(spot.m)} m to where it is all in water`, from, [spot.x, spot.d]);
          } else { drop(i); entry(i, it, 'drop', 'boat', `${Math.round(land * 100)} % of its footprint is on land and no spot within ${_scxR1(R)} m holds it in water`, from, null, 'place it on the water (on: \'<water id>\')'); }
        } else entry(i, it, 'warn', 'boat', `${Math.round(land * 100)} % of its footprint touches land${protNote}${pixel ? '' : ' (a ground placement on the water: its drawn length may reach the bank; not moved)'}`, from, null, 'move it onto the water');
        return;
      }
      const m = sceneXSenseProbe(C, g.x, g.d), gap = -m.waterDist - (hd === 90 ? w / 2 : l / 2);
      if (gap < W.moorReach && m.bankDir != null) {
        if (_scxAngDiff(m.bankDir, hd) > W.moorTol) entry(i, it, 'warn', 'boatMoor', `moored ${_scxR1(Math.max(0, gap))} m off the bank but ${Math.round(_scxAngDiff(m.bankDir, hd))} degrees off its line (a drawn view cannot turn)`, [g.x, g.d], null, 'lay it alongside, or give it a view along the bank');
        else if (gap > W.moorGap[1]) entry(i, it, 'warn', 'boatMoor', `moored ${_scxR1(gap)} m off the bank (alongside is ${W.moorGap[0]} to ${W.moorGap[1]} m)`, [g.x, g.d], null, 'bring it alongside');
      }
      return;
    }
    // ---- floaters
    if (K.k === 'float') {
      if (pin) return;
      const size = Math.max(real.l || 0, real.h || 0, 0.3);
      if (!g) {
        if (it.y <= cam.horizon) {
          if (canApply) { drop(i); entry(i, it, 'drop', 'float', `a floater with no water or ground under it (its foot is at row ${_scxR1(it.y)}, above the horizon)`, null, null, 'place it on the water'); }
          else entry(i, it, 'warn', 'float', `a floater in the sky${protNote}`, null, null, 'place it on the water');
        }
        return;
      }
      const p = sceneXSenseProbe(C, g.x, g.d);
      if (p.inWater) {
        const lv = p.level != null ? p.level : cam.water;
        if (!pixel && Number.isFinite(g.h) && g.h > lv + W.levelTol) {
          if (canApply) { const from = [g.x, g.d]; moveTo(it, g.x, g.d, lv, p.water); moved.add(i); entry(i, it, 'snap', 'float', `${_scxR2(g.h - lv)} m above the water line: lowered onto the water`, from, [g.x, g.d]); }
          else entry(i, it, 'warn', 'float', `${_scxR2(g.h - lv)} m above the water line${protNote}`, [g.x, g.d], null, 'drop its h');
        }
        return;
      }
      if (K.sub === 'bird' && p.waterDist <= W.bankNear && _SCX_GRAZE.includes(p.kind)) return;   // on its bank: grazing (kb alt.graze)
      const R = reachOf(it, size), from = [g.x, g.d];
      const spot = p.waterDist <= R ? _scxSpiral(g.x, g.d, R + 0.5, (C.id || '') + '|' + i, (x, d) => { const w = _scxWaterAt(C, x, d); return !!w && _scxBankNear(w, x, d).m >= Math.min(0.3, size / 2) && !inHull(x, d, 0.3); }) : null;
      if (spot && spot.m <= R + 0.5 && canApply) {
        const wa = _scxWaterAt(C, spot.x, spot.d);
        moveTo(it, spot.x, spot.d, wa ? wa.level : cam.water, wa ? wa.id : null); moved.add(i);
        entry(i, it, 'snap', 'float', `a ${K.sub === 'lily' ? 'lily or ring' : 'water bird'} on ${p.kind || 'no surface'} above the water line: moved ${_scxR2(spot.m)} m into the water`, from, [spot.x, spot.d]);
      } else if (K.sub === 'lily' && canApply) { drop(i); entry(i, it, 'drop', 'float', `a ${it.o} on ${p.kind || 'no surface'}, ${_scxR1(p.waterDist)} m from any water`, from, null, 'place it on the water'); }
      else entry(i, it, 'warn', 'float', `a water bird on ${p.kind || 'no surface'} ${_scxR1(p.waterDist)} m from the water${protNote}`, from, null, 'place it on the water or its bank');
      return;
    }
    // ---- reeds
    if (K.k === 'reed') {
      if (!g || pin) return;
      const p = sceneXSenseProbe(C, g.x, g.d), from = [g.x, g.d];
      if (p.inWater) {
        const deep = -p.waterDist;
        if (deep <= W.reedIn) return;
        if (deep > W.reedInClear && canApply) {
          const R = reachOf(it, Math.max(real.l || 0, real.h || 0));
          const spot = _scxSpiral(g.x, g.d, R, (C.id || '') + '|' + i, (x, d) => { const w = _scxWaterAt(C, x, d); return !!w && _scxBankNear(w, x, d).m <= W.reedIn && !inHull(x, d, 0.2); });
          if (spot) {
            const wa = _scxWaterAt(C, spot.x, spot.d);
            moveTo(it, spot.x, spot.d, Number.isFinite(g.h) ? g.h : (wa ? wa.level : 0), wa ? wa.id : null); moved.add(i);
            entry(i, it, 'snap', 'reed', `${_scxR1(deep)} m into open water: moved ${_scxR2(spot.m)} m back into the margin`, from, [spot.x, spot.d]);
          } else { drop(i); entry(i, it, 'drop', 'reed', `${_scxR1(deep)} m into open water (the margin is ${W.reedIn} m)`, from, null, 'keep reeds within the margin (scatter edge: true)'); }
        } else entry(i, it, 'warn', 'reed', `${_scxR1(deep)} m into the water (the margin is ${W.reedIn} m)${protNote}`, from, null, 'keep reeds within the margin');
        return;
      }
      if (p.waterDist <= W.reedOut || _SCX_WET.includes(p.kind)) return;
      if (p.waterDist === Infinity) return;   // no water in the view: a reed on dry ground is the author's (a ditch, a bog)
      entry(i, it, 'warn', 'reedDry', `${_scxR1(p.waterDist)} m from the water on ${p.kind || 'no surface'} (the margin's land side is ${W.reedOut} m)`, from, null, 'move it to the water\'s edge, or use grass');
      return;
    }
    // ---- hanging things
    if (K.k === 'hang') {
      const box = _scxItemBox(it);
      if (!box) return;
      if (box[0] <= W.edge || box[2] >= (C.w || 1600) - W.edge || box[1] <= W.edge) return;   // hangs in from off the frame
      const rule = _SCX_PARENT[K.sub] || _SCX_PARENT.bough;
      const parent = items.some((o, j) => {
        if (j === i || drops.has(j)) return false;
        const c = o.cls || (typeof sceneObjClass === 'function' ? sceneObjClass(o.o) : '');
        if (!rule.cls.includes(c) || (rule.match && !rule.match.test(o.o)) || _SCX_HANG.test(String(o.o))) return false;
        const og = gp(o);
        if (g && og) { if (Math.hypot(g.x - og.x, g.d - og.d) > rule.reach) return false; if (rule.side === 'same' && Math.abs(g.x) > 0.5 && Math.abs(og.x) > 0.5 && Math.sign(g.x) !== Math.sign(og.x)) return false; return true; }
        const ob = _scxItemBox(o);
        if (!ob) return false;
        const ix = Math.min(box[2], ob[2]) - Math.max(box[0], ob[0]), iy = Math.min(box[3], ob[3]) - Math.max(box[1], ob[1]);
        return ix > 0 && iy > 0 && (ob[3] - ob[1]) >= 0.5 * (box[3] - box[1]);
      });
      if (parent) return;
      const from = g ? [g.x, g.d] : null;
      if (canApply) { drop(i); entry(i, it, 'drop', 'orphan', `a ${K.sub} hanging from nothing: no ${rule.match ? rule.match.source + ' ' : ''}${rule.cls.join(' or ')} in reach and no frame edge beside it`, from, null, 'give it its tree, or let it reach in from the frame edge'); }
      else entry(i, it, 'warn', 'orphan', `a ${K.sub} with no parent in reach and no frame edge beside it${protNote}`, from, null, 'give it its tree, or let it reach in from the frame edge');
      return;
    }
    // ---- trees and ground props
    if (K.k === 'ground') {
      if (pin) return;
      if (!g) { if (pixel && K.cls === 'street' && it.y <= cam.horizon) entry(i, it, 'warn', 'ground', `a ground prop hovering above the horizon (row ${_scxR1(it.y)})`, null, null, 'put its foot on the ground, or pin it'); return; }
      const p = sceneXSenseProbe(C, g.x, g.d);
      if (p.inWater && !(K.cls === 'street' && /buoy|post|mooring|bollard|pile/.test(it.o))) entry(i, it, 'warn', 'ground', `a ${K.cls === 'tree' ? 'tree' : 'ground prop'} standing ${_scxR1(-p.waterDist)} m into the water`, [g.x, g.d], null, 'move it onto the bank (a ground placement snaps)');
    }
  });
  if (apply && (drops.size || moved.size)) _scxReorder(C, drops, moved);
  return log;
}
/**
 * Drop items and re-seat moved ones in their layer's depth order, remapping every index into C.items (strips, buildings,
 * lights). Moved items keep their layer; they move to the first place in that layer whose key is beyond theirs.
 */
function _scxReorder(C, drops, moved) {
  const old = C.items, keep = [];
  old.forEach((it, i) => { if (!drops.has(i)) keep.push(i); });
  let order = keep.filter(i => !moved.has(i));
  for (const i of keep.filter(k => moved.has(k))) {
    const it = old[i];
    let at = order.length;
    for (let k = 0; k < order.length; k++) { const o = old[order[k]]; if (o.layer > it.layer || (o.layer === it.layer && o.z > it.z)) { at = k; break; } }
    order.splice(at, 0, i);
  }
  const map = new Map(order.map((oi, ni) => [oi, ni]));
  C.items = order.map(oi => old[oi]);
  for (const st of C.strips || []) st.items = (st.items || []).filter(k => map.has(k)).map(k => map.get(k));
  C.strips = (C.strips || []).filter(st => st.items.length);
  C.strips.forEach((st, si) => { for (const k of st.items) C.items[k].strip = si; });
  for (const b of C.buildings || []) if (Number.isInteger(b.i)) b.i = map.has(b.i) ? map.get(b.i) : null;
  if (Array.isArray(C.lights)) C.lights = C.lights.filter(l => !Number.isInteger(l.i) || map.has(l.i)).map(l => (Number.isInteger(l.i) ? Object.assign(l, { i: map.get(l.i) }) : l));
  if (C.stats) {
    C.stats.placements = C.items.length;
    C.stats.staticItems = C.items.filter(i => !(i.anim && i.anim.length) && i.strip < 0).length;
    C.stats.stripItems = C.items.filter(i => i.strip >= 0).length;
    C.stats.strips = C.strips.length;
  }
}

/* ---------- v1 (report only) ---------- */
/**
 * The rules on a v1 compiled scene, from its inferred camera (sceneMotionWorld: the eye fitted to its people) and its pixel
 * water. Nothing changes: every action is a warning that names what a v2 scene would get.
 */
function _scxRunV1(C, data) {
  const log = [];
  const W = typeof sceneMotionWorld === 'function' ? sceneMotionWorld(C) : null;
  if (!W || !W.cam) return log;
  const cam = W.cam, polys = (W.waterScr || []).map(P => ({ P, box: _scxBoxOf(P) }));
  const wet = (X, Y) => { let c = false; for (const p of polys) if (X >= p.box[0] && X <= p.box[2] && Y >= p.box[1] && Y <= p.box[3] && _scxInPoly(p.P, X, Y)) c = !c; return c; };
  const edgePx = (X, Y) => { let m = Infinity; for (const p of polys) for (let i = 0, j = p.P.length - 1; i < p.P.length; j = i++) m = Math.min(m, _scxSegDist(X, Y, p.P[j], p.P[i])); return m; };
  const mPerPx = Y => (Y > cam.horizon + 0.5 ? (cam.f * cam.eye / (Y - cam.horizon)) / cam.f : Infinity);
  const entry = (i, it, rule, reason, fix) => log.push({ i, obj: it.o, action: 'warn', rule, reason: reason + ' (v1: report only)', from: [_scxR1(it.x), _scxR1(it.y)], to: null, by: 'sense', fix });
  const W0 = SCENE_X_SENSE;
  C.items.forEach((it, i) => {
    const K = _scxKindOf(Object.assign({}, it, { cls: it.cls || (typeof sceneObjClass === 'function' ? sceneObjClass(it.o) : '') }));
    if (!K) return;
    if (K.k === 'float' && polys.length) {
      if (it.y <= cam.horizon) { entry(i, it, 'float', 'a floater above the horizon', 'put it on the water'); return; }
      if (wet(it.x, it.y)) return;
      const m = edgePx(it.x, it.y) * mPerPx(it.y);
      if (K.sub === 'lily' || m > W0.bankNear) entry(i, it, 'float', `a ${K.sub === 'lily' ? 'lily or ring' : 'water bird'} ${_scxR1(m)} m off the water`, 'put it on the water');
    } else if (K.k === 'reed' && polys.length) {
      if (!wet(it.x, it.y) || it.y <= cam.horizon + 2) return;   // at the horizon a row is hundreds of metres: no judgement
      const m = edgePx(it.x, it.y) * mPerPx(it.y);
      if (m > W0.reedIn) entry(i, it, 'reed', `about ${_scxR1(m)} m into the water (the margin is ${W0.reedIn} m)`, 'keep reeds within the margin');
    } else if (K.k === 'hang') {
      const box = _scxItemBox(it);
      if (!box || box[0] <= W0.edge || box[2] >= 1600 - W0.edge || box[1] <= W0.edge) return;
      const rule = _SCX_PARENT[K.sub] || _SCX_PARENT.bough;
      const ok = C.items.some((o, j) => {
        if (j === i) return false;
        const c = o.cls || (typeof sceneObjClass === 'function' ? sceneObjClass(o.o) : '');
        if (!rule.cls.includes(c) || (rule.match && !rule.match.test(o.o)) || _SCX_HANG.test(String(o.o))) return false;
        const ob = _scxItemBox(o);
        return !!ob && Math.min(box[2], ob[2]) > Math.max(box[0], ob[0]) && Math.min(box[3], ob[3]) > Math.max(box[1], ob[1]) && (ob[3] - ob[1]) >= 0.5 * (box[3] - box[1]);
      });
      if (!ok) entry(i, it, 'orphan', `a ${K.sub} with no parent in reach and no frame edge beside it`, 'give it its tree, or let it reach in from the frame edge');
    } else if (K.k === 'boat' && polys.length) {
      if (!wet(it.x, it.y)) entry(i, it, 'boat', 'a boat whose waterline is not on the water', 'put it on the water');
    }
  });
  return log;
}
