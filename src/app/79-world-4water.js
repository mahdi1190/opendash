/* ============================================================
   WORLD ENGINE (scene format v3.1), package look: WATER (docs/dev/WORLD_ENGINE.md 2.5, 11.2; requirements H1-H6, W4, Y3,
   SCENE_LESSONS section C). PURE classic script at load (constants and two registrations); the drawing helpers touch a canvas
   only when called in the browser.

   Reflections come FROM THE WATER SURFACE. Objects never make their own reflection: each water region mirrors the composite
   of everything drawn above it, column by column, each pixel about its OWNER's contact row, so a thing drawn in many pieces (a
   boat in slices, a bridge, a viaduct, a reed stand) lands in the water exactly once and can never repeat or double.

     WORLD_WATER_LOOK                         per kind: base colours (far, mid, near), tint, clarity, mirror, ripple, drift
     worldWaterLook(kind, hint)               -> the look of a kind; scenes give only hint: 'calm' | 'breezy' (H5)
     worldWaterPlan(world, cam, o)            -> regions [{ id, kind, level, hint, flow, speed, look, polyM, clipM, clip, box, topRow,
                                                 col0, dNear, dFar, steps }]: the polygon clipped at the near plane (so water running
                                                 under the camera reaches the frame's bottom edge: H6), projected at its level;
                                                 topRow[i] = the first water row of scene column col0 + i (the far bank's edge there)
     worldWaterSpansAt(region, X)             -> [[Y0, Y1], ...] the water rows of scene column X (islands make several)
     worldWaterContact(region, ent, cam)      -> the owner's contact: { kind: 'own', z } (standing or floating in the water: its own
                                                 waterline), { kind: 'line', pts } (a perspective boat: its footprint's outline at the
                                                 level, one continuous sloped line), { kind: 'bank', z } (on the bank: per column the
                                                 nearer of its own waterline and the bank's water edge there, so a far-bank tree's
                                                 mirror starts exactly at the bank edge and follows the bank in perspective)
     worldWaterContactRow(region, c, X)       -> the contact row (scene units) of a contact at scene column X
     worldWaterContactBase(region, c, X)      -> the row the owner's art stands on there (its waterline; a bank owner's ground),
                                                 laid on the contact row by the mirror so a bank thing's image has no gap
     worldWaterOwners(world, cam, region, ents) -> [{ id, z, contact }] the owner table for the entities that can reflect here
     worldWaterComposite(region, draws, o)    -> { comp, owner: { idx, list, layers } }: the composite above the water, its
                                                 per-pixel owner (the last drawn there at half cover or more) and every owner's OWN
                                                 layer (the union of its pieces), which the mirror reads first, so what a nearer
                                                 thing hides on the screen still reflects (no holes; SCENE_LESSONS C). draws
                                                 [{ id, z, contact, img, x, y }] (pure) or [{ id, z, contact, paint(g, dx, dy) }]
                                                 (canvas). The compositor may instead pass its own form: a canvas { c, x, y, w, h }
                                                 and owner { list: [{ id, z, sp, M, box, row, clipY }] } (the mirror re-draws each
                                                 record into its layer; contacts from o.world's entities, else the record's row)
     worldWaterMirror(ctx, region, comp, owner, o) -> { img, base, refl, zb, x0, y0, px, wet, gaps }: the water of the region:
                                                 o.base: the base colour by kind and depth with the sky's mirror (Fresnel), dithered;
                                                 the mirror of comp about each owner's contact row, nearer owner wins, ripple
                                                 displacement (drifting with the flow on rivers, still on canals), fade with
                                                 mirrored height, Fresnel falloff, tint by kind, dimmed under cast shadows. Statics:
                                                 once at bake (o.base true); movers: per frame on their columns only (o.cols, o.zb of
                                                 the bake so a nearer static still covers a farther mover). No wet pixel is left
                                                 transparent (gaps = 0), at the frame edge, near the camera or at an occluder (H6).
     worldWaterRipple(region, yDev, t, o)     -> the ripple shift (device px) of a row now
     worldWaterCut(ent, cam, region)          -> where a floater's art is cut: { kind: 'row', row, footRow, sink } or { kind: 'line',
                                                 pts, sink } (the waterline at level - sink; H3)
     worldWaterReflectOf(world, cam, ent, regions) -> { surface, rowY } | null (the frame record's reflect field)
     worldWaterFalls(world, cam, regions)     -> weirs, falls and lock steps as falling water: [{ id, kind, crest, drop, upper, lower,
                                                 top: [[X, Y]], foot: [[X, Y]] }] (H4)
     worldWaterInit(world), worldWaterTick(world, dt, ctx), worldWaterEvent(world, kind, e), worldWaterBob(world, ent)
                                              the 'water' system (phase fx): ripples' clock, wakes from 'wake' events (and from moving
                                                 boats) spreading and fading, rings from paddling birds and rain, buoyancy bob and
                                                 rocking in passing wakes, the flow advecting floating leaves in autumn; spray at
                                                 falls through worldEmit (particles, typeof) (Y3)
   Browser: worldWaterDraw(ctx, res, region, t, o) (the baked water with its reflection rippled in bands), worldWaterDrawFx
   (rings, wakes, leaves), worldWaterDrawFalls, worldWaterDrawGlitter.
   The v2 water pass (78-scene-water.js) keeps drawing base water for v2 scenes; world scenes give it no placements.
   ============================================================ */
const WORLD_WATER_LOOK = Object.freeze({
  // drift: how the ripple pattern moves ('flow' rivers: along the current; 'still' canals and puddles: in place; 'wind' ponds
  // and lakes: a slow wind drift; 'swell' the sea: rolling toward the shore)
  canal: { base: ['#4a5a48', '#3a4a3e', '#2a362e'], tint: '#3a4a3e', clarity: 0.05, mirror: 0.85, ripple: 0.15, drift: 'still', rings: true },
  river: { base: ['#5a7480', '#3f5e6a', '#2d4652'], tint: '#3f5e6a', clarity: 0.08, mirror: 0.6, ripple: 0.35, drift: 'flow', rings: true, flow: 0.45 },
  lake: { base: ['#6a8a9a', '#446a7c', '#2a4a5a'], tint: '#446a7c', clarity: 0.12, mirror: 0.7, ripple: 0.3, drift: 'wind', rings: true },
  pond: { base: ['#6a8a9a', '#446a7c', '#2a4a5a'], tint: '#446a7c', clarity: 0.15, mirror: 0.8, ripple: 0.2, drift: 'wind', rings: true },
  sea: { base: ['#5f8aa6', '#3a6a8c', '#234a66'], tint: '#3a6a8c', clarity: 0.1, mirror: 0.35, ripple: 0.6, drift: 'swell', rings: false, chop: 0.7 },
  harbour: { base: ['#5a7480', '#3f5e6a', '#2d4652'], tint: '#3f5e6a', clarity: 0.06, mirror: 0.6, ripple: 0.25, drift: 'wind', rings: true },
  // a wide tidal estuary (Mersey, Thames, Severn, Humber): silt-laden, brown-grey, opaque, choppy, running with the tide
  estuary: { base: ['#946c3e', '#704f2c', '#4b351b'], tint: '#704f2c', clarity: 0.02, mirror: 0.12, ripple: 0.55, drift: 'flow', rings: true, flow: 0.5, chop: 1 },
  puddle: { base: ['#6a7480', '#4a5560', '#2a3540'], tint: '#4a5560', clarity: 0, mirror: 0.9, ripple: 0.05, drift: 'still', rings: false },
});
const _WWA_BED = '#4a4030', _WWA_FLOATS = /^(boat|duck|swan|coot|grebe|goose|gull|fish)$/, _WWA_SWIMMERS = /^(duck|swan|coot|grebe|goose)$/;
const WORLD_WATER_CAPS = Object.freeze({ wakes: 48, rings: 64, leaves: 24, falls: 12 });
let _wwaDegrade = 0;                            // the water system's degrade level (1..3 under budget pressure: fewer rings and wakes)

/* ---------- small maths ---------- */
function _wwaClamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function _wwaRgb(hex) { let s = String(hex || '#000').replace('#', ''); if (s.length === 3) s = s.replace(/./g, '$&$&'); const n = parseInt(s.slice(0, 6), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function _wwaMixRgb(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function _wwaInPoly(x, y, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
function _wwaHash(s) { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function _wwaRng(seed) { let a = _wwaHash(seed) || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function _wwaPoly(s) { return typeof _wlSurfPoly === 'function' ? _wlSurfPoly(s) : (s.poly || []); }
function _wwaDither(x, y) { return typeof worldDither === 'function' ? worldDither(x, y) : 0; }
function _wwaLevel(world, s) { if (s && Number.isFinite(s.level)) return s.level; const c = world && world.cam; return c && Number.isFinite(c.water) ? c.water : 0; }
/** The screen row (scene units) of the water plane at depth z. */
function _wwaRow(cam, z, level) { return cam.horizon + cam.f * (cam.eye - level) / Math.max(1e-3, z); }
/** The part of a polygon (metres) in front of the near plane z >= zn (Sutherland-Hodgman against one half-plane). */
function _wwaClipNear(P, zn) {
  const out = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], ia = a[1] >= zn, ib = b[1] >= zn;
    if (ia) out.push(a);
    if (ia !== ib) { const t = (zn - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, zn]); }
  }
  return out;
}

/* ---------- what of a lowered water can be seen (SCENE_LESSONS J: people walked on the water at a quay) ---------- */
/** Ear-clipping of a simple polygon into triangles (convex pieces for the opening test); a convex polygon is its own piece. */
function _wwaConvexPieces(P) {
  const n = P.length;
  if (n < 3) return [];
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  let area = 0; for (let i = 0, j = n - 1; i < n; j = i++) area += (P[j][0] + P[i][0]) * (P[j][1] - P[i][1]);
  const sg = area < 0 ? 1 : -1;                                // the sign of a counter-clockwise turn for this winding
  let convex = true;
  for (let i = 0; i < n && convex; i++) if (sg * cross(P[i], P[(i + 1) % n], P[(i + 2) % n]) < -1e-9) convex = false;
  if (convex) return [P];
  const idx = P.map((_, i) => i), out = [];
  const inTri = (p, a, b, c) => sg * cross(a, b, p) >= -1e-9 && sg * cross(b, c, p) >= -1e-9 && sg * cross(c, a, p) >= -1e-9;
  let guard = n * n;
  while (idx.length > 3 && guard-- > 0) {
    let cut = false;
    for (let k = 0; k < idx.length; k++) {
      const a = P[idx[(k + idx.length - 1) % idx.length]], b = P[idx[k]], c = P[idx[(k + 1) % idx.length]];
      if (sg * cross(a, b, c) <= 1e-9) continue;
      let ear = true;
      for (const j of idx) { const q = P[j]; if (q === a || q === b || q === c) continue; if (inTri(q, a, b, c)) { ear = false; break; } }
      if (!ear) continue;
      out.push([a, b, c]); idx.splice(k, 1); cut = true; break;
    }
    if (!cut) break;
  }
  if (idx.length === 3) out.push(idx.map(i => P[i]));
  return out;
}
/**
 * The part of a water polygon (metres, in front of the near plane) that the eye can see over the ground. The water lies below the
 * ground plane (level < 0: a quay, a lock, a river in its cut): the sight line to a point of it crosses the ground level nearer by
 * the factor k = (eye - level) / eye, and the point is seen only when it crosses INSIDE an opening of the ground (a water polygon);
 * across the quay it is hidden. So the visible footprint is the polygon cut by every opening scaled by k about the camera's foot. Returns
 * a list of convex-clipped pieces (each a polygon in metres), or null when the whole polygon is visible.
 */
function _wwaVisiblePieces(P, k, openings) {
  const pieces = [];
  for (const O of openings) {
    const kO = O.map(p => [p[0] * k, p[1] * k]), c = typeof _wlClipConvex === 'function' ? _wlClipConvex(P, kO) : P;
    if (c.length >= 3) pieces.push(c);
  }
  return pieces;
}
/** Pieces as one ring (keyholes of zero width join them), so a region's outline stays one polygon for every consumer. */
function _wwaOutline(pieces) {
  if (pieces.length === 1) return pieces[0];
  const ring = [], keys = [];
  for (const c of pieces) { for (const q of c) ring.push(q); ring.push(c[0]); keys.push(c[0]); }
  for (let i = keys.length - 2; i >= 0; i--) ring.push(keys[i]);
  return ring;
}

/* ---------- kinds (H5) ---------- */
/** The look of a kind of water. Scenes give only a hint: 'calm' halves the ripple, 'breezy' raises it (x 1.6); nothing else. */
function worldWaterLook(kind, hint) {
  const own = WORLD_WATER_LOOK[kind] || WORLD_WATER_LOOK.pond, v2 = typeof sceneWaterDefaults === 'function' && WORLD_WATER_LOOK[kind] ? sceneWaterDefaults(kind) : null;
  const L = Object.assign({ kind: WORLD_WATER_LOOK[kind] ? kind : 'pond' }, own);
  if (v2) { L.base = v2.base.slice(); L.mirror = v2.mirror; L.ripple = v2.ripple; L.clarity = v2.clarity; }   // one table with the v2 base water
  L.hint = hint === 'calm' || hint === 'breezy' ? hint : null;
  L.ripple = L.ripple * (L.hint === 'calm' ? 0.5 : L.hint === 'breezy' ? 1.6 : 1);
  return L;
}
/** The flow of a water surface (metres per second, camera frame [fx, fz]): rivers flow along their centre line (or the authored
 *  flow: [fx, fz], { dir (degrees, 0 = away), speed }, or a speed along the path); everything else is still. */
function _wwaFlow(s, look) {
  const f = s.flow;
  if (Array.isArray(f) && f.length === 2 && f.every(Number.isFinite)) return f.slice();
  if (f && typeof f === 'object' && Number.isFinite(f.dir)) { const sp = Number.isFinite(f.speed) ? f.speed : look.flow || 0.4; return [Math.sin(f.dir * Math.PI / 180) * sp, Math.cos(f.dir * Math.PI / 180) * sp]; }
  if (look.drift !== 'flow' && !Number.isFinite(f)) return [0, 0];
  const sp = Number.isFinite(f) ? f : look.flow || 0.4, P = Array.isArray(s.path) && s.path.length >= 2 ? s.path : null;
  if (P) { const a = P[0], b = P[P.length - 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / L * sp, (b[1] - a[1]) / L * sp]; }
  // a river polygon: along its longest extent, toward the camera (rivers in view run past the viewer)
  const Q = _wwaPoly(s), xs = Q.map(p => p[0]), zs = Q.map(p => p[1]), wx = Math.max(...xs) - Math.min(...xs), wz = Math.max(...zs) - Math.min(...zs);
  return wx > wz ? [sp, 0] : [0, -sp];
}

/* ---------- the plan ---------- */
/**
 * The water regions of a world for a camera. o: { near (the near clip plane, metres), overscan (scene units each side for the
 * topRow table; 400) }. Regions keep cam so the contact rows and the mirror can project.
 */
function worldWaterPlan(world, cam, o) {
  cam = typeof _wlCam === 'function' ? _wlCam(world, cam) : (cam || (world && world.cam));
  o = o || {};
  const zn = Number.isFinite(o.near) ? o.near : Math.max(0.15, (cam.dMin || 1) * 0.2), out = [], ov = Number.isFinite(o.overscan) ? o.overscan : 400;
  const surfs = (world && world.surfaces) || [];
  // the openings of the ground: every water polygon in front of the near plane, in convex pieces (a lowered water is seen only through them)
  const openings = [];
  for (const s of surfs) {
    if (!s || s.kind !== 'water') continue;
    const P = _wwaPoly(s), c = Array.isArray(P) && P.length >= 3 ? _wwaClipNear(P, zn) : [];
    if (c.length >= 3) for (const q of _wwaConvexPieces(c)) openings.push(q);
  }
  for (const s of surfs) {
    if (!s || s.kind !== 'water') continue;
    const polyM = _wwaPoly(s);
    if (!Array.isArray(polyM) || polyM.length < 3) continue;
    let clipM = _wwaClipNear(polyM, zn);
    if (clipM.length < 3) continue;
    const level = _wwaLevel(world, s), kind = WORLD_WATER_LOOK[s.water] ? s.water : WORLD_WATER_LOOK[s.waterKind] ? s.waterKind : 'pond';
    const look = worldWaterLook(kind, s.hint), flow = _wwaFlow(s, look);
    // a water below the ground is hidden behind the near bank: only what the sight lines carry through an opening is seen
    const k = cam.eye > 0.2 ? (cam.eye - level) / cam.eye : 1;
    if (k > 1.02 && o.hide !== false) {
      const pieces = _wwaVisiblePieces(clipM, k, openings);
      if (!pieces.length) continue;
      clipM = _wwaOutline(pieces);
    }
    const clip = clipM.map(p => [cam.x0 + cam.f * p[0] / p[1], _wwaRow(cam, p[1], level)]);
    const box = [Math.min(...clip.map(p => p[0])), Math.min(...clip.map(p => p[1])), Math.max(...clip.map(p => p[0])), Math.max(...clip.map(p => p[1]))];
    const R = { id: s.id, kind, level, hint: look.hint, flow, speed: Math.hypot(flow[0], flow[1]), look, polyM, clipM, clip, box, cam,
      dNear: Math.min(...clipM.map(p => p[1])), dFar: Math.max(...clipM.map(p => p[1])), steps: [], phase: (_wwaHash('water|' + s.id) % 6283) / 1000 };
    // topRow: the first water row of each scene column (the bank's water edge there), NaN where the column has no water
    const c0 = Math.floor(Math.max(box[0], -ov)), c1 = Math.ceil(Math.min(box[2], 2 * (cam.x0 || 800) + ov));
    R.col0 = c0; R.topRow = new Float32Array(Math.max(0, c1 - c0 + 1));
    for (let i = 0; i < R.topRow.length; i++) { const sp = worldWaterSpansAt(R, c0 + i + 0.5); R.topRow[i] = sp.length ? sp[0][0] : NaN; }
    out.push(R);
  }
  // steps between regions (W4, H4): a region's own step, and weir surfaces between two waters
  for (const R of out) {
    const s = surfs.find(q => q && q.id === R.id);
    if (s && s.step && typeof s.step === 'object') R.steps.push(Object.assign({ kind: s.step.kind || 'weir' }, s.step));
  }
  return out;
}
/** The water rows [[Y0, Y1], ...] of a scene column X (even-odd crossings of the projected outline). */
function worldWaterSpansAt(R, X) {
  const P = R.clip, ys = [];
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const a = P[j], b = P[i];
    if ((a[0] <= X) === (b[0] <= X)) continue;
    ys.push(a[1] + (b[1] - a[1]) * (X - a[0]) / (b[0] - a[0]));
  }
  ys.sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i + 1 < ys.length; i += 2) out.push([ys[i], ys[i + 1]]);
  return out;
}
function _wwaTopAt(R, X) {
  const i = Math.floor(X - R.col0);
  if (R.topRow && i >= 0 && i < R.topRow.length) return R.topRow[i];
  const sp = worldWaterSpansAt(R, X);
  return sp.length ? sp[0][0] : NaN;
}

/* ---------- owners and contact rows (H1, H2) ---------- */
function _wwaFootOf(e) {
  if (Array.isArray(e.foot) && e.foot.length >= 3) return e.foot;
  if (typeof _wlFoot === 'function') return _wlFoot(e);
  return [[e.x - 0.2, e.z - 0.2], [e.x + 0.2, e.z - 0.2], [e.x + 0.2, e.z + 0.2], [e.x - 0.2, e.z + 0.2]];
}
/**
 * The contact of an owner on a region. In the water (its anchor inside the region): 'own' (its waterline at its own depth), or
 * 'line' when its footprint is long (a boat seen in perspective: the footprint's outline at the water level, per column the
 * nearest edge: one continuous sloped waterline for the whole boat, whatever pieces it is drawn in). On land: 'bank' (the bank's
 * water edge in each column, or its own waterline when that is nearer). Flyers: 'own' (a true mirror about the plane).
 */
function worldWaterContact(R, e, cam, o) {
  cam = cam || R.cam;
  const P = R.polyM, inW = _wwaInPoly(e.x, e.z, P), at = String(e.attach || '');
  if (/^air/.test(at) || e.cls === 'bird-air') return { kind: 'own', z: e.z };
  if (inW) {
    const foot = _wwaFootOf(e), xs = foot.map(p => p[0]), zs = foot.map(p => p[1]);
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
    // the footprint's outline is the waterline of a thing drawn IN PERSPECTIVE along it (a hull, a walkway's rails); a sprite is
    // drawn about its anchor, so it mirrors about its own waterline there (o.sprite), never the footprint's near edge (that left a
    // gap: the platform's and the boardwalk's images hung far below them, SCENE_LESSONS G)
    if (span > 2.5 && foot.every(p => p[1] > 0.05) && !(o && o.sprite)) {
      const pts = foot.map(p => [cam.x0 + cam.f * p[0] / p[1], _wwaRow(cam, p[1], R.level)]);
      return { kind: 'line', z: Math.min(...zs), pts };
    }
    return { kind: 'own', z: e.z };
  }
  // on the bank: the front of its real footprint (the core's foot: a trunk, a wall line), else its anchor (never the picture box);
  // base: the row its art stands on (its ground at that depth), which the mirror lays on the water edge, so the image starts
  // exactly at the bank with no gap (the ground strip between is the v2 base layer's, never part of the composite)
  const g = Number.isFinite(e.y) ? e.y : 0, real = Array.isArray(e.foot) && e.foot.length >= 3;
  const zf = Math.max(0.05, real ? Math.min(...e.foot.map(p => p[1])) : e.z);
  if (real) {
    const xs = e.foot.map(p => p[0]), zs = e.foot.map(p => p[1]);
    if (Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) > 2.5 && zs.every(z => z > 0.05)) {
      return { kind: 'bank', z: zf, ptsL: e.foot.map(p => [cam.x0 + cam.f * p[0] / p[1], _wwaRow(cam, p[1], R.level)]), ptsG: e.foot.map(p => [cam.x0 + cam.f * p[0] / p[1], _wwaRow(cam, p[1], g)]) };
    }
  }
  return { kind: 'bank', z: zf, base: _wwaRow(cam, zf, g) };
}
/** The contact row (scene units) of a contact at scene column X. */
function worldWaterContactRow(R, c, X) {
  const cam = R.cam;
  if (!c) return NaN;
  if (c.kind === 'own') return _wwaRow(cam, c.z, R.level);
  if (c.kind === 'line') return _wwaLineAt(c.pts, X);
  if (c.kind === 'fixed') return c.row;
  const own = c.ptsL ? _wwaLineAt(c.ptsL, X) : _wwaRow(cam, c.z, R.level), top = _wwaTopAt(R, X);
  return Number.isFinite(top) ? Math.max(own, top) : own;
}
/** The row a contact's art stands on at scene column X: its contact row in the water; its own ground on the bank. */
function worldWaterContactBase(R, c, X) {
  if (!c || c.kind !== 'bank') return worldWaterContactRow(R, c, X);
  return c.ptsG ? _wwaLineAt(c.ptsG, X) : Number.isFinite(c.base) ? c.base : worldWaterContactRow(R, c, X);
}
/** An outline's lowest (nearest) edge over scene column X; held flat past its ends. */
function _wwaLineAt(P, X) {
  let best = -Infinity, x0 = Infinity, x1 = -Infinity, y0 = 0, y1 = 0;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const a = P[j], b = P[i];
    if (a[0] < x0) { x0 = a[0]; y0 = a[1]; } if (a[0] > x1) { x1 = a[0]; y1 = a[1]; }
    if ((a[0] <= X) === (b[0] <= X)) continue;
    const y = a[1] + (b[1] - a[1]) * (X - a[0]) / (b[0] - a[0]);
    if (y > best) best = y;
  }
  if (best > -Infinity) return best;
  return X < x0 ? y0 : y1;
}
/** The owner table of a region: every entity (statics and movers) that can reflect in it, with its depth and contact. */
function worldWaterOwners(world, cam, R, ents) {
  cam = cam || R.cam;
  const out = [];
  for (const e of ents || ((world && world.entities) || [])) {
    if (!e || !e.obj || !(e.z > 0.05)) continue;
    out.push({ id: e.id, z: e.z, contact: worldWaterContact(R, e, cam), ent: e });
  }
  return out;
}

/* ---------- the composite and its owners ---------- */
/**
 * The composite above a region and its per-pixel owner. draws (in draw order, far to near): pure { id, z, contact, img: { data,
 * width, height }, x, y } (device px of the image's top-left), or canvas { id, z, contact, paint(g, dx, dy) } (the browser:
 * paint draws the entity exactly as the compositor does with its device origin at (dx, dy)). o: { vs, ox, oy, top (device row
 * the composite starts at; default 0, may be negative: overscan above the frame), W (device width) }.
 * -> { comp: { data, width, height, x0, y0 }, owner: { idx: Int32Array, list: [{ id, z, contact }] } }
 */
function worldWaterComposite(R, draws, o) {
  o = o || {};
  const vs = o.vs || 1, ox = o.ox || 0, oy = o.oy || 0;
  const x0 = Math.floor(Math.max(R.box[0] * vs + ox, o.x0 != null ? o.x0 : -Infinity, o.W != null ? 0 : -Infinity)), x1 = Math.ceil(Math.min(R.box[2] * vs + ox, o.W != null ? o.W : Infinity, o.x1 != null ? o.x1 : Infinity));
  const y0 = Math.floor(o.top != null ? o.top : 0), y1 = Math.ceil(Math.min(R.box[3] * vs + oy, o.H != null ? o.H : Infinity));
  const w = Math.max(0, x1 - x0), h = Math.max(0, y1 - y0);
  const comp = { data: new Uint8ClampedArray(w * h * 4), width: w, height: h, x0, y0 }, idx = new Int32Array(w * h).fill(-1), cov = new Uint8Array(w * h), list = [];
  const own = new Map(), byOwner = [];
  for (const d of draws || []) {
    if (!d) continue;
    let k = own.get(d.id);
    if (k == null) { k = list.length; own.set(d.id, k); list.push({ id: d.id, z: d.z, contact: d.contact || null }); }
    let src = d.img, sx = d.x | 0, sy = d.y | 0;
    if (!src && typeof d.paint === 'function' && typeof document !== 'undefined') {
      // the canvas path: paint into a scratch the size of the composite, read it back
      const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h);
      const g = c.getContext('2d', { willReadFrequently: true });
      d.paint(g, x0, y0);
      src = g.getImageData(0, 0, c.width, c.height); sx = x0; sy = y0;
    }
    if (!src || !src.data) continue;
    const a0 = Math.max(x0, sx), a1 = Math.min(x1, sx + src.width), b0 = Math.max(y0, sy), b1 = Math.min(y1, sy + src.height);
    for (let y = b0; y < b1; y++) {
      for (let x = a0; x < a1; x++) {
        const s4 = ((y - sy) * src.width + (x - sx)) * 4, a = src.data[s4 + 3];
        if (!a) continue;
        const p = (y - y0) * w + (x - x0), p4 = p * 4, D = comp.data, al = a / 255;
        // source-over
        const da = D[p4 + 3] / 255, oa = al + da * (1 - al);
        for (let c = 0; c < 3; c++) D[p4 + c] = oa > 0 ? (src.data[s4 + c] * al + D[p4 + c] * da * (1 - al)) / oa : 0;
        D[p4 + 3] = Math.round(oa * 255);
        // the owner: the last drawn here at half cover or more (a faint veil on top does not take the pixel)
        if (a >= 128 || a > cov[p]) { idx[p] = k; cov[p] = a; }
      }
    }
    (byOwner[k] || (byOwner[k] = [])).push([src, sx, sy]);
  }
  return { comp, owner: { idx, list, layers: _wwaLayers(byOwner, x0, y0, x1, y1) } };
}
/**
 * Each owner's own image (the union of its pieces, drawn in order), cut to the composite's box: [{ k, x0, y0, w, h, data }].
 * The mirror reads these first, so a far thing keeps the parts a nearer thing hides on the screen (one flattened composite of
 * the view left holes in the water there; SCENE_LESSONS C), and the nearer image wins wherever two land on one water pixel.
 */
function _wwaLayers(byOwner, X0, Y0, X1, Y1) {
  const out = [];
  byOwner.forEach((list, k) => {
    if (!list || !list.length) return;
    let a0 = Infinity, b0 = Infinity, a1 = -Infinity, b1 = -Infinity;
    for (const [src, sx, sy] of list) { a0 = Math.min(a0, sx); b0 = Math.min(b0, sy); a1 = Math.max(a1, sx + src.width); b1 = Math.max(b1, sy + src.height); }
    a0 = Math.max(a0, X0); b0 = Math.max(b0, Y0); a1 = Math.min(a1, X1); b1 = Math.min(b1, Y1);
    const w = a1 - a0, h = b1 - b0;
    if (!(w > 0 && h > 0)) return;
    const D = new Uint8ClampedArray(w * h * 4);
    for (const [src, sx, sy] of list) {
      const c0 = Math.max(a0, sx), c1 = Math.min(a1, sx + src.width), d0 = Math.max(b0, sy), d1 = Math.min(b1, sy + src.height);
      for (let y = d0; y < d1; y++) for (let x = c0; x < c1; x++) {
        const s4 = ((y - sy) * src.width + (x - sx)) * 4, al = src.data[s4 + 3] / 255;
        if (!al) continue;
        const p4 = ((y - b0) * w + (x - a0)) * 4, da = D[p4 + 3] / 255, oa = al + da * (1 - al);
        for (let c = 0; c < 3; c++) D[p4 + c] = (src.data[s4 + c] * al + D[p4 + c] * da * (1 - al)) / oa;
        D[p4 + 3] = Math.round(oa * 255);
      }
    }
    out.push({ k, x0: a0, y0: b0, w, h, data: D });
  });
  return out;
}

/* ---------- ripple (H4: drifting with the flow on rivers, still on canals) ---------- */
/**
 * The horizontal ripple shift (device px) of device row yDev at time t. o: { vs, oy, wind (the live wind, 1), still }.
 * Rivers: a travelling pattern along the current (up the screen when it flows away, down when toward the camera); canals and
 * puddles: a standing shimmer in place (no drift); ponds and lakes: a slow wind drift; the sea: a swell rolling in.
 */
// the ripple's wavenumber (radians per scene row) far and near: the pattern spreads over more rows toward the camera (perspective)
const WORLD_RIPPLE_K = Object.freeze({ far: 0.5, near: 0.12 });
// the most a reflection may shear from one row to the next (px per px): above it a vertical edge in the mirror breaks into a
// sawtooth (the zigzag columns of the first v3 renders, SCENE_LESSONS G); the wind never raises the ripple past 1.6 x
const WORLD_RIPPLE_SLOPE = 0.3, WORLD_RIPPLE_WIND_MAX = 1.6;
function worldWaterRipple(R, yDev, t, o) {
  o = o || {};
  const vs = o.vs || 1, oy = o.oy || 0, look = R.look || WORLD_WATER_LOOK.pond, wind = _wwaClamp(o.wind == null ? 1 : o.wind, 0, WORLD_RIPPLE_WIND_MAX);
  // by the row within the region: small and quick far, longer and gentler near. The phase is the integral of the wavenumber
  // (WORLD_RIPPLE_K far .. near), so the pattern never folds back on itself; the amplitude is the kind's ripple, shrinking toward
  // the camera, and never more than WORLD_RIPPLE_SLOPE / wavenumber, so the shift is smooth from row to row (no jagged columns)
  const top = R.box[1] * vs + oy, bh = Math.max(1, Math.min(R.box[3], 900) * vs + oy - top), yRel = _wwaClamp(yDev + 0.5 - top, 0, bh), u = yRel / bh;
  const K0 = WORLD_RIPPLE_K.far, K1 = WORLD_RIPPLE_K.near, k = (K0 - (K0 - K1) * u) / vs, kMid = (K0 - (K0 - K1) * 0.5) / vs;
  // the shear a row may take: a breezy surface a little choppier, a calm one smoother, the wind within bounds (at most 0.45 px a row)
  const slope = WORLD_RIPPLE_SLOPE * (look.hint === 'breezy' ? 1.25 : look.hint === 'calm' ? 0.8 : 1) * _wwaClamp(Math.sqrt(wind), 0.7, 1.2);
  // never more than the middle distance's own cap either: the near water's long, slow swell stays gentle (the nearest reflections
  // are of the biggest things, and a few pixels of shift there shears a whole trunk or post)
  const A = Math.min(look.ripple * wind * (2 + 8 * u) * vs, slope / k, slope / kMid) * (1 - 0.35 * u);
  if (!(A > 0.01)) return 0;
  const ph = (K0 * yRel - (K0 - K1) * yRel * yRel / (2 * bh)) / vs + (R.phase || 0), tt = o.still ? 0 : (t || 0);
  switch (look.drift) {
    case 'flow': { const f = R.flow || [0, 0], dir = f[1] !== 0 ? Math.sign(f[1]) : f[0] !== 0 ? Math.sign(f[0]) : 1; return A * Math.sin(ph + (1.7 + 3 * (R.speed || 0)) * dir * tt); }
    case 'still': return A * Math.sin(ph) * Math.cos(0.9 * tt);
    case 'swell': return A * Math.sin(ph - 1.1 * tt);
    default: return A * Math.sin(ph + 1.2 * tt);
  }
}

/* ---------- the mirror (H1, H2, H6) ---------- */
function _wwaSkyCols(o) {
  const sky = o.sky && o.sky.__sky ? o.sky : null, L = sky ? sky.L : o.L || null;
  const top = (sky && sky.sky.top) || (L && L.top) || '#3a80c4', mid = (sky && sky.sky.mid) || (L && L.mid) || '#98c4e4', low = (sky && sky.sky.low) || (L && L.low) || '#e6eee8';
  return { top: _wwaRgb(top), mid: _wwaRgb(mid), low: _wwaRgb(low), dark: sky ? sky.dark : L && L.dark || 0, L };
}
/**
 * Mirror a composite into a region's water. ctx: a 2D context (browser; the result is drawn at its device box) or null (Node).
 * comp, owner: worldWaterComposite (owner.list[k].contact from worldWaterContact; owners without one get one from o.ents).
 * o: { vs, ox, oy, W, H (device frame), t (s), wind, sky (worldSkyOf) or L, base (true: paint the whole water: kind colour,
 * sky mirror, Fresnel, dithered), ripple (true: displace by worldWaterRipple at t; false: leave it to the frame's band blit),
 * cols: [x0, x1] device columns (movers: only theirs), zb: a previous result's zb (statics: a farther mover never covers a
 * nearer static's reflection), shade: [{ scr: [[X, Y]], op }] (screen polygons of shadows over the water: it dims there), dst
 * (an ImageData-like frame buffer to blend into; Node) }.
 */
function worldWaterMirror(ctx, R, comp, owner, o) {
  o = o || {};
  const vs = o.vs || 1, ox = o.ox || 0, oy = o.oy || 0, cam = R.cam;
  ({ comp, owner } = _wwaNorm(R, comp, owner, o));
  const W = o.W != null ? o.W : ctx && ctx.canvas ? ctx.canvas.width : Math.ceil(2 * cam.x0 * vs + ox);
  const H = o.H != null ? o.H : ctx && ctx.canvas ? ctx.canvas.height : Math.ceil(900 * vs + oy);
  let x0 = Math.max(0, Math.floor(R.box[0] * vs + ox)), x1 = Math.min(W, Math.ceil(R.box[2] * vs + ox));
  const y0 = Math.max(0, Math.floor(R.box[1] * vs + oy)), y1 = Math.min(H, Math.ceil(R.box[3] * vs + oy));
  if (Array.isArray(o.cols)) { x0 = Math.max(x0, Math.floor(o.cols[0])); x1 = Math.min(x1, Math.ceil(o.cols[1])); }
  const w = Math.max(0, x1 - x0), h = Math.max(0, y1 - y0);
  const res = { img: { data: new Uint8ClampedArray(w * h * 4), width: w, height: h }, base: null, refl: null, zb: null, x0, y0, w, h, px: 0, wet: 0, gaps: 0 };
  if (!w || !h) return res;
  const look = R.look || WORLD_WATER_LOOK.pond, S = _wwaSkyCols(o);
  // 1. the wet mask: pixel centres inside the projected outline
  const wet = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) {
    const X = (x0 + x + 0.5 - ox) / vs;
    for (const [a, b] of worldWaterSpansAt(R, X)) {
      const ya = Math.max(y0, Math.ceil(a * vs + oy - 0.5)), yb = Math.min(y1 - 1, Math.floor(b * vs + oy - 0.5));
      for (let y = ya; y <= yb; y++) wet[(y - y0) * w + x] = 1;
    }
  }
  // per row: the grazing factor u (1 at the horizon), the base colour by depth, the mirrored sky, the Fresnel weight
  const rowU = new Float32Array(h), rowBase = new Array(h);
  let base3 = look.base.map(_wwaRgb);
  if (S.L && typeof S.L.water === 'function') { try { const wb = S.L.water(look.base); if (Array.isArray(wb) && wb.length === 3) base3 = wb.map(_wwaRgb); } catch (e) { /* the kind's own */ } }
  else if (S.dark > 0.05) base3 = base3.map(c => _wwaMixRgb(c, _wwaMixRgb(S.mid, [5, 7, 12], 0.4), _wwaClamp(S.dark, 0, 1) * 0.85));
  const bed = _wwaRgb(_WWA_BED);
  for (let r = 0; r < h; r++) {
    const Y = (y0 + r + 0.5 - oy) / vs, g = _wwaClamp((Y - cam.horizon) / Math.max(1, 900 - cam.horizon), 0, 1), u = 1 - g;
    rowU[r] = u;
    const b = g < 0.5 ? _wwaMixRgb(base3[0], base3[1], g * 2) : _wwaMixRgb(base3[1], base3[2], (g - 0.5) * 2);
    const skyc = g < 0.35 ? _wwaMixRgb(S.low, S.mid, g / 0.35) : _wwaMixRgb(S.mid, S.top, _wwaClamp((g - 0.35) / 0.65, 0, 1));   // the sky mirrored about the horizon
    const F = _wwaClamp(look.mirror * (0.25 + 0.55 * u), 0, 0.95);
    rowBase[r] = _wwaMixRgb(_wwaMixRgb(b, bed, _wwaClamp(look.clarity * 2.5 * g * g, 0, 0.5)), skyc, F * 0.6);
  }
  // 2. the base (statics' bake): every wet pixel opaque, dithered
  const D = res.img.data;
  if (o.base !== false) {
    const B = new Uint8ClampedArray(w * h * 4);
    for (let r = 0; r < h; r++) for (let x = 0; x < w; x++) {
      const p = r * w + x;
      if (!wet[p]) continue;
      const c = rowBase[r], dz = _wwaDither(x0 + x, y0 + r), q = p * 4;
      B[q] = c[0] + dz; B[q + 1] = c[1] + dz; B[q + 2] = c[2] + dz; B[q + 3] = 255;
      res.wet++;
    }
    if (typeof worldWaterChop === 'function') worldWaterChop(B, wet, w, h, x0, y0, { R, look, vs, ox, oy, cam });   // wavelets on open water (79-world-4chop.js)
    res.base = { data: B, width: w, height: h };
    D.set(B);
  } else for (let p = 0; p < w * h; p++) if (wet[p]) res.wet++;
  // 3. the mirror: each owned pixel about its owner's contact row; the nearer owner wins where two land on one
  const refl = new Uint8ClampedArray(w * h * 4), zb = new Float32Array(w * h).fill(Infinity), zPrev = o.zb && o.zb.data ? o.zb : null;
  const list = (owner && owner.list) || [], entOf = (id) => (!o.ents ? null : o.ents instanceof Map ? o.ents.get(id) : o.ents[id]);
  const ctc = list.map(L => L.contact || (entOf(L.id) ? worldWaterContact(R, entOf(L.id), cam) : null));
  const stamp = new Int32Array(list.length).fill(-1), rowC = new Float64Array(list.length), rowB = new Float64Array(list.length);
  // the body colour the mirror is tinted by: the kind's, lit by the light now (at night its daylight green-grey lifted every
  // mirrored dark into a grey veil over the water: SCENE_LESSONS G)
  const tint = S.dark > 0.05 ? _wwaMixRgb(_wwaRgb(look.tint || look.base[1]), base3[1], _wwaClamp(S.dark * 1.2, 0, 1)) : _wwaRgb(look.tint || look.base[1]);
  // one source pixel into the reflection: about the owner's contact row (a bank owner's base laid on the water edge), only into
  // the water, faded with its mirrored height, Fresnel by the row, tinted by the kind; where two land on one, blended by depth
  // (the nearer over the farther, whatever the order), so the nearer owner wins and a soft edge stays soft
  const put = (k, ix, x, yc, S, s4, a, A, B) => {
    if (!(yc < B)) return;                                          // at or below its own waterline (its base on the bank): not mirrored
    const ty = Math.floor(A + B - yc), r = ty - y0;
    if (r < 0 || r >= h) return;
    const t = r * w + ix;
    if (!wet[t]) return;                                            // nothing reflects outside the water
    const z = list[k].z || 0;
    if (zPrev && zPrev.x0 != null) { const px = x - zPrev.x0, py = ty - zPrev.y0; if (px >= 0 && py >= 0 && px < zPrev.w && py < zPrev.h && zPrev.data[py * zPrev.w + px] < z) return; }
    const hM = (ty + 0.5 - A) / vs * Math.max(0.05, z) / cam.f, fade = Math.exp(-hM / 45), F = _wwaClamp(look.mirror * (0.3 + 0.6 * rowU[r]), 0, 0.95);
    const na = a * F * fade / 255;
    if (!(na > 0.002)) return;
    const t4 = t * 4, nr = S[s4] * 0.78 + tint[0] * 0.22, ng = S[s4 + 1] * 0.78 + tint[1] * 0.22, nb = S[s4 + 2] * 0.78 + tint[2] * 0.22;
    const oa = refl[t4 + 3] / 255;
    if (!(oa > 0)) { refl[t4] = nr; refl[t4 + 1] = ng; refl[t4 + 2] = nb; refl[t4 + 3] = Math.round(na * 255); zb[t] = z; return; }
    const near = z <= zb[t], fa = near ? na : oa, ba = near ? oa : na, ra = fa + ba * (1 - fa);
    const f = near ? [nr, ng, nb] : [refl[t4], refl[t4 + 1], refl[t4 + 2]], bk = near ? [refl[t4], refl[t4 + 1], refl[t4 + 2]] : [nr, ng, nb];
    for (let c = 0; c < 3; c++) refl[t4 + c] = (f[c] * fa + bk[c] * ba * (1 - fa)) / ra;
    refl[t4 + 3] = Math.round(ra * 255);
    if (near) zb[t] = z;
  };
  const rowsOf = (k, x) => { const X = (x + 0.5 - ox) / vs, A = worldWaterContactRow(R, ctc[k], X) * vs + oy; return [A, ctc[k].kind === 'bank' ? worldWaterContactBase(R, ctc[k], X) * vs + oy : A]; };
  if (owner && Array.isArray(owner.layers) && owner.layers.length) {
    for (const Ly of owner.layers) {
      const k = Ly.k;
      if (!ctc[k]) continue;
      for (let lx = 0; lx < Ly.w; lx++) {
        const x = Ly.x0 + lx, ix = x - x0;
        if (ix < 0 || ix >= w) continue;
        const [A, B] = rowsOf(k, x);
        for (let ly = 0; ly < Ly.h; ly++) { const s4 = (ly * Ly.w + lx) * 4, a = Ly.data[s4 + 3]; if (a) put(k, ix, x, Ly.y0 + ly + 0.5, Ly.data, s4, a, A, B); }
      }
    }
  } else if (comp && comp.data && owner && owner.idx) {
    const cw = comp.width, ch = comp.height, cx0 = comp.x0 || 0, cy0 = comp.y0 || 0;
    for (let cx = 0; cx < cw; cx++) {
      const x = cx0 + cx, ix = x - x0;
      if (ix < 0 || ix >= w) continue;
      for (let cy = 0; cy < ch; cy++) {
        const pi = cy * cw + cx, k = owner.idx[pi];
        if (k < 0 || !ctc[k]) continue;
        const a = comp.data[pi * 4 + 3];
        if (!a) continue;
        if (stamp[k] !== x) { stamp[k] = x; const q = rowsOf(k, x); rowC[k] = q[0]; rowB[k] = q[1]; }
        put(k, ix, x, cy0 + cy + 0.5, comp.data, pi * 4, a, rowC[k], rowB[k]);
      }
    }
  }
  res.refl = { data: refl, width: w, height: h };
  res.zb = { data: zb, x0, y0, w, h };
  // 4. the reflection over the base, displaced by the ripple (or left to the frame's band blit)
  const rip = o.ripple !== false;
  for (let r = 0; r < h; r++) {
    const dx = rip ? Math.round(worldWaterRipple(R, y0 + r, o.t || 0, { vs, oy, wind: o.wind })) : 0;
    for (let x = 0; x < w; x++) {
      const t = r * w + x;
      if (!wet[t]) continue;
      let sx = x - dx;
      if (sx < 0 || sx >= w || !wet[r * w + sx]) sx = x;            // a ripple never pulls a dry pixel (or nothing) into the water
      const s4 = (r * w + sx) * 4, a = refl[s4 + 3];
      if (!a) continue;
      const t4 = t * 4, al = a / 255;
      if (o.base !== false) { D[t4] = D[t4] * (1 - al) + refl[s4] * al; D[t4 + 1] = D[t4 + 1] * (1 - al) + refl[s4 + 1] * al; D[t4 + 2] = D[t4 + 2] * (1 - al) + refl[s4 + 2] * al; }
      else { D[t4] = refl[s4]; D[t4 + 1] = refl[s4 + 1]; D[t4 + 2] = refl[s4 + 2]; D[t4 + 3] = a; }
      res.px++;
    }
  }
  // 5. shade: water under a cast shadow darkens subtly (the shadow itself never lies on water)
  for (const s of o.shade || []) {
    const P = s && (s.scr || s);
    if (!Array.isArray(P) || P.length < 3) continue;
    const k = 1 - 0.18 * _wwaClamp((s.op == null ? 0.35 : s.op) / 0.35, 0, 1);
    const bx0 = Math.max(x0, Math.floor(Math.min(...P.map(p => p[0])) * vs + ox)), bx1 = Math.min(x1, Math.ceil(Math.max(...P.map(p => p[0])) * vs + ox));
    const by0 = Math.max(y0, Math.floor(Math.min(...P.map(p => p[1])) * vs + oy)), by1 = Math.min(y1, Math.ceil(Math.max(...P.map(p => p[1])) * vs + oy));
    for (let y = by0; y < by1; y++) for (let x = bx0; x < bx1; x++) {
      const t = (y - y0) * w + (x - x0);
      if (!wet[t] || !_wwaInPoly((x + 0.5 - ox) / vs, (y + 0.5 - oy) / vs, P)) continue;
      const t4 = t * 4; D[t4] *= k; D[t4 + 1] *= k; D[t4 + 2] *= k;
    }
  }
  if (o.base !== false) for (let p = 0; p < w * h; p++) if (wet[p] && D[p * 4 + 3] < 255) res.gaps++;
  // 6. out: into a frame buffer (Node) or the canvas (browser: through a scratch so the dry pixels stay untouched)
  if (o.dst && o.dst.data) _wwaBlit(o.dst, res.img, x0, y0);
  else if (ctx && typeof ctx.drawImage === 'function' && typeof document !== 'undefined' && typeof ImageData !== 'undefined') {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').putImageData(new ImageData(res.img.data, w, h), 0, 0);
    const org = Array.isArray(o.origin) ? o.origin : [0, 0];
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(c, x0 - org[0], y0 - org[1]); ctx.restore();
    res.canvas = c;
  }
  return res;
}
/**
 * The composite and its owners in the mirror's own form ({ data, width, height, x0, y0 } and a per-pixel owner index). Accepts
 * worldWaterComposite's result as it is, and the compositor's form: a canvas composite { c, x, y, w, h } (or a pixel buffer)
 * with owner { list: [{ id, z, sp, M, box, row, contact }] } (its draw records, far to near). Then the pixels are read back once
 * and the owners rebuilt by re-drawing each record's sprite through its matrix (browser), else from their device boxes over the
 * composite's coverage (later records win). Each owner's contact: its own, else worldWaterContact of its world entity (o.world
 * or o.ents), else the record's device row (a fixed contact).
 */
function _wwaNorm(R, comp, owner, o) {
  if (!comp) return { comp: null, owner: null };
  if (comp.data && owner && owner.idx) return { comp, owner };
  let C = comp;
  if (!comp.data && comp.c && typeof comp.c.getContext === 'function') {
    try {
      const g = comp.c.getContext('2d', { willReadFrequently: true }), id = g.getImageData(0, 0, comp.c.width, comp.c.height);
      C = { data: id.data, width: comp.c.width, height: comp.c.height, x0: comp.x || 0, y0: comp.y || 0 };
    } catch (e) { return { comp: null, owner: null }; }
  } else if (comp.data && comp.x0 == null) C = { data: comp.data, width: comp.width, height: comp.height, x0: comp.x || 0, y0: comp.y || 0 };
  if (!C.data) return { comp: null, owner: null };
  const vs = o.vs || 1, oy = o.oy || 0, list0 = (owner && owner.list) || [], n = C.width * C.height, idx = new Int32Array(n).fill(-1), cov = new Uint8Array(n);
  let ents = o.ents || null;
  if (!ents && o.world) { ents = new Map(); for (const e of [].concat(o.world.entities || [], o.world.agents || [])) if (e && e.id != null) ents.set(String(e.id), e); }
  const entOf = (id) => (!ents ? null : ents instanceof Map ? ents.get(String(id)) || ents.get(id) : ents[id]);
  const list = list0.map(L => {
    const e = entOf(L.id);
    return { id: L.id, z: L.z, contact: L.contact || (e ? worldWaterContact(R, e, R.cam) : Number.isFinite(L.row) ? { kind: 'fixed', row: (L.row - oy) / vs } : null) };
  });
  let tc = null, tg = null;
  const layers = [];
  list0.forEach((L, k) => {
    if (typeof document !== 'undefined' && L.sp && L.sp.c && Array.isArray(L.M)) {
      try {
        // the record's own image (its layer: what nearer things hide on the screen is still there for the water)
        if (!tc) { tc = document.createElement('canvas'); tc.width = Math.max(1, C.width); tc.height = Math.max(1, C.height); tg = tc.getContext('2d', { willReadFrequently: true }); }
        tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, tc.width, tc.height);
        const M = L.M; tg.setTransform(M[0], M[1], M[2], M[3], M[4] - C.x0, M[5] - C.y0); tg.drawImage(L.sp.c, L.sp.x0, L.sp.y0, L.sp.w, L.sp.h);
        if (Number.isFinite(L.clipY)) { tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, L.clipY - C.y0, tc.width, tc.height); }   // a floater cut at its waterline
        const b = Array.isArray(L.box) ? [Math.max(0, Math.floor(L.box[0] - C.x0)), Math.max(0, Math.floor(L.box[1] - C.y0)), Math.min(C.width, Math.ceil(L.box[2] - C.x0)), Math.min(C.height, Math.ceil(L.box[3] - C.y0))] : [0, 0, C.width, C.height];
        if (b[2] > b[0] && b[3] > b[1]) { const id = tg.getImageData(b[0], b[1], b[2] - b[0], b[3] - b[1]); layers.push({ k, x0: C.x0 + b[0], y0: C.y0 + b[1], w: b[2] - b[0], h: b[3] - b[1], data: id.data }); }
        return;
      } catch (e) { /* the box below */ }
    }
    if (Array.isArray(L.box)) {
      const x0 = Math.max(0, Math.floor(L.box[0] - C.x0)), x1 = Math.min(C.width, Math.ceil(L.box[2] - C.x0)), y0 = Math.max(0, Math.floor(L.box[1] - C.y0)), y1 = Math.min(C.height, Math.ceil(L.box[3] - C.y0));
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const p = y * C.width + x; if (C.data[p * 4 + 3]) idx[p] = k; }
    }
  });
  return { comp: C, owner: { idx, list, layers: layers.length === list0.length ? layers : null } };
}
/** source-over of an ImageData-like image into a frame buffer at (x0, y0). */
function _wwaBlit(dst, img, x0, y0) {
  for (let y = 0; y < img.height; y++) {
    const Y = y0 + y;
    if (Y < 0 || Y >= dst.height) continue;
    for (let x = 0; x < img.width; x++) {
      const X = x0 + x;
      if (X < 0 || X >= dst.width) continue;
      const s = (y * img.width + x) * 4, a = img.data[s + 3];
      if (!a) continue;
      const d = (Y * dst.width + X) * 4, al = a / 255, da = dst.data[d + 3] / 255, oa = al + da * (1 - al);
      for (let c = 0; c < 3; c++) dst.data[d + c] = oa > 0 ? (img.data[s + c] * al + dst.data[d + c] * da * (1 - al)) / oa : 0;
      dst.data[d + 3] = Math.round(oa * 255);
    }
  }
}

/* ---------- floaters (H3) ---------- */
/**
 * Where a floater's art is cut: the waterline at the region's level (its y is level - sink, from the core). A short floater (a
 * duck, a swan) is cut along one row; a long one (a boat in perspective) along its footprint's near outline at the level.
 * -> { kind: 'row', row, footRow, sink } | { kind: 'line', pts, sink } (scene units), or null when it is not in this water.
 */
function worldWaterCut(e, cam, R) {
  if (!e || !R) return null;
  cam = cam || R.cam;
  if (!_wwaInPoly(e.x, e.z, R.polyM)) return null;
  const sink = Number.isFinite(e.y) ? Math.max(0, R.level - e.y) : Math.max(0, Number(e.sink) || 0);
  const c = worldWaterContact(R, e, cam);
  if (c.kind === 'line') return { kind: 'line', pts: c.pts, sink };
  return { kind: 'row', row: _wwaRow(cam, e.z, R.level), footRow: _wwaRow(cam, e.z, R.level - sink), sink };
}
/** The reflect field of the frame record: the region an entity's mirror image lands in and its contact row there, or null. */
function worldWaterReflectOf(world, cam, e, regions) {
  if (!e || !e.obj || !(e.z > 0.05)) return null;
  const regs = regions || worldWaterPlan(world, cam);
  const h = typeof _wlHeight === 'function' ? _wlHeight(e) : (e.height || 1);
  for (const R of regs) {
    const c = worldWaterContact(R, e, cam || R.cam), cm = cam || R.cam, X = cm.x0 + cm.f * e.x / e.z;
    const A = worldWaterContactRow(R, c, X), B = worldWaterContactBase(R, c, X), yTop = _wwaRow(cm, e.z, (Number.isFinite(e.y) ? e.y : 0) + h);   // the top of the thing on screen
    const reach = A + B - yTop;                                       // where the mirrored top lands
    if (!(yTop < B)) continue;
    if (worldWaterSpansAt(R, X).some(([a, b]) => reach >= a && A <= b)) return { surface: R.id, rowY: Math.round(A * 100) / 100 };
  }
  return null;
}

/* ---------- weirs, falls and locks (H4, W4) ---------- */
/**
 * The steps of the water as falling water. From a region's own step ({ path | line: [[x, z]...] the crest, drop (m) or to (a
 * region id), kind 'weir' | 'fall' | 'lock' }) and from 'weir' surfaces (the crest: the path, or the far side of the polygon;
 * the levels: the highest and lowest water within 4 m; 0.6 m when unknown). -> [{ id, kind, crest, drop, upper, lower, width,
 * top: [[X, Y]] (the crest at the upper level), foot: [[X, Y]] (the same line at the lower level) }], at most WORLD_WATER_CAPS.falls.
 */
function worldWaterFalls(world, cam, regions) {
  cam = typeof _wlCam === 'function' ? _wlCam(world, cam) : cam;
  const regs = regions || worldWaterPlan(world, cam), out = [];
  const near = (P, d) => regs.filter(R => P.some(p => _wwaInPoly(p[0], p[1], R.polyM) || R.polyM.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < d) || _wwaEdgeDist(R.polyM, p) < d));
  const mk = (id, kind, crest, upper, lower) => {
    const C = crest.filter(p => p[1] > 0.2);
    if (C.length < 2) return;
    const drop = Math.max(0.15, upper - lower), width = C.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - C[i][0], p[1] - C[i][1]), 0);
    out.push({ id, kind, crest: C, drop: Math.round(drop * 100) / 100, upper, lower, width: Math.round(width * 10) / 10,
      top: C.map(p => [cam.x0 + cam.f * p[0] / p[1], _wwaRow(cam, p[1], upper)]), foot: C.map(p => [cam.x0 + cam.f * p[0] / p[1], _wwaRow(cam, p[1], lower)]) });
  };
  for (const R of regs) for (const st of R.steps || []) {
    const line = Array.isArray(st.path) ? st.path : Array.isArray(st.line) ? st.line : null;
    if (!line || line.length < 2) continue;
    const to = st.to ? regs.find(q => q.id === st.to) : null, lower = to ? to.level : R.level - (Number.isFinite(st.drop) ? st.drop : 0.6);
    mk(R.id + ':step', st.kind === 'lock' ? 'lock' : st.kind === 'fall' ? 'fall' : 'weir', line, Math.max(R.level, lower), Math.min(R.level, lower));
  }
  for (const s of (world && world.surfaces) || []) {
    if (!s || s.kind !== 'weir') continue;
    const P = _wwaPoly(s);
    if (!P || P.length < 2) continue;
    let crest = Array.isArray(s.path) && s.path.length >= 2 ? s.path : null;
    if (!crest) { const zs = P.map(p => p[1]).sort((a, b) => a - b), mid = zs[Math.floor(zs.length / 2)]; crest = P.filter(p => p[1] >= mid).sort((a, b) => a[0] - b[0]); }
    const W = near(P, 4), lv = W.map(R => R.level);
    const upper = lv.length ? Math.max(...lv) : 0.6, lower = lv.length > 1 ? Math.min(...lv) : upper - 0.6;
    mk(s.id, 'weir', crest, upper, lower === upper ? upper - 0.6 : lower);
  }
  return out.slice(0, WORLD_WATER_CAPS.falls);
}
function _wwaEdgeDist(P, p) {
  let d = Infinity;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const a = P[j], b = P[i], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz, t = L2 ? _wwaClamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2, 0, 1) : 0;
    d = Math.min(d, Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz));
  }
  return d;
}

/* ---------- the water system (Y3) ---------- */
function _wwaRegionsM(world) {
  return ((world && world.surfaces) || []).filter(s => s && s.kind === 'water').map(s => {
    const look = worldWaterLook(WORLD_WATER_LOOK[s.water] ? s.water : 'pond', s.hint), P = _wwaPoly(s);
    const xs = P.map(p => p[0]), zs = P.map(p => p[1]);
    return { id: s.id, P, look, flow: _wwaFlow(s, look), level: _wwaLevel(world, s), bb: [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)] };
  });
}
/** Set up the water state of a world (the system's init). */
function worldWaterInit(world) {
  if (!world) return null;
  world.water = { t: 0, wakes: [], rings: [], leaves: [], regions: _wwaRegionsM(world), bob: new Map(), lastWake: new Map(), nextRing: new Map(), spray: 0, rainAcc: 0, leafAcc: 0, n: 0, degrade: 0 };
  return world.water;
}
/** An event for the water: 'wake' { id, x, z, vx, vz, speed, beam } (a boat under way) starts a wake there. */
function worldWaterEvent(world, kind, e) {
  const W = (world && world.water) || worldWaterInit(world);
  if (!W || !e) return;
  if (kind === 'wake' && Number.isFinite(e.x) && Number.isFinite(e.z)) {
    const sp = Number.isFinite(e.speed) ? e.speed : Math.hypot(e.vx || 0, e.vz || 0);
    if (!(sp > 0.02)) return;
    W.wakes.push({ src: e.id == null ? null : e.id, x: e.x, z: e.z, vx: Number.isFinite(e.vx) ? e.vx : 0, vz: Number.isFinite(e.vz) ? e.vz : sp, speed: sp, beam: e.beam || 2, age: 0, life: 9, n: W.n++ });
    if (e.id != null) W.lastWake.set(e.id, W.t);
    while (W.wakes.length > WORLD_WATER_CAPS.wakes >> (W.degrade > 1 ? 1 : 0)) W.wakes.shift();
  }
  if (kind === 'ring' && Number.isFinite(e.x)) _wwaRing(W, e.x, e.z, e.src || null, e.r0 || 0.15);
}
function _wwaRing(W, x, z, src, r0) {
  W.rings.push({ x, z, src, age: 0, life: 3.2, r0, n: W.n++ });
  while (W.rings.length > WORLD_WATER_CAPS.rings >> (W.degrade > 1 ? 1 : 0)) W.rings.shift();
}
function _wwaRegionOfM(W, x, z) { for (const R of W.regions) if (x >= R.bb[0] && x <= R.bb[2] && z >= R.bb[1] && z <= R.bb[3] && _wwaInPoly(x, z, R.P)) return R; return null; }
/**
 * One tick of the water (the system's update; dt seconds of scene time). ctx: the time context (weather, month, season, wind).
 * Wakes age, spread and fade; moving boats that sent no 'wake' lately start one; paddling birds and rain make rings; floaters
 * bob (seeded per entity, never in step) and rock when a wake passes; in autumn the current carries floating leaves downstream.
 * Falls throw spray through worldEmit (particles) when it is loaded.
 */
function worldWaterTick(world, dt, ctx) {
  const W = (world && world.water) || worldWaterInit(world);
  if (!W || !(dt > 0)) return W;
  ctx = ctx || world.time || world.ctx || {};
  W.t += dt; W.degrade = _wwaDegrade;
  const t = W.t, rnd = _wwaRng('water|' + (world.seed | 0) + '|' + Math.floor(t * 30));
  for (const k of ['wakes', 'rings', 'leaves']) { for (const q of W[k]) q.age += dt; W[k] = W[k].filter(q => q.age < q.life); }
  const agents = Array.isArray(world.agents) ? world.agents : typeof worldAgents === 'function' ? (() => { try { return worldAgents(world) || []; } catch (e) { return []; } })() : [];
  const floaters = [];
  for (const e of [].concat((world.entities || []), agents)) {
    if (!e || !Number.isFinite(e.x) || !Number.isFinite(e.z)) continue;
    const cls = e.cls || '', onW = String(e.attach || '') === 'water' || e.layer === 'swim' || _WWA_FLOATS.test(cls);
    if (!onW) continue;
    const R = _wwaRegionOfM(W, e.x, e.z);
    if (!R) continue;
    floaters.push([e, R]);
    const sp = Math.hypot(e.vx || 0, e.vz || 0) || (Number.isFinite(e.speed) ? e.speed : 0);
    // a boat under way leaves a wake even when no event says so (life emits 'wake' events; this keeps the water right without them)
    if (cls === 'boat' && sp > 0.05 && e.id != null && !(t - (W.lastWake.get(e.id) == null ? -1e9 : W.lastWake.get(e.id)) < 0.6)) worldWaterEvent(world, 'wake', { id: e.id, x: e.x, z: e.z, vx: e.vx, vz: e.vz, speed: sp });
    // paddling birds: a ring every few seconds (more often when they swim), seeded per bird
    if (_WWA_SWIMMERS.test(cls) && R.look.rings) {
      const key = e.id == null ? e.obj + '@' + e.x + ',' + e.z : e.id, next = W.nextRing.get(key);
      if (next == null) W.nextRing.set(key, t + _wwaRng('ring0|' + key)() * 3);
      else if (t >= next) { _wwaRing(W, e.x, e.z, key, 0.12); W.nextRing.set(key, t + (sp > 0.05 ? 1.2 : 2.6) + _wwaRng('ring|' + key + '|' + Math.floor(t))() * 2); }
    }
  }
  // rain rings on the open water
  const wx = String(ctx.weather || ''), rain = /rain|drizzle|showers|thunder/.test(wx) ? (/drizzle/.test(wx) ? 0.4 : 1) : 0;
  if (rain && W.regions.length) {
    W.rainAcc += dt * 14 * rain * (W.degrade > 1 ? 0.4 : 1);
    while (W.rainAcc >= 1) {
      W.rainAcc -= 1;
      const R = W.regions[Math.floor(rnd() * W.regions.length)];
      for (let tries = 0; tries < 8; tries++) { const x = R.bb[0] + rnd() * (R.bb[2] - R.bb[0]), z = R.bb[1] + rnd() * (R.bb[3] - R.bb[1]); if (z > 0.5 && _wwaInPoly(x, z, R.P)) { _wwaRing(W, x, z, 'rain', 0.05); break; } }
    }
  }
  // buoyancy: a seeded bob per floater (no two in step), plus rocking from wakes passing within reach
  for (const [e, R] of floaters) {
    const key = e.id == null ? e.obj + '@' + e.x + ',' + e.z : e.id, r = _wwaRng('bob|' + key), ph = r() * 6.283, w = 1.1 + r() * 0.9, amp = 0.012 + 0.05 * R.look.ripple;
    let roll = Math.sin(t * w * 0.7 + ph * 1.3) * 0.6, dy = amp * Math.sin(t * w + ph), kmax = 0;
    // a passing wake: its front spreads from where the boat was at 0.8 x its speed; the strongest front over this floater rocks it
    for (const q of W.wakes) {
      if (q.src === key) continue;
      const age = q.age, reach = 0.5 + age * Math.max(0.4, q.speed) * 0.8, d = Math.hypot(e.x - q.x, e.z - q.z);
      if (d > reach + 6) continue;
      const k = Math.exp(-age / 6) * Math.exp(-Math.abs(d - reach) / 2) * _wwaClamp(q.speed, 0.2, 2);
      if (k > kmax) kmax = k;
    }
    if (kmax > 0.01) { roll += 9 * kmax * Math.sin(t * 3.1 + ph); dy += 0.06 * kmax * Math.sin(t * 3.1 + ph + 1); }
    const b = { dy: Math.round(dy * 1000) / 1000, roll: Math.round(roll * 100) / 100 };
    W.bob.set(key, b);
  }
  // leaves on the water in autumn: carried by the current (rivers) or barely drifting (still water), capped and pooled
  const month = Number.isFinite(ctx.month) ? ctx.month : null, autumn = ctx.season === 'autumn' || (month != null && month >= 8 && month <= 10);
  if (autumn) {
    W.leafAcc += dt * 0.25;
    while (W.leafAcc >= 1 && W.leaves.length < WORLD_WATER_CAPS.leaves) {
      W.leafAcc -= 1;
      const R = W.regions[Math.floor(rnd() * W.regions.length)];
      if (!R) break;
      const f = R.flow, fl = Math.hypot(f[0], f[1]);
      let x, z;
      for (let tries = 0; tries < 10; tries++) {
        x = R.bb[0] + rnd() * (R.bb[2] - R.bb[0]); z = R.bb[1] + rnd() * (R.bb[3] - R.bb[1]);
        if (fl > 0) { if (f[0] > 0) x = R.bb[0] + rnd() * (R.bb[2] - R.bb[0]) * 0.15; else if (f[0] < 0) x = R.bb[2] - rnd() * (R.bb[2] - R.bb[0]) * 0.15; if (f[1] < 0) z = R.bb[3] - rnd() * (R.bb[3] - R.bb[1]) * 0.15; else if (f[1] > 0) z = R.bb[1] + rnd() * (R.bb[3] - R.bb[1]) * 0.15; }
        if (_wwaInPoly(x, z, R.P)) break; x = null;
      }
      if (x != null) W.leaves.push({ x, z, region: R.id, age: 0, life: 120, spin: rnd() * 6.28, n: W.n++ });
    }
  }
  W.leaves = W.leaves.filter(q => {
    const R = W.regions.find(r => r.id === q.region);
    if (!R) return false;
    const wob = Math.sin(t * 0.7 + q.n) * 0.02;
    q.x += (R.flow[0] + wob) * dt; q.z += (R.flow[1] + wob * 0.5) * dt; q.spin += dt * 0.3;
    return _wwaInPoly(q.x, q.z, R.P);
  });
  // spray at falls (particles, when loaded)
  if (typeof worldEmit === 'function' && Array.isArray(world.falls) && world.falls.length) {
    W.spray += dt;
    if (W.spray > 0.25) {
      W.spray = 0;
      for (const f of world.falls) {
        const p = f.crest[Math.floor(rnd() * f.crest.length)];
        try { worldEmit(world, 'spray', { x: p[0], z: p[1] - 0.3, y: f.lower + 0.1, n: Math.min(6, 1 + Math.round(f.drop * f.width / 4)), up: 0.6 + f.drop }); } catch (e) { /* particles are optional */ }
      }
    }
  }
  return W;
}
/** The bob and roll of a floater now ({ dy metres, roll degrees }), { dy: 0, roll: 0 } when it has none. */
function worldWaterBob(world, e) {
  const W = world && world.water;
  if (!W || !e) return { dy: 0, roll: 0 };
  return W.bob.get(e.id == null ? e.obj + '@' + e.x + ',' + e.z : e.id) || { dy: 0, roll: 0 };
}
try {
  if (typeof worldSystem === 'function') {
    worldSystem({ id: 'water', phase: 'fx', after: ['wind'], rate: 30, budgetMs: 0.8, components: { read: ['transform', 'desc'], write: ['look'] },
      init(world) { worldWaterInit(world); if (world && world.cam) { try { world.falls = worldWaterFalls(world, world.cam); } catch (e) { world.falls = []; } } },
      update(world, dt) { worldWaterTick(world, dt, world.time || world.ctx); },
      onEvent: { wake(world, e) { worldWaterEvent(world, 'wake', e); } },
      degrade(level, world) { _wwaDegrade = level | 0; if (world && world.water) world.water.degrade = level | 0; } });
  }
} catch (e) { /* the systems runner refused: the water still draws, it just does not tick */ }

/* ---------- browser drawing ---------- */
/**
 * Draw a baked water result (worldWaterMirror with ripple: false) for a frame: the base once, then the reflection in horizontal
 * bands, each shifted by the ripple now. res.canvas / res.reflCanvas are made on first use. o: { vs, oy, wind, band (rows per
 * band, 3) }.
 */
function worldWaterDraw(ctx, res, R, t, o) {
  if (!ctx || !res || !res.w || typeof document === 'undefined') return 0;
  o = o || {};
  const mk = (img) => { const c = document.createElement('canvas'); c.width = res.w; c.height = res.h; c.getContext('2d').putImageData(new ImageData(img.data, res.w, res.h), 0, 0); return c; };
  if (!res.baseCanvas && res.base) res.baseCanvas = mk(res.base);
  if (!res.reflCanvas && res.refl) res.reflCanvas = mk(res.refl);
  let n = 0;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  if (res.baseCanvas) { ctx.drawImage(res.baseCanvas, res.x0, res.y0); n++; }
  if (res.reflCanvas) {
    // bands of 2 rows: with the slope cap of worldWaterRipple a band steps at most 0.6 px from the next (never a staircase)
    const bh = Math.max(1, Math.min(2, o.band || 2));
    for (let y = 0; y < res.h; y += bh) {
      const h = Math.min(bh, res.h - y), dx = worldWaterRipple(R, res.y0 + y, t, o);
      ctx.drawImage(res.reflCanvas, 0, y, res.w, h, res.x0 + dx, res.y0 + y, res.w, h); n++;
    }
  }
  ctx.restore();
  return n;
}
/** Rings, wakes and floating leaves of world.water, projected by cam (scene units -> device by vs, ox, oy). */
function worldWaterDrawFx(ctx, world, cam, o) {
  const W = world && world.water;
  if (!ctx || !W || !cam) return 0;
  o = o || {};
  const vs = o.vs || 1, ox = o.ox || 0, oy = o.oy || 0, P = (x, z, y) => { const d = Math.max(0.3, z); return [(cam.x0 + cam.f * x / d) * vs + ox, (_wwaRow(cam, d, y || 0)) * vs + oy, cam.f / d * vs]; };
  let n = 0;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.strokeStyle = 'rgba(236,244,248,1)'; ctx.lineWidth = Math.max(0.6, vs * 0.8);
  for (const r of W.rings) {
    const R = W.regions.find(q => _wwaInPoly(r.x, r.z, q.P));
    const u = r.age / r.life, rad = r.r0 + 1.1 * u, [X, Y, k] = P(r.x, r.z, R ? R.level : 0), rx = rad * k, ry = Math.max(0.4, rx * (cam.eye - (R ? R.level : 0)) / Math.max(0.3, r.z));
    ctx.globalAlpha = 0.55 * (1 - u) * (1 - u); ctx.beginPath(); ctx.ellipse(X, Y, rx, ry, 0, 0, 6.283); ctx.stroke(); n++;
  }
  for (const q of W.wakes) {
    const u = q.age / q.life, sp = Math.max(0.3, q.speed), len = 1 + q.age * sp * 0.7, h = Math.hypot(q.vx, q.vz) || 1, bx = -q.vx / h, bz = -q.vz / h, s = Math.tan(19.5 * Math.PI / 180);
    const a = P(q.x, q.z), l = P(q.x + (bx - bz * s) * len, q.z + (bz + bx * s) * len), rr = P(q.x + (bx + bz * s) * len, q.z + (bz - bx * s) * len);
    ctx.globalAlpha = 0.5 * (1 - u); ctx.beginPath(); ctx.moveTo(l[0], l[1]); ctx.lineTo(a[0], a[1]); ctx.lineTo(rr[0], rr[1]); ctx.stroke(); n++;
  }
  ctx.fillStyle = '#b8742c';
  for (const q of W.leaves) { const [X, Y, k] = P(q.x, q.z); ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.ellipse(X, Y, Math.max(0.6, 0.06 * k), Math.max(0.4, 0.03 * k), q.spin, 0, 6.283); ctx.fill(); n++; }
  ctx.restore();
  return n;
}
/** Falling water at a weir or fall: a curtain from the crest to the foot with streaks moving down, a foam band, a mist of spray. */
function worldWaterDrawFalls(ctx, falls, t, o) {
  if (!ctx || !falls || !falls.length) return 0;
  o = o || {};
  const vs = o.vs || 1, ox = o.ox || 0, oy = o.oy || 0, D = (p) => [p[0] * vs + ox, p[1] * vs + oy];
  let n = 0;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (const f of falls) {
    const T = f.top.map(D), F = f.foot.map(D);
    ctx.beginPath(); ctx.moveTo(T[0][0], T[0][1]); for (const p of T) ctx.lineTo(p[0], p[1]); for (let i = F.length - 1; i >= 0; i--) ctx.lineTo(F[i][0], F[i][1]); ctx.closePath();
    const yTop = Math.min(...T.map(p => p[1])), yFoot = Math.max(...F.map(p => p[1]));
    const g = ctx.createLinearGradient(0, yTop, 0, Math.max(yTop + 1, yFoot));
    g.addColorStop(0, f.kind === 'lock' ? 'rgba(70,80,78,0.95)' : 'rgba(190,212,218,0.95)'); g.addColorStop(1, 'rgba(246,251,255,0.98)');
    ctx.fillStyle = g; ctx.fill(); n++;
    // streaks: thin lines down the curtain, their dash moving with the fall
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = Math.max(0.5, vs * 0.7); ctx.setLineDash([4 * vs, 6 * vs]); ctx.lineDashOffset = -((t || 0) * 40 * vs) % (10 * vs);
    for (let i = 0; i < T.length - 1; i++) {
      const steps = Math.max(2, Math.round(Math.hypot(T[i + 1][0] - T[i][0], T[i + 1][1] - T[i][1]) / (5 * vs)));
      for (let k = 0; k < steps; k++) { const u = (k + 0.5) / steps, a = [T[i][0] + (T[i + 1][0] - T[i][0]) * u, T[i][1] + (T[i + 1][1] - T[i][1]) * u], b = [F[i][0] + (F[i + 1][0] - F[i][0]) * u, F[i][1] + (F[i + 1][1] - F[i][1]) * u]; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    }
    ctx.restore();
    // foam at the foot and a soft mist above it
    if (f.kind !== 'lock' || f.drop > 0.3) {
      const rnd = _wwaRng('foam|' + f.id + '|' + Math.floor((t || 0) * 8));
      ctx.fillStyle = 'rgba(250,252,255,0.8)';
      for (let i = 0; i < F.length - 1; i++) for (let k = 0; k < 10; k++) {
        const u = rnd(), p = [F[i][0] + (F[i + 1][0] - F[i][0]) * u, F[i][1] + (F[i + 1][1] - F[i][1]) * u], r = (1.5 + rnd() * 3) * vs;
        ctx.globalAlpha = 0.5 + 0.4 * rnd(); ctx.beginPath(); ctx.ellipse(p[0], p[1] + rnd() * 2 * vs, r * 1.6, r * 0.6, 0, 0, 6.283); ctx.fill(); n++;
      }
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
  return n;
}
/** The glitter road (worldGlitterPlan, light package) twinkling in three groups, drifting with the ripple. */
function worldWaterDrawGlitter(ctx, plan, R, t, o) {
  if (!ctx || !plan || !plan.kind || !plan.glints.length) return 0;
  o = o || {};
  const vs = o.vs || 1, ox = o.ox || 0, oy = o.oy || 0;
  let n = 0;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.lineCap = 'round'; ctx.strokeStyle = plan.col; ctx.lineWidth = 2.2 * vs;
  for (let g = 0; g < 3; g++) {
    ctx.globalAlpha = 0.85 * plan.k * (0.4 + 0.6 * Math.abs(Math.sin((t || 0) * (1.3 + g * 0.55) + g * 2.1)));
    ctx.beginPath();
    for (const s of plan.glints) if (s.g === g) { const dx = R ? worldWaterRipple(R, s.y * vs + oy, t, o) : 0, x = s.x * vs + ox + dx, y = s.y * vs + oy; ctx.moveTo(x, y); ctx.lineTo(x + s.len * vs, y); }
    ctx.stroke(); n++;
  }
  ctx.restore();
  return n;
}
