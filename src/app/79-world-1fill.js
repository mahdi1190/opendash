/* ============================================================
   WORLD ENGINE (scene format v3.1): the fill (docs/dev/WORLD_ENGINE.md 12.3; WORLD_ENGINE_REQUIREMENTS.md P5, P6, P7, P8, C3, C6).
   Package `kb`, private prefix _wfl. PURE classic script: only constants and functions at load. It reads the knowledge base
   (79-world-0kb.js) and, through typeof guards, the core and sense (worldSurfaceAt, worldPlaceProbe, worldPlaceOk,
   worldPlaceAdd, worldObjectInfo), look (worldCoverage, worldBackdrop, worldEntityBox) and the v2 camera maths (sceneProject,
   sceneUnproject, sceneGroundHeight). A missing package removes a detail; the fill still runs on its own checks. Never throws.

     WORLD_FILL_STYLES               per place style: what dresses each surface (near / mid / far / seasonal accents), the edges
                                     (water banks by water kind, verges, kerbs and pavements, wall bases, hedgerows), the framing
                                     options and the default backdrop
     WORLD_RICHNESS_FLOOR            the floor of worldRichness (P7) and the box-measure target by place kind
     worldFill(world, o)             -> log: dresses edges (P5), frames the near band (C3), gives paving its sparse street furniture
                                     and unlived paving and paths their people (a population), fills every visible undressed
                                     surface by kind, style and depth (P6) and keeps filling with the next tier until the frame has
                                     <= 15 % bare (C6, look's worldCoverage, over the entities present all year), then the richness
                                     tier lifts the box measure towards the place kind's target or a converted scene's source score
                                     (P7). Nothing auto-placed hides a landmark's main face (P8). spec fill: false (or o.fill ===
                                     false) switches the auto-fill off; edges and framing still run. Idempotent (world.fillState).
                                     Things that come and go by date (K6: flowers, lilies, leaf litter) are placed only with
                                     o.seasonal or when the renderer hides absent statics (worldStaticPresent, typeof).
     worldRichness(world, cam, o)    -> { near, mid, far: { cover, variety }, score, bare, ok, floor, box: { near, mid, far, score } }
                                     (P7; box is the tools' critic measure: depth bands near < 15 m, mid 15-80 m, far beyond)
     worldFillStyle(world, o)        -> the style key the fill uses for a world

   Every generated entity carries auto: 'edge' | 'frame' | 'fill' and goes through sense's worldPlaceAdd(world, e, why) when
   it exists (its log lists each one); otherwise the fill builds the entity itself after its own habitat (K1), footprint
   overlap (P2), walking-line (P3), frame-cut (C1) and landmark (P8) checks and logs each one. Placement is seeded and
   clustered (clumps, stands with gaps), never rows. The entries go into world.log (when the world has one) and are returned.
   o: { ctx (WorldTimeCtx), cam, fill, style, floor: { score } (a converted scene's source score, box measure), seasonal, maxTier (5),
        maxAuto (1400), W (1600), H (900), overscan (0.18 of W each side) }.
   ============================================================ */

/* ---------- styles: built from the style kits (79-world-0kits.js; N1) ---------- */
// score / near / mid / far: the frame-band floor (cover below the horizon, variety); box: the default target of the box measure
// (worldRichness(...).box, the same measure as the tools' critic: a converted scene must reach its source's) by place kind
const WORLD_RICHNESS_FLOOR = Object.freeze({ score: 62, near: Object.freeze({ cover: 0.7, variety: 2 }), mid: Object.freeze({ cover: 0.7, variety: 3 }), far: Object.freeze({ cover: 0.6, variety: 2 }),
  box: Object.freeze({ rural: 96, park: 96, town: 75, city: 66 }) });
// bands: near z < 12 m (low dressing only), mid 12-35 m, far 35-120 m (structured trees only), distant beyond (dome trees allowed)
const _WFL_NEAR_Z = 12, _WFL_MID_Z = 35, _WFL_FAR_Z = 120, _WFL_EDGE_ZMAX = 150, _WFL_FILL_ZMAX = 260;
// every kit and every legacy style name (canal-wooded, city-victorian ...) as a fill style: what dresses each surface (near / mid
// / far / distant / seasonal accents), the edges, the framing options, the richness pools, the default life and backdrop
const WORLD_FILL_STYLES = (() => {
  const out = {};
  if (typeof WORLD_STYLE_KITS !== 'object' || !WORLD_STYLE_KITS) return Object.freeze(out);
  for (const k of Object.keys(WORLD_STYLE_KITS).concat(Object.keys(WORLD_KIT_ALIAS))) { const st = worldKitFillStyle(k); if (st) out[k] = st; }
  return _wkbFreeze(out);
})();
// surface kind -> fill group
const _WFL_GROUP = { grass: 'grass', lawn: 'grass', park: 'grass', verge: 'grass', garden: 'grass', meadow: 'grass', bank: 'grass', ground: null,
  heath: 'heath', field: 'field', wood: 'wood', sand: 'sand', beach: 'sand', shingle: 'sand', pavement: 'paving', plaza: 'paving', platform: 'paving', driveway: 'paving',
  path: 'path', towpath: 'path', track: 'path', cycleway: 'path', water: 'water', reeds: 'wet', bed: 'wet', mud: 'wet', reedbed: 'wet' };
const _WFL_DRESSED = new Set(['water', 'reeds', 'bed', 'hedge', 'weir', 'rail', 'tram', 'reedbed']);
const _WFL_WALK = new Set(['path', 'pavement', 'towpath', 'plaza', 'boardwalk', 'bridge-deck', 'deck', 'platform', 'stairs', 'ramp', 'crossing', 'track', 'cycleway', 'steps', 'driveway', 'jetty', 'pontoon']);

/* ---------- small helpers ---------- */
const _wflNum = v => typeof v === 'number' && Number.isFinite(v);
const _wflR2 = v => Math.round(v * 100) / 100;
const _wflDeg = r => r * 180 / Math.PI;
function _wflRng(seed) {
  let a = _wkbHash(seed) || 1;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function _wflPick(list, r, seen) {
  if (!Array.isArray(list) || !list.length) return null;
  // seen (a Map id -> count): favour kinds not placed yet, damp kinds placed many times (variety, P7)
  if (seen instanceof Map) list = list.map(([id, w]) => [id, w * (seen.has(id) ? 1 / (1 + seen.get(id) / 3) : 2)]);
  let tot = 0; for (const [, w] of list) tot += Math.max(0, w);
  if (!(tot > 0)) return null;
  let u = r() * tot;
  for (const [id, w] of list) { u -= Math.max(0, w); if (u <= 0) return id; }
  return list[list.length - 1][0];
}
function _wflInPoly(P, x, z) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
function _wflSeg(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz, t = L2 > 0 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)) : 0;
  const px = a[0] + t * dx, pz = a[1] + t * dz;
  return { d: Math.hypot(x - px, z - pz), px, pz, dir: _wflDeg(Math.atan2(dx, dz)), t };
}
/** Nearest point of a polyline (open) or ring (closed). */
function _wflNear(pts, x, z, closed) {
  let best = { d: Infinity, px: x, pz: z, dir: 0 };
  const n = pts.length, m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) { const r = _wflSeg(x, z, pts[i], pts[(i + 1) % n]); if (r.d < best.d) best = r; }
  return best;
}
function _wflContains(s, x, z) {
  if (Array.isArray(s.poly) && s.poly.length >= 3) return _wflInPoly(s.poly, x, z);
  if (Array.isArray(s.path) && s.path.length >= 2 && s.width > 0) return _wflNear(s.path, x, z, false).d <= s.width / 2;
  return false;
}
function _wflOffsetLine(P, o) {
  return P.map((p, i) => {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
    // +o: to the right of the path direction (x right, z forward: the right normal of (dx, dz) is (dz, -dx))
    return [p[0] + o * dz / L, p[1] - o * dx / L];
  });
}
const _wflLog = (F, e) => { F.log.push(Object.assign({ id: null, obj: null, action: 'fill', rule: 'P6', reason: '', by: 'kb' }, e)); };

/* ---------- the camera ---------- */
function _wflProj(F, x, z, y) {
  const cam = F.cam;
  if (typeof sceneProject === 'function') return sceneProject(cam, x, z, y);
  const d = Math.max(0.01, z), k = cam.f / d;
  return { X: cam.x0 + k * x, Y: cam.horizon + k * (cam.eye - (y == null ? 0 : y)), k };
}
function _wflGround(F, x, z) { return typeof sceneGroundHeight === 'function' ? sceneGroundHeight(F.cam, x, z) : 0; }
function _wflUnproject(cam, X, Y) {
  if (typeof sceneUnproject === 'function') return sceneUnproject(cam, X, Y);
  if (!(Y > cam.horizon + 1e-6)) return null;
  const d = cam.f * cam.eye / (Y - cam.horizon);
  return { x: (X - cam.x0) * d / cam.f, d };
}
/** The frame x at depth z of a screen column X. */
const _wflXAt = (cam, X, z) => (X - cam.x0) * z / cam.f;
const _wflDims = (obj) => { const kb = worldKb(obj); if (kb && kb.size && _wflNum(kb.size.h0)) return { h: kb.size.h0, l: kb.size.l || 1, w: kb.size.w || 0.5 }; const r = typeof sceneObjReal === 'function' ? sceneObjReal(obj) : null; return r ? { h: r.h, l: r.l, w: r.w } : { h: 1, l: 1, w: 0.6 }; };
/** The screen box [X0, Y0, X1, Y1] of an entity standing at its real size (look's worldEntityBox when loaded). */
/** The overlap of two screen boxes [x0, y0, x1, y1] as a share of the smaller one's area. */
function _wflBoxOverlap(a, b) {
  const w = Math.min(a[2], b[2]) - Math.max(a[0], b[0]), h = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
  if (!(w > 0 && h > 0)) return 0;
  const A = Math.max(1e-6, Math.min((a[2] - a[0]) * (a[3] - a[1]), (b[2] - b[0]) * (b[3] - b[1])));
  return w * h / A;
}
function _wflBox(F, e) {
  if (e && Array.isArray(e.primBox)) return e.primBox;   // an extruded building or wall: its own screen box (worldPrimEntities)
  const kb = e && e.obj ? worldKb(e.obj) : null;
  if (kb && kb.hang && Array.isArray(kb.art)) {
    const z = Math.max(0.05, e.z), y = _wflNum(e.y) ? e.y : _wflGround(F, e.x, z), p = _wflProj(F, e.x, z, y), mir = _wflNum(e.facing) && e.facing > 180 && e.facing < 360 ? -1 : 1;
    const xa = p.X + kb.art[0] * p.k * mir, xb = p.X + kb.art[2] * p.k * mir;
    return [Math.min(xa, xb), p.Y - kb.art[3] * p.k, Math.max(xa, xb), p.Y - kb.art[1] * p.k];
  }
  if (typeof worldEntityBox === 'function') { try { const b = worldEntityBox(F.cam, e); if (b && b.every(_wflNum)) return b; } catch (err) { /* own */ } }
  const d = _wflDims(e.obj), z = Math.max(0.05, e.z), y = _wflNum(e.y) ? e.y : _wflGround(F, e.x, z), p = _wflProj(F, e.x, z, y);
  const h = _wflNum(e.height) ? e.height : d.h, hw = d.l * p.k / 2;
  return [p.X - hw, p.Y - h * p.k, p.X + hw, p.Y];
}

/* ---------- the world index (surfaces, water, walking lines, solids) ---------- */
function _wflIndexOf(F) {
  if (F.ix) return F.ix;
  const W = F.world, surfs = (W.surfaces || []).filter(s => s && (Array.isArray(s.poly) || (Array.isArray(s.path) && s.width > 0)));
  const ix = { surfs, waters: [], walks: [], roads: [], solids: [], cell: 4, grid: new Map() };
  for (const s of surfs) {
    if (s.kind === 'water') ix.waters.push({ s, rings: _wflRings(s), calm: !(s.water === 'river' || s.water === 'estuary' || s.water === 'sea' || s.hint === 'breezy' || s.flow), shallow: _wflNum(s.shallow) ? s.shallow : 0.5 });
    else if (_WFL_WALK.has(s.kind)) ix.walks.push(s);
    else if (s.kind === 'road' || s.kind === 'tramway') ix.roads.push(s);
  }
  for (const e of W.entities || []) _wflIndexEnt(ix, e);
  for (const b of W.buildings || []) if (b && Array.isArray(b.foot) && b.foot.length >= 3) _wflIndexEnt(ix, { foot: b.foot, solidity: 'solid', attach: 'ground', id: b.id });
  F.ix = ix;
  return ix;
}
function _wflIndexEnt(ix, e) {
  if (!e || !Array.isArray(e.foot) || e.foot.length < 3 || e.backdrop) return;
  const a = String(e.attach || '');
  // things in the air or on a wall or deck leave the ground free; an 'air' object standing on the ground (a framing trunk the
  // library classes as overhead art) still has its footprint there
  if (/^(wall|deck)/.test(a) || (/^air/.test(a) && !(Math.abs(Number(e.y) || 0) < 0.3))) return;
  const sol = e.solidity;
  if (sol !== 'solid' && sol !== 'walkable' && sol !== 'overhead') return;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of e.foot) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
  const rec = { e, foot: e.foot, sol, box: [x0, z0, x1, z1] };
  ix.solids.push(rec);
  for (let i = Math.floor(x0 / ix.cell); i <= Math.floor(x1 / ix.cell); i++) for (let j = Math.floor(z0 / ix.cell); j <= Math.floor(z1 / ix.cell); j++) {
    const k = i + ',' + j; let c = ix.grid.get(k); if (!c) ix.grid.set(k, c = []); c.push(rec);
  }
}
/** Water boundary rings: a polygon's own ring (closed) or a centre line's two banks (open). */
function _wflRings(s) {
  if (Array.isArray(s.poly)) return [{ pts: s.poly, closed: true }];
  return [{ pts: _wflOffsetLine(s.path, -s.width / 2), closed: false }, { pts: _wflOffsetLine(s.path, s.width / 2), closed: false }];
}
/** The topmost surface at a ground point (the core's worldSurfaceAt when loaded: decks first, solids cut water). */
function _wflSurfAt(F, x, z) {
  if (typeof worldSurfaceAt === 'function') { try { return worldSurfaceAt(F.world, x, z); } catch (e) { /* own */ } }
  const S = _wflIndexOf(F).surfs;
  for (let i = S.length - 1; i >= 0; i--) if (_wflContains(S[i], x, z)) return S[i];
  return null;
}
/** The ground surface at a point from the fill's own index (no deck scan): for sampling the frame, where decks do not matter. */
function _wflSurfFast(F, x, z) {
  const S = _wflIndexOf(F).surfs;
  for (let i = S.length - 1; i >= 0; i--) if (_wflContains(S[i], x, z)) return S[i];
  return null;
}
/** The fill's probe (the core's worldPlaceProbe shape): sense's probe wins where it has a value. */
function _wflProbe(F, x, z) {
  const ix = _wflIndexOf(F), s = _wflSurfAt(F, x, z), kind = s ? s.kind : null;
  const p = { x, z, surface: s, surf: s, surfId: s ? s.id : null, kind, tags: null, waterDist: Infinity, bankDist: Infinity, pathDist: Infinity, walkDist: Infinity, calm: true, under: false };
  let inWater = null;
  for (const w of ix.waters) {
    const inside = _wflContains(w.s, x, z);
    for (const r of w.rings) {
      const n = _wflNear(r.pts, x, z, r.closed);
      if (n.d < p.bankDist) { p.bankDist = n.d; p.bankDir = n.dir; p.toWater = _wflDeg(Math.atan2(n.px - x, n.pz - z)); }
    }
    if (inside) { inWater = w; p.waterDist = 0; p.calm = w.calm; p.shallow = w.shallow; }
  }
  if (!inWater) p.waterDist = p.bankDist;
  for (const s2 of ix.walks) {
    if (Array.isArray(s2.path)) {
      const n = _wflNear(s2.path, x, z, false);
      if (n.d < p.pathDist) { p.pathDist = n.d; p.pathDir = n.dir; p.toPath = _wflDeg(Math.atan2(n.px - x, n.pz - z)); }
      p.walkDist = Math.min(p.walkDist, Math.max(0, n.d - s2.width / 2));
    } else if (Array.isArray(s2.poly)) {
      if (_wflInPoly(s2.poly, x, z)) p.walkDist = 0;
      else { const n = _wflNear(s2.poly, x, z, true); p.walkDist = Math.min(p.walkDist, n.d); if (!_wflNum(p.toPath) || n.d < (p._pd || Infinity)) { p._pd = n.d; p.toPath = _wflDeg(Math.atan2(n.px - x, n.pz - z)); p.pathDir = n.dir; } }
    }
  }
  for (const r of ix.roads) if (Array.isArray(r.path)) {
    const n = _wflNear(r.path, x, z, false);
    if (!_wflNum(p._rd) || n.d < p._rd) {
      p._rd = n.d; p.roadDir = n.dir; p.toRoad = _wflDeg(Math.atan2(n.px - x, n.pz - z));
      const tx = Math.sin(n.dir * Math.PI / 180), tz = Math.cos(n.dir * Math.PI / 180);
      p.roadSide = ((x - n.px) * tz - (z - n.pz) * tx) >= 0 ? 1 : -1;   // +1: right of the centre line looking along roadDir
    }
  }
  // overhead spans and footprints under the point
  const cell = ix.grid.get(Math.floor(x / ix.cell) + ',' + Math.floor(z / ix.cell)) || [];
  for (const rec of cell) if (rec.sol === 'overhead' && _wflInPoly(rec.foot, x, z)) p.under = true;
  // tags: the surface's, plus the distance tags (the core's probe adds the same)
  const tags = new Set(worldKbSurfaceTags(kind == null ? 'ground' : kind));
  if (!s && F.style && F.style.ground) for (const t of worldKbSurfaceTags(F.style.ground)) tags.add(t);
  if (inWater) { if (p.bankDist <= Math.max(0.3, inWater.shallow)) tags.add('water-margin'); }
  else if (p.waterDist <= 0.6) { tags.add('water-margin'); tags.add('wet'); tags.add('bank'); }
  else if (p.waterDist <= 2.5) tags.add('bank');
  if ((tags.has('grass') || tags.has('soil')) && p.walkDist > 0 && p.walkDist <= 1.5) tags.add('grass-edge');
  if (_WFL_WALK.has(kind) && p.pathDist < 0.6) tags.add('walkline');
  p.tags = [...tags];
  // sense's probe, when loaded, is the authority for what it knows
  if (typeof worldPlaceProbe === 'function') {
    try {
      const q = worldPlaceProbe(F.world, x, z);
      if (q && typeof q === 'object') {
        for (const k of Object.keys(q)) if (q[k] != null && !(typeof q[k] === 'number' && !Number.isFinite(q[k]))) p[k] = q[k];
        if (!Array.isArray(q.tags)) p.tags = [...tags];
        if (typeof q.surface === 'string') p.surfId = q.surface;
        p.surf = s;
        if (_wflNum(q.waterDist) && q.waterDist < 0) p.waterDist = 0;   // the core counts depth into the water below zero
      }
    } catch (e) { /* own probe */ }
  }
  return p;
}

/* ---------- N2: the vista and the sky ---------- */
const _WFL_SKY_C = 40, _WFL_SKY_R = 16, _WFL_VISTA_MAX = 0.35;
/** The silhouette cells an entity covers on a grid over a screen rectangle [X0, Y0, X1, Y1] (look's worldArtMask; else its box). */
function _wflCells(F, e, kb, rect, C, R, fn) {
  const b = _wflBox(F, e), cw = (rect[2] - rect[0]) / C, ch = (rect[3] - rect[1]) / R;
  if (!(cw > 0 && ch > 0) || b[2] < rect[0] || b[0] > rect[2] || b[3] < rect[1] || b[1] > rect[3]) return;
  const mask = typeof worldArtMask === 'function' ? worldArtMask(e.obj, e.variant, F.world.season || 'summer') : null;
  const i0 = Math.max(0, Math.floor((b[0] - rect[0]) / cw)), i1 = Math.min(C - 1, Math.floor((b[2] - rect[0]) / cw)), j0 = Math.max(0, Math.floor((b[1] - rect[1]) / ch)), j1 = Math.min(R - 1, Math.floor((b[3] - rect[1]) / ch));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    if (mask) {
      const u = ((rect[0] + (i + 0.5) * cw) - b[0]) / Math.max(1e-6, b[2] - b[0]), v = ((rect[1] + (j + 0.5) * ch) - b[1]) / Math.max(1e-6, b[3] - b[1]);
      const flip = _wflNum(e.facing) && e.facing > 180 && e.facing < 360, gi = Math.floor((flip ? 1 - u : u) * mask.n), gj = Math.floor(v * mask.n);
      if (gi < 0 || gj < 0 || gi >= mask.n || gj >= mask.n || !mask.grid[gj * mask.n + gi]) continue;
    }
    fn(j * C + i);
  }
}
/**
 * The view the fill must keep (N2): the VISTA, the screen area where the main leading lines (the walks and waters running away
 * from the camera) meet the horizon, and the SKY above the horizon down to the kit's minimum share. Both are grids marked by
 * what stands there (silhouettes), the author's things and the backdrop first.
 */
function _wflViewInit(F) {
  const cam = F.cam, hz = cam.horizon, W = F.W, H = F.H, ix = _wflIndexOf(F), x0 = _wflNum(cam.x0) ? cam.x0 : W / 2;
  // the leading lines: walk and water surfaces that reach from the lower frame to beyond 60 m
  const pts = [];
  for (const sf of ix.waters.map(w => w.s).concat(ix.walks)) {
    const P = Array.isArray(sf.path) ? sf.path : Array.isArray(sf.poly) ? sf.poly : null;
    if (!P || P.length < 2) continue;
    const zs = P.map(p => p[1]);
    if (!(Math.min(...zs) < 15 && Math.max(...zs) > 60)) continue;
    for (let z = 60; z <= Math.min(180, Math.max(...zs)); z += 15) {
      let xs = [];
      if (Array.isArray(sf.path)) { const near = _wflNear(sf.path, 0, z, false); for (let x = -400; x <= 400; x += 2) if (_wflContains(sf, x, z)) xs.push(x); void near; }
      else for (let x = -400; x <= 400; x += 2) if (_wflInPoly(sf.poly, x, z)) xs.push(x);
      if (xs.length) { pts.push(x0 + cam.f * Math.min(...xs) / z, x0 + cam.f * Math.max(...xs) / z); }
    }
  }
  F.vista = null;
  if (pts.length >= 2) {
    // the vanishing area: centred on the far leading lines, never wider than a third of the frame (the sides stay the fill's)
    const mid = pts.slice().sort((a, b) => a - b)[Math.floor(pts.length / 2)], half = Math.min(W / 6, (Math.max(...pts) - Math.min(...pts)) / 2 + 0.04 * W);
    const X0 = Math.max(0, mid - half), X1 = Math.min(W, mid + half);
    if (X1 - X0 > 0.04 * W) F.vista = { rect: [X0, Math.max(0, hz - 0.22 * H), X1, Math.min(H, hz + 0.05 * (H - hz))], cells: new Uint8Array(16 * 8), n: 0 };
  }
  // the sky: the frame above the horizon; its minimum share from the kit (N2). Where the author already left less open sky than the
  // kit asks, the fill may close at most a third of it (the trees round a pond rise into the sky; the upper sky stays open)
  F.sky = hz > 2 ? { rect: [0, 0, W, hz], cells: new Uint8Array(_WFL_SKY_C * _WFL_SKY_R), n: 0, min: 0 } : null;
  for (const e of F.world.entities || []) if (e && e.obj && !e.backdrop) { const kb = worldKb(e.obj); if (kb) _wflViewMark(F, e, kb, true); }
  for (const e of _wflBackdrop(F.world, cam)) if (e && e.obj) _wflViewMark(F, e, worldKb(e.obj) || {}, true);
  if (F.sky) {
    const free = 1 - F.sky.n / F.sky.cells.length, want = Array.isArray(F.style.sky) ? F.style.sky[0] : 0.2;
    // the minimum free share of the sky area: the kit's frame share as a share of the area above the horizon
    F.sky.min = Math.min(free * 2 / 3, Math.max(0.05, want * H / hz));
  }
}
function _wflViewMark(F, e, kb, init) {
  if (!e || !e.obj || !kb) return;
  if (F.vista && (init || e.z < 260)) _wflCells(F, e, kb, F.vista.rect, 16, 8, k => { if (!F.vista.cells[k]) { F.vista.cells[k] = 1; F.vista.n++; } });
  if (F.sky) _wflCells(F, e, kb, F.sky.rect, _WFL_SKY_C, _WFL_SKY_R, k => { if (!F.sky.cells[k]) { F.sky.cells[k] = 1; F.sky.n++; } });
}
/** Would this auto item close the vista (more than 35 % of it covered) or take the sky below its minimum? */
function _wflBlocksView(F, c, kb, b) {
  if (!kb || !(kb.size.h0 >= 1.8)) return false;
  const e = { obj: c.obj, x: c.x, z: c.z, y: c.y, variant: c.variant };
  if (F.vista) {
    let add = 0; _wflCells(F, e, kb, F.vista.rect, 16, 8, k => { if (!F.vista.cells[k]) add++; });
    if (add && (F.vista.n + add) / F.vista.cells.length > _WFL_VISTA_MAX) return true;
  }
  if (F.sky && b[1] < F.cam.horizon) {
    let add = 0; _wflCells(F, e, kb, F.sky.rect, _WFL_SKY_C, _WFL_SKY_R, k => { if (!F.sky.cells[k]) add++; });
    if (add && 1 - (F.sky.n + add) / F.sky.cells.length < F.sky.min) return true;
  }
  return false;
}

/* ---------- placement ---------- */
/** Does a candidate circle (x, z, r) hit a solid or walkable footprint (P2)? */
function _wflHits(F, x, z, r, solidOnly) {
  const ix = _wflIndexOf(F), c = ix.cell, seen = new Set();
  for (let i = Math.floor((x - r) / c); i <= Math.floor((x + r) / c); i++) for (let j = Math.floor((z - r) / c); j <= Math.floor((z + r) / c); j++) {
    for (const rec of ix.grid.get(i + ',' + j) || []) {
      if (seen.has(rec)) continue; seen.add(rec);
      if (rec.sol === 'overhead' || (solidOnly && rec.sol !== 'solid')) continue;
      if (x + r < rec.box[0] || x - r > rec.box[2] || z + r < rec.box[1] || z - r > rec.box[3]) continue;
      if (_wflInPoly(rec.foot, x, z) || _wflNear(rec.foot, x, z, true).d < r + 0.05) return rec;
    }
  }
  return null;
}
/** The penetration depth of two convex polygons (separating axes), 0 when apart. */
function _wflPen(A, B) {
  let best = Infinity;
  for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], nx = -(b[1] - a[1]), nz = b[0] - a[0], L = Math.hypot(nx, nz);
    if (!L) continue;
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const q of A) { const v = (q[0] * nx + q[1] * nz) / L; if (v < a0) a0 = v; if (v > a1) a1 = v; }
    for (const q of B) { const v = (q[0] * nx + q[1] * nz) / L; if (v < b0) b0 = v; if (v > b1) b1 = v; }
    const o = Math.min(a1, b1) - Math.max(a0, b0);
    if (o <= 0) return 0;
    if (o < best) best = o;
  }
  return best === Infinity ? 0 : best;
}
/** Does a candidate footprint polygon overlap a solid (or walkable) footprint (P2)? */
function _wflHitsPoly(F, poly, solidOnly) {
  const ix = _wflIndexOf(F), c = ix.cell, seen = new Set();
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of poly) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
  for (let i = Math.floor(x0 / c); i <= Math.floor(x1 / c); i++) for (let j = Math.floor(z0 / c); j <= Math.floor(z1 / c); j++) {
    for (const rec of ix.grid.get(i + ',' + j) || []) {
      if (seen.has(rec)) continue; seen.add(rec);
      if (rec.sol === 'overhead' || (solidOnly && rec.sol !== 'solid')) continue;
      if (x1 < rec.box[0] || x0 > rec.box[2] || z1 < rec.box[1] || z0 > rec.box[3]) continue;
      if (_wflPen(poly, rec.foot) > 0.03) return rec;
    }
  }
  return null;
}
/** Spacing between auto items (no stacked clones): a hash of the placed items' discs. */
function _wflSpacingOk(F, x, z, sp, obj) {
  const c = 2, out = F.spacing;
  for (let i = Math.floor((x - sp) / c); i <= Math.floor((x + sp) / c); i++) for (let j = Math.floor((z - sp) / c); j <= Math.floor((z + sp) / c); j++) {
    for (const q of out.get(i + ',' + j) || []) { const need = q.obj === obj ? Math.max(sp, q.sp) : Math.min(sp, q.sp) * 0.7; if (Math.hypot(q.x - x, q.z - z) < need) return false; }
  }
  return true;
}
function _wflSpacingAdd(F, x, z, sp, obj) { const k = Math.floor(x / 2) + ',' + Math.floor(z / 2); let c = F.spacing.get(k); if (!c) F.spacing.set(k, c = []); c.push({ x, z, sp, obj }); }
/** C1: a non-framing entity larger than 25 % of the frame may not be cut by the frame edge; nothing auto-placed is a giant. */
function _wflCut(F, b) {
  const area = Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1]);
  if (area <= 0.25 * F.W * F.H) return false;
  return b[0] < 0 || b[2] > F.W || b[1] < 0 || b[3] > F.H;
}
/** P8: nothing auto-placed hides a declared landmark's main face (a coarse grid per landmark; at most 8 % of it, tufts at its foot). */
function _wflLandmarks(F) {
  const out = [];
  for (const e of F.world.entities || []) {
    if (!e || !e.landmark || !(e.z > 0)) continue;
    const b = _wflBox(F, e), cx0 = Math.max(0, b[0]), cx1 = Math.min(F.W, b[2]), cy0 = Math.max(0, b[1]), cy1 = Math.min(F.H, b[3]);
    if (!(cx1 > cx0 && cy1 > cy0)) continue;
    const zf = Array.isArray(e.foot) && e.foot.length ? Math.min(...e.foot.map(p => p[1])) : e.z;
    out.push({ id: e.id || e.obj, box: [cx0, cy0, cx1, cy1], zf, n: 16, m: 10, cov: new Uint8Array(160), used: 0 });
  }
  return out;
}
function _wflLandmarkCells(L, b) {
  // the main face: the landmark's box above its bottom row (the ground at its foot may carry low dressing)
  const out = [], cw = (L.box[2] - L.box[0]) / L.n, ch = (L.box[3] - L.box[1]) / L.m;
  for (let i = 0; i < L.n; i++) for (let j = 0; j < L.m - 1; j++) {
    const X = L.box[0] + (i + 0.5) * cw, Y = L.box[1] + (j + 0.5) * ch;
    if (X >= b[0] && X <= b[2] && Y >= b[1] && Y <= b[3] && !L.cov[i * L.m + j]) out.push(i * L.m + j);
  }
  return out;
}
function _wflHidesLandmark(F, b, z) {
  for (const L of F.landmarks) {
    if (!(z < L.zf)) continue;
    const add = _wflLandmarkCells(L, b);
    if (add.length && (L.used + add.length) / (L.n * (L.m - 1)) > 0.08) return L.id;
  }
  return null;
}
function _wflLandmarkMark(F, b, z) { for (const L of F.landmarks) if (z < L.zf) for (const c of _wflLandmarkCells(L, b)) { L.cov[c] = 1; L.used++; } }
/** The world footprint of a descriptor at (x, z) with facing (the core's convention: length along the facing). */
function _wflFoot(kb, x, z, facing) {
  const f = (_wflNum(facing) ? facing : 90) * Math.PI / 180, hx = Math.sin(f), hz = Math.cos(f), rx = Math.cos(f), rz = -Math.sin(f);
  if (kb.foot !== 'box') { const out = [], r = kb.r || 0.2; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; out.push([_wflR2(x + r * Math.cos(a)), _wflR2(z + r * Math.sin(a))]); } return out; }
  // front classes (benches, buildings, stalls, signs) look along their facing: their length lies across it
  const front = ['path', 'view', 'street'].includes(kb.orient);
  const L = ((front ? kb.size.w : kb.size.l) || 1) / 2, Wd = ((front ? kb.size.l : kb.size.w) || 0.5) / 2;
  return [[-L, -Wd], [L, -Wd], [L, Wd], [-L, Wd]].map(([u, v]) => [_wflR2(x + u * hx + v * rx), _wflR2(z + u * hz + v * rz)]);
}
/** Build the entity record when sense is not loaded (the core's entity shape, 1.2). */
function _wflMake(F, c, kb, probe) {
  const info = typeof worldObjectInfo === 'function' ? worldObjectInfo(c.obj) : null;
  const attach = c.attach || (probe && probe.kind === 'water' && kb.floats ? 'water' : 'ground');
  let y = _wflGround(F, c.x, c.z), waterline = null;
  if (attach === 'water') { const s = probe && probe.surf; const lvl = s && _wflNum(s.level) ? s.level : (_wflNum(F.cam.water) ? F.cam.water : 0); waterline = lvl; y = lvl - (kb.sink || 0); }
  else if (attach === 'air') y += _wflNum(c.y) ? c.y : 0;
  const facing = _wflNum(c.facing) ? c.facing : 90;
  const solidity = info && info.solidity && kb.solidity !== 'water' ? info.solidity : kb.solidity;
  return { id: c.id, obj: c.obj, cls: info ? info.cls : kb.coreCls, kbCls: kb.cls, variant: c.variant == null ? null : c.variant, x: _wflR2(c.x), z: _wflR2(c.z), y: _wflR2(y), facing,
    foot: _wflFoot(kb, c.x, c.z, facing), r: kb.r, height: kb.size.h0, size: { w: kb.size.l, d: kb.size.w, h: kb.size.h0 }, solidity, attach, host: null, deck: null,
    waterline: waterline == null ? null : _wflR2(waterline), lights: null, static: true, seasonal: kb.seasonal, blocks: false, framed: false,
    auto: c.auto, framing: !!c.framing, parent: c.parent || null, pit: !!c.pit };
}
/**
 * Try one auto entity. c: { obj, x, z, facing?, variant?, auto, why, rule, attach?, y?, parent?, framing?, pit?, any? (skip spacing) }.
 * Returns the entity or null. Every check is the engine's own (K1, K7, K9, P2, P3, C1, P8); sense's worldPlaceAdd has the last word.
 */
function _wflTry(F, c) {
  if (F.count >= F.maxAuto) return null;
  if (!(c.z > 0.5) || !_wflNum(c.x) || typeof c.obj !== 'string') return null;
  if (F.bad.has(c.obj)) return null;
  // a kit entry for an object the library does not have is skipped and logged ONCE, never replaced by a weaker stand-in
  // (worldKitCheck and the kit tests fail loudly on it)
  const kb = _wflKb(F, c.obj);
  if (!kb) return null;
  if (!kb.care.ok || !worldKbRegionOk(kb, F.world.place).ok) { F.bad.add(c.obj); return null; }
  const air = c.attach === 'air';
  // people-like statics (picnics, cafe tables, sitters) are a few groups per view, never a crowd of statues (life is the crowd)
  const peopleLike = kb.cls === 'picnic' || kb.cls === 'cafe-table' || kb.cls === 'person';
  if (peopleLike && c.auto === 'fill' && (F.peopleStatics || 0) >= 8) return null;
  // ... and never a giant at the lens (A10): no nearer than where their height fills 45 % of the frame; the fill's own stand back
  // further (a fifth of the frame at most: they are scenery, the walkers are the life) and apart (never a heap of rugs)
  if (peopleLike && c.z < F.cam.f * Math.max(1.2, kb.size.h0 || 1.3) / (c.auto === 'fill' ? 0.2 * F.H : 405)) return null;
  if (peopleLike && c.auto === 'fill' && (F.peopleSpots || []).some(p => Math.hypot(p[0] - c.x, p[1] - c.z) < 4 + 0.04 * c.z)) return null;
  // no prop at the lens either (SCENE_LESSONS K): a bollard, a sandwich board or a bin nearer than where a 1.3 m thing is about 20 % of the
  // frame is a dark blob filling a corner; the placement solver's near band has the same rule for what an author places
  if (!c.framing && ['post', 'bench', 'lamp', 'street', 'gate', 'rock', 'vehicle', 'signage'].includes(kb.cls) && c.z < F.cam.f * Math.min(kb.size.h0 || 1, 1.3) / 270) return null;
  // K6 things that come and go (flowers, lilies, leaf litter) only where the renderer hides them out of season
  if (!F.seasonal && kb.when && (kb.when.months || kb.when.dates || kb.when.weather)) return null;
  // C1, P8 (on screen)
  const ent0 = { obj: c.obj, x: c.x, z: c.z, y: air ? _wflGround(F, c.x, c.z) + (c.y || 0) : undefined, height: kb.size.h0 };
  const b = _wflBox(F, ent0);
  if (!c.framing && _wflCut(F, b)) return null;
  if (_wflHidesLandmark(F, b, c.z)) return null;
  // N2: the vista down the leading line stays open, and the sky keeps its share (auto fill only; framing and edges are exempt)
  if (c.auto === 'fill' && !c.framing && _wflBlocksView(F, c, kb, b)) return null;
  // a feature (a bandstand, a kiosk, a memorial: a structure) stands once in a view, never as a set
  if (c.auto === 'fill' && kb.cls === 'structure' && F.world.entities.some(e => e && e.obj === c.obj && !e.backdrop)) return null;
  // furniture never stacks on screen: a bench over a bench, a rug over a rug at a like depth reads as clutter (a bin behind a lamp,
  // or one far behind the other, is a street in perspective)
  const furn = c.auto === 'fill' && b && ['bench', 'street', 'lamp', 'post', 'cafe-table', 'picnic', 'umbrella'].includes(kb.cls);
  if (furn && (F.furnBoxes || []).some(q => q.cls === kb.cls && q.z < c.z * 1.6 && c.z < q.z * 1.6 && _wflBoxOverlap(q, b) > 0.45)) return null;
  // spacing: no stacked clones; a 'single' (a log, a boulder, a bench) keeps its group gap from its own kind
  const G = kb.group || {}, sp = c.any ? 0 : Math.max(0.18, 0.42 * Math.min(kb.size.l || 0.5, 3) * (F.tier >= 3 ? 0.75 : 1), G.kind === 'single' && _wflNum(G.gap) ? Math.min(G.gap, 12) : 0);
  if (sp && !_wflSpacingOk(F, c.x, c.z, sp, c.obj)) return null;
  // K1 habitat (the whole footprint of a long thing), P3 walking lines, P2 footprints
  let probe = null;
  if (!air) {
    probe = _wflProbe(F, c.x, c.z);
    const hp = c.pit ? Object.assign({}, probe, { pit: true }) : probe;
    if (!worldKbHabitatOk(kb, hp).ok) return null;
    // a long thing, and anything in the water (reeds at a quay's foot: the invariant judges a floater's whole footprint)
    const inWater = c.attach === 'water' || probe.kind === 'water';
    if ((kb.foot === 'box' && (kb.size.l > 1.2 || kb.size.w > 1.2)) || inWater) {
      const corners = _wflFoot(kb, c.x, c.z, c.facing).map(q => { const pq = _wflProbe(F, q[0], q[1]); return c.pit ? Object.assign(pq, { pit: true }) : pq; });
      if (!worldKbHabitatOk(kb, corners).ok) return null;
    }
    if (_wflNum(probe.pathDist) && probe.pathDist < 0.6 + (kb.r || 0.1) + 0.05) return null;
    // nothing on a lived walk strip; a lived square takes furniture (people walk round it)
    if (probe.surfId && F.lived.has(probe.surfId) && _WFL_WALK.has(probe.kind)) {
      const ls = (F.world.surfaces || []).find(q => q && q.id === probe.surfId);
      const pavingStrip = ls && Array.isArray(ls.path) && _WFL_GROUP[ls.kind] === 'paving';
      if (!ls || (Array.isArray(ls.path) && !pavingStrip) || !(c.why && /paving|street furniture|frame/.test(c.why))) return null;
    }
    // a lived walk keeps its whole width: nothing's footprint (not just its anchor) reaches onto it (P3)
    const furniture = !!(c.why && /paving|street furniture|frame/.test(c.why));
    if (_wflLivedWalkDist(F, c.x, c.z, furniture) < Math.max(0.12, kb.r || 0.1)) return null;
    const r = kb.solidity === 'solid' ? (kb.r || 0.2) + (kb.clearance || 0) * 0.5 : Math.min(kb.r || 0.2, 0.3);
    if (_wflHits(F, c.x, c.z, r, false)) return null;
    // a long solid (a hedge, a log, a bench, a planter): its whole footprint, not just a disc round its anchor
    if (kb.solidity === 'solid' && kb.foot === 'box' && _wflHitsPoly(F, _wflFoot(kb, c.x, c.z, c.facing), false)) return null;
    if (probe.under && kb.size.h0 > 2.5) return null;
  }
  // through sense when loaded (its log lists the entity), else built here and logged
  const id = c.id || _wflId(F, c.auto);
  const spec = { id, obj: c.obj, at: [_wflR2(c.x), _wflR2(c.z)], x: _wflR2(c.x), z: _wflR2(c.z), auto: c.auto,
    variant: c.variant == null ? worldKbVariant(kb, F.world.place, F.r, { ctx: F.ctx }) : c.variant };
  if (_wflNum(c.facing)) spec.facing = _wflR2(c.facing);   // else the solver orients it (K3)
  if (air) { spec.attach = 'air'; spec.y = _wflR2(c.y || 0); }
  else if (probe && probe.kind === 'water' && kb.floats) spec.attach = 'water';
  if (c.parent) spec.parent = c.parent;
  if (c.framing) { spec.framing = true; spec.framed = true; }
  if (c.pit) spec.pit = true;
  let ent = null;
  if (typeof worldPlaceAdd === 'function') {
    const action = c.auto === 'edge' ? 'dress' : c.auto === 'frame' ? 'frame' : 'fill';
    try { ent = worldPlaceAdd(F.world, spec, { action, rule: c.rule || 'P6', reason: c.why || 'auto-placed', by: 'kb', snap: !c.exact }); } catch (e) { ent = null; }
    if (!ent) return null;
    if (!ent.auto) ent.auto = c.auto;
    if (c.framing) ent.framing = true;
    if (c.parent && !ent.parent) ent.parent = c.parent;
    if (c.parentOff) ent.parentOff = true;
    if (Array.isArray(F.world.entities) && !F.world.entities.includes(ent) && !F.world.entities.some(q => q && q.id === ent.id)) F.world.entities.push(ent);
  } else {
    ent = _wflMake(F, Object.assign({}, c, spec, { facing: _wflNum(spec.facing) ? spec.facing : 90 }), kb, probe);
    if (c.parentOff) ent.parentOff = true;
    F.world.entities.push(ent);
    _wflLog(F, { id, obj: c.obj, action: c.auto === 'edge' ? 'dress' : c.auto === 'frame' ? 'frame' : 'fill', rule: c.rule || 'P6', reason: c.why || '', to: [ent.x, ent.z] });
  }
  F.ids.add(ent.id || id);
  F.count++;
  if (peopleLike && c.auto === 'fill') { F.peopleStatics = (F.peopleStatics || 0) + 1; (F.peopleSpots || (F.peopleSpots = [])).push([c.x, c.z]); }
  F.added.push(ent);
  if (sp) _wflSpacingAdd(F, ent.x, ent.z, sp, c.obj);
  _wflIndexEnt(_wflIndexOf(F), ent);
  _wflLandmarkMark(F, b, c.z);
  _wflViewMark(F, ent, kb);
  if (F.boxes) F.boxes.push(b);
  if (furn) (F.furnBoxes || (F.furnBoxes = [])).push(Object.assign(b.slice(), { z: c.z, cls: kb.cls }));
  return ent;
}
/**
 * A walked square keeps a way through (SCENE_LESSONS J, the Whitby quay: a bollard 2 m from a bench was the only way along the quay and
 * people met in it). Across the width the frame shows there is always a clear way for the centres of two people abreast (1.0 m) in the
 * space the nav leaves a mover: 0.6 m off a solid and 0.5 m off a bank. Where it is narrower, the last-placed piece of the fill that
 * closes it is taken away (never an authored one). A surface that is itself no wider than that (a boardwalk, a lane of 1.6 m) is left as
 * it is. The flow is along the frame's width for a population with a west or east edge (strips are measured along z at each x),
 * else along z (strips are measured across x at each z).
 */
const WORLD_FILL_LANE = 1.0;            // the way's width for the centres of two people passing abreast (0.67 apart at the personal floor, and some wobble)
const WORLD_FILL_LANE_SOLID = 0.6;      // the nav keeps a mover's centre this far off a solid (its radius and a cell) ...
const WORLD_FILL_LANE_WATER = 0.5;      // ... and this far off a bank
/** Is (x, z) within `m` of a solid's footprint (or inside it)? */
function _wflSolidNear(ix, x, z, m) {
  const c = ix.cell;
  for (let i = Math.floor((x - m) / c); i <= Math.floor((x + m) / c); i++) for (let j = Math.floor((z - m) / c); j <= Math.floor((z + m) / c); j++) {
    for (const rec of ix.grid.get(i + ',' + j) || []) {
      if (rec.sol !== 'solid' || x + m < rec.box[0] || x - m > rec.box[2] || z + m < rec.box[1] || z - m > rec.box[3]) continue;
      if (_wflInPoly(rec.foot, x, z) || _wflNear(rec.foot, x, z, true).d < m) return rec;
    }
  }
  return null;
}
/** The walking surfaces of a world that a population walks, with the flow's axis. -> [{ s, lateral }] */
function _wflLanes(F) {
  const out = [], life = F.world.life || [];
  for (const s of _wflIndexOf(F).walks) {
    if (!F.lived.has(s.id)) continue;
    const pops = life.filter(p => p && p.on === s.id);
    if (!pops.length) continue;
    const lateral = pops.some(p => !Array.isArray(p.edges) || !p.edges.length || p.edges.some(e => e === 'W' || e === 'E' || e === 'left' || e === 'right'));
    out.push({ s, lateral });
  }
  return out;
}
/**
 * The tightest way along one walked surface: { slack (the strip the centres of two people have, less what they need), len, at: [x, z],
 * lateral } or null. A line across the flow is measured every 0.1 m in the space the nav leaves a mover (solids and banks taken off by
 * their margins); the line's way is its longest free run; the surface's tightest line is the way.
 */
function _wflLaneScan(F, L) {
  const ix = _wflIndexOf(F), cam = F.cam, s = L.s;
  const zn = Math.max(cam.f * 1.9 / 405, cam.f * cam.eye / Math.max(1, F.H - cam.horizon) + 0.3);
  const rings = _wflRings(s);
  let xa = Infinity, xb = -Infinity, za = Infinity, zb = -Infinity;
  for (const r of rings) for (const p of r.pts) { xa = Math.min(xa, p[0]); xb = Math.max(xb, p[0]); za = Math.min(za, p[1]); zb = Math.max(zb, p[1]); }
  if (!(xb > xa) || !(zb > za)) return null;
  const tan = (F.W / 2 + F.pad) / cam.f, zFar = Math.min(zb, zn + 40), zNear = Math.max(za, zn);
  if (!(zFar > zNear + 1)) return null;
  const R = Math.min(60, zFar * tan + 2), step = 0.1, waters = ix.waters;
  const nearWater = (x, z) => {
    for (const w of waters) for (const r of w.rings) { if (_wflNear(r.pts, x, z, r.closed).d < WORLD_FILL_LANE_WATER) return true; }
    return false;
  };
  const wetAt = (x, z) => { for (const w of waters) if (_wflContains(w.s, x, z)) return true; return false; };
  // 0 off the surface, 1 free, 2 kept off (a solid's margin, a bank's)
  const cls = (x, z, solids) => {
    if (!_wflContains(s, x, z) || wetAt(x, z)) return 0;
    if (nearWater(x, z)) return 2;
    return solids && _wflSolidNear(ix, x, z, WORLD_FILL_LANE_SOLID) ? 2 : 1;
  };
  let best = null;
  const way = (fn, from, to) => { let run = 0, bf = 0, bAt = from; for (let u = from; u <= to; u += step) { if (fn(u) === 1) { run += step; if (run > bf) { bf = run; bAt = u - run / 2; } } else run = 0; } return { len: bf, at: bAt }; };
  const line = (fnFree, fnSelf, from, to, mk) => {
    const w = way(fnFree, from, to);
    if (w.len >= WORLD_FILL_LANE + 0.5) return;                        // a way with room: nothing to measure
    if (way(fnSelf, from, to).len < WORLD_FILL_LANE + 0.01) return;    // the surface itself is a one-body lane: nothing the fill did
    const slack = w.len - WORLD_FILL_LANE;
    if (!best || slack < best.slack) best = Object.assign({ slack, len: w.len, lateral: L.lateral }, mk(w.at));
  };
  if (L.lateral) {
    for (let x = Math.max(xa, -R); x <= Math.min(xb, R); x += 0.5) line(z => cls(x, z, true), z => cls(x, z, false), zNear, zFar, at => ({ at: [x, at] }));
  } else {
    for (let z = zNear; z <= zFar; z += 1.5) line(x => cls(x, z, true), x => cls(x, z, false), Math.max(xa, -R), Math.min(xb, R), at => ({ at: [at, z] }));
  }
  return best;
}
/** Take away the last-placed fill pieces that close a way through a walked surface. -> the removed entities. */
function _wflThroughLane(F) {
  const removed = [];
  for (let guard = 0; guard < 60; guard++) {
    let culprit = null;
    for (const L of _wflLanes(F)) {
      const sc = _wflLaneScan(F, L);
      if (!sc || sc.slack >= 0) continue;
      // the fill pieces whose margin touches the narrowest strip (they are what closes it): the last placed goes
      const ix = _wflIndexOf(F), x = sc.at[0], z = sc.at[1], pick = [], m = WORLD_FILL_LANE_SOLID + sc.len / 2 + 0.3;
      for (const rec of ix.solids) {
        const e = rec.e;
        if (!e || !e.auto || rec.sol !== 'solid' || !F.added.includes(e)) continue;
        if (x >= rec.box[0] - m && x <= rec.box[2] + m && z >= rec.box[1] - m && z <= rec.box[3] + m) pick.push(e);
      }
      pick.sort((a, b) => F.added.indexOf(b) - F.added.indexOf(a));
      if (pick.length) { culprit = pick[0]; break; }
    }
    if (!culprit) break;
    _wflUndo(F, culprit);
    removed.push(culprit);
    if (Array.isArray(F.world.log)) F.world.log.push({ id: culprit.id, obj: culprit.obj, action: 'drop', rule: 'P3', reason: 'it closed the way through the walked ground to less than two abreast need (they stand nose to nose in it)', by: 'kb' });
  }
  return removed;
}
/** The tightest way through the walked ground of a world, for tools and tests: { slack (< 0: too narrow for two abreast), len, need, at, surface } or null. */
function worldFillLane(world, o) {
  o = o || {};
  const cam = o.cam || (world && world.cam);
  if (!world || !cam || !_wflNum(cam.f)) return null;
  const F = { world, cam, W: o.W || 1600, H: o.H || 900, pad: (o.overscan == null ? 0.18 : o.overscan) * (o.W || 1600), lived: _wflLived(world), ix: null, added: [] };
  let best = null;
  for (const L of _wflLanes(F)) { const sc = _wflLaneScan(F, L); if (sc && (!best || sc.slack < best.slack)) best = Object.assign({ surface: L.s.id }, sc); }
  return best;
}
/** The descriptor of a kit object, or null; a name the library does not have is logged once (kitMissing), never swapped. */
function _wflKb(F, id) {
  if (typeof id !== 'string' || !id) return null;
  const kb = worldKb(id);
  if (kb && kb.object !== false && kb.size && kb.size.h0 > 0) return kb;
  if (!F.bad.has(id)) { F.bad.add(id); _wflLog(F, { obj: id, action: 'fill', rule: 'kitMissing', reason: `the kit names ${id}, which is not a library object: skipped (no stand-in); fix the kit (worldKitCheck)` }); }
  return null;
}
/** The distance from (x, z) to the nearest lived walk strip (a population walks it): <= 0 inside it, Infinity with none. */
function _wflLivedWalkDist(F, x, z, furniture) {
  let d = Infinity;
  for (const s of _wflIndexOf(F).walks) {
    if (!F.lived.has(s.id)) continue;
    // a pavement's furniture stands in its kerb and building-line bands (its walking line stays clear, P3)
    if (furniture && _WFL_GROUP[s.kind] === 'paving') continue;
    // a lived walk STRIP (a path, a towpath, a pavement) is walked along its width; a lived square is walked round what stands on it
    if (Array.isArray(s.path) && s.width > 0) d = Math.min(d, _wflNear(s.path, x, z, false).d - s.width / 2);
  }
  return d;
}
function _wflId(F, auto) { let id; do { id = `${auto || 'fill'}-${F.seq++}`; } while (F.ids.has(id)); return id; }
/** A clump of 1..n members of one object round (x, z) (K5: clumps with gaps, stands; never rows). */
function _wflClump(F, obj, x, z, n, spread, c) {
  const kb = _wflKb(F, obj); if (!kb) return [];
  const out = [], r = F.r, l = kb.size.l || 0.5;
  for (let i = 0, tries = 0; i < n && tries < n * 4; tries++) {
    const a = r() * Math.PI * 2, d = i === 0 ? 0 : spread * Math.sqrt(-2 * Math.log(Math.max(1e-6, r()))) * 0.55;
    const xx = x + Math.cos(a) * d, zz = z + Math.sin(a) * d * 1.2;
    const e = _wflTry(F, Object.assign({}, c, { obj, x: xx, z: zz, facing: c && _wflNum(c.facing) ? c.facing : (r() < 0.5 ? 90 : 270) }));
    if (e) { out.push(e); i++; } else if (i === 0) return out;
  }
  return out.length ? out : [];
}

/* ---------- sampling the frame (the coverage rules of look's worldCoverage) ---------- */
function _wflLived(world) { const s = new Set(); for (const p of world.life || []) if (p && p.on) s.add(p.on); return s; }
/** Perennial entities: present at every date (no K6 `when`), so coverage holds all year. */
function _wflPerennial(e) { if (!e || !e.obj) return false; const kb = worldKb(e.obj); return !kb || !kb.when || (!kb.when.months && !kb.when.dates && !kb.when.weather); }
/**
 * Sample the frame below the horizon: { samples: [{ X, Y, x, z, band, surf, dressed, by }], bare, sky }. Entities cover by their
 * screen boxes; water, reeds, beds, hedges, weirs and rails dress themselves; lived surfaces are dressed by their life.
 */
function _wflSample(world, cam, o) {
  o = o || {};
  const W = o.W || 1600, H = o.H || 900, cols = o.cols || 64, rows = o.rows || 36, top = Math.max(0, cam.horizon), pad = o.pad || 0;
  const res = { samples: [], bare: 0, n: 0, rows, cols, top, W, H, colW: (W + 2 * pad) / cols, rowH: (H - top) / rows };
  if (top >= H) return res;
  const ents = (o.ents || world.entities || []).filter(e => e && e.obj && e.z > 0 && !(o.filter && !o.filter(e)));
  const bd = o.backdrop || [];
  const fake = { cam, world, W, H };
  const byCol = Array.from({ length: cols }, () => []);
  const X0 = -pad, X1 = W + pad, colW = (X1 - X0) / cols;
  const prims = typeof worldPrimEntities === 'function' ? worldPrimEntities(world, cam) : [];
  for (const e of ents.concat(bd, prims)) {
    const b = _wflBox(fake, e);
    if (b[2] < X0 || b[0] > X1 || b[3] < top) continue;
    const c0 = Math.max(0, Math.floor((b[0] - X0) / colW)), c1 = Math.min(cols - 1, Math.floor((b[2] - X0) / colW));
    for (let c = c0; c <= c1; c++) byCol[c].push({ b, e });
  }
  const lived = _wflLived(world), ground = o.ground;
  for (let r = 0; r < rows; r++) {
    const Y = top + (r + 0.5) * (H - top) / rows, band = r < rows / 3 ? 'far' : r < 2 * rows / 3 ? 'mid' : 'near';
    for (let c = 0; c < cols; c++) {
      const X = X0 + (c + 0.5) * colW;
      let by = null;   // the nearest entity whose box covers the sample: what the eye sees there
      for (const q of byCol[c]) if (X >= q.b[0] && X <= q.b[2] && Y >= q.b[1] && Y <= q.b[3] && (!by || q.e.z < by.z)) by = q.e;
      const g = _wflUnproject(cam, X, Y);
      let surf = null, dressed = !!by;
      if (g) {
        surf = o.surfAt ? o.surfAt(g.x, g.d) : null;
        if (!dressed && surf && (_WFL_DRESSED.has(surf.kind) || lived.has(surf.id))) dressed = true;
        else if (!dressed && !surf && ground && Y - cam.horizon < 1.5) dressed = true;
      }
      res.samples.push({ X, Y, x: g ? g.x : null, z: g ? g.d : null, band, surf, dressed, by, inFrame: X >= 0 && X <= W });
      if (X >= 0 && X <= W) { res.n++; if (!dressed) res.bare++; }
    }
  }
  res.bare = res.n ? res.bare / res.n : 0;
  return res;
}
function _wflBackdrop(world, cam) {
  if (typeof worldBackdrop !== 'function' || !world.backdrop) return [];
  try { return worldBackdrop(world, cam, world.season) || []; } catch (e) { return []; }
}
/** The official coverage (look's worldCoverage) over the perennial entities; the fill's own sampler without look. */
function _wflCoverage(F) {
  const world = F.world, view = Object.assign({}, world, { entities: (world.entities || []).filter(_wflPerennial) }), bd = _wflBackdrop(view, F.cam);
  // the STRICT measure when look has it (what the eye sees: silhouettes, textured versus dressed ground): the fill stops when
  // the strict critic would pass the ground (<= 15 % undressed, no ninth over 55 %), never on the lenient box measure
  if (typeof worldDetailCoverage === 'function') {
    try {
      const r = worldDetailCoverage(view, F.cam, { backdrop: bd, W: F.W, H: F.H, debug: true });
      const bmax = Math.max(0.15, (F.style.bare && F.style.bare.ground) || 0);
      if (r && _wflNum(r.bare) && r.grid) return { bare: r.bare, sky: r.sky, ok: r.bare <= bmax && r.regions.every(q => q.bare <= 0.55), regions: r.regions, by: 'strict', rec: r };
    } catch (e) { /* the plain measure */ }
  }
  if (typeof worldCoverage === 'function') {
    try { const r = worldCoverage(view, F.cam, { backdrop: bd, W: F.W, H: F.H }); if (r && _wflNum(r.bare)) return { bare: r.bare, sky: _wflNum(r.sky) ? r.sky : 0, ok: !!r.ok, regions: r.regions || [], by: 'look' }; } catch (e) { /* own */ }
  }
  const s = _wflSample(view, F.cam, { W: F.W, H: F.H, backdrop: bd, surfAt: (x, z) => _wflSurfFast(F, x, z), ground: true });
  return { bare: Math.round(s.bare * 1000) / 1000, sky: 0, ok: s.bare <= 0.15, regions: [], by: 'kb' };
}

/* ---------- P7: richness ---------- */
const _WFL_VTARGET = { near: 4, mid: 5, far: 4 };
/**
 * The richness of a world through a camera (P7): per frame band (the thirds of the frame below the horizon: far, mid, near) the
 * covered share and the variety (distinct objects, self-dressed surface kinds and life populations seen there), and a score
 * 0..100 (near 40 %, mid 35 %, far 25 %; each band 60 % cover, 40 % variety). o: { perennial (only entities present all year),
 * floor ({ score } to beat, e.g. a converted scene's source score), W, H, cols, rows, backdrop }. The tools' critic uses this.
 */
function worldRichness(world, cam, o) {
  const empty = { near: { cover: 0, variety: 0 }, mid: { cover: 0, variety: 0 }, far: { cover: 0, variety: 0 }, score: 0, bare: 1, ok: false };
  try {
    o = o || {};
    cam = cam || (world && world.cam);
    if (!world || !cam) return empty;
    const view = o.perennial ? Object.assign({}, world, { entities: (world.entities || []).filter(_wflPerennial) }) : world;
    const bd = o.backdrop || _wflBackdrop(view, cam), F = { world: view, cam, ix: null };
    const s = _wflSample(view, cam, { W: o.W || 1600, H: o.H || 900, cols: o.cols || 48, rows: o.rows || 30, backdrop: bd, surfAt: (x, z) => _wflSurfFast(F, x, z), ground: true });
    const lived = new Map(); for (const p of world.life || []) if (p && p.on) { const k = lived.get(p.on) || []; k.push(String(p.who)); lived.set(p.on, k); }
    const out = { near: null, mid: null, far: null, score: 0, bare: Math.round(s.bare * 1000) / 1000 };
    let score = 0;
    for (const band of ['near', 'mid', 'far']) {
      const B = s.samples.filter(q => q.band === band && q.inFrame), kinds = new Set();
      let cov = 0;
      for (const q of B) {
        if (q.dressed) cov++;
        if (q.by) kinds.add(q.by.obj);
        else if (q.surf && _WFL_DRESSED.has(q.surf.kind)) kinds.add('surface:' + q.surf.kind);
        if (q.surf && lived.has(q.surf.id)) for (const w of lived.get(q.surf.id)) kinds.add('life:' + w);
      }
      const cover = B.length ? cov / B.length : 1, variety = kinds.size;
      out[band] = { cover: Math.round(cover * 1000) / 1000, variety };
      score += ({ near: 0.4, mid: 0.35, far: 0.25 })[band] * (0.6 * cover + 0.4 * Math.min(1, variety / _WFL_VTARGET[band]));
    }
    out.score = Math.round(score * 100);
    const fl = WORLD_RICHNESS_FLOOR, want = Math.max(fl.score, o.floor && _wflNum(o.floor.score) ? o.floor.score : 0);
    out.ok = out.score >= want && ['near', 'mid', 'far'].every(b => out[b].cover >= fl[b].cover && out[b].variety >= fl[b].variety);
    out.floor = want;
    if (o.box === false) return out;
    const box = _wflBoxScore(view, cam, { W: o.W, H: o.H, backdrop: bd });
    out.box = { near: { cover: box.near.cover, variety: box.near.variety, n: box.near.n }, mid: { cover: box.mid.cover, variety: box.mid.variety, n: box.mid.n },
      far: { cover: box.far.cover, variety: box.far.variety, n: box.far.n }, score: box.score };
    return out;
  } catch (e) { return empty; }
}

/* ---------- the style ---------- */
/**
 * The fill style (the KIT) of a world: the place's own style (place.style: a kit id or a legacy style name, or o.style when it
 * is not just the backdrop's), else what its surfaces say. Urban (roads, pavements, plazas, tramways): a river or canal between
 * them is a river city, a harbour or the sea a quayside, a plaza larger than the pavements a civic square, a road with pavements
 * or buildings a terraced street, else a village green. Country: heath (a moor when the backdrop or the place says so), fields
 * (downs or farmland), the sea (coast), a canal or river (canal), a pond or lake (pond), woodland, sand (coast), else the
 * backdrop's kit, else a park.
 */
function worldFillStyle(world, o) {
  try {
    const bd = world && world.backdrop && world.backdrop.style, ps = world && world.place && world.place.style;
    const own = ps || (o && o.style && o.style !== bd ? o.style : null);
    if (own && WORLD_FILL_STYLES[own]) return own;
    const S = ((world && world.surfaces) || []).filter(s => s && !s.auto), has = k => S.some(s => s.kind === k), waters = S.filter(s => s.kind === 'water');
    const wk = (...k) => waters.some(w => k.includes(w.water)), area = (s) => {
      if (Array.isArray(s.poly)) { let A = 0; for (let i = 0, j = s.poly.length - 1; i < s.poly.length; j = i++) A += (s.poly[j][0] + s.poly[i][0]) * (s.poly[j][1] - s.poly[i][1]); return Math.abs(A / 2); }
      if (Array.isArray(s.path)) { let L = 0; for (let i = 1; i < s.path.length; i++) L += Math.hypot(s.path[i][0] - s.path[i - 1][0], s.path[i][1] - s.path[i - 1][1]); return L * (s.width || 2); }
      return 0;
    };
    const sum = (k) => S.filter(s => s.kind === k).reduce((t, s) => t + area(s), 0);
    // what the view shows: the ground in the camera's cone, sampled evenly on screen (geometric depth steps), the top surface at
    // each point. A grass field with a 4 m plaza on it is a green, not a civic square
    const seen = {}; let nSeen = 0;
    for (let i = 0; i < 24; i++) {
      const z = 2 * Math.pow(100, (i + 0.5) / 24);
      for (let j = 0; j < 24; j++) {
        const x = (j / 23 - 0.5) * 1.9 * z;
        let top = null; for (const s of S) if (_wflContains(s, x, z)) top = s;
        if (top) { seen[top.kind] = (seen[top.kind] || 0) + 1; nSeen++; }
      }
    }
    const share = (...k) => nSeen ? k.reduce((t, q) => t + (seen[q] || 0), 0) / nSeen : 0;
    const paved = share('road', 'pavement', 'plaza', 'tramway', 'platform', 'driveway'), green = share('grass', 'heath', 'field', 'sand');
    const built = ((world && world.buildings) || []).length > 0 || S.some(s => s.kind === 'road');
    const urban = (has('road') || has('pavement') || has('plaza') || has('tramway') || has('platform') || /^(city|town)/.test(String(bd || ''))) &&
      (built || paved >= 0.25 * green || !nSeen);
    if (urban) {
      if (wk('river', 'canal')) return 'river-city';
      if (wk('harbour', 'sea')) return 'quayside';
      if (has('plaza') && sum('plaza') >= sum('pavement')) return 'civic-square';
      if (has('road') && (has('pavement') || ((world && world.buildings) || []).length)) return 'terraced-street';
      return 'village-green';
    }
    if (has('heath')) return /moor|peak|gritstone/.test(String((world.place && (world.place.region || world.place.type)) || '') + String(bd || '')) ? 'moor' : 'heath';
    if (has('field')) return bd === 'downs' ? 'downs' : 'farmland';
    if (wk('sea', 'harbour')) return 'coast';
    if (wk('canal', 'river')) return bd === 'woodland' ? 'woodland' : 'canal';
    if (waters.length) return 'pond';
    if (has('wood')) return 'woodland';
    if (has('sand') || has('beach') || has('shingle')) return 'coast';
    return bd && WORLD_FILL_STYLES[bd] ? bd : 'park';
  } catch (e) { return 'park'; }
}

/* ---------- P5: edge dressing ---------- */
function _wflVisible(F, x, z, margin) {
  if (!(z > F.cam.dMin * 0.85) || z > _WFL_EDGE_ZMAX) return false;
  const xa = _wflXAt(F.cam, -F.pad, z) - (margin || 2), xb = _wflXAt(F.cam, F.W + F.pad, z) + (margin || 2);
  return x >= xa && x <= xb;
}
/** Walk a polyline in steps that grow with depth; fn(point, dir, normal(right), s). */
function _wflWalk(pts, closed, fn) {
  const n = pts.length, m = closed ? n : n - 1;
  let s = 0;
  for (let i = 0; i < m; i++) {
    const a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
    if (!(L > 0)) continue;
    const tx = dx / L, tz = dz / L;
    for (let t = 0; t < L;) {
      const x = a[0] + tx * t, z = a[1] + tz * t, step = Math.max(0.35, Math.min(4, 0.022 * Math.max(1, z)));
      fn([x, z], [tx, tz], [tz, -tx], s + t, step);
      t += step;
    }
    s += L;
  }
}
/**
 * A hedge surface is a hedge (P5, 1.4): its whole visible length gets library hedge sections end to end (seeded jitter, never a
 * grid), except where a hedge-class thing already stands on it (an author's brambles dress their own stretch, never the whole
 * line: before, one bramble on a 400 m hedge left the rest of it as bare ground, 15 Oct audit bug 9). Through sense
 * (worldPlaceAdd: habitat, overlap, walking lines, the near band) so a section never lands where the solver would refuse it.
 */
function _wflHedges(F) {
  const ix = _wflIndexOf(F), r = _wflRng('hedge|' + (F.world.seed | 0)), cam = F.cam, before = F.count;
  for (const s of ix.surfs) {
    if (s.kind !== 'hedge' || s.open === true || !Array.isArray(s.path) || s.path.length < 2) continue;
    const obj = s.obj && worldKb(s.obj) ? s.obj : 'plant.towpath-hedge', kb = worldKb(obj);
    if (!kb) continue;
    const L = kb.size.l || 3, D = kb.size.w || 1.2;
    let n = 0;
    for (let i = 1; i < s.path.length; i++) {
      const a = s.path[i - 1], b = s.path[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (!(len > 0.01)) continue;
      const ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len, facing = (_wflDeg(Math.atan2(ux, uz)) + 360) % 360;
      for (let u = L / 2 + r() * 0.3; u < len; u += L + 0.08 + r() * 0.35) {
        const off = (r() - 0.5) * Math.max(0, (s.width || 1.2) - D) * 0.6, x = a[0] + ux * u - uz * off, z = a[1] + uz * u + ux * off;
        if (!(z > cam.dMin * 0.85) || z > _WFL_FILL_ZMAX) continue;
        const xa = _wflXAt(cam, -F.pad, z) - L, xb = _wflXAt(cam, F.W + F.pad, z) + L;
        if (x < xa || x > xb) continue;
        // an author's hedge-class thing (a bramble, a holly) already stands on this stretch
        const hit = _wflHits(F, x, z, L * 0.45, true);
        if (hit && hit.e && (worldKb(hit.e.obj) || {}).cls === 'hedge') continue;
        const spec = { obj, at: [_wflR2(x), _wflR2(z)], facing: _wflR2(facing), variant: worldKbVariant(kb, F.world.place, F.r, { ctx: F.ctx }), auto: 'edge' };
        let ent = null;
        if (typeof worldPlaceAdd === 'function') { try { ent = worldPlaceAdd(F.world, spec, { action: 'dress', rule: 'P5', reason: `hedge surface ${s.id}: a section of its hedge`, by: 'kb', snap: false, log: false }); } catch (e) { ent = null; } }
        else ent = _wflMake(F, Object.assign({ id: _wflId(F, 'edge'), x, z, auto: 'edge' }, spec), kb, null), F.world.entities.push(ent);
        if (!ent) continue;
        ent.on = s.id;
        F.count++; F.added.push(ent); F.ids.add(ent.id); n++;
        _wflIndexEnt(ix, ent);
      }
    }
    if (n) _wflLog(F, { id: s.id, obj, action: 'dress', rule: 'P5', reason: `hedge surface ${s.id} laid with ${n} sections of ${obj} (stretches an author's hedge-class things dress are kept)` });
  }
  return F.count - before;
}
function _wflEdges(F) {
  const E = F.style.edges || {}, ix = _wflIndexOf(F), r = F.r, before = F.count;
  _wflHedges(F);
  // water banks by water kind: reed stands with gaps in the margin and bank planting (natural), coping lines (urban)
  for (const w of ix.waters) {
    const mode = (E.water || {})[w.s.water] || 'natural';
    if (mode === 'none') continue;
    for (const ring of w.rings) {
      let state = r() < 0.5 ? 'gap' : 'stand', left = 1 + r() * 4, hard = [], stObj = _wflPick(E.natural.margin, r);
      const flush = () => { if (hard.length >= 2) _wflLine(F, 'coping', hard, w.s.id); hard = []; };
      _wflWalk(ring.pts, ring.closed, (p, t, nr, s, step) => {
        // the outward normal: the side of the boundary that is not this water
        const o1 = [p[0] + nr[0] * 0.6, p[1] + nr[1] * 0.6], out = _wflContains(w.s, o1[0], o1[1]) ? [-nr[0], -nr[1]] : nr;
        if (!_wflVisible(F, p[0], p[1], 4)) { flush(); return; }
        const land = _wflProbe(F, p[0] + out[0] * 1.2, p[1] + out[1] * 1.2);
        if (land.kind === 'water' || land.kind === 'weir') { flush(); return; }
        const walled = mode === 'urban' || mode === 'quay';
        const hardBank = walled || _WFL_WALK.has(land.kind) || (land.tags || []).includes('paving') || land.walkDist <= 1.0 || !!_wflHits(F, p[0] + out[0] * 1.2, p[1] + out[1] * 1.2, 0.3, true);
        if (hardBank) {
          if (walled && E.kerb !== false) hard.push([_wflR2(p[0]), _wflR2(p[1])]); else flush();
          // a quay's posts: bollards and lifebuoys along the edge, seeded at mooring intervals (never in a row: K5)
          if (mode === 'quay' && E.quay && Array.isArray(E.quay.posts) && E.quay.posts.length) {
            F.postLeft = (F.postLeft == null ? 2 + r() * 6 : F.postLeft) - step;
            if (F.postLeft <= 0) {
              F.postLeft = 6 + r() * 9;
              _wflTry(F, { obj: _wflPick(E.quay.posts, r), x: p[0] + out[0] * 0.45, z: p[1] + out[1] * 0.45, auto: 'edge', rule: 'P5', why: `${w.s.water || 'water'} quay: mooring post` });
            }
          }
          // a quay's top: low tufts and the odd buddleia in the joints behind the coping (the wall face is the ground detail's)
          if (mode === 'quay' && E.quay && Array.isArray(E.quay.top) && E.quay.top.length && r() < 0.3) {
            const off = 0.45 + r() * 0.8;
            _wflTry(F, { obj: _wflPick(E.quay.top, r), x: p[0] + out[0] * off + t[0] * (r() - 0.5) * step, z: p[1] + out[1] * off + t[1] * (r() - 0.5) * step, auto: 'edge', rule: 'P5', why: `${w.s.water || 'water'} quay top` });
          }
          return;
        }
        flush();
        left -= step;
        if (left <= 0) { state = state === 'stand' ? 'gap' : 'stand'; left = state === 'stand' ? 2 + r() * 4.5 : 1.5 + r() * 8 * (1 - (E.natural.stands || 0.5)); if (state === 'stand') stObj = _wflPick(E.natural.margin, r); }
        // the author's reeds already dress this stretch
        if (state === 'stand' && !F.authorReeds.some(q => Math.hypot(q.x - p[0], q.z - p[1]) < 2.5)) {
          const per = Math.max(1, Math.round(step / Math.max(0.35, 0.012 * p[1])));
          for (let k = 0; k < per; k++) {
            const along = (r() - 0.5) * step, inn = 0.1 + r() * Math.min(0.85, Math.max(0.3, w.shallow) + 0.1), obj = r() < 0.8 ? stObj : _wflPick(E.natural.margin, r);
            _wflTry(F, { obj, x: p[0] + t[0] * along - out[0] * inn, z: p[1] + t[1] * along - out[1] * inn, auto: 'edge', rule: 'P5', why: `${w.s.water || 'water'} bank: reed stand` });
          }
        }
        if (r() < (state === 'gap' ? 0.4 : 0.2)) {
          const off = 0.35 + r() * 1.3, obj = _wflPick(E.natural.bank, r);
          _wflTry(F, { obj, x: p[0] + out[0] * off + t[0] * (r() - 0.5) * step, z: p[1] + out[1] * off + t[1] * (r() - 0.5) * step, auto: 'edge', rule: 'P5', why: `${w.s.water || 'water'} bank planting` });
        }
      });
      flush();
    }
  }
  // paths get verges (tussocks in clumps along both sides where the ground beside is grass or soil)
  if (Array.isArray(E.verge) && E.verge.length) for (const s of ix.walks) {
    if (!Array.isArray(s.path) || !(s.width > 0) || s.kind === 'boardwalk' || s.kind === 'bridge-deck' || s.kind === 'deck') continue;
    for (const side of [-1, 1]) {
      const share = _wflNum(E.vergeShare) ? E.vergeShare : 0.6;
      let on = r() < share, left = 1 + r() * 3;
      _wflWalk(s.path, false, (p, t, nr, si, step) => {
        if (!_wflVisible(F, p[0], p[1], 2)) return;
        left -= step;
        if (left <= 0) { on = !on; left = on ? (1 + r() * 3.5) * share / 0.6 : (0.8 + r() * 4) * 0.6 / share; }
        if (!on || r() < 0.4) return;
        const off = s.width / 2 + 0.15 + r() * 0.75;
        _wflTry(F, { obj: _wflPick(E.verge, r), x: p[0] + side * nr[0] * off + t[0] * (r() - 0.5) * step, z: p[1] + side * nr[1] * off + t[1] * (r() - 0.5) * step, auto: 'edge', rule: 'P5', why: `${s.kind} verge` });
      });
    }
  }
  // roads get kerbs (linear features for the extruder) and, in towns, pavements where none runs beside them
  for (const s of ix.roads) {
    if (!Array.isArray(s.path) || !(s.width > 0)) continue;
    for (const side of [-1, 1]) {
      const kerb = _wflOffsetLine(s.path, side * s.width / 2);
      if (E.kerb !== false) _wflLine(F, 'kerb', kerb, s.id);
      if (!E.pavement) continue;
      const pave = _wflOffsetLine(s.path, side * (s.width / 2 + 1.1)), base = s.id + '-pave' + (side < 0 ? 'L' : 'R');
      if ((F.world.surfaces || []).some(q => q && typeof q.id === 'string' && q.id.startsWith(base))) continue;
      // sampled every 0.75 m; a pavement is laid only where it is free: never through a solid (a building, a wall: whatever
      // stands there was authored first and must not end up on an invented walking line), nor over water, roads or other walks.
      // The free stretches of 8 m or more become pavements of their own.
      const pts = [];
      for (let i = 1; i < pave.length; i++) {
        const a = pave[i - 1], b = pave[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.75));
        for (let k = i === 1 ? 0 : 1; k <= n; k++) pts.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
      }
      const ok = (q) => { const pr = _wflProbe(F, q[0], q[1]); return !_WFL_WALK.has(pr.kind) && pr.kind !== 'water' && pr.kind !== 'road' && !_wflHits(F, q[0], q[1], 1.05, true); };
      const runs = [];
      let cur = [];
      for (const q of pts) { if (ok(q)) cur.push(q); else { if (cur.length) runs.push(cur); cur = []; } }
      if (cur.length) runs.push(cur);
      const long = runs.filter(r => r.length >= 2 && _wflR2(r.reduce((L, q, i) => i ? L + Math.hypot(q[0] - r[i - 1][0], q[1] - r[i - 1][1]) : 0, 0)) >= 8);
      long.forEach((r, k) => {
        const ps = { id: base + (long.length > 1 ? '-' + (k + 1) : ''), kind: 'pavement', layer: 'walk', path: r.filter((q, i) => i % 4 === 0 || i === r.length - 1).map(q => [_wflR2(q[0]), _wflR2(q[1])]), width: 2.0, auto: 'edge' };
        F.world.surfaces.push(ps);
        F.ix = null; _wflIndexOf(F);
        _wflLog(F, { id: ps.id, action: 'dress', rule: 'P5', reason: `a pavement beside road ${s.id}${long.length > 1 || runs.length > 1 ? ' (only where it is free of solids, water and other walks)' : ''}` });
      });
    }
  }
  // walls and fences get bases (tufts on the camera side); fields get hedgerows where no boundary runs
  if (Array.isArray(E.wallBase) && E.wallBase.length) {
    const walls = (F.world.entities || []).filter(e => e && !e.auto && Array.isArray(e.foot) && (e.cls === 'fence' || e.cls === 'building' || (worldKb(e.obj) || {}).cls === 'fence') && e.z < 80)
      .concat((F.world.buildings || []).filter(b => b && Array.isArray(b.foot) && b.foot.length >= 3 && Math.min(...b.foot.map(p => p[1])) < 80));
    for (const e of walls) {
      const P = e.foot; let best = null;
      for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], mz = (a[1] + b[1]) / 2; if (!best || mz < best.mz) best = { a, b, mz }; }
      if (!best) continue;
      const L = Math.hypot(best.b[0] - best.a[0], best.b[1] - best.a[1]), n = Math.min(10, Math.max(1, Math.round(L / 2.5)));
      for (let k = 0; k < n; k++) if (r() < 0.55) {
        const t = (k + r()) / n, x = best.a[0] + (best.b[0] - best.a[0]) * t, z = best.a[1] + (best.b[1] - best.a[1]) * t - 0.25 - r() * 0.3;
        _wflTry(F, { obj: _wflPick(E.wallBase, r), x, z, auto: 'edge', rule: 'P5', why: 'wall base' });
      }
    }
    for (const L of F.world.lines || []) if (L && (L.kind === 'wall' || L.kind === 'fence') && Array.isArray(L.path) && !L.auto) {
      _wflWalk(L.path, false, (p, t, nr, s, step) => { if (_wflVisible(F, p[0], p[1], 1) && r() < 0.35) _wflTry(F, { obj: _wflPick(E.wallBase, r), x: p[0] - Math.abs(nr[0]) * 0, z: p[1] - 0.35, auto: 'edge', rule: 'P5', why: 'wall base' }); });
    }
  }
  if (Array.isArray(E.hedgerow) && E.hedgerow.length) for (const s of ix.surfs) {
    if (s.kind !== 'field' || !Array.isArray(s.poly)) continue;
    let on = true, left = 3 + r() * 6;
    _wflWalk(s.poly, true, (p, t, nr, si, step) => {
      if (!_wflVisible(F, p[0], p[1], 3)) return;
      const o1 = [p[0] + nr[0] * 0.8, p[1] + nr[1] * 0.8], out = _wflContains(s, o1[0], o1[1]) ? [-nr[0], -nr[1]] : nr, pr = _wflProbe(F, p[0] + out[0] * 1.5, p[1] + out[1] * 1.5);
      if (pr.kind === 'field' || pr.kind === 'hedge' || pr.kind === 'water') return;
      if ((F.world.lines || []).some(L => L && /hedge|wall|fence/.test(L.kind) && Array.isArray(L.path) && _wflNear(L.path, p[0], p[1], false).d < 1.5)) return;
      left -= step;
      if (left <= 0) { on = !on; left = on ? 4 + r() * 10 : 1 + r() * 3; }
      if (on) _wflTry(F, { obj: _wflPick(E.hedgerow, r), x: p[0] - out[0] * 0.5, z: p[1] - out[1] * 0.5, facing: _wflDeg(Math.atan2(t[0], t[1])), auto: 'edge', rule: 'P5', why: 'field hedgerow' });
    });
  }
  if (F.count > before) _wflLog(F, { action: 'dress', rule: 'P5', reason: `edges dressed: ${F.count - before} entities (banks, verges, wall bases, hedgerows)` });
}
/** A linear feature added for the extruder (kerb, coping), unless one already runs there. */
function _wflLine(F, kind, pts, of) {
  if (!Array.isArray(F.world.lines)) F.world.lines = [];
  const vis = pts.filter(p => p[1] > 0);
  if (vis.length < 2) return;
  if (F.world.lines.some(L => L && L.kind === kind && Array.isArray(L.path) && _wflNear(L.path, vis[0][0], vis[0][1], false).d < 1 && _wflNear(L.path, vis[vis.length - 1][0], vis[vis.length - 1][1], false).d < 1)) return;
  const id = `${kind}-${of}-${F.world.lines.length}`;
  F.world.lines.push({ id, kind, path: vis.map(p => [_wflR2(p[0]), _wflR2(p[1])]), width: kind === 'coping' ? 0.3 : 0.2, h: kind === 'coping' ? 0.3 : 0.12, auto: 'edge' });
  _wflLog(F, { id, action: 'dress', rule: 'P5', reason: `${kind} along ${of}` });
}

/* ---------- C3, N2: framing ---------- */
const _WFL_FRAME_CLS = new Set(['bough', 'frond', 'hedge', 'fence', 'lamp', 'reed', 'shrub', 'tree', 'post', 'signage', 'rock', 'street', 'structure', 'building', 'bench']);
/** The screen box of a building or a linear feature of the world (extruded: a footprint and a height), or null. */
function _wflPrimBox(F, foot, h) {
  const cam = F.cam, near = Math.max(0.4, (cam.dMin || 1) * 0.3), pts = [];
  for (const p of foot) if (p[1] >= near) { const a = _wflProj(F, p[0], p[1], 0), c = _wflProj(F, p[0], p[1], h); pts.push([a.X, a.Y], [c.X, c.Y]); }
  if (pts.length < 2) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const q of pts) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
  return [x0, y0, x1, y1];
}
/**
 * What frames the view now (C3, N2): { top, side: [left, right], declared } as descriptions (or null). top: a bough or frond
 * entering from a top corner, or a crown cut by the top edge at a side; a side: something standing in the near part of the frame
 * (its foot below 60 % of the ground rows) at that side and tall enough to read (12 % of the frame): reeds, a shrub, a hedge, a
 * lamp, a trunk, a railing, a building's edge, or a channel wall running to that bottom corner (a wall edge, C1). declared: the
 * author marked an element framing: true / framed: true (it is kept and nothing is added).
 */
function _wflFrameState(F) {
  const st = { top: null, topHang: 0, topCrown: 0, side: [null, null], declared: null }, W = F.W, H = F.H, hz = F.cam.horizon, nearRow = hz + (H - hz) * 0.6;
  const side = (b, what) => {
    if (!(b[3] >= nearRow && Math.min(H, b[3]) - Math.max(0, b[1]) >= 0.12 * H && Math.min(W, b[2]) - Math.max(0, b[0]) >= 0.035 * W)) return;
    if (b[0] < 0.2 * W && b[2] > 0 && !st.side[0]) st.side[0] = what;
    if (b[2] > 0.8 * W && b[0] < W && !st.side[1]) st.side[1] = what;
  };
  for (const e of F.world.entities || []) {
    if (!e || !e.obj || e.backdrop || !(e.z > 0)) continue;
    const kb = worldKb(e.obj); if (!kb || kb.decal) continue;
    const what = `${e.auto ? 'a' : 'the author’s'} ${kb.cls} (${e.id || e.obj})`;
    // the author's own declared framing (framing: true / framed: true) wins wherever it stands
    if ((e.framing || e.framed) && !e.auto && !st.declared) st.declared = what;
    const b = _wflBox(F, e);
    if (b[2] < 0 || b[0] > W || b[3] < 0 || b[1] > H) continue;
    const hang = kb.cls === 'bough' || kb.cls === 'frond' || (kb.hang && String(e.attach || '') === 'air');
    if (!st.top && hang && b[1] <= 0.1 * H && (b[0] <= 0.03 * W || b[2] >= 0.97 * W)) { st.top = what; st.topHang = b[0] <= 0.03 * W ? -1 : 1; }
    // a structured crown cut by the top edge at a side frames the top too; a dome or blob crown does not (SCENE_LESSONS A)
    const domed = (typeof WORLD_KIT_WEAK === 'object' && WORLD_KIT_WEAK[e.obj]) || (typeof WORLD_KIT_DISTANT_ONLY === 'object' && WORLD_KIT_DISTANT_ONLY.includes(e.obj));
    if (!st.top && kb.cls === 'tree' && !domed && b[1] < 0.02 * H && (b[0] < 0.08 * W || b[2] > 0.92 * W) && b[3] - b[1] > 0.6 * H) { st.top = what; st.topCrown = b[0] < 0.08 * W ? -1 : 1; }
    if (_WFL_FRAME_CLS.has(kb.cls) && !hang) side(b, what);
  }
  for (const bd of F.world.buildings || []) { if (bd && Array.isArray(bd.foot)) { const b = _wflPrimBox(F, bd.foot, _wflNum(bd.h) ? bd.h : 6); if (b) side(b, 'the building ' + (bd.id || '')); } }
  for (const L of F.world.lines || []) {
    if (!L || !Array.isArray(L.path) || !/wall|hedge|fence|railing/.test(L.kind)) continue;
    for (let i = 1; i < L.path.length; i++) { const b = _wflPrimBox(F, [L.path[i - 1], L.path[i]], _wflNum(L.h) ? L.h : 1.2); if (b) side(b, 'the ' + L.kind + ' ' + (L.id || '')); }
  }
  // the channel walls of sunken water reaching a bottom corner frame that side (look's worldChannelWalls)
  if (typeof worldChannelWalls === 'function') {
    try {
      for (const rec of worldChannelWalls(F.world, F.cam)) for (const r of rec.runs) {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const q of r.scr) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
        if (y1 >= 0.97 * H && rec.look !== 'earth') side([x0, y0, x1, y1], 'the ' + rec.look + ' wall of ' + rec.water);
      }
    } catch (e) { /* no walls */ }
  }
  return st;
}
/** Does the view already have its framing? -> a description or null. */
function _wflHasFrame(F) {
  const st = _wflFrameState(F);
  if (st.declared) return st.declared;
  const natural = F.style.place === 'rural' || F.style.place === 'park';
  const sideD = st.side[0] || st.side[1];
  if (natural ? (st.topHang && sideD) : (st.top || sideD)) return [st.top, st.side[0], st.side[1]].filter(Boolean).join(', ');
  return null;
}
/**
 * The framing foreground (C3, N2): an author's declared framing element is kept and nothing is added. Otherwise a view needs a
 * side of its near band framed (reeds, a shrub, a hedge, a railing, a lamp from the kit, at the side with legal ground) and, in
 * natural settings (rural, park), a top frame too: a bough reaching in from a top corner, its trunk just outside the frame on the
 * SAME side (K4), placed on the side already framed below when it can be (one strong frame, the subject off to the other side).
 */
function _wflFrame(F) {
  const st = _wflFrameState(F);
  if (st.declared) { _wflLog(F, { action: 'frame', rule: 'C3', reason: `the author frames the view: ${st.declared}` }); return; }
  const natural = F.style.place === 'rural' || F.style.place === 'park', opts = F.style.frame || [];
  const boughs = opts.filter(o => o.kind === 'bough'), clumps = opts.filter(o => o.kind !== 'bough' && o.kind !== 'fronds');
  let sideOf = st.side[0] ? -1 : st.side[1] ? 1 : 0;
  const added = [];
  if (!st.side[0] || !st.side[1]) {
    // the open sides of the near band: the first from the kit's best option that fits, then (when both were open) the other
    // side with the next option that fits there, so an open foreground (water, a wide lawn) is held at both corners
    const open = [-1, 1].filter(sd => !st.side[sd < 0 ? 0 : 1]), first = open.length === 2 ? (F.r() < 0.5 ? -1 : 1) : open[0];
    const order = open.length === 2 ? [first, -first] : [first];
    const want = open.length === 2 ? 2 : 0;
    for (const sd of order) {
      if (added.length >= want) break;
      for (const opt of clumps) {
        const got = _wflFrameClump(F, opt, sd);
        if (got) { if (!sideOf) sideOf = sd; added.push(opt.kind); _wflLog(F, { id: got, action: 'frame', rule: 'C3', reason: `natural framing: ${opt.kind} at the ${sd < 0 ? 'left' : 'right'} of the near band (${F.styleKey})` }); break; }
      }
    }
  }
  // the top frame: a bough or fronds reaching in from a corner (a crown cut by the top edge frames its side; the bough then
  // takes the other). Natural settings always want one; a town or city when its kit leads with a bough (a river, a park)
  const wantBough = natural || (opts[0] && opts[0].kind === 'bough');
  if (!st.topHang && (wantBough || !(st.side[0] || st.side[1] || added.length))) {
    const first = st.topCrown ? -st.topCrown : sideOf || (F.r() < 0.5 ? -1 : 1);
    outer2: for (const opt of boughs) for (const sd of [first, -first]) {
      const got = _wflFrameBough(F, opt, sd);
      if (got) { added.push('bough'); _wflLog(F, { id: got, action: 'frame', rule: 'C3', reason: `natural framing: a bough reaching in from the top ${sd < 0 ? 'left' : 'right'} corner, its trunk just outside the frame (${F.styleKey})` }); break outer2; }
    }
  }
  const has = [st.top && 'top: ' + st.top, st.side[0] && 'left: ' + st.side[0], st.side[1] && 'right: ' + st.side[1]].filter(Boolean);
  if (!added.length) _wflLog(F, { action: 'frame', rule: 'C3', reason: has.length ? `the view is already framed (${has.join('; ')})` : 'no legal place for a framing element in the near band' });
  else if (has.length) _wflLog(F, { action: 'frame', rule: 'C3', reason: `kept: ${has.join('; ')}` });
}
/** A bough with its trunk just outside the frame on the same side (K4: the parent in frame or just outside, at a plausible height). */
function _wflFrameBough(F, opt, s) {
  const cam = F.cam, kt = _wflKb(F, opt.trunk), kbB = _wflKb(F, opt.bough);
  if (!kt || !kbB) return null;
  // the bough reaches about a third of the way across the frame: its depth follows from its drawn width
  const reach = kbB.art ? Math.abs(kbB.art[2] - kbB.art[0]) : kbB.size.l;
  const zBase = Math.max(cam.dMin * 1.5, cam.f * reach / (0.36 * F.W));
  const thw = kt.art ? Math.max(Math.abs(kt.art[0]), Math.abs(kt.art[2])) : (kt.size.l || 1) / 2;
  for (const zb of [zBase, zBase * 0.8, zBase * 1.25, zBase * 1.6]) for (const out of [0.01, 0.06, 0.12]) {
    // the trunk wholly outside the frame on the same side (its near edge beyond the frame edge), on legal ground
    const zt = zb + 0.5, hw = thw * cam.f / zt, xt = _wflXAt(cam, s < 0 ? -hw - out * F.W : F.W + hw + out * F.W, zt);
    const trunk = _wflTry(F, { obj: opt.trunk, x: xt, z: zt, facing: 90, auto: 'frame', rule: 'C3', why: 'framing trunk', framing: true, any: true, exact: true });
    if (!trunk) continue;
    // the bough's anchor is where it enters the frame, at the top corner (its art hangs below the anchor and reaches inwards)
    const k = cam.f / zb, Xa = s < 0 ? -0.02 * F.W : 1.02 * F.W, Ya = 0.03 * F.H;
    const xb = _wflXAt(cam, Xa, zb), yb = cam.eye + (cam.horizon - Ya) / k - _wflGround(F, xb, zb);
    const child = { x: xb, z: zb, y: yb, obj: opt.bough };
    const pok = worldKbParentOk(kbB, child, Object.assign({}, trunk, { height: kt.size.h0 }), { cam, W: F.W });
    if (pok.ok) {
      // the trunk stands just outside the frame: the frame record may not hold it, so the bough says so (the orphan invariant)
      const tX = cam.x0 + cam.f / trunk.z * trunk.x, parentOff = tX < 0 || tX > F.W;
      const b = _wflTry(F, { obj: opt.bough, x: xb, z: zb, attach: 'air', y: yb, parent: trunk.id, parentOff, facing: s < 0 ? 90 : 270, auto: 'frame', rule: 'C3', why: 'framing bough on its trunk', framing: true, any: true, exact: true });
      if (b) return b.id;
    }
    _wflUndo(F, trunk);
  }
  return null;
}
/**
 * A clump (reeds, shrub, hedge, railing, lamp, rock) at one side of the near band, on its own habitat. The search runs in SCREEN
 * space over the bottom rows at that side (C3, N2: the frame must stand in the near band), on the ground and on every water
 * level (reeds in the margin at a quay's foot stand on the water, lower on the screen than the bank), and keeps the size of a
 * frame: a tenth to a third of the frame wide, never a wall in the lens's face.
 */
function _wflFrameClump(F, opt, s, wide) {
  const cam = F.cam, kb = _wflKb(F, opt.obj);
  const used = F.frameSpots || (F.frameSpots = []);
  if (!kb) return null;
  const W = F.W, H = F.H, hz = cam.horizon, ix = _wflIndexOf(F), x0 = _wflNum(cam.x0) ? cam.x0 : W / 2;
  const levels = [0].concat([...new Set(ix.waters.map(w => _wflNum(w.s.level) ? w.s.level : _wflNum(cam.water) ? cam.water : 0))].filter(l => l < -0.05));
  const aquatic = kb.cls === 'reed' || (kb.habitat && Array.isArray(kb.habitat.on) && kb.habitat.on.includes('water-margin'));
  const n = opt.kind === 'reeds' ? (wide ? 7 : 5) : opt.kind === 'shrub' || opt.kind === 'hedge' || opt.kind === 'rock' ? 2 : 1;
  for (const fy of [0.95, 0.86, 0.77, 0.68]) for (const fx of wide ? [0.04, 0.09, 0.15, 0.21, 0.27, 0.33] : [0.04, 0.09, 0.15, 0.21]) for (const lvl of levels) {
    if (lvl < 0 && !aquatic) continue;
    const X = s < 0 ? fx * W : (1 - fx) * W, Y = hz + (H - hz) * fy;
    if (!(Y > hz + 1)) continue;
    let z = cam.f * (cam.eye - lvl) / (Y - hz), x = (X - x0) * z / cam.f;
    if (!(z > Math.max(0.6, cam.dMin * 1.05))) continue;
    let p = _wflProbe(F, x, z);
    if (lvl < 0) {
      // on the water at this level: step to its margin (within the shallows of the nearest bank)
      if (p.kind !== 'water') continue;
      // ... its whole footprint in the water (a reed stand at a quay's foot keeps its radius off the wall)
      const sh = _wflNum(p.shallow) ? p.shallow : 0.5, want = Math.max(sh * 0.5, (kb.r || 0.2) + 0.08);
      if (_wflNum(p.bankDist) && Math.abs(p.bankDist - want) > 0.05 && _wflNum(p.toWater)) {
        const a = p.toWater * Math.PI / 180, step = p.bankDist - want;
        let q = _wflProbe(F, x + Math.sin(a) * step, z + Math.cos(a) * step);
        // the probe's direction is the bank's: if the step went the wrong way, the other way
        if (!(q.kind === 'water' && _wflNum(q.bankDist) && Math.abs(q.bankDist - want) < Math.abs(p.bankDist - want))) { const q2 = _wflProbe(F, x - Math.sin(a) * step, z - Math.cos(a) * step); if (q2.kind === 'water') { x -= Math.sin(a) * step; z -= Math.cos(a) * step; q = q2; } else continue; }
        else { x += Math.sin(a) * step; z += Math.cos(a) * step; }
        p = q;
        if (p.kind !== 'water') continue;
      }
    } else if (p.kind === 'water') continue;
    // the size of a frame at this depth
    // a lamp or a post is a framing element that may rise past the top edge (C1); everything else stays inside three quarters
    const wPx = cam.f * (kb.size.l || 1) / z, hPx = cam.f * kb.size.h0 / z, tall = kb.cls === 'lamp' || kb.cls === 'post' || kb.cls === 'signage';
    if (wPx > 0.36 * W || hPx > (tall ? 1.6 : 0.75) * H || hPx < 0.09 * H) continue;
    const Xs = x0 + cam.f * x / z;
    if (s < 0 ? Xs > (wide ? 0.38 : 0.3) * W : Xs < (wide ? 0.62 : 0.7) * W) continue;
    // a fresh spot each time (never stacked on an earlier frame clump)
    if (used.some(q => Math.hypot(q[0] - x, q[1] - z) < Math.max(2.5, 0.12 * z))) continue;
    const or = worldKbOrient(kb, p);
    if (opt.kind === 'railing' && !(_wflNum(p.bankDist) && p.bankDist <= 3 && p.kind !== 'water')) continue;   // a quay railing stands at the water
    const facing = _wflNum(or.facing) ? or.facing : (s < 0 ? 90 : 270);
    const got = _wflClump(F, opt.obj, x, z, n, Math.max(0.35, kb.size.l * 0.4), { auto: 'frame', rule: 'C3', why: `framing ${opt.kind}`, framing: true, facing });
    if (got.length) { used.push([x, z]); return got[0].id; }
  }
  return null;
}
/**
 * The near band must hold something standing (N2: no empty foreground), not only water or bare texture: while under a tenth of
 * it is covered by things (look's strict worldDetailCoverage), add the kit's framing clumps at its sides (reeds in the margin at
 * a quay's foot, a shrub, a lamp), wider of the corners each round. Logged; capped at four clumps.
 */
function _wflNearBand(F) {
  if (typeof worldDetailCoverage !== 'function') return;
  // the author's declared framing is the author's composition: kept as it is
  if ((F.world.entities || []).some(e => e && !e.auto && (e.framing || e.framed))) return;
  const clumps = (F.style.frame || []).filter(o => o.kind !== 'bough' && o.kind !== 'fronds');
  if (!clumps.length) return;
  let rec = worldDetailCoverage(F.world, F.cam, { W: F.W, H: F.H }), n = 0;
  const start = rec.near.object;
  for (let round = 0; round < 6 && rec.near.object < 0.12; round++) {
    const sd = round % 2 ? 1 : -1;
    let got = null;
    for (const opt of clumps) { got = _wflFrameClump(F, opt, sd, true); if (got) break; }
    if (got) { n++; rec = worldDetailCoverage(F.world, F.cam, { W: F.W, H: F.H }); }
  }
  if (n) _wflLog(F, { action: 'frame', rule: 'N2', reason: `the near band held ${Math.round(start * 100)} % standing things: ${n} framing clump(s) added at its sides (now ${Math.round(rec.near.object * 100)} %)` });
}
/** Remove an entity the fill has just added (a framing trunk whose bough found no place). */
function _wflUndo(F, e) {
  const W = F.world, i = W.entities.indexOf(e);
  if (i >= 0) W.entities.splice(i, 1);
  F.added = F.added.filter(q => q !== e);
  F.count = Math.max(0, F.count - 1);
  F.ix = null;
  for (let k = F.log.length - 1; k >= 0; k--) if (F.log[k] && F.log[k].id === e.id) F.log.splice(k, 1);
  if (Array.isArray(W.log)) for (let k = W.log.length - 1; k >= 0; k--) if (W.log[k] && W.log[k].id === e.id && W.log[k].by !== 'kb') W.log.splice(k, 1);
}

/* ---------- P6, C6: the cover passes ---------- */
function _wflGroupOf(F, surf) {
  if (!surf) return F.style.ground || 'grass';
  const g = _WFL_GROUP[surf.kind];
  return g === null ? (F.style.ground || 'grass') : g || null;
}
/** One cover pass: every bare sample of the frame gets a clump of the surface's dressing for its depth band. -> placed count. */
function _wflCoverPass(F, tier) {
  F.tier = tier;
  const view = Object.assign({}, F.world, { entities: (F.world.entities || []).filter(_wflPerennial) });
  let S = null, bare = null;
  // the bare samples of the strict measure (silhouettes): the ground the eye sees undressed, not what an entity box happens to
  // span; the plain sampler without look
  const cov = _wflCoverage(F);
  if (cov.by === 'strict' && cov.rec && cov.rec.grid) {
    const g = cov.rec.grid, cw = F.W / g.cols, ch = F.H / g.rows, hz = F.cam.horizon;
    S = { colW: cw, rowH: ch, samples: [] };
    for (let k = 0; k < g.cells.length; k++) {
      const c = g.cells[k];
      // undressed ground; an open lawn or beach (half dressed by its texture) gets a sparse share of the samples, never a carpet
      // (fewer near the lens, where one tuft fills a cell, more in the middle and far distance, where trees and benches stand)
      const rowT = (Math.floor(k / g.cols) + 0.5) * ch, nearRow = (rowT - F.cam.horizon) / (F.H - F.cam.horizon);
      if (c !== 't' && c !== 'f' && !(c === 'p' && F.r() < (nearRow > 2 / 3 ? 0.03 : nearRow > 1 / 3 ? 0.14 : 0.4))) continue;
      const i = k % g.cols, j = Math.floor(k / g.cols), X = (i + 0.5) * cw, Y = (j + 0.5) * ch;
      if (!(Y > hz + 1)) continue;
      const gp = _wflUnproject(F.cam, X, Y);
      if (!gp) continue;
      const band = (Y - hz) / (F.H - hz) < 1 / 3 ? 'far' : (Y - hz) / (F.H - hz) < 2 / 3 ? 'mid' : 'near';
      S.samples.push({ X, Y, x: gp.x, z: gp.d, band, surf: _wflSurfFast(F, gp.x, gp.d), dressed: false, inFrame: true, open: c === 'p' });
    }
    bare = S.samples.filter(q => q.z != null && q.z <= _WFL_FILL_ZMAX);
  } else {
    S = _wflSample(view, F.cam, { W: F.W, H: F.H, cols: 56, rows: 34, pad: F.pad, backdrop: _wflBackdrop(view, F.cam), surfAt: (x, z) => _wflSurfFast(F, x, z), ground: true });
    bare = S.samples.filter(q => !q.dressed && q.z != null && q.z <= _WFL_FILL_ZMAX);
  }
  // seeded order, nearest rows first (they are the largest share of the frame)
  const r = F.r;
  for (const q of bare) q.u = r() + (q.band === 'near' ? 0 : q.band === 'mid' ? 0.5 : 1);
  bare.sort((a, b) => a.u - b.u);
  F.boxes = [];
  let placed = 0;
  for (const q of bare) {
    if (F.count >= F.maxAuto) break;
    if (F.boxes.some(b => q.X >= b[0] && q.X <= b[2] && q.Y >= b[1] && q.Y <= b[3])) continue;
    const g = _wflGroupOf(F, q.surf), spec = g && F.style.fill[g];
    if (!spec) { F.unfillable.add(q.surf ? q.surf.kind : 'ground'); continue; }
    const band = q.z < _WFL_NEAR_Z ? 'near' : q.z < _WFL_MID_Z ? 'mid' : q.z >= _WFL_FAR_Z && Array.isArray(spec.distant) && spec.distant.length ? 'distant' : 'far';
    // the next tier reaches for the next band's dressing too (taller clumps cover more of the frame)
    let list = spec[band] || [];
    if (tier >= 3 && band === 'near' && !q.open) list = list.concat((spec.mid || []).filter(([id]) => (worldKb(id) || { size: { h0: 9 } }).size.h0 <= 1.6));
    // an open lawn or beach: single things, no flower carpet (flowers stay seasonal accents)
    if (q.open) list = list.filter(([id]) => { const k = worldKb(id); return k && k.cls !== 'flower'; });
    if (tier >= 2 && band === 'mid') list = list.concat(spec.far || []);
    // maxH: the tallest near and mid dressing (a number), or per band ({ near, mid }: a green's specimen trees stand in the middle distance)
    const maxH = _wflNum(spec.maxH) ? (band !== 'far' && band !== 'distant' ? spec.maxH : null) : spec.maxH && _wflNum(spec.maxH[band]) ? spec.maxH[band] : null;
    if (maxH != null) list = list.filter(([id]) => { const k = worldKb(id); return k && k.size.h0 <= maxH; });
    if (!list.length) { F.unfillable.add(q.surf ? q.surf.kind : 'ground'); continue; }
    // paving gets its sparse furniture once (_wflPaving), never a carpet of planters
    if (g === 'paving') { if (F.pavingDone) F.pavingCapped.add(q.surf ? q.surf.id : 'paving'); continue; }
    let done = false;
    for (let tries = 0; tries < 4 && !done; tries++) {
      const obj = _wflPick(list, r), kb = _wflKb(F, obj);
      if (!kb) continue;
      // a seeded point inside the sample's cell (never the sample lattice itself: no rows), a little nearer so its clump covers it
      const jit = q.open ? 3 : 1, gp = _wflUnproject(F.cam, q.X + (r() - 0.5) * S.colW * jit, Math.max(F.cam.horizon + 0.5, q.Y + (r() - 0.5) * S.rowH * jit)) || { x: q.x, d: q.z };
      const zf = Math.max(F.cam.dMin * 1.03, gp.d * (0.82 + 0.14 * r())), xf = gp.x * zf / gp.d + (r() - 0.5) * Math.min(1.2, kb.size.l * 0.5);
      if (_wflGroupOf(F, _wflSurfAt(F, xf, zf)) !== g) continue;   // the dressing of this surface, not of its neighbour
      const n = q.open ? 1 : kb.cls === 'tree' ? 1 + (r() < 0.35 ? 1 : 0) : kb.cls === 'shrub' || kb.cls === 'cover' || kb.cls === 'flower' ? 1 + Math.floor(r() * (tier >= 2 ? 4 : 3)) : 1;
      const pit = g === 'paving' && kb.cls === 'tree';
      const or = kb.orient && kb.orient !== 'free' ? worldKbOrient(kb, _wflProbe(F, xf, zf)) : null;
      const got = _wflClump(F, obj, xf, zf, n, Math.max(0.5, kb.size.l * (kb.cls === 'tree' ? 1.6 : 0.9)), { auto: 'fill', rule: tier > 1 ? 'C6' : 'P6', why: `${g} ${band} dressing (tier ${tier})`, pit, facing: or && _wflNum(or.facing) ? or.facing : undefined });
      if (got.length) { done = true; placed += got.length; }
    }
  }
  F.boxes = null;
  return placed;
}
/** Street furniture on paving (P6, SCENE_LESSONS A: no big empty paving): the kit's bins, planters, benches, lamps and trees in
    pits per depth band at seeded spots (never rows), more where paving is a larger share of the frame, on lived plazas too (people
    walk round furniture; a strip's walking line stays clear, P3). A tree in a pit or a lamp in the middle distance gets a companion
    beside it (a bench, a bin, a planter): furniture comes in groups, as streets have it. */
function _wflPaving(F) {
  F.pavingDone = true;
  const cam = F.cam, r = F.r, ix = _wflIndexOf(F), spec = F.style.fill.paving;
  if (!spec || !ix.surfs.some(s => _WFL_GROUP[s.kind] === 'paving')) return;
  // the paving's share of the frame below the horizon (a coarse grid): a square that fills the frame gets up to three times the furniture
  let pv = 0, nn = 0;
  for (let j = 0; j < 12; j++) for (let i = 0; i < 16; i++) { const g = _wflUnproject(cam, (i + 0.5) * F.W / 16, cam.horizon + (j + 0.5) * (F.H - cam.horizon) / 12); if (!g) continue; nn++; if (_wflGroupOf(F, _wflSurfFast(F, g.x, g.d)) === 'paving') pv++; }
  const k = Math.max(1, Math.min(3, (nn ? pv / nn : 0) * 5));
  const cap0 = spec.max || { near: 6, mid: 14, far: 12 }, cap = { near: Math.round(cap0.near * k), mid: Math.round(cap0.mid * k), far: Math.round(cap0.far * k) };
  const got = { near: 0, mid: 0, far: 0 }, spots = [], seen = new Map();
  const companions = (spec.near || []).filter(([id]) => { const kb = worldKb(id); return kb && kb.size.h0 <= 1.6; }).concat([['street.bench', 2], ['street.mcf-litter-bin', 1]]).filter(([id]) => typeof sceneObj !== 'function' || sceneObj(id));
  // paving strips (pavements beside a road, a riverside walk): furniture stands in their kerb and building-line bands, outside
  // the walking line (P3); the sampler aims half its spots there
  const strips = ix.surfs.filter(s => _WFL_GROUP[s.kind] === 'paving' && Array.isArray(s.path) && s.path.length >= 2 && s.width >= 1.8);
  const stripLen = strips.map(s => { let L = 0; for (let i = 1; i < s.path.length; i++) L += Math.hypot(s.path[i][0] - s.path[i - 1][0], s.path[i][1] - s.path[i - 1][1]); return L; });
  const totLen = stripLen.reduce((a, v) => a + v, 0);
  for (let tries = 0; tries < 900; tries++) {
    let g = null;
    if (strips.length && totLen > 0 && r() < 0.5) {
      // a strip by length, a spot along it (nearer spots likelier: they are larger on screen), a side band
      let u = r() * totLen, si = 0; while (si < strips.length - 1 && u > stripLen[si]) { u -= stripLen[si]; si++; }
      const s = strips[si], P = s.path, at = Math.pow(r(), 1.6) * stripLen[si];
      let acc = 0, x = P[0][0], z = P[0][1], tx = 0, tz = 1;
      for (let i = 1; i < P.length; i++) { const L = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (acc + L >= at) { const t = (at - acc) / (L || 1); x = P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t; z = P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t; tx = (P[i][0] - P[i - 1][0]) / (L || 1); tz = (P[i][1] - P[i - 1][1]) / (L || 1); break; } acc += L; }
      const side = r() < 0.5 ? -1 : 1, off = side * (s.width / 2 - 0.25 - r() * Math.max(0.05, s.width / 2 - 1.1));
      g = { x: x + tz * off, d: z - tx * off };
    } else {
      const X = -F.pad + r() * (F.W + 2 * F.pad), Y = cam.horizon + 2 + r() * (F.H - cam.horizon - 2);
      g = _wflUnproject(cam, X, Y);
    }
    if (!g || !(g.d > 0.6) || g.d > 160) continue;
    const surf = _wflSurfAt(F, g.x, g.d);
    if (!surf || _wflGroupOf(F, surf) !== 'paving') continue;
    // a lived strip keeps its walking line (P3, _wflTry); a lived square keeps room to walk between groups
    const livedPoly = F.lived.has(surf.id) && !Array.isArray(surf.path);
    const band = g.d < _WFL_NEAR_Z ? 'near' : g.d < _WFL_MID_Z ? 'mid' : 'far';
    if (got[band] >= cap[band]) continue;
    // spacing grows with depth (the near band is small in metres but large on screen); a lived square keeps more room to walk
    if (spots.some(p => Math.hypot(p[0] - g.x, p[1] - g.d) < (livedPoly ? 2.6 : 2.2) + 0.07 * g.d)) continue;
    const obj = _wflPick(spec[band], r, seen), kb = _wflKb(F, obj);
    if (!kb) continue;
    const or = kb.orient && kb.orient !== 'free' ? worldKbOrient(kb, _wflProbe(F, g.x, g.d)) : null;
    const e = _wflTry(F, { obj, x: g.x, z: g.d, auto: 'fill', rule: 'P6', why: `paving ${band}: street furniture`, pit: kb.cls === 'tree', facing: or && _wflNum(or.facing) ? or.facing : (r() < 0.5 ? 90 : 270) });
    if (!e) continue;
    got[band]++; spots.push([g.x, g.d]); seen.set(obj, (seen.get(obj) || 0) + 1);
    // the group: a companion beside a tree pit or a lamp (a bench under the tree, a bin by the lamp)
    if (band !== 'far' && (kb.cls === 'tree' || kb.cls === 'lamp') && companions.length && r() < 0.75) {
      for (let t = 0; t < 4; t++) {
        const a = r() * Math.PI * 2, d = 1.1 + r() * 0.8, cobj = _wflPick(companions, r), ckb = _wflKb(F, cobj);
        if (!ckb) continue;
        const cx = g.x + Math.cos(a) * d, cz = g.d + Math.sin(a) * d, cor = ckb.orient && ckb.orient !== 'free' ? worldKbOrient(ckb, _wflProbe(F, cx, cz)) : null;
        const c = _wflTry(F, { obj: cobj, x: cx, z: cz, auto: 'fill', rule: 'P6', why: `paving ${band}: street furniture (a group)`, facing: cor && _wflNum(cor.facing) ? cor.facing : (r() < 0.5 ? 90 : 270) });
        if (c) break;
      }
    }
  }
  if (spots.length) _wflLog(F, { action: 'fill', rule: 'P6', reason: `${spots.length} pieces of street furniture on the paving (near ${got.near}, mid ${got.mid}, far ${got.far}; caps x${Math.round(k * 10) / 10} for the paving share)` });
}
/**
 * People dress paving and paths (C6, SCENE_LESSONS A: crowd flows, never empty squares): a walk surface that still shows a large
 * bare share of the frame and has no population gets the kit's own (a crowd in towns and cities, walkers with dogs in parks and
 * the country). The life package spawns, routes and thins them by time (worldKbDensity).
 */
function _wflPeople(F) {
  const W = F.world, view = Object.assign({}, W, { entities: (W.entities || []).filter(_wflPerennial) });
  const S = _wflSample(view, F.cam, { W: F.W, H: F.H, cols: 48, rows: 30, backdrop: _wflBackdrop(view, F.cam), surfAt: (x, z) => _wflSurfFast(F, x, z), ground: true });
  const bare = new Map();
  // walks, and open sand (a beach is walked all over)
  for (const q of S.samples) if (q.inFrame && !q.dressed && q.surf && (_WFL_WALK.has(q.surf.kind) || ['sand', 'beach'].includes(q.surf.kind)) && !q.surf.auto) bare.set(q.surf.id, (bare.get(q.surf.id) || 0) + 1);
  // lived surfaces count as dressed to the plain sampler: the strict measure asks again for every unlived walk in the frame
  const city = (F.style.place === 'city' || F.style.place === 'town'), K = F.style.life || {};
  for (const [id, n] of bare) {
    if (n / Math.max(1, S.n) < 0.03 || F.lived.has(id)) continue;
    const s = (W.surfaces || []).find(q => q.id === id), paving = s && ['pavement', 'plaza', 'platform', 'driveway'].includes(s.kind), sand = s && ['sand', 'beach'].includes(s.kind);
    if (_wflCarriesBuilding(W, s)) { _wflLog(F, { id: 'life:' + id, action: 'skip', rule: 'A2', reason: `no people on ${id}: a building stands on it (walkers would cross its walls)` }); continue; }
    const pick = (sand && K.sand) || (paving && K.paving) || K.walk || (city ? { who: 'crowd', rate: '8/min' } : { who: 'walkers', rate: '3/min', mix: { stroll: 0.55, brisk: 0.2, 'dog-walker': 0.25 } });
    const L = Object.assign({ who: pick.who, on: id, rate: pick.rate }, pick.mix ? { mix: Object.assign({}, pick.mix) } : {});
    L.auto = 'fill';
    try { const P = typeof WORLD_POPULATIONS === 'object' && WORLD_POPULATIONS ? WORLD_POPULATIONS[L.who] : null; if (P) L.pop = Object.assign({}, P); } catch (e) { /* the core resolves it */ }
    if (!Array.isArray(W.life)) W.life = [];
    W.life.push(L);
    F.lived.add(id);
    _wflLog(F, { id: 'life:' + id, action: 'fill', rule: 'C6', reason: `${L.who} on ${id} (${s ? s.kind : 'walk'}, ${Math.round(n / S.n * 100)} % of the frame bare): ${city ? 'paving' : 'a path'} is dressed by its people (the ${F.styleKey} kit)` });
  }
}
/** A polygon surface with a building standing on it (a footprint corner or centre inside it). */
function _wflCarriesBuilding(W, s) {
  if (!s || !Array.isArray(s.poly) || s.poly.length < 3) return false;
  for (const b of Array.isArray(W.buildings) ? W.buildings : []) {
    const P = b && Array.isArray(b.foot) ? b.foot.filter(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])) : [];
    if (!P.length) continue;
    const c = [P.reduce((a, p) => a + p[0], 0) / P.length, P.reduce((a, p) => a + p[1], 0) / P.length];
    if (P.concat([c]).some(p => _wflInPoly(s.poly, p[0], p[1]))) return true;
  }
  return false;
}
/**
 * The life defaults of the kit (N3: no scene ships lifeless): water birds on the largest visible water with no swimmers, grazers
 * on the largest open grass or heath (moor sheep, farm cattle), gulls over the coast and harbours, pigeons on city paving, each
 * only where the scene has none of that kind. Populations, never placed movers: the life package spawns and thins them by time.
 */
function _wflLife(F) {
  const W = F.world, K = F.style.life || {}, life = Array.isArray(W.life) ? W.life : (W.life = []), cam = F.cam;
  const visible = (s) => { const P = Array.isArray(s.poly) ? s.poly : Array.isArray(s.path) ? s.path : null; if (!P) return 0; let n = 0; for (const p of P) if (p[1] > 1 && Math.abs(p[0]) < 1.4 * p[1] + 30) n++; return n; };
  const area = (s) => { if (!Array.isArray(s.poly)) return Array.isArray(s.path) ? 50 * (s.width || 2) : 0; let A = 0; for (let i = 0, j = s.poly.length - 1; i < s.poly.length; j = i++) A += (s.poly[j][0] + s.poly[i][0]) * (s.poly[j][1] - s.poly[i][1]); return Math.abs(A / 2); };
  const layerOf = (L) => { const P = L && (L.pop || (typeof WORLD_POPULATIONS === 'object' && WORLD_POPULATIONS ? WORLD_POPULATIONS[L.who] : null)); return P ? P.layer : null; };
  const add = (L, why) => { try { const P = typeof WORLD_POPULATIONS === 'object' && WORLD_POPULATIONS ? WORLD_POPULATIONS[L.who] : null; if (!P) return; L.pop = Object.assign({}, P); } catch (e) { return; } L.auto = 'fill'; life.push(L); _wflLog(F, { id: 'life:' + (L.on || L.who), action: 'fill', rule: 'N3', reason: `${L.who}${L.count ? ' x' + L.count : ''}${L.on ? ' on ' + L.on : ''}: ${why} (the ${F.styleKey} kit)` }); };
  const waters = (W.surfaces || []).filter(s => s && s.kind === 'water' && s.water !== 'puddle' && visible(s)).sort((a, b) => area(b) - area(a));
  if (Array.isArray(K.water) && waters.length && !waters.some(w => life.some(L => L && L.on === w.id && (layerOf(L) === 'swim' || layerOf(L) === 'wade')))) {
    const w = waters[0];
    for (const it of K.water) add({ who: it.who, count: it.count, on: w.id }, 'water birds on the largest water');
  }
  const opens = (W.surfaces || []).filter(s => s && ['grass', 'heath', 'field', 'meadow'].includes(s.kind) && visible(s) && area(s) > 600).sort((a, b) => area(b) - area(a));
  if (Array.isArray(K.graze) && opens.length && !life.some(L => layerOf(L) === 'graze')) for (const it of K.graze) add({ who: it.who, count: it.count, on: opens[0].id }, 'grazers on the open ground');
  if (Array.isArray(K.air) && !life.some(L => layerOf(L) === 'air')) for (const it of K.air) add({ who: it.who, count: it.count }, 'birds over the scene');
  const pavs = (W.surfaces || []).filter(s => s && ['plaza', 'pavement'].includes(s.kind) && visible(s) && !_wflCarriesBuilding(W, s)).sort((a, b) => area(b) - area(a));
  if (Array.isArray(K.ground) && pavs.length && !life.some(L => L && /pigeon/.test(String(L.who)))) for (const it of K.ground) add({ who: it.who, count: it.count, on: pavs[0].id }, 'birds on the paving');
  void cam;
}
/** Seasonal and occasional accents (flowers in their months, leaf litter in autumn, lilies on calm water): variety, never coverage. */
function _wflAccents(F) {
  const r = F.r, before = F.count, ix = _wflIndexOf(F), cam = F.cam;
  const n = Math.min(80, Math.max(8, Math.round(F.count * 0.1)));
  for (let i = 0, tries = 0; i < n && tries < n * 6; tries++) {
    const X = -F.pad + r() * (F.W + 2 * F.pad), Y = cam.horizon + (F.H - cam.horizon) * Math.pow(r(), 0.7), g = _wflUnproject(cam, X, Y);
    if (!g || g.d > _WFL_MID_Z * 2) continue;
    const surf = _wflSurfAt(F, g.x, g.d), grp = _wflGroupOf(F, surf), spec = grp && F.style.fill[grp];
    if (!spec || !spec.accents || !spec.accents.length || grp === 'water') continue;
    const obj = _wflPick(spec.accents, r), kb = _wflKb(F, obj);
    if (!kb) continue;
    // an accent that is there all year (stones, a picnic) is occasional: a few clumps per view, never a carpet; the seasonal ones
    // (flowers, leaf litter) come and go with their months
    const seasonal = !!(kb.when && (kb.when.months || kb.when.dates || kb.when.weather)) && kb.cls !== 'picnic';
    const used = (F.accentN || (F.accentN = new Map())).get(obj) || 0;
    if (!seasonal && used >= 6) continue;
    const G = kb.group || {}, n = G.kind === 'single' ? 1 : 1 + Math.floor(r() * Math.min(4, Array.isArray(G.size) ? G.size[1] : 4));
    const got = _wflClump(F, obj, g.x, g.d, n, Math.max(0.4, kb.size.l), { auto: 'fill', rule: 'P6', why: `${grp} seasonal accent` });
    if (got.length) F.accentN.set(obj, used + 1);
    i += got.length;
  }
  // calm water: lilies in loose rafts near the banks, a few fish rings
  const wspec = F.style.fill.water;
  if (wspec && wspec.calm && wspec.calm.length) for (const w of ix.waters) {
    if (!w.calm) continue;
    const rafts = Math.round(6 * (wspec.share || 0.3) * 3);
    for (let k = 0, tries = 0; k < rafts && tries < rafts * 8; tries++) {
      const X = r() * F.W, Y = cam.horizon + (F.H - cam.horizon) * Math.pow(r(), 0.8), g = _wflUnproject(cam, X, Y);
      if (!g || g.d > 90) continue;
      const p = _wflProbe(F, g.x, g.d);
      if (p.kind !== 'water' || !(p.bankDist < 6)) continue;
      const obj = _wflPick(wspec.calm, r), kb = _wflKb(F, obj);
      const got = _wflClump(F, obj, g.x, g.d, kb && kb.cls === 'lily' ? 3 + Math.floor(r() * 6) : 1, 0.8, { auto: 'fill', rule: 'P6', why: 'calm water: lilies and rings', attach: undefined });
      if (got.length) k++;
    }
  }
  if (F.count > before) _wflLog(F, { action: 'fill', rule: 'P6', reason: `${F.count - before} seasonal accents (flowers in their months, leaf litter, lilies on calm water)` });
}

/* ---------- P7: the box measure (the tools' critic measure) and the richness tier ---------- */
const _WFL_BOX_BANDS = [{ id: 'near', z0: 0, z1: 15, w: 0.3, cover: 0.4, variety: 10, n: 80 }, { id: 'mid', z0: 15, z1: 80, w: 0.45, cover: 0.6, variety: 25, n: 300 },
  { id: 'far', z0: 80, z1: Infinity, w: 0.25, cover: 0.25, variety: 15, n: 500 }];
/** The box measure of a world: its statics, backdrop bands and hedge surfaces as screen boxes, judged per depth band (near < 15 m,
    mid 15-80 m, far beyond) by frame cover, object variety and count: { near, mid, far: { cover, variety, n }, score }. */
function _wflBoxScore(world, cam, o) {
  o = o || {};
  const W = o.W || 1600, H = o.H || 900, COLS = 64, ROWS = 36, F = { world, cam, W, H }, recs = [];
  for (const e of world.entities || []) if (e && e.obj && e.z > 0.3) recs.push({ obj: e.obj, z: e.z, box: _wflBox(F, e) });
  for (const b of o.backdrop || _wflBackdrop(world, cam)) if (b && b.obj && b.z > 0) recs.push({ obj: b.obj, z: b.z, box: _wflBox(F, b) });
  for (const s of world.surfaces || []) {
    if (s.kind !== 'hedge' || !Array.isArray(s.path) || s.path.length < 2) continue;
    const obj = s.obj || 'plant.towpath-hedge';
    if ((world.entities || []).some(e => e.obj === obj && e.host === s.id)) continue;
    for (let i = 1; i < s.path.length; i++) {
      const a = s.path[i - 1], b = s.path[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 2));
      for (let k = 0; k < n; k++) { const t = (k + 0.5) / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t; if (z > 0.5) recs.push({ obj, z, box: _wflBox(F, { obj, x, z }) }); }
    }
  }
  const out = {}, cells = _WFL_BOX_BANDS.map(() => new Uint8Array(COLS * ROWS)), objs = _WFL_BOX_BANDS.map(() => new Set()), counts = _WFL_BOX_BANDS.map(() => 0);
  for (const r of recs) {
    const b = r.box;
    if (!b || !b.every(_wflNum) || b[2] < 0 || b[0] > W || b[3] < 0 || b[1] > H) continue;
    const bi = _WFL_BOX_BANDS.findIndex(x => r.z >= x.z0 && r.z < x.z1);
    if (bi < 0) continue;
    objs[bi].add(r.obj); counts[bi]++;
    const c0 = Math.max(0, Math.floor(b[0] / W * COLS)), c1 = Math.min(COLS - 1, Math.floor(b[2] / W * COLS)), w0 = Math.max(0, Math.floor(b[1] / H * ROWS)), w1 = Math.min(ROWS - 1, Math.floor(b[3] / H * ROWS));
    for (let j = w0; j <= w1; j++) for (let i = c0; i <= c1; i++) { const X = (i + 0.5) * W / COLS, Y = (j + 0.5) * H / ROWS; if (X >= b[0] && X <= b[2] && Y >= b[1] && Y <= b[3]) cells[bi][j * COLS + i] = 1; }
  }
  let score = 0;
  _WFL_BOX_BANDS.forEach((band, bi) => {
    let n = 0; for (const v of cells[bi]) n += v;
    const cover = n / (COLS * ROWS), variety = objs[bi].size, q = { cover: 0.4 * Math.min(1, cover / band.cover), variety: 0.3 * Math.min(1, variety / band.variety), n: 0.3 * Math.min(1, Math.log1p(counts[bi]) / Math.log1p(band.n)) };
    out[band.id] = { cover: Math.round(cover * 1000) / 1000, variety, n: counts[bi], need: { cover: 0.4 - q.cover, variety: 0.3 - q.variety, n: 0.3 - q.n }, objs: objs[bi] };
    score += band.w * (q.cover + q.variety + q.n);
  });
  out.score = Math.round(score * 1000) / 10;
  return out;
}
/**
 * The richness tier (P7): until the box measure reaches the target (a converted scene's source score, o.floor.score, else the
 * place kind's default), add to the band that lacks most: tall clumps where it lacks cover, objects it has not got where it lacks
 * variety, small clumps where it lacks count. Each on legal ground through the usual checks; capped, and logged.
 */
function _wflRichTier(F, floor) {
  const kind = F.style.place || 'park', target = floor && _wflNum(floor.score) ? floor.score : (WORLD_RICHNESS_FLOOR.box[kind] || 90);
  // the kit's perennial pools (N1): every richness item is a curated kit object, never a stand-in
  const city = kind === 'city' || kind === 'town', pool = F.style.rich || { mid: [], far: [] }, r = F.r, cam = F.cam;
  const distant = (F.style.fill.grass && F.style.fill.grass.distant) || (F.style.fill[F.style.ground] && F.style.fill[F.style.ground].distant) || [];
  // the near band's pool: the style's near dressing, the wet margin and the small things of the mid pool
  // only the groups of the surfaces this world has (a park lawn never gets heather because the kit could dress a heath)
  const present = new Set(((F.world.surfaces || []).map(s => s && _WFL_GROUP[s.kind]).filter(Boolean)).concat([F.style.ground || 'grass']));
  const nearGroups = (city ? ['grass'] : ['grass', 'heath', 'wood', 'wet']).filter(g => present.has(g));
  const nearPool = [].concat(...nearGroups.map(g => F.style.fill[g]).filter(sp => sp && Array.isArray(sp.near)).map(sp => sp.near), (F.style.edges && F.style.edges.natural && !city) ? F.style.edges.natural.margin : [],
    (pool.mid || []).filter(([id]) => (worldKb(id) || { size: { h0: 9 } }).size.h0 < 2.5));
  const pools = { near: nearPool, mid: pool.mid || [], far: pool.far || [] }, Z = { near: [Math.max(cam.dMin * 1.1, 4), 15], mid: [15, 80], far: [80, 300] };
  let B = _wflBoxScore(F.world, cam), added = 0;
  const start = B.score, dead = new Set();
  // what already stands nearer at each screen cell (the strict measure's depth grid): the richness tier never plants a tree that
  // nothing of would show (behind a terrace, a mill, a wood), a waste of the scene's budget
  let occ = null;
  if (typeof worldDetailCoverage === 'function') { try { const rr = worldDetailCoverage(F.world, cam, { W: F.W, H: F.H, debug: true }); occ = rr && rr.grid; } catch (e) { occ = null; } }
  const hidden = (x, z, h) => {
    if (!occ) return false;
    const cw = F.W / occ.cols, ch = F.H / occ.rows, P0 = _wflProj(F, x, z, null), P1 = _wflProj(F, x, z, _wflGround(F, x, z) + h);
    for (const Y of [P0.Y - 2, (P0.Y + P1.Y) / 2, P1.Y + 2]) {
      const i = Math.floor(P0.X / cw), j = Math.floor(Y / ch);
      if (i < 0 || j < 0 || i >= occ.cols || j >= occ.rows) return false;
      const zz = occ.z[j * occ.cols + i];
      if (!(zz >= 0 && zz < z - 1)) return false;
    }
    return true;
  };
  for (let round = 0; round < 18 && added < 300 && B.score < target; round++) {
    // the band and the part of the measure that lack most (a part with nothing left to add is skipped)
    let best = null;
    for (const band of ['near', 'mid', 'far']) for (const what of ['cover', 'variety', 'count']) {
      if (dead.has(band + what) || dead.has(band)) continue;
      // variety and count are cheap (a new kind, a few small clumps); cover costs big trees: weigh by what it buys per item
      const need = B[band].need[what === 'count' ? 'n' : what] * _WFL_BOX_BANDS.find(x => x.id === band).w, gain = need * ({ variety: 3, count: 2, cover: 1 })[what];
      if (need > 0.002 && (!best || gain > best.gain)) best = { band, what, need, gain };
    }
    if (!best) break;
    const { band, what } = best, list = pools[band];
    let L = what === 'variety' ? list.filter(([id]) => !B[band].objs.has(id)) : what === 'cover' ? list.filter(([id]) => (worldKb(id) || { size: { h0: 0 } }).size.h0 >= (band === 'near' ? 0.8 : 4)) : list.filter(([id]) => (worldKb(id) || { size: { h0: 9 } }).size.h0 < 4);
    if (!L.length) { dead.add(band + what); continue; }
    let placed = 0;
    for (let tries = 0; tries < 200 && placed < 30; tries++) {
      // cover is bought nearest the band's front (a tree at 90 m covers twice the frame of one at 180 m), then wherever there is land
      const front = what === 'cover' && band !== 'near' && tries < 100;
      const zr = front ? [Z[band][0] + (band === 'mid' ? 12 : 0), Z[band][0] + (Z[band][1] - Z[band][0]) * (band === 'far' ? 0.25 : 1)] : Z[band];
      const z = zr[0] + Math.pow(r(), 0.8) * (zr[1] - zr[0]), x = _wflXAt(cam, -F.pad + r() * (F.W + 2 * F.pad), z);
      // beyond the far band (120 m) the distant pool (dome trees read as trees there); nearer, only structured trees
      const LL = band === 'far' && z >= _WFL_FAR_Z && distant.length && what !== 'variety' ? distant : L;
      const obj = _wflPick(LL, r), kb = _wflKb(F, obj);
      if (!kb || kb.object === false) continue;
      if (hidden(x, z, kb.size.h0)) continue;
      const n = kb.cls === 'tree' ? 1 + (r() < 0.3 ? 1 : 0) : 1 + Math.floor(r() * 3);
      const got = _wflClump(F, obj, x, z, n, Math.max(0.6, kb.size.l * (kb.cls === 'tree' ? 1.2 : 0.8)), { auto: 'fill', rule: 'P7', why: `richness: ${band} ${what}` });
      placed += got.length;
      if (what === 'variety' && got.length) { L = L.filter(([id]) => id !== obj); if (!L.length) break; }
    }
    added += placed;
    const B2 = _wflBoxScore(F.world, cam);
    // nothing placed, or too little gained for what it costs: that part is done
    if (!placed || B2.score - B.score < 0.02 * placed) dead.add(band + what);
    B = B2;
  }
  if (F.world.fillState) F.world.fillState.box = B.score;
  if (added || B.score < target) _wflLog(F, { action: 'fill', rule: 'P7', reason: `richness tier: ${added} added; box measure ${start} -> ${B.score} (target ${target}${floor && _wflNum(floor.score) ? ', the source' : ', ' + kind})${B.score < target ? ': no legal place left for more' : ''}` });
}

/* ---------- the fill ---------- */
/**
 * Dress, frame and fill a world (12.3). Runs after the placement solver; idempotent (a second call does only what the first
 * skipped, e.g. the auto-fill after fill: false). Returns the log entries of this call (the caller appends them to world.log).
 */
function worldFill(world, o) {
  const log = [];
  try {
    o = o || {};
    if (!world || typeof world !== 'object') return log;
    const cam = o.cam || world.cam;
    if (!cam || !_wflNum(cam.f)) { log.push({ id: null, obj: null, action: 'fill', rule: 'P6', reason: 'no camera: nothing filled', by: 'kb' }); return log; }
    if (!Array.isArray(world.entities)) world.entities = [];
    if (!Array.isArray(world.surfaces)) world.surfaces = [];
    const state = world.fillState || (world.fillState = { edges: false, frame: false, fill: false, tiers: 0 });
    const fillOff = o.fill === false || world.fill === false || (world.spec && world.spec.fill === false);
    // o.styleRecord: a fill style record to use as it is (tools and tests); else the world's kit
    const styleKey = o.styleRecord && o.styleRecord.kit ? o.styleRecord.kit : worldFillStyle(world, o), style = o.styleRecord || WORLD_FILL_STYLES[styleKey];
    const F = { world, cam, log, style, styleKey, W: o.W || 1600, H: o.H || 900, pad: (o.overscan == null ? 0.18 : o.overscan) * (o.W || 1600), ctx: o.ctx || world.ctx || null,
      r: _wflRng('fill|' + (world.seed | 0) + '|' + styleKey + '|' + Math.round(cam.heading || 0)), count: 0, seq: 0, maxAuto: o.maxAuto || 1400, ids: new Set(), added: [], bad: new Set(),
      spacing: new Map(), tier: 1, unfillable: new Set(), pavingCapped: new Set(), lived: _wflLived(world), ix: null, boxes: null, pavingDone: false, authorReeds: [],
      seasonal: o.seasonal === true || (o.seasonal !== false && typeof worldStaticPresent === 'function') };
    for (const e of world.entities) { if (e && e.id) F.ids.add(e.id); if (e && e.auto) F.count++; }
    F.count = Math.min(F.count, F.maxAuto);
    F.authorReeds = world.entities.filter(e => e && !e.auto && e.obj && (worldKb(e.obj) || {}).cls === 'reed');
    F.landmarks = _wflLandmarks(F);
    _wflViewInit(F);
    for (const e of world.entities) if (e && e.auto && e.obj) { const kb = worldKb(e.obj); if (kb) _wflSpacingAdd(F, e.x, e.z, Math.max(0.18, 0.42 * Math.min(kb.size.l || 0.5, 3)), e.obj); }
    // the backdrop from the place style when the scene has none (no empty backgrounds)
    if (!world.backdrop && style.backdrop) {
      world.backdrop = { style: style.backdrop };
      log.push({ id: null, obj: null, action: 'default', rule: 'emptyBackground', reason: `backdrop '${style.backdrop}' from the place style '${styleKey}'`, by: 'kb' });
    }
    if (!state.edges) { _wflEdges(F); state.edges = true; }
    if (!state.frame) { _wflFrame(F); _wflNearBand(F); state.frame = true; }
    if (!fillOff && !state.fill) {
      const floor = o.floor || null, maxTier = o.maxTier || 5;
      let cov = _wflCoverage(F), rich = worldRichness(world, cam, { perennial: true, floor, W: F.W, H: F.H, box: false });
      const start = cov.bare;
      _wflPaving(F);
      _wflPeople(F);
      _wflLife(F);
      for (let tier = 1; tier <= maxTier; tier++) {
        if (cov.ok && rich.ok && tier > 1) break;
        const n = _wflCoverPass(F, tier);
        const cov2 = _wflCoverage(F);
        log.push({ id: null, obj: null, action: 'fill', rule: tier > 1 ? 'C6' : 'P6', reason: `tier ${tier}: ${n} placed; bare ${Math.round(cov.bare * 100)} % -> ${Math.round(cov2.bare * 100)} % (${cov2.by})`, by: 'kb' });
        cov = cov2; rich = worldRichness(world, cam, { perennial: true, floor, W: F.W, H: F.H, box: false });
        state.tiers = tier;
        if (n === 0) break;
      }
      _wflAccents(F);
      _wflRichTier(F, floor);
      // ... and the walked ground keeps a way through (last, so the richness tiers cannot close it again)
      { const gone = _wflThroughLane(F); if (gone.length) log.push({ id: null, obj: null, action: 'fill', rule: 'P3', reason: `${gone.length} piece(s) taken away that closed the way through the walked ground (${gone.map(e => e.obj).join(', ')})`, by: 'kb' }); }
      rich = worldRichness(world, cam, { perennial: true, floor, W: F.W, H: F.H, box: false });
      if (!cov.ok) {
        const why = [];
        if (F.unfillable.size) why.push('nothing dresses ' + [...F.unfillable].join(', '));
        if (F.pavingCapped.size) why.push(`the street furniture budget is spent on ${[...F.pavingCapped].join(', ')}`);
        if (F.count >= F.maxAuto) why.push('the auto entity budget is spent');
        log.push({ id: null, obj: null, action: 'fill', rule: 'C6', reason: `stopped at ${Math.round(cov.bare * 100)} % bare (from ${Math.round(start * 100)} %): no legal place left${why.length ? ' (' + why.join('; ') + ')' : ''}`, by: 'kb' });
      }
      if (!rich.ok) {
        const fl = WORLD_RICHNESS_FLOOR, short = ['near', 'mid', 'far'].filter(k => rich[k].cover < fl[k].cover || rich[k].variety < fl[k].variety).map(k => `${k} cover ${rich[k].cover} (floor ${fl[k].cover}), variety ${rich[k].variety} (floor ${fl[k].variety})`);
        log.push({ id: null, obj: null, action: 'fill', rule: 'P7', reason: `below the richness floor: score ${rich.score} (floor ${rich.floor})${short.length ? '; ' + short.join('; ') : ''}`, by: 'kb' });
      }
      state.fill = true;
      state.coverage = cov.bare; state.richness = rich.score;
    } else if (fillOff && !state.offLogged) {
      log.push({ id: null, obj: null, action: 'fill', rule: 'P6', reason: 'fill: false: no auto-fill (edges and framing only)', by: 'kb' });
      state.offLogged = true;
    }
    state.style = styleKey;
    if (Array.isArray(world.log)) for (const x of log) world.log.push(x);
    return log;
  } catch (e) {
    log.push({ id: null, obj: null, action: 'fill', rule: 'G8', reason: 'the fill stopped on an error: ' + (e && e.message ? e.message : String(e)), by: 'kb' });
    return log;
  }
}
