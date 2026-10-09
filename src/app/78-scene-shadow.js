/* ============================================================
   SCENE ENGINE v2: the shadow pass (docs/dev/SCENE_ENGINE_V2.md 6; builder B). Browser only (pure at load).

   Applies to v2 scenes and to v1 scenes with fx: { shadows: 2 } (whose camera is inferred from the view). It replaces
   v1's two ellipses per object with shadows CAST FROM THE SILHOUETTE along the real sun (or a bright high moon):

   bake (layer 'under', order 30: after the water, before the layer's objects, so objects stand on their shadows):
     1. every caster of the layer (items with `shadow`, and the classes of 6.3) is drawn into ONE scratch canvas through an
        affine shear (sceneShadowMatrix: the foot stays, sprite "up" goes to the projected tip of the shadow, sprite x goes
        along the ground perpendicular to the sun), long golden-hour shadows twice (full length faint, half length full)
        so they fade away from the foot; projected buildings add their prism (F's sceneBuildingShadow);
     2. the scratch is filled with the shadow colour (#14202e, 30 % toward L.shade) through source-in: one silhouette;
     3. it is composited at the sky's opacity through blur() (four offset draws where filters are missing): overlapping
        shadows never darken twice;
     4. after dusk, lamps (C's lights) throw short shadows away from themselves (casters in a lamp's pool, at most 40 pairs);
     5. contact shadows (always on, day and night): a small soft ellipse under each foot, one per axle for vehicles, a soft
        band along a building's base: the cure for floating.
   frame (frameGroup, order 25, before the group's movers): each actor and flow agent gets a blob (one soft ellipse,
     sheared a little along the sun) or, when the sun is out and it is near (vehicles under 40 m, people under 20 m), its
     projected silhouette (made once per sprite). The governor's level 3 turns projected shadows into blobs.

   Helpers for the flow pass (D; set agent.shadowDone = true when you draw it yourself):
     sceneShadowBlob(env, ctx, m)        m: { X, Y, s, d, cls } (scene units, metres); returns draws (0 or 1)
     sceneShadowProjected(env, ctx, m)   m: { X, Y, s, flip, d, sp (its sprite), box (the object box) }; returns draws
     sceneShadowBlobSprite()             the pre-rendered soft ellipse (64 x 32)
   The pure maths (sceneShadowSun, sceneShadowTip, sceneShadowMatrix, sceneContactOf) lives in 70-scene-svg.js (the SVG
   still draws the same shadows).
   ============================================================ */
const SCENE_SHADOW_LAMP_PAIRS = 40;
const _scshSil = new WeakMap();
let _scshBlob = null;
const _SCSH_NO_CAST = new Set(['boat', 'bird-water', 'bird-air', 'air', 'cover', 'shrub', 'rail']);

/** The soft ellipse used for contact shadows and blobs (64 x 32, opaque centre fading to nothing). */
function sceneShadowBlobSprite() {
  if (_scshBlob) return _scshBlob;
  const c = _sccCanvas(64, 32), cx = c.getContext('2d');
  cx.setTransform(1, 0, 0, 0.5, 0, 0);
  const g = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(12,18,24,1)'); g.addColorStop(0.45, 'rgba(12,18,24,0.75)'); g.addColorStop(1, 'rgba(12,18,24,0)');
  cx.fillStyle = g; cx.fillRect(0, 0, 64, 64);
  _scshBlob = c;
  return c;
}
/** The shadow colour of a light: #14202e mixed 30 % toward the light's shade colour. */
function _scshCol(L) { return _scMixHex('#14202e', (L && L.shade) || '#14202e', 0.3); }
/** A sprite's silhouette in the shadow colour (made once per sprite canvas). */
function _scshSilhouette(sp, col) {
  let s = _scshSil.get(sp.c);
  if (s && s.col === col) return s.c;
  const c = _sccCanvas(sp.c.width, sp.c.height), cx = c.getContext('2d');
  cx.drawImage(sp.c, 0, 0);
  cx.globalCompositeOperation = 'source-in'; cx.fillStyle = col; cx.fillRect(0, 0, c.width, c.height);
  _scshSil.set(sp.c, { c, col });
  return c;
}
/** The ground record of an item: { X, Y, x, d } (v2: its ground place; v1 fx: from the camera inferred from the view). */
function _scshFoot(cam, it) {
  const d = Number.isFinite(it.dz) ? it.dz : it.g && Number.isFinite(it.g.d) ? it.g.d : sceneCamDepthAt(cam, it.y);
  if (!Number.isFinite(d) || d <= 0) return null;
  const x = it.g && Number.isFinite(it.g.x) ? it.g.x : (it.x - cam.x0) * d / cam.f;
  return { X: it.x, Y: it.y, x, d };
}
/** The scene-unit bounds of a sprite box b drawn through a scene-unit matrix M. */
function _scshBounds(M, b) {
  const pts = [[b[0], b[1]], [b[2], b[1]], [b[0], b[3]], [b[2], b[3]]].map(([u, v]) => [M[0] * u + M[2] * v + M[4], M[1] * u + M[3] * v + M[5]]);
  return [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))];
}
const _scshUnion = (a, b) => (!a ? b : !b ? a : [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]);

sceneRenderPassDefine({
  id: 'shadow',
  order: { layer: 30, 'layer:under': 30, frameGroup: 25, default: 30 },
  applies(C) { return !!C && (C.v === 2 || !!(C.fx && C.fx.shadows === 2)); },
  key(L) { const s = sceneShadowSun(L); return s.kind ? s.kind + Math.round(Math.atan2(s.g[0], s.g[1]) * 180 / Math.PI / 10) + ':' + Math.round(Math.min(12, s.tan) * 2) : '0'; },
  prebake(env) {
    const C = env.C, cam = env.cam, L = env.L, sun = sceneShadowSun(L, C);
    const st = { sun, col: _scshCol(L), byLayer: C.layers.map(() => []), lamps: C.layers.map(() => []), draws: 0, casters: 0, contacts: 0, lampPairs: 0, silhouettes: 0 };
    env.own.shadows = true;
    env.shadow = st;
    if (!cam) return;
    C.items.forEach((it, i) => {
      if (it.strip >= 0) return;
      const cls = it.cls || sceneObjClassOf(it.o);
      if (_SCSH_NO_CAST.has(cls) && !it.shadow) return;
      const contact = SCENE_SHADOW_CLASSES.includes(cls);
      if (!it.shadow && !contact) return;
      if (it.direct) { st.byLayer[it.layer].push({ it, i, cls, direct: true }); return; }
      const sh = sceneObjShapes(it.o, it.v, it.season), foot = sh && _scshFoot(cam, it);
      if (!foot || foot.Y <= cam.horizon + 0.5) return;
      const rec = { it, i, cls, sh, foot, hTop: Math.max(1, -sh.box[1]), cast: !_SCSH_NO_CAST.has(cls), contact: contact ? sceneContactOf(it.o, cls, sh, it.s, foot.d, cam) : [] };
      st.byLayer[it.layer].push(rec);
      // how far the shadow reaches (the group bitmap is cropped to what it draws)
      if (sun.kind && rec.cast) {
        const M = sceneShadowMatrix(cam, foot, it.s, rec.hTop, it.flip, sun, 1, 0, 0), b = _scshBounds(M, sh.box), pad = sun.blur * 3 + 2;
        env.extraBox[it.layer] = _scshUnion(env.extraBox[it.layer], [b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad]);
        rec.bounds = b;
      }
    });
    // lamps after dusk: casters inside a pool throw short shadows away from the lamp (nearest pairs first, at most 40)
    const lights = (env.lights && env.lights.length ? env.lights : C.lights || []).filter(l => l && (l.kind === 'lamp' || !l.kind));
    if (L && L.lamps && lights.length) {
      const pairs = [];
      for (const recs of st.byLayer) for (const rec of recs) {
        if (!rec.foot || !rec.cast) continue;
        for (const l of lights) {
          const lx = Number.isFinite(l.x) ? l.x : null, ld = Number.isFinite(l.d) ? l.d : null;
          if (lx == null || ld == null) continue;
          const dist = Math.hypot(rec.foot.x - lx, rec.foot.d - ld), r = l.r || 7;
          if (dist < 0.3 || dist > r) continue;
          pairs.push({ rec, g: [(rec.foot.x - lx) / dist, (rec.foot.d - ld) / dist], k: 1 - dist / r, dist });
        }
      }
      pairs.sort((a, b) => a.dist - b.dist);
      pairs.length = Math.min(pairs.length, SCENE_SHADOW_LAMP_PAIRS);
      for (const p of pairs) st.lamps[p.rec.it.layer].push(p);
      st.lampPairs = pairs.length;
    }
  },
  layer(env, layer, gx, when) {
    if (when !== 'under' || !gx || !env.shadow) return;
    _scshBake(env, layer, gx);
  },
  frameGroup(env, grp, ctx, t, below) {
    const st = env.shadow;
    if (!st) return 0;
    const gi = env.groups.indexOf(grp);
    let draws = 0;
    for (const a of env.actorsNow) {
      if (a.gi !== gi || _SCSH_NO_CAST.has(a.cls) || a.y * env.vs + env.oy > below) continue;
      const m = { X: a.x, Y: a.y, s: a.s, flip: a.dir < 0, d: a.d, cls: a.cls, box: a.box, alpha: a.alpha, o: a.o, v: a.v, sp: a.sp, rec: a };
      draws += _scshMover(env, ctx, m);
    }
    for (const f of env.flowNow || []) {
      if (!f || f.shadowDone) continue;
      const fgi = Number.isFinite(f.gi) ? f.gi : Number.isFinite(f.layer) ? env.layerOfGroup[f.layer] : -1;
      if (fgi !== gi) continue;
      const cls = f.cls || (f.o ? sceneObjClassOf(f.o) : null);
      if (_SCSH_NO_CAST.has(cls)) continue;
      draws += _scshMover(env, ctx, { X: f.X != null ? f.X : f.x, Y: f.Y != null ? f.Y : f.y, s: f.s, flip: !!f.flip, d: f.d, cls, box: f.box, alpha: f.alpha, o: f.o, v: f.v, sp: f.sp, rec: f });
    }
    return draws;
  },
  stats(env) { const st = env.shadow || {}; return { sun: st.sun ? st.sun.kind : null, op: st.sun ? _scR2(st.sun.op) : 0, casters: st.casters || 0, contacts: st.contacts || 0, lampPairs: st.lampPairs || 0 }; },
});

/** Bake one layer's shadows into its group bitmap: the cast silhouettes (one scratch), lamp shadows, contact shadows. */
function _scshBake(env, layer, gx) {
  const st = env.shadow, recs = st.byLayer[layer];
  if (!recs || !recs.length) return;
  const { vs, ox, oy, cam, C } = env, grp = env.grp, sun = st.sun, L = env.L;
  const bucket = (s) => (typeof sceneScaleBucket === 'function' ? sceneScaleBucket(s) : s);
  const spriteOf = (rec) => (env.itemSprite ? env.itemSprite(rec.i) : env.keep(env.sprite({ o: rec.it.o, v: rec.it.v, season: rec.it.season, part: '*', haze: 0, tint: null, scale: bucket(rec.it.s) * vs, plain: true })));
  /** One scratch the size of a box (device px, clipped to the group), drawn by fill(sx, ox', oy'), then silhouetted and composited. */
  const composite = (bounds, op, blur, fill) => {
    if (!bounds || op <= 0.004) return;
    const pad = Math.ceil(blur * vs * 3 + 2);
    const x0 = Math.max(grp.x, Math.floor(bounds[0] * vs + ox) - pad), y0 = Math.max(grp.y, Math.floor(bounds[1] * vs + oy) - pad);
    const x1 = Math.min(grp.x + grp.w, Math.ceil(bounds[2] * vs + ox) + pad), y1 = Math.min(grp.y + grp.h, Math.ceil(bounds[3] * vs + oy) + pad);
    if (x1 <= x0 || y1 <= y0) return;
    const c = _sccCanvas(x1 - x0, y1 - y0), sx = c.getContext('2d', _SCC_CPU);
    fill(sx, ox - x0, oy - y0);
    sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalAlpha = 1;
    sx.globalCompositeOperation = 'source-in'; sx.fillStyle = st.col; sx.fillRect(0, 0, c.width, c.height);
    gx.setTransform(1, 0, 0, 1, 0, 0);
    const b = blur * vs;
    if (typeof gx.filter === 'string' && b >= 0.5) { gx.filter = `blur(${_scR1(b)}px)`; gx.globalAlpha = op; gx.drawImage(c, x0 - grp.x, y0 - grp.y); gx.filter = 'none'; }
    else if (b >= 0.5) { gx.globalAlpha = op / 4; for (const [dx, dy] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) gx.drawImage(c, x0 - grp.x + dx * b, y0 - grp.y + dy * b); }
    else { gx.globalAlpha = op; gx.drawImage(c, x0 - grp.x, y0 - grp.y); }
    gx.globalAlpha = 1;
    c.width = 0;
  };
  // 1-3. the cast shadows of the sun (or the moon)
  if (sun.kind) {
    let bounds = null;
    const casters = recs.filter(r => r.cast && (r.bounds || r.direct));
    for (const r of casters) if (r.bounds) bounds = _scshUnion(bounds, r.bounds);
    const prisms = [];
    if (typeof sceneBuildingShadow === 'function' && C.buildings) {
      for (const r of casters) if (r.direct) {
        const b = C.buildings.find(bb => bb.i === r.i);
        if (!b) continue;
        try { const poly = sceneBuildingShadow(b, sun.g, sun.tan, cam); if (poly && poly.length > 2) { prisms.push(poly); for (const p of poly) bounds = _scshUnion(bounds, [p[0], p[1], p[0], p[1]]); } } catch (e) { /* no prism */ }
      }
    }
    composite(bounds, sun.op, sun.blur, (sx, ox2, oy2) => {
      for (const r of casters) {
        if (r.direct) continue;
        const sp = spriteOf(r);
        if (!sp || !sp.c) continue;
        const draw = (sh, a) => { const M = sceneShadowMatrix(cam, r.foot, r.it.s, r.hTop, r.it.flip, sh, vs, ox2, oy2); sx.globalAlpha = a; sx.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]); sx.drawImage(sp.c, sp.x0, sp.y0, sp.w, sp.h); };
        if (sun.fade) { draw(sun, 0.5); draw({ g: sun.g, tan: sun.tan * 0.5 }, 1); } else draw(sun, 1);
        st.casters++;
      }
      sx.globalAlpha = 1; sx.setTransform(vs, 0, 0, vs, ox2, oy2); sx.fillStyle = '#000';
      for (const poly of prisms) { sx.beginPath(); poly.forEach((p, k) => (k ? sx.lineTo(p[0], p[1]) : sx.moveTo(p[0], p[1]))); sx.closePath(); sx.fill(); }
    });
  }
  // 4. lamp shadows: short, away from each lamp, faded with the distance to it
  const pairs = st.lamps[layer];
  if (pairs && pairs.length) {
    let bounds = null;
    const draws = [];
    for (const p of pairs) {
      const r = p.rec, sp = spriteOf(r);
      if (!sp || !sp.c) continue;
      const sh = { g: p.g, tan: 0.8 }, M1 = sceneShadowMatrix(cam, r.foot, r.it.s, r.hTop, r.it.flip, sh, 1, 0, 0);
      bounds = _scshUnion(bounds, _scshBounds(M1, r.sh.box));
      draws.push({ r, sp, sh, k: p.k });
    }
    composite(bounds, 0.25 * (1 - 0.4 * (L && L.cover > 0.75 ? 1 : 0)), 2, (sx, ox2, oy2) => {
      for (const q of draws) { const M = sceneShadowMatrix(cam, q.r.foot, q.r.it.s, q.r.hTop, q.r.it.flip, q.sh, vs, ox2, oy2); sx.globalAlpha = _scClamp(q.k * 1.4, 0.15, 1); sx.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]); sx.drawImage(q.sp.c, q.sp.x0, q.sp.y0, q.sp.w, q.sp.h); }
    });
  }
  // 5. contact shadows: always on (ambient occlusion: objects sit on the ground in every light)
  const blob = sceneShadowBlobSprite();
  gx.setTransform(1, 0, 0, 1, 0, 0);
  gx.globalAlpha = st.sun.contact;
  for (const r of recs) {
    if (!r.contact || !r.contact.length) continue;
    const fl = r.it.flip ? -1 : 1;
    for (const [dx, rx, ry] of r.contact) {
      const X = (r.foot.X + fl * dx) * vs + ox - grp.x, Y = r.foot.Y * vs + oy - grp.y;
      gx.drawImage(blob, X - rx * vs, Y - ry * vs, 2 * rx * vs, 2 * ry * vs);
      st.contacts++;
    }
  }
  gx.globalAlpha = 1;
}
/** One mover's shadow now (6.4): projected when the sun is out and it is near, else a blob. Returns draws. */
function _scshMover(env, ctx, m) {
  const st = env.shadow, sun = st.sun, gov = env.gov ? env.gov.level : 0;
  if (!Number.isFinite(m.X) || !Number.isFinite(m.Y)) return 0;
  const d = Number.isFinite(m.d) ? m.d : sceneCamDepthAt(env.cam, m.Y);
  if (!Number.isFinite(d)) return 0;
  const veh = ['car', 'bus', 'tram', 'tractor', 'bike', 'cyclist', 'train'].includes(m.cls), person = m.cls === 'person' || m.cls === 'animal-dog' || m.cls === 'animal';
  const proj = sun.kind === 'sun' && sun.op > 0.05 && gov < 3 && ((veh && d < 40) || (person && d < 20));
  if (proj) {
    const n = sceneShadowProjected(env, ctx, Object.assign({}, m, { d }));
    if (n) return n + sceneShadowBlob(env, ctx, Object.assign({}, m, { d, contactOnly: true }));
  }
  return sceneShadowBlob(env, ctx, Object.assign({}, m, { d }));
}
/** A mover's blob shadow (6.4): one soft ellipse at its foot, sheared a little along the sun. m: { X, Y, s, d, cls, box }. */
function sceneShadowBlob(env, ctx, m) {
  const st = env.shadow, cam = env.cam, { vs, ox, oy } = env;
  if (!st || !cam) return 0;
  const d = Number.isFinite(m.d) ? m.d : sceneCamDepthAt(cam, m.Y);
  if (!Number.isFinite(d) || d <= 0) return 0;
  const sh = m.box ? { box: m.box } : sceneObjShapes(m.o, m.v || 0, env.C.season);
  const c = sceneContactOf(m.o, m.cls, sh, m.s || 1, d, cam);
  if (!c.length) return 0;
  const sun = st.sun, sk = sun.kind && !m.contactOnly ? _scClamp(sun.tan, 0, 3) * 0.25 : 0;
  const blob = sceneShadowBlobSprite();
  let n = 0;
  for (const [dx, rx0, ry0] of c) {
    const rx = rx0 * (1 + sk * Math.abs(sun.g[0])), ry = ry0 * (1 + sk * Math.abs(sun.g[1]));
    const cx = m.X + (m.flip ? -dx : dx) + sk * sun.g[0] * rx0, cy = m.Y - sk * sun.g[1] * ry0 * 0.5;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = st.sun.contact * (m.alpha == null ? 1 : m.alpha) * (m.contactOnly ? 0.8 : 1);
    ctx.drawImage(blob, (cx - rx) * vs + ox, (cy - ry) * vs + oy, 2 * rx * vs, 2 * ry * vs);
    n++;
  }
  ctx.globalAlpha = 1;
  return n;
}
/** A mover's projected shadow (6.4): its sprite's silhouette laid along the sun through the shear of 6.2. Returns draws. */
function sceneShadowProjected(env, ctx, m) {
  const st = env.shadow, cam = env.cam, sun = st && st.sun, { vs, ox, oy } = env;
  if (!sun || !sun.kind || !cam) return 0;
  let sp = m.rec && m.rec.shadowSp;
  if (!sp) {
    const base = m.sp;
    if (base && base.c && m.o) sp = env.keep(env.sprite({ o: m.o, v: m.v || 0, season: env.C.season, part: '*', haze: 0, scale: base.sc || vs, plain: true }));
    if (!sp) sp = base;
    if (m.rec && sp) m.rec.shadowSp = sp;
  }
  if (!sp || !sp.c) return 0;
  const box = m.box || (sceneObjShapes(m.o, m.v || 0, env.C.season) || {}).box;
  if (!box) return 0;
  const d = Number.isFinite(m.d) ? m.d : sceneCamDepthAt(cam, m.Y);
  const foot = { X: m.X, Y: m.Y, x: (m.X - cam.x0) * d / cam.f, d };
  const M = sceneShadowMatrix(cam, foot, m.s || 1, Math.max(1, -box[1]), !!m.flip, sun, vs, ox, oy);
  const sil = _scshSilhouette(sp, st.col);
  ctx.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]);
  ctx.globalAlpha = sun.op * (m.alpha == null ? 1 : m.alpha);
  ctx.drawImage(sil, sp.x0, sp.y0, sp.w, sp.h);
  ctx.globalAlpha = 1;
  return 1;
}
