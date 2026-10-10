/* ============================================================
   WORLD ENGINE (scene format v3): backdrop bands and the bare-frame check (docs/dev/WORLD_ENGINE.md 2.7, 8.5; module E).
   PURE (Node + browser): only functions and frozen data at load; it reads the object library (sceneObj, sceneObjReal) and the
   camera maths (sceneProject, sceneUnproject) when called.

     WORLD_BACKDROP_STYLES               the presets: a far ground kind + 2-4 bands at fixed depths (metres) of library objects
     worldBackdrop(world, cam, season)   -> entities[] (far bands + skyline entries) in WORLD metres, seeded clustered scatter
     worldBackdropGround(world, cam)     -> the style's far ground surface (a polygon in metres from the scene's edge to dMax)
     worldBackdropValidate(backdrop)     -> [{ path, rule, msg, fix }] (unknown style, bad skyline entries, look fields)
     worldCoverage(world, cam, o)        -> { bare, ok, regions: [{ name, box, bare }], samples } (> 0.15 bare: emptyBackground)

   A world here is the record of worldBuild (module A) or anything with { cam?, surfaces, entities, life?, backdrop, seed }.
   Entities: { id, obj, x, z, y?, facing?, height? }. Surfaces: { id, kind, poly } or { id, kind, path, width }.
   The backdrop has no pixel, no scale and no layer: every band member is a world entity at a real depth with its real size.
   ============================================================ */

/* ---------- presets ---------- */
// band: z (metres, the band's nominal depth; the band never starts nearer than the scene's own far edge), dz (depth jitter, a
// share of z), objs (library ids, weighted by repetition), fill (members' widths per metre of band width; > 1 overlaps), cl (members per cluster [min, max]), sp (cluster spread, metres), max (member cap; the perf budget).
const WORLD_BACKDROP_STYLES = Object.freeze({
  heath: { ground: 'heath', bands: [
    { z: 260, dz: 0.25, objs: ['tree.far-pine', 'tree.far-pine', 'tree.far-birch', 'tree.distant-pine'], fill: 1.1, cl: [3, 7], sp: 18, max: 90 },
    { z: 700, dz: 0.2, objs: ['tree.distant-pine', 'tree.distant', 'tree.woods-edge'], fill: 1.2, cl: [4, 9], sp: 40, max: 90 },
    { z: 2000, dz: 0.15, objs: ['tree.woods-edge', 'tree.pond-wood'], fill: 0.9, cl: [5, 10], sp: 120, max: 80 }] },
  woodland: { ground: 'grass', bands: [
    { z: 220, dz: 0.25, objs: ['tree.far-broad', 'tree.far-broad', 'tree.far-birch', 'tree.wyv-far-oak'], fill: 1.3, cl: [4, 8], sp: 16, max: 100 },
    { z: 650, dz: 0.2, objs: ['tree.woods-edge', 'tree.distant', 'tree.pond-wood'], fill: 1.3, cl: [5, 10], sp: 40, max: 90 },
    { z: 1800, dz: 0.15, objs: ['tree.woods-edge', 'tree.pond-wood'], fill: 1, cl: [6, 12], sp: 120, max: 80 }] },
  downs: { ground: 'field', bands: [
    { z: 300, dz: 0.25, objs: ['tree.far-broad', 'tree.distant', 'plant.hedge'], fill: 0.8, cl: [3, 6], sp: 25, max: 80 },
    { z: 900, dz: 0.2, objs: ['tree.woods-edge', 'tree.distant'], fill: 0.7, cl: [3, 7], sp: 60, max: 70 },
    { z: 2500, dz: 0.1, objs: ['rock.chalk-downs'], fill: 1.2, cl: [2, 4], sp: 200, max: 40 }] },
  farmland: { ground: 'field', bands: [
    { z: 250, dz: 0.25, objs: ['tree.far-broad', 'tree.far-broad', 'plant.hedge', 'plant.hedge', 'building.cottage'], fill: 1, cl: [3, 7], sp: 22, max: 100 },
    { z: 700, dz: 0.2, objs: ['tree.distant', 'tree.woods-edge', 'building.oast-house', 'tree.far-broad'], fill: 1, cl: [3, 8], sp: 50, max: 90 },
    { z: 2000, dz: 0.15, objs: ['tree.woods-edge', 'tree.pond-wood'], fill: 0.9, cl: [5, 10], sp: 120, max: 80 }] },
  'town-low': { ground: 'town', bands: [
    { z: 200, dz: 0.2, objs: ['building.terrace', 'building.terrace', 'building.cottage', 'tree.far-broad', 'building.church'], fill: 1.2, cl: [3, 8], sp: 20, max: 110 },
    { z: 600, dz: 0.2, objs: ['building.terrace', 'tree.distant', 'building.townhouse', 'tree.woods-edge'], fill: 1.2, cl: [4, 9], sp: 45, max: 100 },
    { z: 1800, dz: 0.15, objs: ['tree.woods-edge', 'tree.pond-wood', 'building.skyline-band'], fill: 0.9, cl: [5, 10], sp: 120, max: 80 }] },
  'city-victorian': { ground: 'town', bands: [
    { z: 180, dz: 0.2, objs: ['building.terrace-victorian', 'building.terrace-victorian', 'building.townhouse', 'building.church', 'building.shopfront'], fill: 1.4, cl: [4, 9], sp: 18, max: 120 },
    { z: 550, dz: 0.2, objs: ['building.townhouse', 'building.tower-stone', 'building.terrace-victorian', 'tree.distant'], fill: 1.3, cl: [4, 9], sp: 40, max: 100 },
    { z: 1600, dz: 0.15, objs: ['building.skyline-band', 'building.tower-stone'], fill: 1, cl: [3, 7], sp: 100, max: 60 }] },
  'city-sheffield-hills': { ground: 'town', bands: [
    { z: 200, dz: 0.2, objs: ['building.terrace-northern', 'building.terrace-northern', 'building.mill-red-brick', 'tree.far-broad'], fill: 1.3, cl: [3, 8], sp: 20, max: 110 },
    { z: 650, dz: 0.2, objs: ['building.terrace-northern', 'building.mill-red-brick', 'tree.distant', 'tree.woods-edge'], fill: 1.2, cl: [4, 9], sp: 45, max: 100 },
    { z: 1800, dz: 0.12, objs: ['building.shc-hills'], fill: 1.2, cl: [2, 4], sp: 200, max: 30 }] },
  'city-manchester-towers': { ground: 'town', bands: [
    { z: 200, dz: 0.2, objs: ['building.mill-red-brick', 'building.warehouse-canal', 'building.media-block', 'building.terrace-northern'], fill: 1.3, cl: [3, 7], sp: 22, max: 100 },
    { z: 600, dz: 0.2, objs: ['building.mcr-glass-tower', 'building.tower-glass', 'building.mill-red-brick', 'building.warehouse-canal'], fill: 1.1, cl: [3, 7], sp: 50, max: 90 },
    { z: 1600, dz: 0.15, objs: ['building.skyline-band', 'building.tower-glass'], fill: 1, cl: [3, 7], sp: 100, max: 60 }] },
  'canal-wooded': { ground: 'grass', bands: [
    { z: 200, dz: 0.25, objs: ['tree.bank-distant', 'tree.bank-distant', 'tree.far-broad', 'tree.far-birch', 'tree.wyv-far-sallow'], fill: 1.4, cl: [4, 9], sp: 16, max: 110 },
    { z: 600, dz: 0.2, objs: ['tree.woods-edge', 'tree.distant', 'tree.pond-wood'], fill: 1.3, cl: [5, 10], sp: 40, max: 90 },
    { z: 1800, dz: 0.15, objs: ['tree.woods-edge', 'tree.pond-wood'], fill: 1, cl: [6, 12], sp: 120, max: 80 }] },
  coast: { ground: 'sand', bands: [
    { z: 300, dz: 0.2, objs: ['building.beach-huts', 'building.cottage', 'tree.far-broad'], fill: 0.7, cl: [3, 7], sp: 25, max: 80 },
    { z: 900, dz: 0.2, objs: ['rock.chalk-cliff', 'tree.woods-edge'], fill: 0.8, cl: [2, 5], sp: 80, max: 50 },
    { z: 2500, dz: 0.1, objs: ['rock.chalk-downs', 'rock.chalk-cliff'], fill: 1, cl: [2, 4], sp: 200, max: 40 }] },
});
const WORLD_COVERAGE_MAX = 0.15;
// surfaces that are dressed by themselves (texture, mirror, ripple, stems); grass, paving, fields are bare unless something
// stands on them or a life population walks them
const _WBD_DRESSED_KINDS = new Set(['water', 'reeds', 'bed', 'hedge', 'weir', 'rail', 'tram']);
const _WBD_SKY_KEYS = ['obj', 'bearing', 'dist', 'src', 'id', 'variant'];

/* ---------- small helpers (shared with 79-world-4light.js: one classic scope) ---------- */
function _wlHash(s) { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function _wlRng(seed) {
  let a = _wlHash(seed) || 1;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function _wlCam(world, cam) {
  const c = cam || (world && world.cam);
  if (!c) throw new Error('world light: no camera');
  return c;
}
const _wlDimMemo = new Map();
/** Real dimensions of a library object in metres { h, l (across the view), w (depth) }: sceneObjReal, else a 1 m cube. */
function _wlDims(id) {
  let r = _wlDimMemo.get(id);
  if (r) return r;
  const q = typeof sceneObjReal === 'function' ? sceneObjReal(id) : null;
  r = q ? { h: q.h, l: q.l, w: q.w } : { h: 1, l: 1, w: 1 };
  _wlDimMemo.set(id, r);
  return r;
}
function _wlHeight(e) { return Number.isFinite(e.height) ? e.height : _wlDims(e.obj).h; }
function _wlGroundY(cam, x, z) { return typeof sceneGroundHeight === 'function' ? sceneGroundHeight(cam, x, z) : 0; }
function _wlProj(cam, x, z, y) {
  const d = Math.max(0.01, z), k = cam.f / d, h = y == null ? _wlGroundY(cam, x, d) : y;
  return { X: cam.x0 + k * x, Y: cam.horizon + k * (cam.eye - h), k };
}
function _wlInPoly(x, z, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
function _wlSegDist(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz;
  const t = L2 > 0 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)) : 0;
  const px = a[0] + t * dx, pz = a[1] + t * dz;
  return { d: Math.hypot(x - px, z - pz), p: [px, pz] };
}
/** The polygon of a surface: its own poly, or its centre line buffered to its width (a quad strip outline). */
function _wlSurfPoly(s) {
  if (Array.isArray(s.poly)) return s.poly;
  if (s._poly) return s._poly;
  const P = s.path || [], hw = (s.width || 2) / 2, L = [], R = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], n = Math.hypot(dx, dz) || 1;
    L.push([P[i][0] - dz / n * hw, P[i][1] + dx / n * hw]); R.push([P[i][0] + dz / n * hw, P[i][1] - dx / n * hw]);
  }
  const out = L.concat(R.reverse());
  try { Object.defineProperty(s, '_poly', { value: out, enumerable: false }); } catch (e) { /* frozen: recompute */ }
  return out;
}
function _wlInSurf(s, x, z) {
  if (Array.isArray(s.poly)) return _wlInPoly(x, z, s.poly);
  const P = s.path;
  if (!Array.isArray(P) || P.length < 2) return false;
  const hw = (s.width || 2) / 2;
  for (let i = 0; i + 1 < P.length; i++) if (_wlSegDist(x, z, P[i], P[i + 1]).d <= hw) return true;
  return false;
}
/** The topmost surface at (x, z) (later surfaces override earlier ones, WORLD_ENGINE 1.4). */
function _wlSurfAt(world, x, z) {
  const S = (world && world.surfaces) || [];
  for (let i = S.length - 1; i >= 0; i--) if (_wlInSurf(S[i], x, z)) return S[i];
  return null;
}
function _wlFarZ(world) {
  let m = 0;
  for (const s of (world && world.surfaces) || []) for (const p of (Array.isArray(s.poly) ? s.poly : s.path || [])) if (p[1] > m) m = p[1];
  for (const e of (world && world.entities) || []) if (!e.backdrop && e.z > m && e.z < 1000) m = e.z;
  return m;
}
/** The half-width of the camera frustum at depth z (metres), with a margin. */
function _wlHalfW(cam, z, margin) { return (cam.x0 + (margin || 0)) * z / cam.f; }

/* ---------- the backdrop ---------- */
/** Errors of a backdrop block (rules: badBackdrop, unknownStyle, screenOrLookField, unknownSize). */
function worldBackdropValidate(b) {
  const errs = [], E = (path, rule, msg, fix) => errs.push({ path, rule, msg, fix });
  if (!b || typeof b !== 'object') { E('backdrop', 'emptyBackground', 'backdrop is required', "add backdrop: { style: 'woodland' } (" + Object.keys(WORLD_BACKDROP_STYLES).join(', ') + ')'); return errs; }
  for (const k of Object.keys(b)) if (k !== 'style' && k !== 'skyline') E('backdrop.' + k, /^(X|Y|px|s|scale|layer|tint|light|colour|grade)$/.test(k) ? 'screenOrLookField' : 'unknownKey', 'backdrop has no field ' + k, 'remove it');
  if (!WORLD_BACKDROP_STYLES[b.style]) E('backdrop.style', 'unknownStyle', 'unknown backdrop style ' + b.style, 'one of ' + Object.keys(WORLD_BACKDROP_STYLES).join(', '));
  if (b.skyline != null && !Array.isArray(b.skyline)) E('backdrop.skyline', 'badBackdrop', 'skyline is a list', 'skyline: [{ obj, bearing, dist, src }]');
  (Array.isArray(b.skyline) ? b.skyline : []).forEach((s, i) => {
    const p = 'backdrop.skyline[' + i + ']';
    if (!s || typeof s !== 'object') { E(p, 'badBackdrop', 'not an object', '{ obj, bearing, dist, src }'); return; }
    for (const k of Object.keys(s)) if (!_WBD_SKY_KEYS.includes(k)) E(p + '.' + k, /^(X|Y|px|s|scale|layer|y|h)$/.test(k) ? 'screenOrLookField' : 'unknownKey', 'a skyline entry has no field ' + k, 'only ' + _WBD_SKY_KEYS.join(', '));
    if (typeof sceneObj === 'function' && !sceneObj(s.obj)) E(p + '.obj', 'unknownSize', 'no library object ' + s.obj, 'use a library id');
    if (!Number.isFinite(s.bearing)) E(p + '.bearing', 'badBackdrop', 'bearing (degrees from north) is required', 'bearing: 312');
    if (!(s.dist > 0)) E(p + '.dist', 'badBackdrop', 'dist (metres) is required', 'dist: 1800');
    if (!s.src) E(p + '.src', 'badBackdrop', 'a real landmark carries src', "src: 'OS map'");
  });
  return errs;
}
/** The style's far ground: a polygon from just inside the scene's far edge to the camera's far limit, across the frustum. */
function worldBackdropGround(world, cam) {
  cam = _wlCam(world, cam);
  const st = WORLD_BACKDROP_STYLES[world && world.backdrop && world.backdrop.style];
  if (!st) return null;
  const z0 = Math.max(cam.dMin || 2, _wlFarZ(world) * 0.98), z1 = Math.max(z0 + 10, cam.dMax || 20000), m = 200;
  return { id: 'backdrop-ground', kind: st.ground, backdrop: true, poly: [[-_wlHalfW(cam, z0, m), z0], [_wlHalfW(cam, z0, m), z0], [_wlHalfW(cam, z1, m), z1], [-_wlHalfW(cam, z1, m), z1]] };
}
/**
 * The far bands and skyline of a world, as world entities (metres). Seeded clustered scatter: cluster centres spread across
 * the band's frustum width, members gaussian about them, each a library object at its real size. Members whose screen box
 * would be fully hidden by a nearer band member of the same column are kept (the order pass sorts them): cheap and simple.
 */
function worldBackdrop(world, cam, season) {
  cam = _wlCam(world, cam);
  const b = world && world.backdrop, st = b && WORLD_BACKDROP_STYLES[b.style];
  if (!st) return [];
  const has = (id) => typeof sceneObj !== 'function' || !!sceneObj(id);
  const rnd = _wlRng('backdrop|' + b.style + '|' + (world.seed == null ? 0 : world.seed) + '|' + Math.round(cam.heading || 0));
  const gauss = () => { let u = 0; for (let i = 0; i < 4; i++) u += rnd(); return (u - 2) / 0.58; };
  const out = [], farZ = _wlFarZ(world);
  st.bands.forEach((band, bi) => {
    const objs = band.objs.filter(has);
    if (!objs.length) return;
    const z = Math.max(band.z, farZ * (1.12 + 0.6 * bi)), hw = _wlHalfW(cam, z, 120), W = 2 * hw;
    // march across the band: clusters of k members, each member a step of (its width / fill) with jitter, a short seeded gap
    // between clusters; when the cap would not reach across, the steps stretch evenly (gaps, never an empty side)
    const avgL = objs.reduce((a, id) => a + _wlDims(id).l, 0) / objs.length, stretch = Math.max(1, (W * band.fill / avgL) / band.max);
    let cur = -hw - rnd() * avgL, n = 0;
    while (cur < hw && n < band.max) {
      const cz = z * (1 + (rnd() * 2 - 1) * band.dz), k = band.cl[0] + Math.floor(rnd() * (band.cl[1] - band.cl[0] + 1));
      for (let j = 0; j < k && n < band.max && cur < hw; j++) {
        const obj = objs[Math.floor(rnd() * objs.length)], dm = _wlDims(obj);
        const zz = Math.max(farZ + 5, cz + gauss() * band.sp * 0.4), x = cur + dm.l / 2;
        out.push({ id: 'bd-' + bi + '-' + n, obj, x: Math.round(x * 10) / 10, z: Math.round(zz * 10) / 10, y: _wlGroundY(cam, x, zz), facing: 0,
          height: dm.h, static: true, backdrop: true, band: bi, season: season || null, solidity: 'passable', attach: 'ground' });
        cur += dm.l / band.fill * (0.6 + 0.6 * rnd()) * stretch * (zz / z);
        n++;
      }
      cur += rnd() * band.sp * 0.5 * stretch;
    }
  });
  (Array.isArray(b.skyline) ? b.skyline : []).forEach((s, i) => {
    if (!s || !has(s.obj) || !(s.dist > 0) || !Number.isFinite(s.bearing)) return;
    const rel = (s.bearing - (cam.heading || 0)) * Math.PI / 180, x = s.dist * Math.sin(rel), z = s.dist * Math.cos(rel);
    if (!(z > 1)) return;                           // behind the camera: not in this view
    out.push({ id: s.id || 'sky-' + i, obj: s.obj, variant: s.variant, x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, y: _wlGroundY(cam, x, z), facing: 0,
      height: _wlDims(s.obj).h, static: true, backdrop: true, skyline: true, src: s.src || null, season: season || null, solidity: 'passable', attach: 'ground' });
  });
  return out;
}

/* ---------- the bare-frame check ---------- */
/** The screen box [X0, Y0, X1, Y1] (scene units) of a world entity standing at its real size. */
function worldEntityBox(cam, e) {
  const d = _wlDims(e.obj), z = Math.max(0.05, e.z), y = Number.isFinite(e.y) ? e.y : _wlGroundY(cam, e.x, z);
  const p = _wlProj(cam, e.x, z, y), h = _wlHeight(e), hw = d.l * p.k / 2;
  return [p.X - hw, p.Y - h * p.k, p.X + hw, p.Y];
}
/**
 * The share of the frame below the horizon row that is bare: neither inside an entity's screen box (the scene's, the
 * backdrop's, o.extra's) nor on a self-dressed surface (water, reeds, beds, hedges, rails) nor on a surface a life population
 * walks. o: { backdrop (entities; default worldBackdrop), cols (64), rows (40), W (1600), H (900), season }.
 * Also the horizon: the share of columns where nothing stands across the horizon row (sky meets bare ground), <= 15 %.
 * Returns { bare, sky, ok, rule, regions: [{ name, box, bare }] (a 3 x 3 grid of the area below the horizon, worst first), samples }.
 */
function worldCoverage(world, cam, o) {
  cam = _wlCam(world, cam); o = o || {};
  const W = o.W || 1600, H = o.H || 900, cols = o.cols || 64, rows = o.rows || 40, top = Math.max(0, cam.horizon);
  const bd = o.backdrop || worldBackdrop(world, cam, o.season), ground = worldBackdropGround(world, cam);
  const ents = ((world && world.entities) || []).concat(bd, o.extra || []);
  const lived = new Set();
  for (const p of (world && world.life) || []) if (p && p.on) lived.add(p.on);
  // boxes bucketed by column
  const colOf = (X) => Math.max(0, Math.min(cols - 1, Math.floor(X / W * cols)));
  const byCol = Array.from({ length: cols }, () => []);
  for (const e of ents) {
    if (!e || !e.obj || !(e.z > 0)) continue;
    const bx = worldEntityBox(cam, e);
    if (bx[2] < 0 || bx[0] > W || bx[3] < top) continue;
    for (let c = colOf(bx[0]); c <= colOf(bx[2]); c++) byCol[c].push(bx);
  }
  const reg = Array.from({ length: 9 }, () => ({ n: 0, bare: 0 }));
  let n = 0, bare = 0;
  if (top >= H) return { bare: 0, ok: true, regions: [], samples: 0 };
  for (let r = 0; r < rows; r++) {
    const Y = top + (r + 0.5) * (H - top) / rows;
    for (let c = 0; c < cols; c++) {
      const X = (c + 0.5) * W / cols;
      let dressed = byCol[c].some(b => X >= b[0] && X <= b[2] && Y >= b[1] && Y <= b[3]);
      if (!dressed) {
        const g = typeof sceneUnproject === 'function' ? sceneUnproject(cam, X, Y) : (Y > cam.horizon ? { x: (X - cam.x0) * cam.f * cam.eye / (Y - cam.horizon) / cam.f, d: cam.f * cam.eye / (Y - cam.horizon) } : null);
        if (g) {
          const s = _wlSurfAt(world, g.x, g.d);
          if (s && (_WBD_DRESSED_KINDS.has(s.kind) || lived.has(s.id))) dressed = true;
          // the far ground beyond the last band is dressed by the bands themselves only where they stand: rows within a
          // pixel of the horizon read as the horizon line, not as bare ground
          else if (!s && ground && Y - cam.horizon < 1.5) dressed = true;
        }
      }
      const ri = Math.min(2, Math.floor(r / rows * 3)) * 3 + Math.min(2, Math.floor(c / cols * 3));
      reg[ri].n++; n++;
      if (!dressed) { reg[ri].bare++; bare++; }
    }
  }
  const RN = ['far', 'mid', 'near'], CN = ['left', 'centre', 'right'];
  const regions = reg.map((q, i) => ({ name: RN[Math.floor(i / 3)] + '-' + CN[i % 3],
    box: [Math.round((i % 3) * W / 3), Math.round(top + Math.floor(i / 3) * (H - top) / 3), Math.round((i % 3 + 1) * W / 3), Math.round(top + (Math.floor(i / 3) + 1) * (H - top) / 3)],
    bare: q.n ? Math.round(q.bare / q.n * 1000) / 1000 : 0 })).filter(q => q.bare > 0).sort((a, b) => b.bare - a.bare);
  // the horizon line: a column where nothing stands across the horizon row is sky meeting bare ground (an empty background)
  let open = 0;
  const openCols = [];
  for (let c = 0; c < cols; c++) {
    const X = (c + 0.5) * W / cols, hz = cam.horizon;
    if (!byCol[c].some(b => X >= b[0] && X <= b[2] && b[1] < hz - 0.5 && b[3] >= hz - 0.5 - 0.02 * (H - hz))) { open++; openCols.push(c); }
  }
  const sky = cols ? open / cols : 0;
  if (sky > 0) {
    const thirds = [0, 0, 0];
    for (const c of openCols) thirds[Math.min(2, Math.floor(c / cols * 3))]++;
    thirds.forEach((k, i) => { if (k) regions.push({ name: 'horizon-' + CN[i], box: [Math.round(i * W / 3), Math.round(cam.horizon - 0.04 * H), Math.round((i + 1) * W / 3), Math.round(cam.horizon)], bare: Math.round(k / (cols / 3) * 1000) / 1000 }); });
  }
  const share = n ? bare / n : 0, ok = share <= WORLD_COVERAGE_MAX && sky <= WORLD_COVERAGE_MAX;
  return { bare: Math.round(share * 1000) / 1000, sky: Math.round(sky * 1000) / 1000, ok, rule: ok ? null : 'emptyBackground', regions, samples: n,
    msg: ok ? '' : `${Math.round(share * 100)} % of the frame below the horizon is bare and ${Math.round(sky * 100)} % of the horizon is open sky (max 15 % each); worst: ${regions.slice().sort((a, b) => b.bare - a.bare).slice(0, 2).map(q => q.name + ' ' + Math.round(q.bare * 100) + ' %').join(', ')}` };
}
