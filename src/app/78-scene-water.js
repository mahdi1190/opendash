/* ============================================================
   SCENE ENGINE v2: the water pass (docs/dev/SCENE_ENGINE_V2.md 5.3 to 5.5; builder B). Browser only (pure at load).

   Every v2 water region (C.water[i].v2, compiled by A from `water: [...]`), and every v1 region of a scene with
   fx: { water: 2 }, is drawn here instead of by the v1 water code:

   bake (layer 'under', order 20, in the region's layer):
     1. the base: L.water(base) from the far edge to the near edge, mixed toward the bed by clarity near the camera,
        lighter far (a grazing view reflects the sky), darker near (looking down into it)
     2. the reflection bitmap (one cropped canvas per region): the sky mirrored about the horizon row; every placement
        farther than the near edge flipped about ITS OWN waterline Yw(d) (its base hb metres above the water mirrors to
        Yw(d) + f * hb / d); farther bitmaps flipped about Yw(dFar); a Fresnel alpha (mirror * .25 near .. * .8 far);
        25 % of the water's mid colour. Calm water (ripple * wind < .05) bakes it straight into the layer.
     3. the bank edges (coping, quay, wall, natural, beach) in projected widths, dropped under 1 unit
   bake (group, order 60): the mask, the region MINUS everything of the same group drawn after the water (near-bank
     reeds, a moored boat, a bridge pier), so nothing per frame ever paints over what stands in front of the water.
   frame (frameGroup, order 20), in the region's group, before its movers:
     the ripple (the reflection redrawn in horizontal bands, 2 px far .. 6 px near, each shifted by
     A(Y) sin(kY + wt + phase)), the glitter road of the sun or a bright moon (at most 30 glints, 3 twinkle groups) and
     the rings round ducks and swans (at most 16), all re-made at 15 Hz (7.5 Hz under the governor) into a scratch that
     the mask clips, then blitted once; then at frame rate the wakes behind moving boats and the reflections of movers on
     or beside the water (actors, flow agents), masked the same way.

   Helpers for the flow pass (D):
     sceneWaterRegionAt(env, X, Y)                      the region under a screen point (scene units), or null
     sceneWaterMoverReflect(env, ctx, m, region)        one mover's reflection now (m: { X, Y, s, flip, d, sp, alpha }); returns draws
     sceneWaterWakeSprite(vs) / sceneWaterRingSprite(vs)   the pre-rendered V-wake and ring sprites
   Pure helpers (Node tests): sceneWaterDefaults(kind), sceneWaterPlanOf(w, C, cam), sceneWaterGlintPlan(region, src, seed)
   The maths it shares with the SVG still lives in 70-scene-svg.js (sceneWaterRow, sceneWaterFresnel, sceneWaterBands ...).
   ============================================================ */
const SCENE_WATER_KINDS = Object.freeze({
  canal: { base: ['#4a5a48', '#3a4a3e', '#2a362e'], clarity: 0.05, mirror: 0.85, ripple: 0.15, edge: 'coping' },
  river: { base: ['#5a7480', '#3f5e6a', '#2d4652'], clarity: 0.08, mirror: 0.6, ripple: 0.35, edge: 'natural' },
  lake: { base: ['#6a8a9a', '#446a7c', '#2a4a5a'], clarity: 0.12, mirror: 0.7, ripple: 0.3, edge: 'natural' },
  pond: { base: ['#6a8a9a', '#446a7c', '#2a4a5a'], clarity: 0.15, mirror: 0.8, ripple: 0.2, edge: 'natural' },
  sea: { base: ['#5f8aa6', '#3a6a8c', '#234a66'], clarity: 0.1, mirror: 0.35, ripple: 0.6, edge: 'beach' },
  harbour: { base: ['#5a7480', '#3f5e6a', '#2d4652'], clarity: 0.06, mirror: 0.6, ripple: 0.25, edge: 'quay' },
  puddle: { base: ['#6a7480', '#4a5560', '#2a3540'], clarity: 0, mirror: 0.9, ripple: 0.05, edge: 'none' },
});
const SCENE_WATER_RINGS_MAX = 16, SCENE_WATER_BANDS_REGION = 90, SCENE_WATER_BANDS_SCENE = 160, SCENE_WATER_MIRRORED_MAX = 600, SCENE_WATER_GLINTS = 30;
const _scwaSprites = new Map();

/** The defaults of a kind of water (5.1). */
function sceneWaterDefaults(kind) { return SCENE_WATER_KINDS[kind] || SCENE_WATER_KINDS.lake; }
/**
 * A region's plan (pure): the record the pass works from, for a v2 region (w.v2) or a v1 region in an fx scene (legacy:
 * mirrors about its far edge y0, as v1). { legacy, kind, layer, y0, y1 (far, near rows), box, level, mirror, ripple, clarity,
 * bed, glint, rings, wakes, flow, dNear, dFar, polyM, edges, foam, calm(wind) }
 */
function sceneWaterPlanOf(w, C, cam) {
  const v = w.v2, kind = (v && v.kind) || 'lake', def = sceneWaterDefaults(kind), num = (x, d) => (Number.isFinite(x) ? x : d);
  const box = scenePathBox(w.d) || [-160, w.y0 || 0, 1760, w.y1 || 900];
  const y0 = num(w.y0, box[1]), y1 = num(w.y1, box[3]);
  const level = v && Number.isFinite(v.level) ? v.level : cam.water || 0;
  const dNear = v && Number.isFinite(v.dNear) ? v.dNear : sceneCamDepthAt(cam, y1, level), dFar = v && Number.isFinite(v.dFar) ? v.dFar : sceneCamDepthAt(cam, y0, level);
  return {
    legacy: !v, kind, layer: w.layer, y0, y1, box, level,
    base: (v && v.base) || w.base || def.base,
    mirror: v ? num(v.mirror, def.mirror) : (w.reflect ? 0.6 : 0.3), ripple: v ? num(v.ripple, def.ripple) : 0.2,
    clarity: v ? num(v.clarity, def.clarity) : 0.08, bed: (v && v.bed) || '#4a4030',
    glint: v ? v.glint !== false : !!w.lightPath, rings: v ? v.rings !== false : true, wakes: v ? v.wakes !== false : true,
    flow: v && Array.isArray(v.flow) ? v.flow : [0, 0], dNear: Math.max(0.5, dNear), dFar: Math.max(dNear, Number.isFinite(dFar) ? dFar : 20000),
    polyM: v && Array.isArray(v.polyM) ? v.polyM : null, edges: v && Array.isArray(v.edges) ? v.edges : [], foam: v ? v.foam : 'none',
    calm: (wind) => (v ? num(v.ripple, def.ripple) : 0.2) * (wind == null ? 1 : wind) < 0.05,
  };
}
/** The glitter road's strokes (pure, seeded): [{ x, y, len, g }] in scene units, narrow at the far edge and wide near. */
function sceneWaterGlintPlan(R, src, seed) {
  if (!src) return [];
  const r = _scRndOf(seed || 43), out = [], span = R.y1 - R.y0;
  for (let i = 0; i < SCENE_WATER_GLINTS; i++) {
    const t = Math.pow(r(), 0.8), y = R.y0 + 2 + t * Math.max(0, span - 4), hw = 50 * (0.2 + t * 1.6);
    out.push({ x: src.x + (r() * 2 - 1) * hw, y, len: (5 + r() * 15) * (0.35 + t), g: i % 3 });
  }
  return out;
}
function _scwaInPoly(x, y, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
/** The ground distance (metres) from (x, d) to a polygon's edge (0 inside). */
function _scwaDistPoly(x, d, P) {
  if (_scwaInPoly(x, d, P)) return 0;
  let m = Infinity;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const ax = P[j][0], ad = P[j][1], bx = P[i][0], bd = P[i][1], vx = bx - ax, vd = bd - ad, L2 = vx * vx + vd * vd;
    const u = L2 ? _scClamp(((x - ax) * vx + (d - ad) * vd) / L2, 0, 1) : 0;
    m = Math.min(m, Math.hypot(x - ax - u * vx, d - ad - u * vd));
  }
  return m;
}
/** A sprite canvas, cached per kind and device-scale bucket. */
function _scwaSprite(key, w, h, draw) {
  let c = _scwaSprites.get(key);
  if (!c) { c = _sccCanvas(w, h); draw(c.getContext('2d')); _scwaSprites.set(key, c); }
  return c;
}
/** The V-wake behind a boat, top-down (apex at the left middle, opening to the right): 256 x 128, light foam lines fading. */
function sceneWaterWakeSprite() {
  return _scwaSprite('wake', 256, 128, (cx) => {
    const g = cx.createLinearGradient(0, 0, 256, 0);
    g.addColorStop(0, 'rgba(240,246,248,0.95)'); g.addColorStop(0.5, 'rgba(240,246,248,0.45)'); g.addColorStop(1, 'rgba(240,246,248,0)');
    cx.strokeStyle = g; cx.lineCap = 'round';
    cx.lineWidth = 5; cx.beginPath(); cx.moveTo(2, 64); cx.lineTo(254, 64 - 254 * 0.354); cx.moveTo(2, 64); cx.lineTo(254, 64 + 254 * 0.354); cx.stroke();
    cx.lineWidth = 9; cx.globalAlpha = 0.5; cx.beginPath(); cx.moveTo(2, 64); cx.lineTo(150, 64); cx.stroke();
    cx.globalAlpha = 0.35; cx.lineWidth = 2;
    for (let i = 1; i < 6; i++) { const x = i * 40; cx.beginPath(); cx.moveTo(x, 64 - x * 0.3); cx.quadraticCurveTo(x + 8, 64, x, 64 + x * 0.3); cx.stroke(); }
  });
}
/** A ripple ring (an ellipse stroke; scaled and squashed when drawn): 64 x 64. */
function sceneWaterRingSprite() {
  return _scwaSprite('ring', 64, 64, (cx) => { cx.strokeStyle = 'rgba(236,244,248,1)'; cx.lineWidth = 3; cx.beginPath(); cx.arc(32, 32, 28, 0, Math.PI * 2); cx.stroke(); });
}
/** The region under a screen point (scene units), or null. */
function sceneWaterRegionAt(env, X, Y) {
  const st = env && env.water;
  if (!st) return null;
  for (const R of st.regions) if (X >= R.box[0] && X <= R.box[2] && Y >= R.box[1] - 2 && Y <= R.box[3] + 2 && _scwaHit(R, X, Y)) return R;
  return null;
}
let _scwaHitCx = null;
function _scwaHit(R, X, Y) {
  if (!_scwaHitCx) _scwaHitCx = _sccCanvas(1, 1).getContext('2d');
  return _scwaHitCx.isPointInPath(R.path, X, Y);
}
/** The ripple shift (device px) of the band at device row Y (relative to the region's top), at the quantised time tq. */
function _scwaShift(R, yRel, tq, wind) {
  if (R.calmNow) return 0;
  const u = _scClamp(yRel / Math.max(1, R.bh), 0, 1), A = sceneWaterRippleA(R.ripple, wind, u, R.unit);
  const k = (0.55 - 0.32 * u) / R.unit, flow = Math.hypot(R.flow[0], R.flow[1]);
  return A * Math.sin(k * yRel + (1.7 + flow) * tq + R.phase);
}

sceneRenderPassDefine({
  id: 'water',
  order: { layer: 20, 'layer:under': 20, group: 60, frameGroup: 20, default: 20 },
  applies(C) { return !!C && C.water && C.water.length > 0 && (C.v === 2 ? C.water.some(w => w.v2) : !!(C.fx && C.fx.water === 2)); },
  key(L, C) { const src = sceneWaterGlintSource(L, sceneRenderCam(C)); return src ? src.kind + Math.round(src.x / 40) : ''; },
  prebake(env) {
    const C = env.C, cam = env.cam, L = env.L, vs = env.vs;
    const regions = [];
    C.water.forEach((w, wi) => {
      if (C.v === 2 ? !w.v2 : !(C.fx && C.fx.water === 2)) return;
      const R = sceneWaterPlanOf(w, C, cam);
      R.w = w; R.wi = wi; R.path = _sccPath(w.d); R.gi = env.layerOfGroup[w.layer];
      R.phase = (_scHashS(C.id + '|wa|' + wi) % 6283) / 1000;
      R.unit = Math.max(1, vs);
      const db = [Math.max(0, Math.floor(R.box[0] * vs + env.ox) - 2), Math.max(0, Math.floor(R.box[1] * vs + env.oy) - 2), Math.min(env.W, Math.ceil(R.box[2] * vs + env.ox) + 2), Math.min(env.H, Math.ceil(R.box[3] * vs + env.oy) + 2)];
      if (db[2] <= db[0] || db[3] <= db[1]) return;
      R.db = db; R.bw = db[2] - db[0]; R.bh = db[3] - db[1];
      R.cols = L && L.water ? L.water(R.base) : R.base;
      R.calmNow = R.calm(L ? L.wind : 1);
      R.glints = R.glint ? sceneWaterGlintPlan(R, sceneWaterGlintSource(L, cam), _scHashS(C.id + '|gl|' + wi)) : [];
      R.glintSrc = R.glint ? sceneWaterGlintSource(L, cam) : null;
      R.bands = sceneWaterBands(0, R.bh, R.unit, SCENE_WATER_BANDS_REGION);
      env.own.water.add(w);
      regions.push(R);
    });
    // the scene's band cap (160): thicker bands where several regions ripple
    const tot = regions.reduce((n, R) => n + (R.calmNow ? 0 : R.bands.length), 0);
    if (tot > SCENE_WATER_BANDS_SCENE) for (const R of regions) if (!R.calmNow) R.bands = sceneWaterBands(0, R.bh, R.unit, Math.max(8, Math.floor(R.bands.length * SCENE_WATER_BANDS_SCENE / tot)));
    for (const R of regions) _scwaSpans(R, vs, env.ox, env.oy);
    // ducks and swans on the water: rings (nearest first, at most 16 in the scene)
    const rings = [];
    C.items.forEach((it, i) => {
      if (it.strip >= 0) return;
      const cls = it.cls || sceneObjClassOf(it.o);
      if (cls !== 'bird-water') return;
      const R = regions.find(R => R.rings && (R.polyM && it.g ? _scwaInPoly(it.g.x, it.g.d, R.polyM) : _scwaHit(R, it.x, it.y)));
      if (!R) return;
      const d = Number.isFinite(it.dz) ? it.dz : sceneCamDepthAt(cam, it.y, R.level);
      rings.push({ R, X: it.x, Y: it.y, d, ph: (_scHashS(C.id + '|ring|' + i) % 1000) / 1000 });
    });
    rings.sort((a, b) => a.d - b.d);
    rings.length = Math.min(rings.length, SCENE_WATER_RINGS_MAX);
    for (const g of rings) (g.R.ringList || (g.R.ringList = [])).push(g);
    env.water = { regions, rings, bandDraws: 0 };
  },
  layer(env, layer, gx, when) {
    if (when !== 'under' || !gx) return;
    for (const R of env.water.regions) if (R.layer === layer) _scwaBake(env, R, gx);
  },
  group(env, grp) {
    for (const R of env.water.regions) if (env.groups[R.gi] === grp) _scwaMask(env, R, grp);
  },
  frameGroup(env, grp, ctx, t, below) {
    let draws = 0;
    for (const R of env.water.regions) if (env.groups[R.gi] === grp) draws += _scwaFrame(env, R, ctx, t, below);
    return draws;
  },
  stats(env) {
    const st = env.water || { regions: [] };
    return { regions: st.regions.length, rippling: st.regions.filter(R => !R.calmNow).length, bands: st.regions.reduce((n, R) => n + (R.calmNow ? 0 : R.bands.length), 0),
      rings: (st.rings || []).length, mirrored: st.regions.reduce((n, R) => n + (R.mirrored || 0), 0) };
  },
});

/** The outline of a region as device-px points (a polyline path), or null (curves: no spans, the whole box is used). */
function _scwaPoints(R, vs, ox, oy) {
  const nums = String(R.w.d || '').match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/g);
  if (!nums || /[CQSTAcqsta]/.test(R.w.d) || nums.length < 6) return null;
  const P = [];
  for (let i = 0; i + 1 < nums.length; i += 2) P.push([+nums[i] * vs + ox, +nums[i + 1] * vs + oy]);
  return P;
}
/**
 * Where the water is, per band (box-relative device px): b.x0, b.x1 from the outline's crossings over the band's rows (padded by
 * the largest ripple shift); and SLABS of about 8 bands, each with the union of its bands' spans: the 15 Hz scratch is cleared,
 * masked and blitted only over them (a canal in perspective is a narrow wedge in a wide box).
 */
function _scwaSpans(R, vs, ox, oy) {
  const P = _scwaPoints(R, vs, ox, oy), pad = Math.ceil(sceneWaterRippleA(R.ripple, 1.8, 1, R.unit)) + 3;
  const xs = (Y) => { const out = []; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[j], b = P[i]; if ((a[1] <= Y) === (b[1] <= Y)) continue; out.push(a[0] + (b[0] - a[0]) * (Y - a[1]) / (b[1] - a[1])); } return out; };
  const full = (b) => { b.x0 = 0; b.x1 = R.bw; };
  const bands = R.bands.length ? R.bands : [{ y: 0, h: R.bh }];
  for (const b of bands) {
    if (!P) { full(b); continue; }
    const Y0 = b.y + R.db[1], Y1 = b.y + b.h + R.db[1], X = [...xs(Y0 + 0.01), ...xs((Y0 + Y1) / 2), ...xs(Y1 - 0.01)];
    for (const p of P) if (p[1] >= Y0 && p[1] <= Y1) X.push(p[0]);
    if (!X.length) { b.x0 = 0; b.x1 = 0; continue; }
    b.x0 = Math.max(0, Math.floor(Math.min(...X) - R.db[0] - pad)); b.x1 = Math.min(R.bw, Math.ceil(Math.max(...X) - R.db[0] + pad));
  }
  R.slabs = [];
  for (let i = 0; i < bands.length; i += 8) {
    const g = bands.slice(i, i + 8), x0 = Math.min(...g.map(b => b.x0)), x1 = Math.max(...g.map(b => b.x1));
    if (x1 > x0) R.slabs.push({ y: g[0].y, h: g[g.length - 1].y + g[g.length - 1].h - g[0].y, x0, x1 });
  }
}
/**
 * The rows the farther bitmaps mirror about, per run of columns (device px): [[xa, xb, Yf]]. A flat mirror shows each thing
 * about its own waterline; the bitmaps hold no depth, so: where the outline's top in a column is a FAR BANK (an edge running
 * across the view, |slope| < .35), its own row (a canal that turns across the view mirrors that bank); elsewhere (a side bank
 * running away, open water) the waterline of the far edge, Yw(dFar). Columns of 8 px, runs merged.
 */
function _scwaFarRows(R, cam, vs, ox, oy) {
  const far = sceneWaterRow(cam, R.dFar, R.level) * vs + oy, fallback = [[R.db[0], R.db[2], far]];
  const nums = String(R.w.d || '').match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/g);
  if (!nums || /[CQSTAcqsta]/.test(R.w.d) || nums.length < 6) return fallback;
  const P = [];
  for (let i = 0; i + 1 < nums.length; i += 2) P.push([+nums[i] * vs + ox, +nums[i + 1] * vs + oy]);
  const topAt = (X) => {
    let best = Infinity, slope = 0;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const a = P[j], b = P[i];
      if ((a[0] <= X) === (b[0] <= X)) continue;
      const k = (b[1] - a[1]) / (b[0] - a[0]), y = a[1] + k * (X - a[0]);
      if (y < best) { best = y; slope = k; }
    }
    return Number.isFinite(best) && Math.abs(slope) < 0.35 ? Math.max(far, best) : far;
  };
  const out = [], step = 8;
  for (let xa = R.db[0]; xa < R.db[2]; xa += step) {
    const xb = Math.min(R.db[2], xa + step), y = Math.round(topAt((xa + xb) / 2) * 2) / 2, last = out[out.length - 1];
    if (last && Math.abs(last[2] - y) < 0.75) last[1] = xb; else out.push([xa, xb, y]);
  }
  return out.length > 400 ? fallback : out;
}
/** Bake one region into its layer: base, reflection (calm: into the layer; rippling: kept for the frames), edges. */
function _scwaBake(env, R, gx) {
  const { vs, ox, oy, cam, L } = env, grp = env.grp, TG = env.TG, C = env.C;
  const cols = R.cols, low = (L && L.low) || '#dcebf2';
  // 1. the base
  gx.setTransform(TG[0], TG[1], TG[2], TG[3], TG[4], TG[5]);
  const g = gx.createLinearGradient(0, R.y0, 0, R.y1);
  g.addColorStop(0, _scMixHex(cols[0], low, 0.18));
  g.addColorStop(0.5, cols[1]);
  g.addColorStop(1, _scMixHex(_scMixHex(cols[2], R.bed, R.clarity * 2.5), '#000000', 0.12));
  gx.globalAlpha = 1; gx.fillStyle = g; gx.fill(R.path);
  // 2. the reflection bitmap (device px, cropped to the region)
  const c = _sccCanvas(R.bw, R.bh), rc = c.getContext('2d', _SCC_CPU);
  const toR = (M) => [M[0], M[1], M[2], M[3], M[4] - R.db[0], M[5] - R.db[1]];
  rc.save();
  rc.setTransform(vs, 0, 0, vs, ox - R.db[0], oy - R.db[1]); rc.clip(R.path);
  const Yh = (R.legacy ? R.y0 : cam.horizon) * vs + oy;
  // the sky, mirrored about the horizon (water near the camera mirrors the sky above the frame: the zenith colour)
  rc.setTransform(1, 0, 0, 1, 0, 0); rc.fillStyle = (L && L.top) || '#3a80c4'; rc.fillRect(0, 0, R.bw, R.bh);
  if (env.out.sky) { rc.setTransform(1, 0, 0, -1, -R.db[0], 2 * Yh - R.db[1]); rc.drawImage(env.out.sky, 0, 0); }
  // farther bitmaps (and what this group holds so far: the far bank), flipped about the waterline of the far edge above each
  // column strip (a canal that turns across the view mirrors its own far bank, not the far end's)
  const strips = R.legacy ? [[R.db[0], R.db[2], R.y0 * vs + oy]] : _scwaFarRows(R, cam, vs, ox, oy);
  rc.setTransform(1, 0, 0, 1, 0, 0);
  for (const [xa, xb, Yf] of strips) {
    // only the source rows that land in the water: [2 Yf - bottom, Yf], cut to each bitmap (one drawImage per bitmap and run)
    for (const pg of env.groups) {
      if (!pg || !pg.c) continue;
      const sx0 = Math.max(xa, pg.x), sx1 = Math.min(xb, pg.x + pg.w), sy0 = Math.max(2 * Yf - R.db[3], pg.y), sy1 = Math.min(Yf, pg.y + pg.h);
      if (sx1 <= sx0 || sy1 <= sy0) continue;
      rc.setTransform(1, 0, 0, -1, -R.db[0], 2 * Yf - R.db[1]);
      rc.drawImage(pg.c, sx0 - pg.x, sy0 - pg.y, sx1 - sx0, sy1 - sy0, sx0, sy0, sx1 - sx0, sy1 - sy0);
    }
  }
  // the placements not yet in any bitmap (this layer and nearer), each about its own waterline
  const cand = [];
  for (let i = 0; i < C.items.length; i++) {
    const it = C.items[i];
    if (it.layer < R.layer || (it.direct && !it.direct.shapes)) continue;
    if (R.legacy) { if (it.layer === R.layer && it.reflect && it.y <= R.y0 + 8) cand.push({ it, i, d: 0, Ym: 2 * R.y0 - it.y }); continue; }
    const d = Number.isFinite(it.dz) ? it.dz : sceneCamDepthAt(cam, it.y);
    if (!(d > R.dNear * 0.98) || !Number.isFinite(d)) continue;
    const cls = it.cls || sceneObjClassOf(it.o), floating = cls === 'boat' || cls === 'bird-water' || (it.g && it.g.surf && /water|canal|river|pond|lake|sea/.test(it.g.surf));
    // the base hb metres above the water: a floating object sits on it; anything on land stands on the ground above it
    const hb = floating ? 0 : (it.g && Number.isFinite(it.g.h) ? it.g.h : 0) - R.level;
    // a projected building mirrors about its anchor (its lowest ground point on screen; direct.foot is the ground footprint)
    const dA = it.direct && it.direct.anchor ? sceneCamDepthAt(cam, it.direct.anchor[1]) : d;
    const Ym = floating ? it.y : sceneWaterMirrorY(cam, Number.isFinite(dA) ? dA : d, R.level, hb);
    // (integration, 8 Oct) a thing standing BEYOND the far edge in this layer (a mill behind a strip of quay) still reflects when
    // its mirror image reaches down into the water: the test is the image's reach, not where its foot is
    const sh = sceneObjShapes(it.o, it.v, it.season);
    if (!sh && !it.direct) continue;
    if (sh) { const top = Ym + (-sh.box[1]) * it.s; if (top < R.y0 - 1) continue; }   // the mirror image must reach the water
    else if (it.direct.box) { const fy = it.direct.anchor ? it.direct.anchor[1] : it.y; if (Ym + (fy - it.direct.box[1]) < R.y0 - 1) continue; }
    else if (Ym < R.y0 - 2) continue;
    cand.push({ it, i, d, Ym });
  }
  cand.sort((a, b) => a.d - b.d);
  if (cand.length > SCENE_WATER_MIRRORED_MAX) cand.length = SCENE_WATER_MIRRORED_MAX;
  // the nearest are kept; they are PAINTED far to near (in compiled draw order), so a nearer building's image covers what stands behind it
  cand.sort((a, b) => a.i - b.i);
  R.mirrored = cand.length;
  const bucket = (s) => (typeof sceneScaleBucket === 'function' ? sceneScaleBucket(s) : s), night = !!(L && L.windows);
  for (const { it, i, Ym } of cand) {
    if (it.direct) {
      // a projected building: its fills, flipped about its own waterline (its foot row to Ym)
      const fy = it.direct.anchor ? it.direct.anchor[1] : it.y;
      rc.setTransform(vs, 0, 0, -vs, ox - R.db[0], (Ym + fy) * vs + oy - R.db[1]);
      for (const s0 of it.direct.shapes || []) { if (typeof s0.f !== 'string') continue; rc.globalAlpha = s0.op == null ? 1 : s0.op; rc.fillStyle = _scCol(s0.f, L); rc.fill(_sccPath(s0.d)); }
      rc.globalAlpha = 1;
      continue;
    }
    const sp = env.itemSprite ? env.itemSprite(i) : env.keep(env.sprite({ o: it.o, v: it.v, season: it.season, part: '*', haze: it.haze || 0, tint: it.tint, scale: bucket(it.s) * vs, flip: it.flip, cls: it.cls, i }));
    if (!sp || !sp.c) continue;
    const M = env.placeM(it.x, Ym, it.s, it.flip), MR = toR([M[0], 0, 0, -M[3], M[4], M[5]]);
    rc.setTransform(...MR);
    rc.drawImage(sp.c, sp.x0, sp.y0, sp.w, sp.h);
    // after real dusk the lit things mirror too: the lit part (through the atmos pass's lit treatment: no lamp pools or mist
    // mirrored as light), lit windows and lamps (the brightest thing in a night canal)
    if (night) {
      if (it.lit) { const lp = env.keep(env.sprite({ o: it.o, v: it.v, season: it.season, part: 'lit', scale: bucket(it.s) * vs, flip: it.flip, cls: it.cls, i })); if (lp && lp.c) { rc.setTransform(...MR); rc.drawImage(lp.c, lp.x0, lp.y0, lp.w, lp.h); } }
      if (it.glowOn && typeof _sccGlows === 'function') _sccGlows(rc, MR, it, null, env.windowShare);
    }
  }
  // Fresnel (5.3): stronger toward the far edge; then 25 % of the water's mid colour
  rc.setTransform(1, 0, 0, 1, 0, 0);
  rc.globalCompositeOperation = 'destination-in';
  const fy0 = R.y0 * vs + oy - R.db[1], fy1 = R.y1 * vs + oy - R.db[1], fg = rc.createLinearGradient(0, fy0, 0, fy1);
  fg.addColorStop(0, `rgba(0,0,0,${_scR2(sceneWaterFresnel(R.mirror, 1))})`); fg.addColorStop(1, `rgba(0,0,0,${_scR2(sceneWaterFresnel(R.mirror, 0))})`);
  rc.fillStyle = fg; rc.fillRect(0, 0, R.bw, R.bh);
  rc.globalCompositeOperation = 'source-atop';
  rc.globalAlpha = 0.25; rc.fillStyle = cols[1]; rc.fillRect(0, 0, R.bw, R.bh);
  rc.restore();
  R.refl = c;
  env.out.sprites.add({ c, bytes: c.width * c.height * 4 });
  if (R.calmNow) { gx.setTransform(1, 0, 0, 1, 0, 0); gx.globalAlpha = 1; gx.drawImage(c, R.db[0] - grp.x, R.db[1] - grp.y); }
  // 3. the bank edges, in projected widths
  R.edgePath = _scwaEdges(env, R, gx);
}
/** The bank edges (5.3 step 2): sceneWaterEdgeQuads (shared with the SVG still), filled into the layer; returns their Path2D (the mask cuts it). */
function _scwaEdges(env, R, gx) {
  if (R.legacy || !R.edges.length) return null;
  const TG = env.TG, all = new Path2D();
  gx.setTransform(TG[0], TG[1], TG[2], TG[3], TG[4], TG[5]); gx.globalAlpha = 1;
  for (const e of sceneWaterEdgeQuads(R.w.v2, R.w.d, env.cam)) {
    const p = new Path2D();
    for (const q of e.quads) { p.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) p.lineTo(q[i][0], q[i][1]); p.closePath(); }
    gx.fillStyle = _scCol(e.col, env.L); gx.fill(p);
    all.addPath(p);
  }
  return all;
}
/** The mask (group stage): the region minus its edges and everything of this group drawn after the water. */
function _scwaMask(env, R, grp) {
  const { vs, ox, oy, C } = env, m = _sccCanvas(R.bw, R.bh), mc = m.getContext('2d', _SCC_CPU);
  mc.setTransform(vs, 0, 0, vs, ox - R.db[0], oy - R.db[1]);
  mc.fillStyle = '#000'; mc.fill(R.path);
  mc.globalCompositeOperation = 'destination-out';
  if (R.edgePath) mc.fill(R.edgePath);
  const bucket = (s) => (typeof sceneScaleBucket === 'function' ? sceneScaleBucket(s) : s);
  const lay = new Set(grp.layers.filter(l => l >= R.layer));
  for (let i = 0; i < C.items.length; i++) {
    const it = C.items[i];
    if (!lay.has(it.layer)) continue;
    if (it.direct) { mc.setTransform(vs, 0, 0, vs, ox - R.db[0], oy - R.db[1]); for (const s0 of it.direct.shapes || []) mc.fill(_sccPath(s0.d)); continue; }
    const sh = sceneObjShapes(it.o, it.v, it.season);
    if (!sh) continue;
    const s = it.s, b = sh.box, x0 = it.flip ? it.x - b[2] * s : it.x + b[0] * s, x1 = it.flip ? it.x - b[0] * s : it.x + b[2] * s;
    if (x1 < R.box[0] || x0 > R.box[2] || it.y + b[1] * s > R.box[3] || it.y + b[3] * s < R.box[1]) continue;
    const sp = env.itemSprite ? env.itemSprite(i) : env.keep(env.sprite({ o: it.o, v: it.v, season: it.season, part: '*', haze: 0, tint: null, scale: bucket(s) * vs, plain: true }));
    if (!sp || !sp.c) continue;
    const M = env.placeM(it.x, it.y, s, it.flip);
    mc.setTransform(M[0], M[1], M[2], M[3], M[4] - R.db[0], M[5] - R.db[1]);
    mc.drawImage(sp.c, sp.x0, sp.y0, sp.w, sp.h);
  }
  R.mask = m;
  env.out.sprites.add({ c: m, bytes: m.width * m.height * 4 });
  R.scratch = _sccCanvas(R.bw, R.bh);
  env.out.sprites.add({ c: R.scratch, bytes: R.bw * R.bh * 4 });
}
/** One frame of a region: the 15 Hz scratch (ripple, glints, rings), then the movers on it (wakes, reflections). */
function _scwaFrame(env, R, ctx, t, below) {
  if (!R.mask || R.db[1] >= below) return 0;
  const { vs, ox, oy, cam } = env, L = env.Lnow || env.L, gov = env.gov ? env.gov.level : 0;
  const hz = gov >= 1 ? 7.5 : 15, tq = env.still ? 0 : Math.floor(t * hz) / hz;
  let draws = 0;
  if (R.tq !== tq) {
    R.tq = tq;
    const sx = R.scratch.getContext('2d');
    sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalCompositeOperation = 'source-over'; sx.globalAlpha = 1;
    for (const sl of R.slabs) sx.clearRect(sl.x0, sl.y, sl.x1 - sl.x0, sl.h);
    const wind = L ? L.wind : 1;
    if (!R.calmNow && R.refl) {
      for (const b of R.bands) { if (b.x1 <= b.x0) continue; const dx = _scwaShift(R, b.y + b.h / 2, tq, wind); sx.drawImage(R.refl, b.x0, b.y, b.x1 - b.x0, b.h, b.x0 + dx, b.y, b.x1 - b.x0, b.h); draws++; }
    }
    // the glitter road: three twinkle groups (as v1's water light), drifting with the ripple
    if (R.glints.length && R.glintSrc) {
      sx.setTransform(vs, 0, 0, vs, ox - R.db[0], oy - R.db[1]);
      sx.lineCap = 'round'; sx.strokeStyle = R.glintSrc.col;
      for (let gq = 0; gq < 3; gq++) {
        sx.globalAlpha = 0.85 * R.glintSrc.k * (0.4 + 0.6 * Math.abs(Math.sin(tq * (1.3 + gq * 0.55) + gq * 2.1)));
        sx.lineWidth = 2.2;
        sx.beginPath();
        for (const s of R.glints) if (s.g === gq) { const dx = _scwaShift(R, s.y * vs + oy - R.db[1], tq, wind) / vs + Math.sin(tq * 0.9 + gq * 2) * 3; sx.moveTo(s.x + dx, s.y); sx.lineTo(s.x + dx + s.len, s.y); }
        sx.stroke(); draws++;
      }
    }
    // rings round ducks and swans: two concentric ellipses each, growing and fading (off under the governor's level 2)
    if (R.ringList && gov < 2) {
      const ring = sceneWaterRingSprite(), eyeW = cam.eye - R.level;
      for (const g of R.ringList) {
        for (let k = 0; k < 2; k++) {
          const u = _scFrac(tq / 3.2 + g.ph + k * 0.5), r = 0.2 + 1.1 * u, rx = cam.f * r / g.d * vs, ry = Math.max(0.6, rx * eyeW / g.d);
          sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalAlpha = 0.55 * (1 - u) * (1 - u);
          sx.drawImage(ring, g.X * vs + ox - R.db[0] - rx, g.Y * vs + oy - R.db[1] - ry, 2 * rx, 2 * ry); draws++;
        }
      }
    }
    sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalAlpha = 1;
    sx.globalCompositeOperation = 'destination-in';
    for (const sl of R.slabs) { sx.save(); sx.beginPath(); sx.rect(sl.x0, sl.y, sl.x1 - sl.x0, sl.h); sx.clip(); sx.drawImage(R.mask, sl.x0, sl.y, sl.x1 - sl.x0, sl.h, sl.x0, sl.y, sl.x1 - sl.x0, sl.h); sx.restore(); draws++; }
    sx.globalCompositeOperation = 'source-over';
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  for (const sl of R.slabs) {
    const h = Math.min(sl.h, below - R.db[1] - sl.y);
    if (h > 0) { ctx.drawImage(R.scratch, sl.x0, sl.y, sl.x1 - sl.x0, h, R.db[0] + sl.x0, R.db[1] + sl.y, sl.x1 - sl.x0, h); draws++; }
  }
  draws += _scwaMovers(env, R, ctx, t, tq, below);
  return draws;
}
/** The movers on (or within 3 m of) a region now: wakes behind moving boats, and each mover's reflection; masked, blitted once. */
function _scwaMovers(env, R, ctx, t, tq, below) {
  const { vs, ox, oy, cam } = env, list = [];
  const consider = (m) => {
    if (!m || !Number.isFinite(m.X) || !Number.isFinite(m.Y)) return;
    if (m.X < R.box[0] - 400 || m.X > R.box[2] + 400 || m.Y < R.box[1] - 2 || m.Y > R.box[3] + 400) return;
    const on = _scwaHit(R, m.X, m.Y);
    let near = on;
    if (!on && R.polyM && Number.isFinite(m.d)) { const xm = (m.X - cam.x0) * m.d / cam.f; near = _scwaDistPoly(xm, m.d, R.polyM) <= 3; }
    else if (!on && R.legacy) near = m.Y >= R.y0 - 6 && m.Y <= R.y0 + 2;
    if (near) list.push(Object.assign({ on }, m));
  };
  for (const a of env.actorsNow) consider({ X: a.x, Y: a.y, s: a.s, flip: a.dir < 0, d: a.d, sp: a.sp, alpha: a.alpha, cls: a.cls, speed: a.speed, box: a.box });
  for (const f of env.flowNow || []) {
    if (!f || f.reflectDone) continue;
    consider({ X: f.X != null ? f.X : f.x, Y: f.Y != null ? f.Y : f.y, s: f.s, flip: !!f.flip, d: f.d, sp: f.sp || null, o: f.o, v: f.v, alpha: f.alpha == null ? 1 : f.alpha, cls: f.cls || (f.o ? sceneObjClassOf(f.o) : null), speed: f.speedU || 0, box: f.box, speedM: f.speed });
  }
  if (!list.length) return 0;
  if (!R.ms) { R.ms = _sccCanvas(R.bw, R.bh); env.out.sprites.add({ c: R.ms, bytes: R.bw * R.bh * 4 }); }
  const mx = R.ms.getContext('2d');
  mx.setTransform(1, 0, 0, 1, 0, 0); mx.globalCompositeOperation = 'source-over'; mx.globalAlpha = 1;
  // only the box the movers' wakes and reflections cover is cleared, masked and blitted (last frame's box is cleared too)
  let draws = 0, ub = null;
  const grow = (x0, y0, x1, y1) => { ub = ub ? [Math.min(ub[0], x0), Math.min(ub[1], y0), Math.max(ub[2], x1), Math.max(ub[3], y1)] : [x0, y0, x1, y1]; };
  if (R.msBox) mx.clearRect(R.msBox[0], R.msBox[1], R.msBox[2] - R.msBox[0], R.msBox[3] - R.msBox[1]);
  const wind = (env.Lnow || env.L || {}).wind;
  for (const m of list) {
    let sp = m.sp;
    if (!sp && m.o) sp = env.keep(env.sprite({ o: m.o, v: m.v || 0, part: '*', scale: (typeof sceneScaleBucket === 'function' ? sceneScaleBucket(m.s || 1) : m.s || 1) * vs, plain: false }));
    // the wake: behind a moving boat, squashed by the water's foreshortening at its depth; its alpha follows the speed
    const speedM = Number.isFinite(m.speedM) ? m.speedM : (m.speed || 0) * (m.d || 20) / cam.f;
    if (R.wakes && m.cls === 'boat' && m.on && speedM > 0.05 && Number.isFinite(m.d) && m.box) {
      const wk = sceneWaterWakeSprite(), lenU = (m.box[2] - m.box[0]) * (m.s || 1), dir = m.flip ? -1 : 1, sternX = m.X - dir * lenU * 0.42;
      const wl = lenU * 2.6, wh = Math.max(2, cam.f * (lenU * m.d / cam.f * 2.6) * 0.7 * (cam.eye - R.level) / (m.d * m.d));
      mx.setTransform(-dir * wl * vs / 256, 0, 0, wh * vs / 128, sternX * vs + ox - R.db[0], (m.Y - wh * 0.5) * vs + oy - R.db[1]);
      mx.globalAlpha = _scClamp(speedM / 1.5, 0.25, 1) * 0.55;
      mx.drawImage(wk, 0, 0); draws++;
      const wx0 = sternX * vs + ox - R.db[0], wy0 = (m.Y - wh * 0.5) * vs + oy - R.db[1];
      grow(Math.min(wx0, wx0 - dir * wl * vs), wy0, Math.max(wx0, wx0 - dir * wl * vs), wy0 + wh * vs);
    }
    // the reflection: flipped about its own waterline, at mirror * .5, with its band's ripple shift
    if (sp && sp.c) {
      const d = Number.isFinite(m.d) ? m.d : sceneCamDepthAt(cam, m.Y);
      const floating = m.on || m.cls === 'boat' || m.cls === 'bird-water';
      const Ym = R.legacy ? 2 * R.y0 - m.Y : floating ? m.Y : sceneWaterMirrorY(cam, d, R.level, -R.level);
      const dx = _scwaShift(R, Ym * vs + oy - R.db[1], tq, wind);
      const s = m.s || 1, fl = m.flip ? -1 : 1;
      mx.setTransform(vs * s * fl, 0, 0, -vs * s, m.X * vs + ox - R.db[0] + dx, Ym * vs + oy - R.db[1]);
      mx.globalAlpha = _scClamp(R.mirror * 0.5 * (m.alpha == null ? 1 : m.alpha), 0, 1);
      mx.drawImage(sp.c, sp.x0, sp.y0, sp.w, sp.h); draws++;
      const px = m.X * vs + ox - R.db[0] + dx, py = Ym * vs + oy - R.db[1], ax = vs * s * fl;
      grow(Math.min(px + ax * sp.x0, px + ax * (sp.x0 + sp.w)), py - vs * s * (sp.y0 + sp.h), Math.max(px + ax * sp.x0, px + ax * (sp.x0 + sp.w)), py - vs * s * sp.y0);
    }
  }
  mx.setTransform(1, 0, 0, 1, 0, 0); mx.globalAlpha = 1;
  R.msBox = null;
  if (!draws || !ub) return 0;
  const x0 = Math.max(0, Math.floor(ub[0]) - 2), y0 = Math.max(0, Math.floor(ub[1]) - 2), x1 = Math.min(R.bw, Math.ceil(ub[2]) + 2), y1 = Math.min(R.bh, Math.ceil(ub[3]) + 2);
  if (x1 <= x0 || y1 <= y0) return draws;
  R.msBox = [x0, y0, x1, y1];
  mx.save(); mx.beginPath(); mx.rect(x0, y0, x1 - x0, y1 - y0); mx.clip();
  mx.globalCompositeOperation = 'destination-in'; mx.drawImage(R.mask, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
  mx.restore(); mx.globalCompositeOperation = 'source-over';
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  const h = Math.min(y1, below - R.db[1]) - y0;
  if (h > 0) ctx.drawImage(R.ms, x0, y0, x1 - x0, h, R.db[0] + x0, R.db[1] + y0, x1 - x0, h);
  return draws + 2;
}
/**
 * One mover's reflection, for a pass that draws its own movers (D's flows): m { X, Y, s, flip, d, sp, alpha }; region (or
 * the region under it). Draws straight onto ctx inside the region's outline (not masked); returns the draws (0 or 1).
 */
function sceneWaterMoverReflect(env, ctx, m, region) {
  const R = region || sceneWaterRegionAt(env, m.X, m.Y);
  if (!R || !m.sp || !m.sp.c) return 0;
  const { vs, ox, oy } = env, Ym = R.legacy ? 2 * R.y0 - m.Y : m.Y;
  ctx.save();
  ctx.setTransform(vs, 0, 0, vs, ox, oy); ctx.clip(R.path);
  const s = m.s || 1, dx = _scwaShift(R, Ym * vs + oy - R.db[1], R.tq || 0, (env.Lnow || env.L || {}).wind);
  ctx.setTransform(vs * s * (m.flip ? -1 : 1), 0, 0, -vs * s, m.X * vs + ox + dx, Ym * vs + oy);
  ctx.globalAlpha = _scClamp(R.mirror * 0.5 * (m.alpha == null ? 1 : m.alpha), 0, 1);
  ctx.drawImage(m.sp.c, m.sp.x0, m.sp.y0, m.sp.w, m.sp.h);
  ctx.restore();
  return 1;
}
