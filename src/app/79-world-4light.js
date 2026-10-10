/* ============================================================
   WORLD ENGINE (scene format v3): shadows, reflections, haze and night lights (docs/dev/WORLD_ENGINE.md 2.4-2.6, 8.5; module E).
   The scene has NO light, shadow or reflection field: everything here is derived from the world, the camera and the live sky.

   Pure part (Node + browser): plans in world metres plus the screen rows the renderer needs.
     worldSunOf(sun, cam)                 -> { kind, g: [gx, gz], tan, op, blur } from a live-sky L (sceneShadowSun), a
                                             { az, alt } in world degrees, or an already resolved shadow sun
     worldShadowPlan(world, cam, sun)     -> [{ ref, kind: 'cast' | 'contact', poly: [[x, z]], scr: [[X, Y]], op, blur, cutWater }]
     worldReflectPlan(world, cam, o)      -> [{ ref, rowY, artClipY, clip, surface, kind, mirror, shear, start, sink }]
                                             o.agents: movers ({ id, obj, x, y, z }) planned the same way, per frame
     worldWaterLevel(world, s)            -> the water level (y, metres) of a water surface
     worldLights(world, o)                -> [{ ref, part, kind, x, y, z, r, col, on, pool? }] from LIBRARY GLOW PARTS only
     worldHazePlan(world, cam, L, atmos)  -> Float32Array: the haze of each entity from its own depth (v2 7.1)
   Browser part (guarded by typeof document): draw helpers the host (module F) calls while baking chunks and per frame, and
   the v2 render passes (sceneRenderPassDefine) for a compiled v3 scene that carries C.world (C.fx.world = 2 opts it in).
   It reuses 70-scene-svg.js (sceneShadowSun, sceneShadowTip), 78-scene-water.js (sceneWaterDefaults) and 70-scene-1atmos.js
   (sceneHazeAt, _scatSourceOf); it edits none of them.
   ============================================================ */
const _WL_D = Math.PI / 180;
// classes that cast no ground shadow (floaters get a darkened reflection zone from the water pass instead; flat cover none)
const _WL_NO_CAST = /^(boat|water|ground|sky)\./;
const WORLD_SHADOW_FAR = 400;                   // metres: beyond, a cast shadow is under a pixel tall; skip it
const WORLD_WINDOW_SHARE = 0.6;                 // share of library windows lit at night (per window seeded threshold)

/* ---------- the sun ---------- */
function worldSunOf(sun, cam) {
  const none = { kind: null, g: [0, 1], tan: 0, op: 0, blur: 0, fade: false, contact: 0.3 };
  if (!sun) return none;
  if (Array.isArray(sun.g) && Number.isFinite(sun.tan)) return sun;
  if (Number.isFinite(sun.az)) {
    const rel = ((sun.az - ((cam && cam.heading) || 0)) % 360 + 540) % 360 - 180, alt = Number(sun.alt) || 0;
    const L = { alt, cover: sun.cover || 0, sun: { rel, show: alt > 0 }, moon: sun.moon || { alt: -20, illum: 0 } };
    if (typeof sceneShadowSun === 'function') return sceneShadowSun(L, null);
    if (alt <= -1) return none;
    return { kind: 'sun', g: [-Math.sin(rel * _WL_D), -Math.cos(rel * _WL_D)], tan: alt > 0.08 ? Math.min(12, 1 / Math.tan(alt * _WL_D)) : 12, op: 0.38, blur: 2, fade: false, contact: 0.35 };
  }
  if (Number.isFinite(sun.alt) && typeof sceneShadowSun === 'function') return sceneShadowSun(sun, null);
  return none;
}

/* ---------- footprints ---------- */
/** The world footprint of an entity: its derived foot, else the library box rotated by its facing. */
function _wlFoot(e) {
  if (Array.isArray(e.foot) && e.foot.length >= 3) return e.foot;
  const d = _wlDims(e.obj), f = (Number(e.facing) || 0) * _WL_D;
  // facing 0 = away from the camera: the object's length runs along z; facing 90: along x
  const hl = (d.l || 1) / 2, hw = (d.w || d.l || 1) / 2, ax = [Math.sin(f), Math.cos(f)], ay = [Math.cos(f), -Math.sin(f)];
  return [[-hl, -hw], [hl, -hw], [hl, hw], [-hl, hw]].map(([a, b]) => [e.x + ax[0] * a + ay[0] * b, e.z + ax[1] * a + ay[1] * b]);
}
function _wlHull(P) {
  const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  lo.pop(); up.pop();
  return lo.concat(up);
}
function _wlPolysTouch(A, B) {
  for (const p of A) if (_wlInPoly(p[0], p[1], B)) return true;
  for (const p of B) if (_wlInPoly(p[0], p[1], A)) return true;
  const X = (a, b, c, d) => { const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b); };
  for (let i = 0, j = A.length - 1; i < A.length; j = i++) for (let k = 0, l = B.length - 1; k < B.length; l = k++) if (X(A[j], A[i], B[l], B[k])) return true;
  return false;
}
function _wlIsWater(s) { return !!s && s.kind === 'water'; }
function _wlAttachOf(e) { return String(e.attach || 'ground'); }

/* ---------- shadows ---------- */
/**
 * Shadow polygons on the ground (metres) and on the screen: a cast shadow for every static caster (its footprint extruded to
 * its real height and laid along the sun; the hull of the foot and the tip footprint), a contact shadow for every grounded or
 * decked entity. Floaters and flat cover cast none. cutWater lists the water surfaces the polygon touches: the renderer clips
 * them out (no dark shapes on water).
 */
function worldShadowPlan(world, cam, sun) {
  cam = _wlCam(world, cam);
  const S = worldSunOf(sun, cam), out = [], waters = ((world && world.surfaces) || []).filter(_wlIsWater);
  const scr = (P, y) => P.map(p => { const q = _wlProj(cam, p[0], p[1], y == null ? null : y); return [q.X, q.Y]; });
  for (const e of (world && world.entities) || []) {
    if (!e || !e.obj || e.static === false || !(e.z > 0)) continue;
    const at = _wlAttachOf(e);
    if (at === 'water' || at === 'air') continue;
    const foot = _wlFoot(e), h = _wlHeight(e);
    // contact: a flattened disc a little wider than the foot
    const cx = foot.reduce((a, p) => a + p[0], 0) / foot.length, cz = foot.reduce((a, p) => a + p[1], 0) / foot.length;
    const rx = Math.max(0.15, Math.max(...foot.map(p => Math.abs(p[0] - cx))) * 1.15), rz = Math.max(0.12, Math.max(...foot.map(p => Math.abs(p[1] - cz))) * 1.15);
    if (e.z < WORLD_SHADOW_FAR && !e.backdrop) {
      const c = [];
      for (let i = 0; i < 10; i++) { const a = i / 10 * 2 * Math.PI; c.push([cx + rx * Math.cos(a), cz + rz * Math.sin(a)]); }
      out.push({ ref: e.id, kind: 'contact', poly: c, scr: scr(c), op: S.contact || 0.3, blur: 1, cutWater: [] });
    }
    if (!S.kind || _WL_NO_CAST.test(e.obj) || h < 0.25 || e.z > WORLD_SHADOW_FAR) continue;
    const tip = typeof sceneShadowTip === 'function' ? sceneShadowTip(cam, cx, cz, h, S.g, S.tan) : [cx + S.g[0] * h * S.tan, cz + S.g[1] * h * S.tan];
    const dx = tip[0] - cx, dz = tip[1] - cz;
    const poly = _wlHull(foot.concat(foot.map(p => [p[0] + dx, p[1] + dz])));
    const cut = waters.filter(w => _wlPolysTouch(poly, _wlSurfPoly(w))).map(w => w.id);
    out.push({ ref: e.id, kind: 'cast', poly, scr: scr(poly), op: S.op, blur: S.blur, fade: !!S.fade, sun: S.kind, dir: [dx, dz], cutWater: cut });
  }
  return out;
}

/* ---------- reflections ---------- */
function worldWaterLevel(world, s) {
  if (s && Number.isFinite(s.level)) return s.level;
  const cam = world && world.cam;
  return cam && Number.isFinite(cam.water) ? cam.water : 0;
}
/** The nearest point of a polygon's boundary to (x, z) and its distance (0 inside). */
function _wlNearest(P, x, z) {
  if (_wlInPoly(x, z, P)) return { d: 0, p: [x, z] };
  let best = { d: Infinity, p: null };
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const q = _wlSegDist(x, z, P[j], P[i]); if (q.d < best.d) best = q; }
  return best;
}
/**
 * The water surface an entity's mirror image lands on, with the mirror row's ground point:
 *   in the water (floaters, waders, posts, piles): its own position, waterline = the surface level;
 *   on the bank: the nearest water edge within reach (max(1.5 m, 0.2 x height)) and nearer the camera than the foot or level
 *   with it, so a far-bank tree reflects starting exactly at the bank's water edge.
 */
function _wlMirrorOf(world, e, waters) {
  const inW = waters.find(w => _wlInSurf(w, e.x, e.z));
  if (inW) return { s: inW, x: e.x, z: e.z, own: true };
  const reach = Math.max(1.5, 0.2 * _wlHeight(e));
  let best = null;
  for (const w of waters) {
    const q = _wlNearest(_wlSurfPoly(w), e.x, e.z);
    if (q.d <= reach && q.p[1] <= e.z + 0.05 && (!best || q.d < best.d)) best = { s: w, x: e.x, z: q.p[1], d: q.d, own: false };
  }
  return best;
}
/**
 * Per entity (and per mover when o.agents is given), the mirror about ITS OWN waterline: rowY = the screen row of
 * (x, water level, z of the contact). artClipY = the row above which the art is mirrored (floaters: the hull's sink line, the row
 * the canvas clips at; everything else: rowY). clip = the water surface's screen polygon at its level (the image never leaves
 * the water). start = the first visible row of the image (max of rowY and the water's top row at x). shear: a perspective
 * boat piece's library waterSlope. mirror: the strength by water kind (78-scene-water's table), so tint follows the kind.
 */
function worldReflectPlan(world, cam, o) {
  cam = _wlCam(world, cam); o = o || {};
  const waters = ((world && world.surfaces) || []).filter(_wlIsWater), out = [];
  if (!waters.length) return out;
  const clipOf = new Map();
  const clip = (w) => {
    let c = clipOf.get(w);
    if (!c) {
      const y = worldWaterLevel(world, w), P = _wlSurfPoly(w).map(p => { const q = _wlProj(cam, p[0], Math.max(0.05, p[1]), y); return [q.X, q.Y]; });
      c = { P, top: Math.min(...P.map(p => p[1])), bottom: Math.max(...P.map(p => p[1])), x0: Math.min(...P.map(p => p[0])), x1: Math.max(...P.map(p => p[0])) };
      clipOf.set(w, c);
    }
    return c;
  };
  const topAt = (P, X) => {                       // the smallest screen row of the polygon's outline along the column X
    let t = Infinity;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const a = P[j], b = P[i];
      if ((a[0] - X) * (b[0] - X) > 0 || a[0] === b[0]) continue;
      const u = (X - a[0]) / (b[0] - a[0]), Y = a[1] + u * (b[1] - a[1]);
      if (Y < t) t = Y;
    }
    return t;
  };
  const plan = (e, mover) => {
    if (!e || !e.obj || !(e.z > 0) || _wlAttachOf(e) === 'air' || e.backdrop) return;
    const m = _wlMirrorOf(world, e, waters);
    if (!m) return;
    const yw = worldWaterLevel(world, m.s), def = typeof sceneObj === 'function' ? sceneObj(e.obj) : null;
    const row = _wlProj(cam, m.x, m.z, yw), h = _wlHeight(e), C = clip(m.s);
    const imgBottom = row.Y + h * row.k;          // the mirrored top of the object
    const X = row.X, hw = (_wlDims(e.obj).l || 1) * row.k / 2;
    if (imgBottom < C.top || row.Y > C.bottom || X + hw < C.x0 || X - hw > C.x1) return;   // the image never reaches the water
    const sink = m.own && _wlAttachOf(e) === 'water' ? Math.max(0, Number(e.sink) || (def && def.sink) || 0) : 0;
    const kind = m.s.water || 'lake', K = typeof sceneWaterDefaults === 'function' ? sceneWaterDefaults(kind) : { mirror: 0.6 };
    const tAt = topAt(C.P, X);
    out.push({ ref: e.id, mover: !!mover, rowY: row.Y, artClipY: row.Y, k: row.k, X, surface: m.s.id, kind, mirror: K.mirror == null ? 0.6 : K.mirror,
      clip: C.P, start: Math.max(row.Y, Number.isFinite(tAt) ? tAt : C.top), shear: Number((def && def.waterSlope) || 0) || 0, sink, own: m.own, waterline: yw });
  };
  for (const e of (world && world.entities) || []) plan(e, false);
  for (const a of o.agents || []) plan(a, true);
  return out;
}

/* ---------- night lights ---------- */
const _WL_GLOW = Object.freeze({ window: { r: 0.7, col: '#ffd890' }, lamp: { r: 1.2, col: '#ffd9a0' }, tail: { r: 0.5, col: '#ff4a3a' }, sign: { r: 1, col: '#ffe6b0' },
  screen: { r: 0.8, col: '#cfe8ff' }, led: { r: 0.4, col: '#ffffff' }, beacon: { r: 1.5, col: '#ff5040' }, rim: { r: 0.6, col: '#ffe0a0' } });
const _wlGlowMemo = new Map();
/** The glow parts of a library object: [{ kind, u, v }] (sprite units, foot at 0), and the sprite's top. */
function _wlGlowParts(id, variant, season) {
  const key = id + '|' + (variant | 0) + '|' + (season || '');
  let r = _wlGlowMemo.get(key);
  if (r) return r;
  r = { parts: [], top: -1 };
  const sh = typeof sceneObjShapes === 'function' ? sceneObjShapes(id, variant | 0, season || 'summer') : null;
  if (sh) {
    r.top = sh.box[1] || -1;
    for (const p of sh.order) for (const s of sh.parts[p] || []) {
      if (!s.glow) continue;
      const b = typeof scenePathBox === 'function' ? scenePathBox(s.d, s.m) : null;
      if (b) r.parts.push({ kind: s.glow, u: (b[0] + b[2]) / 2, v: (b[1] + b[3]) / 2 });
    }
  }
  _wlGlowMemo.set(key, r);
  return r;
}
/**
 * Every light source of the world, ONLY from the library's glow parts (windows, lamps, portholes, signals): an entity with no
 * glow part never lights. o: { night (bool; default from o.L.dark > 0.5), share (lit windows, 0.6), season, agents }.
 * Windows switch by a per-window seeded threshold; lamps, signs and beacons are always on at night. A ground lamp also lays
 * a pool of light on the ground beneath it (radius from the v2 light-source table).
 */
function worldLights(world, o) {
  o = o || {};
  const night = o.night != null ? !!o.night : !!(o.L && o.L.dark > 0.5), share = o.share == null ? WORLD_WINDOW_SHARE : o.share, out = [];
  const one = (e) => {
    if (!e || !e.obj) return;
    const G = _wlGlowParts(e.obj, e.variant, o.season);
    if (!G.parts.length) return;
    const h = _wlHeight(e), mpu = h / Math.max(1, -G.top), f = ((Number(e.facing) || 0) % 360 + 360) % 360, flip = f > 180 ? -1 : 1;
    const y0 = Number.isFinite(e.y) ? e.y : 0, src = typeof _scatSourceOf === 'function' ? _scatSourceOf(e.obj) : null;
    G.parts.forEach((p, i) => {
      const t = _WL_GLOW[p.kind] || _WL_GLOW.window;
      const on = night && (p.kind === 'window' ? _wlRng((e.id || e.obj) + '|w|' + i)() < share : true);
      const L = { ref: e.id, part: i, kind: p.kind, x: e.x + flip * p.u * mpu, y: y0 - p.v * mpu, z: e.z, r: t.r, col: t.col, on };
      if (p.kind === 'lamp' && src && src.kind === 'lamp') L.pool = { x: L.x, z: e.z, r: src.r || 6, col: src.col || t.col };
      out.push(L);
    });
  };
  for (const e of (world && world.entities) || []) one(e);
  for (const a of o.agents || []) one(a);
  return out;
}

/* ---------- haze ---------- */
function worldHazePlan(world, cam, L, atmos) {
  const E = (world && world.entities) || [], out = new Float32Array(E.length);
  if (typeof sceneHazeAt !== 'function') return out;
  E.forEach((e, i) => { out[i] = sceneHazeAt(Math.hypot(e.x || 0, e.z || 0), atmos || (world && world.atmos), L); });
  return out;
}

/* ---------- browser: drawing (the host calls these while baking chunks and per frame) ---------- */
/** Fill the shadow polygons (scene units -> device via vs, ox, oy), cutting out the water surfaces they touch. */
function worldDrawShadows(ctx, plan, o) {
  o = o || {};
  const vs = o.vs || 1, ox = o.ox || 0, oy = o.oy || 0, col = o.col || '#14202e', waterClip = o.waterClip || {};
  let n = 0;
  for (const s of plan) {
    if (!s.scr || s.scr.length < 3 || !(s.op > 0)) continue;
    ctx.save();
    if (s.cutWater && s.cutWater.length && ctx.clip && typeof Path2D === 'function') {
      const p = new Path2D();
      p.rect(-1e5, -1e5, 2e5, 2e5);
      for (const id of s.cutWater) { const P = waterClip[id]; if (P) { p.moveTo(P[0][0] * vs + ox, P[0][1] * vs + oy); for (const q of P) p.lineTo(q[0] * vs + ox, q[1] * vs + oy); p.closePath(); } }
      ctx.clip(p, 'evenodd');
    }
    ctx.globalAlpha = s.op; ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(s.scr[0][0] * vs + ox, s.scr[0][1] * vs + oy);
    for (const q of s.scr) ctx.lineTo(q[0] * vs + ox, q[1] * vs + oy);
    ctx.closePath(); ctx.fill(); ctx.restore(); n++;
  }
  return n;
}
/**
 * Draw the reflections of a plan. spriteOf(ref) -> { c, x0, y0, w, h, s, flip } (the sprite-cache entry the entity is drawn
 * with; x0/y0 relative to the foot). The image is flipped about rowY, only the art above artClipY is used, the whole is clipped
 * to the water polygon and faded by the kind's mirror strength.
 */
function worldDrawReflections(ctx, plan, spriteOf, o) {
  o = o || {};
  const vs = o.vs || 1, ox = o.ox || 0, oy = o.oy || 0;
  let n = 0;
  for (const r of plan) {
    const sp = spriteOf && spriteOf(r.ref);
    if (!sp || !sp.c) continue;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(r.clip[0][0] * vs + ox, r.clip[0][1] * vs + oy);
    for (const q of r.clip) ctx.lineTo(q[0] * vs + ox, q[1] * vs + oy);
    ctx.closePath(); ctx.clip();
    const s = sp.s || 1, fl = sp.flip ? -1 : 1;
    // the vertical flip about the row: local y -> rowY - y; a shear for sloped perspective pieces
    ctx.setTransform(vs * s * fl, 0, -vs * s * (r.shear || 0), -vs * s, (sp.X != null ? sp.X : r.X) * vs + ox, r.rowY * vs + oy);
    ctx.globalAlpha = Math.max(0, Math.min(1, r.mirror * 0.5));
    const hAbove = Math.max(0, Math.min(sp.h, -(sp.y0) - (r.artClipY - r.rowY) / s));   // art above the clip row only
    if (hAbove > 0) ctx.drawImage(sp.c, 0, 0, sp.c.width, sp.c.height * hAbove / sp.h, sp.x0, sp.y0, sp.w, hAbove);
    ctx.restore(); n++;
  }
  return n;
}
/** Draw the lit glow parts (small halos) and the lamp pools (flat ellipses on the ground). */
function worldDrawLights(ctx, lights, cam, o) {
  o = o || {};
  const vs = o.vs || 1, ox = o.ox || 0, oy = o.oy || 0;
  let n = 0;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const L of lights) {
    if (!L.on) continue;
    if (L.pool) {
      const p = _wlProj(cam, L.pool.x, L.pool.z), rx = L.pool.r * p.k * vs, ry = Math.max(1, rx * cam.eye / Math.max(1, L.pool.z));
      ctx.globalAlpha = 0.28; ctx.fillStyle = L.pool.col; ctx.beginPath(); ctx.ellipse(p.X * vs + ox, p.Y * vs + oy, rx, ry, 0, 0, 2 * Math.PI); ctx.fill();
    }
    const q = _wlProj(cam, L.x, L.z, L.y), r = Math.max(0.6, L.r * q.k * vs);
    ctx.globalAlpha = 0.5; ctx.fillStyle = L.col; ctx.beginPath(); ctx.arc(q.X * vs + ox, q.Y * vs + oy, r, 0, 2 * Math.PI); ctx.fill();
    n++;
  }
  ctx.restore();
  return n;
}

/* ---------- v2 render passes for a v3 compiled scene (C.world; opted in by C.fx.world = 2) ---------- */
if (typeof sceneRenderPassDefine === 'function') {
  const isW = (C) => !!(C && C.world && C.world.entities);
  sceneRenderPassDefine({
    id: 'world-light', order: { prebake: 15, framePost: 70 },
    applies: isW,
    key: (L) => 'wl' + (L && L.dark > 0.5 ? 'n' : 'd') + (L && Number.isFinite(L.alt) ? Math.round(L.alt / 3) : ''),
    // plans once per bake: the host (module F) draws them into the chunks (shadows under statics, reflections into the water)
    prebake(env) {
      const W = env.C.world, cam = env.cam || W.cam, L = env.L;
      env.worldLight = { shadow: worldShadowPlan(W, cam, L), reflect: worldReflectPlan(W, cam), lights: worldLights(W, { L, season: env.season }), haze: worldHazePlan(W, cam, L, env.C.atmos) };
    },
    framePost(env, ctx) {
      const st = env.worldLight;
      if (!st || typeof document === 'undefined') return 0;
      return worldDrawLights(ctx, st.lights, env.cam || env.C.world.cam, env);
    },
    stats(env) { const st = env.worldLight || {}; return { shadows: (st.shadow || []).length, reflections: (st.reflect || []).length, lights: (st.lights || []).filter(l => l.on).length }; },
  });
}
