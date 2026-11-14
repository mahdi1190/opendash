/* ============================================================
   WORLD STAGE, the world in depth order (docs/dev/WORLD_STAGE.md 4). Private names: _wsg. Browser only.
   Per frame, from the world's own plan (I1: worldFramePlanAt in 79-world-5frame.js; until it is there, _wsgPlanCopy below):
   the depth order (worldFrameOrder) gives every drawn piece a depth (WSG_D_ORDER + its place); chunks show in their slots
   (79-world-7stage-1layers.js) with their lit glass and additive halos; movers (people, animals, boats, the statics drawn live)
   are their pose plan's blits (_wfrPosePlan: each part a sprite with a 2 x 3 matrix) as pooled images, a matrix without a shear as
   one image (position, rotation, scale, a negative scale for a flip), with a shear as a container pair (the matrix's SVD: R S R);
   people and animals go through the figure atlas (79-world-7stage-3fx.js: one drawing per figure, shown at its own opacity, cut at
   its waterline, mirrored and cast as a shadow from the same posed drawing); an occluder redraw is the static's own pixels cropped
   to the mover's box (no clip, no second blending); a 'static' order item (I2) is drawn once, whole, at its place.
   ============================================================ */

/**
 * The plan of a frame: { S, rec, world, cam, tau, L, aRecs, live, movers, order, wet, lightsOn } or null (the world not baked).
 * warming: a hidden frame (the world's clock neither starts nor moves).
 */
function _wsgPlan(st, env, t, warming) {
  if (typeof worldFramePlanAt === 'function') {
    const w0 = env.warming;
    env.warming = !!warming;
    try { return worldFramePlanAt(env, t); } finally { env.warming = w0; }
  }
  return _wsgPlanCopy(env, t, warming);
}
/**
 * TEMPORARY (I1): the planning half of 79-world-5frame.js _wfrDraw as of 2.68.8, kept in ONE function so it can be deleted once
 * worldFramePlanAt is merged (the flicker builder's fixes live there). No governor thinning: the stage has no governor.
 */
function _wsgPlanCopy(env, t, warming) {
  const S = env._wfr;
  if (!S || !S.ready || !S.plan) return null;
  const rec = S.rec, world = rec.world, cam = world.cam, vs = env.vs, ox = env.ox, oy = env.oy, L = env.Lnow || env.L;
  const h = typeof worldHostAt === 'function' ? worldHostAt(rec, t, { key: env, warming: !!warming, still: !!env.still }) : { tau: 0, agents: [] };
  const tau = h.tau, mem = rec.frame.agents || (rec.frame.agents = new Map()), seen = new Set(), aRecs = [];
  const wet = typeof _scflWeather === 'function' ? !!_scflWeather(L).rain : !!(L && L.rain);
  for (const a of h.agents || []) {
    if (a.culled && a.cullReason !== 'occluded') continue;
    const r = _wfrRec(_wfrAgentEnt(a), cam, { season: S.season, agent: true, prev: mem.get(String(a.id)), regions: S.regions, wet });
    if (!r) continue;
    if (!r.prim && r.z < cam.f * r.height / 405 && !a.framed) continue;
    if (r.box.x1 * vs + ox < -50 || r.box.x0 * vs + ox > env.W + 50 || r.box.y1 * vs + oy < -50) continue;
    r.agent = a;
    _wfrAgentMem(mem, r, tau);
    seen.add(r.id);
    aRecs.push(r);
  }
  for (const k of [...mem.keys()]) if (!seen.has(k)) mem.delete(k);
  S.drawn = { t, tau, agents: aRecs.map(r => r.agent) };
  S.figs = S.figRec ? (S.drawn.figs = []) : null;
  const sea = typeof _wfrSea === 'function' ? _wfrSea(L) : 0, live = S.hasRockingLive ? S.plan.live.map(r => (r.rocks ? _wfrRockRec(env, S, r, tau, sea) : r)) : S.plan.live;
  const movers = live.concat(aRecs);
  const order = typeof worldFrameOrder === 'function' ? worldFrameOrder(S.plan.chunks, movers, null) : S.chunks.map(o => ({ kind: 'chunk', ref: o.ch })).concat(movers.map(r => ({ kind: 'agent', ref: r })));
  const lightsOn = !!(L && ((L.dark || 0) > 0.3 || L.windows || L.fog || (S.lightNow && S.lightNow.alt < 4)));
  return { S, rec, world, cam, tau, L, aRecs, live, movers, order, wet, lightsOn };
}

/* ---------- pooled images: a texture through a 2 x 3 matrix ---------- */
function _wsgPoolImg(st, tx, frame) {
  const P = st.pool, f = frame || null;
  let img = P.img[P.used];
  if (!img) { img = f ? st.scene.add.image(0, 0, tx.key, f) : st.scene.add.image(0, 0, tx.key); img.setOrigin(0, 0); P.img.push(img); img._k = tx.key; img._f = f; }
  else if (img._k !== tx.key || img._f !== f) { if (f) img.setTexture(tx.key, f); else img.setTexture(tx.key); img.setOrigin(0, 0); img._k = tx.key; img._f = f; }
  P.used++;
  img.setVisible(true);
  return img;
}
function _wsgPoolPair(st, tx) {
  const P = st.pool;
  let pr = P.pair[P.pairUsed];
  if (!pr) {
    const inner = st.scene.make.image({ x: 0, y: 0, key: tx.key, add: false }).setOrigin(0, 0);
    const box = st.scene.add.container(0, 0, [inner]);
    pr = { box, inner }; P.pair.push(pr); inner._k = tx.key;
  } else if (pr.inner._k !== tx.key) { pr.inner.setTexture(tx.key); pr.inner.setOrigin(0, 0); pr.inner._k = tx.key; }
  P.pairUsed++;
  pr.box.setVisible(true);
  return pr;
}
/** The images and pairs a frame did not use: hidden (kept for the next frame). */
function _wsgPoolEnd(st) {
  const P = st.pool;
  for (let i = P.used; i < P.img.length; i++) if (P.img[i].visible) P.img[i].setVisible(false);
  for (let i = P.pairUsed; i < P.pair.length; i++) if (P.pair[i].box.visible) P.pair[i].box.setVisible(false);
  // a crowd that left: the pool shrinks back slowly (a few kept spare)
  if (st.frameNo % 600 === 0) {
    while (P.img.length > P.used + 64) P.img.pop().destroy();
    while (P.pair.length > P.pairUsed + 16) P.pair.pop().box.destroy(true);
  }
  st.st.images = P.used + P.pairUsed;
}
const _WSG_BLEND = { add: 1, screen: 3, erase: 17 };   // Phaser.BlendModes (4.2.1)
/**
 * Draw texture tx through A (texture px -> device px: [a, b, c, d, e, f] as a canvas setTransform), at alpha and depth d.
 * o: { blend ('add' | 'screen'), crop: [x, y, w, h] (texture px), frame (a frame name of tx), tint (0xrrggbb: a silhouette fill), mul (0xrrggbb: a colour
 * multiplied in: a white light texture takes the light's colour) }. -> the image (or the pair's inner image).
 */
function _wsgBlit(st, tx, A, alpha, d, o) {
  if (!tx || !(alpha > 0.002)) return null;
  o = o || {};
  const a = A[0], b = A[1], c = A[2], dd = A[3], n2 = a * a + b * b + c * c + dd * dd;
  if (!(n2 > 1e-12)) return null;
  const skew = Math.abs(a * c + b * dd) > 1e-5 * n2;
  let img, obj;
  if (!skew) {
    img = obj = _wsgPoolImg(st, tx, o.frame);
    const rot = Math.atan2(b, a), sx = Math.hypot(a, b), co = Math.cos(rot), si = Math.sin(rot), sy = dd * co - c * si;
    img.setPosition(A[4], A[5]); img.setRotation(rot); img.setScale(sx, sy);
  } else {
    const pr = _wsgPoolPair(st, tx);
    // M = R(phi) diag(sx, sy) R(theta) (the closed-form SVD of [[a, c], [b, d]])
    const E = (a + dd) / 2, F = (a - dd) / 2, G = (b + c) / 2, H = (b - c) / 2, Q = Math.hypot(E, H), R = Math.hypot(F, G);
    const a1 = Math.atan2(G, F), a2 = Math.atan2(H, E);
    pr.box.setPosition(A[4], A[5]); pr.box.setRotation((a2 + a1) / 2); pr.box.setScale(Q + R, Q - R);
    pr.inner.setRotation((a2 - a1) / 2);
    img = pr.inner; obj = pr.box;
  }
  img.setAlpha(Math.min(1, alpha));
  const mode = o.blend ? _WSG_BLEND[o.blend] || 0 : 0;
  if (img.blendMode !== mode) img.setBlendMode(mode);
  if (o.crop) img.setCrop(o.crop[0], o.crop[1], o.crop[2], o.crop[3]); else if (img.isCropped) img.setCrop();
  if (o.tint != null) { img.setTint(o.tint); img.setTintMode(Phaser.TintModes.FILL); }
  else if (o.mul != null) { img.setTint(o.mul); if (img.tintMode !== Phaser.TintModes.MULTIPLY) img.setTintMode(Phaser.TintModes.MULTIPLY); }
  else if (img._tinted) { img.clearTint(); img.setTintMode(Phaser.TintModes.MULTIPLY); }
  img._tinted = o.tint != null || o.mul != null;
  if (obj.depth !== d) obj.setDepth(d);
  return img;
}
/** A sprite ({ c, x0, y0, w, h }) through M (art units -> device px): the matrix of its texture px. */
function _wsgSpriteA(sp, tx, M) {
  const kx = sp.w / tx.w, ky = sp.h / tx.h;
  return [M[0] * kx, M[1] * kx, M[2] * ky, M[3] * ky, M[0] * sp.x0 + M[2] * sp.y0 + M[4], M[1] * sp.x0 + M[3] * sp.y0 + M[5]];
}
/** A sprite's texture (uploaded at first use; a mover's sprites are small). */
function _wsgSpriteTex(st, sp) {
  if (!sp || !sp.c) return null;
  return _wsgTexOf(st, sp.c) || _wsgTexUp(st, sp.c, 'sprite');
}
/** A canvas whose pixels change in place (a rocking boat's bitmap, a hull drawn now): uploaded again when its stamp changes. */
function _wsgDynTex(st, c, stamp) {
  if (!c || !c.width || !c.height) return null;
  let t = st.tex.get(c);
  if (t && t.stamp === stamp) { t.last = st.frameNo; return t; }
  if (t) { st.tex.delete(c); st.st.texBytes -= t.bytes; try { st.scene.textures.remove(t.key); } catch (e) { /* gone */ } }
  t = _wsgTexUp(st, c, 'dyn');
  if (t) t.stamp = stamp;
  return t;
}

/* ---------- the depth order ---------- */
function _wsgDepth(st, env, S, P, t) {
  const chunkOf = S.chunkByRef || (S.chunkByRef = new Map(S.chunks.map(o => [o.ch, o]))), litOf = S.lights && S.lights.byChunk ? S.lights.byChunk : null;
  const idx = S._wsgIdx || (S._wsgIdx = new Map(S.chunks.map((o, i) => [o, i])));
  const vs = env.vs, ox = env.ox, oy = env.oy;
  let i = 0, clip = null, redraws = 0;
  for (const it of P.order) {
    const D = WSG_D_ORDER + (i++);
    if (it.kind === 'chunk') {
      const o = chunkOf.get(it.ref), k = o ? idx.get(o) : -1;
      if (o && o.c) _wsgSlot(st, 'ch' + k, o.c, o.x, o.y, D);
      const li = litOf && litOf.get(it.ref);
      if (li) {
        if (li.glass) _wsgSlot(st, 'chg' + k, li.glass.c, li.glass.x, li.glass.y, D + 0.1, { fadeIn: true });
        if (li.glow) _wsgSlot(st, 'chl' + k, li.glow.c, li.glow.x, li.glow.y, D + 0.2, { blend: 'add', fadeIn: true });
      }
      continue;
    }
    if (it.kind === 'agent') {
      const r = it.ref, ga = _wfrAgentAlpha(r), fr = r._fr || (r.agent ? _wfrFadeRecs(r, r.mem, P.tau) : [{ rec: r, a: 1 }]);
      r._fr = null;
      if (!(r.agent && typeof _wsgFigureDraw === 'function' && _wsgFigureDraw(st, env, S, P, r, fr, ga, D))) {
        fr.forEach((f, j) => _wsgMover(st, env, S, f.rec, P.tau, f.a * ga, D + j * 0.01));
      }
      if (typeof _wsgOwnLights === 'function') _wsgOwnLights(st, env, S, P, r, D + 0.5);
      const b = fr.length === 2 ? { x0: Math.min(r.box.x0, fr[0].rec.box.x0), y0: Math.min(r.box.y0, fr[0].rec.box.y0), x1: Math.max(r.box.x1, fr[0].rec.box.x1), y1: Math.max(r.box.y1, fr[0].rec.box.y1) } : r.box;
      clip = [Math.floor(b.x0 * vs + ox) - 1, Math.floor(b.y0 * vs + oy) - 1, Math.ceil(b.x1 * vs + ox) + 1, Math.ceil(b.y1 * vs + oy) + 1];
      continue;
    }
    if (it.kind === 'redraw' && clip) { if (_wsgRedraw(st, env, S, it.ref, clip, D)) redraws++; continue; }
    if (it.kind === 'static') { _wsgStatic(st, env, S, it.ref, D); continue; }
  }
  st.st.redraws = redraws;
  if (S.stats) { S.stats.frames++; S.stats.agents = P.aRecs.length; S.stats.redraws = redraws; S.stats.tau = P.tau; }
}
/**
 * One mover drawing (an agent's view, a live static) as its pose plan's blits (5frame _wfrDrawMover0): a rocking floater's bitmap,
 * a hull drawn in perspective now, else its rest sprite and its moving parts posed at the scene time. alpha: its whole opacity.
 */
function _wsgMover(st, env, S, r, tau, alpha, D) {
  if (!(alpha > 0.002)) return 0;
  if (r.bmp) {
    const tx = _wsgDynTex(st, r.bmp.c, (r._rk | 0) + '|' + (r._rs | 0) + '|' + r.bmp.x + ',' + r.bmp.y);
    return _wsgBlit(st, tx, [1, 0, 0, 1, r.bmp.x, r.bmp.y], alpha, D, { crop: [0, 0, r.bmp.w, r.bmp.h] }) ? 1 : 0;
  }
  if (r.prim) return _wsgPrimNow(st, env, S, r, alpha, D);
  const sh = typeof sceneObjShapes === 'function' ? sceneObjShapes(r.o, r.v, r.season || S.season) : null;
  const L = env.Lnow || env.L, night = !!(L && (L.windows || L.dark > 0.5)), lit = !r.static && night && /vehicle|tram|train|boat|bus|car/.test(String(r.ent.cls || r.obj));
  const hooks = typeof sceneAnimPose === 'function' ? _wfrHooks(env, S, r, sh, tau) : [];
  const d = r.static ? S.draw.get(r.id) : null, M = d && d.M ? d.M : _wfrM(env, r);
  const plan = _wfrPosePlan(r, hooks, tau, L, env.vs, M);
  const x = { litGlow: lit, bucket: r.bucket };
  let n = 0;
  r.spNow = null;
  plan.blits.forEach((b, i) => {
    const sp = _wfrSpriteOf(env, S, r, b.part, x);
    if (i === 0 && b.part === '*') r.spNow = sp;
    const tx = _wsgSpriteTex(st, sp);
    if (tx && _wsgBlit(st, tx, _wsgSpriteA(sp, tx, b.M), alpha * b.a, D + i * 1e-4)) n++;
  });
  // a live static's lit glass (a lamp's lantern, a lit window): its own small bitmap per lit set
  if (r.static && !r.prim && S.lightNow && typeof _wsgGlass === 'function') n += _wsgGlass(st, env, S, r, D + 0.009);
  if (S.figs && !r.static && r.agent) _wsgFigRec(env, S, r, plan, alpha);
  return n;
}
/** The tools' record of a drawn figure (pops.mjs --browser reads S.figs): as 5frame _wfrDrawMover0 keeps it. */
function _wsgFigRec(env, S, r, plan, alpha) {
  const vs = env.vs || 1, ox = env.ox || 0, oy = env.oy || 0;
  S.figs.push({ id: r.id, obj: r.obj, o: r.o, v: r.v, season: r.season || S.season, flip: !!r.flip, s: r.s, a: alpha, X: r.X, Y: r.Y, x: r.x, z: r.z, height: r.height, view: r.view, mirror: !!r.mirror,
    blits: plan.blits.map(b => ({ part: b.part, a: b.a, M: [b.M[0] / vs, b.M[1] / vs, b.M[2] / vs, b.M[3] / vs, (b.M[4] - ox) / vs, (b.M[5] - oy) / vs] })) });
}
/** A prim mover (a hull under way, drawn in perspective): drawn now into its own small bitmap (5frame draws it as vectors). */
function _wsgPrimNow(st, env, S, r, alpha, D) {
  const p = _wsgPrimTex(st, env, S, r);
  return p && _wsgBlit(st, p.tx, [1, 0, 0, 1, p.x0, p.y0], alpha, D, { crop: [0, 0, p.w, p.h] }) ? 1 : 0;
}
/** A prim mover's bitmap of this frame: { tx, x0, y0, w, h } (drawn once a frame, whoever asks first), or null. */
function _wsgPrimTex(st, env, S, r) {
  const b = r.box, vs = env.vs;
  const x0 = Math.max(0, Math.floor(b.x0 * vs + env.ox) - 1), y0 = Math.max(0, Math.floor(b.y0 * vs + env.oy) - 1), x1 = Math.min(env.W, Math.ceil(b.x1 * vs + env.ox) + 1), y1 = Math.min(env.H, Math.ceil(b.y1 * vs + env.oy) + 1);
  const w = x1 - x0, h = y1 - y0;
  if (!(w > 1 && h > 1) || w * h > 2.5e6) return null;
  const memo = st.prims || (st.prims = new Map());
  let e = memo.get(r.id);
  if (!e || e.c.width < w || e.c.height < h) { e = { c: typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(Math.max(w, 64), Math.max(h, 32)) : Object.assign(document.createElement('canvas'), { width: Math.max(w, 64), height: Math.max(h, 32) }), n: 0 }; memo.set(r.id, e); }
  if (e.seen === st.frameNo && e.out) return e.out;
  e.seen = st.frameNo; e.out = null;
  const cx = e.c.getContext('2d');
  cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 1; cx.clearRect(0, 0, e.c.width, e.c.height);
  if (!_wfrDrawRec(cx, env, S, r, null, x0, y0, 1)) return null;
  const tx = _wsgDynTex(st, e.c, ++e.n);
  if (st.frameNo % 120 === 0) for (const [k, v] of memo) if (st.frameNo - v.seen > 120) memo.delete(k);
  return tx ? (e.out = { tx, x0, y0, w, h }) : null;
}
/**
 * An occluder redraw (R1): the static's own pixels over the mover just drawn, cropped to the mover's box (device px, integer): a
 * drawn piece from its 1:1 cache (_wfrPrimCache), a sprite from its texture with the box mapped back into it (its matrix has no
 * rotation). Its lit glass at night: the static's own lit bitmap (_wsgGlass) cropped the same way.
 */
function _wsgRedraw(st, env, S, r, clip, D) {
  const d = S.draw.get(r.id);
  if (!d) return false;
  if (d.off === undefined) d.off = _wfrOffCanvas(r, env);
  if (d.off) return false;
  if (r.prim) {
    const pc = _wsgPrimPix(st, env, S, r, d);
    if (!pc) return false;
    const tx = _wsgTexOf(st, pc.c) || _wsgTexUp(st, pc.c, 'sprite');
    if (!tx) return false;
    const x0 = Math.max(clip[0], pc.x), y0 = Math.max(clip[1], pc.y), x1 = Math.min(clip[2], pc.x + tx.w), y1 = Math.min(clip[3], pc.y + tx.h);
    if (!(x1 > x0 && y1 > y0)) return false;
    return !!_wsgBlit(st, tx, [1, 0, 0, 1, pc.x, pc.y], 1, D, { crop: [x0 - pc.x, y0 - pc.y, x1 - x0, y1 - y0] });
  }
  const sp = d.sp || _wfrSpriteOf(env, S, r, '*'), tx = _wsgSpriteTex(st, sp);
  if (!tx) return false;
  const A = _wsgSpriteA(sp, tx, d.M || _wfrM(env, r));
  const crop = _wsgCropOf(A, tx, clip);
  if (!crop) return false;
  const ok = !!_wsgBlit(st, tx, A, 1, D, { crop });
  if (ok && S.lightNow && typeof _wsgGlass === 'function') _wsgGlass(st, env, S, r, D + 0.001, clip);
  return ok;
}
/**
 * A drawn piece's own pixels, 1:1 at its device box: the compositor's prim cache (_wfrPrimCache: at most 48 a bake, 2.5 M pixels each),
 * else the stage's own, kept per bake under a budget (a piece the canvas path draws again as vectors must never be skipped here). -> { c, x, y }.
 */
const WORLD_STAGE_PIX_MAX = 48e6;   // device px of the stage's own piece bitmaps, a bake
function _wsgPrimPix(st, env, S, r, d) {
  const pc = _wfrPrimCache(env, S, r, d);
  if (pc) return pc;
  const M = S._wsgPix || (S._wsgPix = { m: new Map(), px: 0 });
  let e = M.m.get(r.id);
  if (e !== undefined) return e;
  e = null;
  const b = r.box, vs = env.vs;
  const x0 = Math.max(0, Math.floor(b.x0 * vs + env.ox) - 1), y0 = Math.max(0, Math.floor(b.y0 * vs + env.oy) - 1), x1 = Math.min(env.W, Math.ceil(b.x1 * vs + env.ox) + 1), y1 = Math.min(env.H, Math.ceil(b.y1 * vs + env.oy) + 1);
  const w = x1 - x0, h = y1 - y0;
  if (w > 1 && h > 1 && M.px + w * h <= WORLD_STAGE_PIX_MAX) {
    try {
      const c = _wsgCv(w, h);
      if (_wfrDrawRec(c.getContext('2d'), env, S, r, d, x0, y0, 1)) { e = { c, x: x0, y: y0 }; M.px += w * h; }
    } catch (err) { e = null; }
  }
  M.m.set(r.id, e);
  return e;
}
/** The texture-px rectangle of an axis-aligned matrix A that lands inside clip [x0, y0, x1, y1] (device px), or null. */
function _wsgCropOf(A, tx, clip) {
  const ia = 1 / A[0], id = 1 / A[3];
  let u0 = (clip[0] - A[4]) * ia, u1 = (clip[2] - A[4]) * ia, v0 = (clip[1] - A[5]) * id, v1 = (clip[3] - A[5]) * id;
  if (u0 > u1) { const q = u0; u0 = u1; u1 = q; }
  if (v0 > v1) { const q = v0; v0 = v1; v1 = q; }
  u0 = Math.max(0, Math.floor(u0)); v0 = Math.max(0, Math.floor(v0)); u1 = Math.min(tx.w, Math.ceil(u1)); v1 = Math.min(tx.h, Math.ceil(v1));
  return u1 > u0 && v1 > v0 ? [u0, v0, u1 - u0, v1 - v0] : null;
}
/** A 'static' order item (I2): a static that can hide a mover, out of the chunk bitmaps, drawn once here from its draw record. */
function _wsgStatic(st, env, S, r, D) {
  const d = S.draw.get(r.id);
  if (!d) return;
  if (d.off === undefined) d.off = _wfrOffCanvas(r, env);
  if (d.off) return;
  if (r.prim) {
    const pc = _wsgPrimPix(st, env, S, r, d);
    const tx = pc ? _wsgTexOf(st, pc.c) || _wsgTexUp(st, pc.c, 'static') : null;
    if (tx) _wsgBlit(st, tx, [1, 0, 0, 1, pc.x, pc.y], 1, D);
    return;
  }
  const sp = d.sp || _wfrSpriteOf(env, S, r, '*'), tx = _wsgSpriteTex(st, sp);
  if (tx) _wsgBlit(st, tx, _wsgSpriteA(sp, tx, d.M || _wfrM(env, r)), 1, D);
  if (S.lightNow && typeof _wsgGlass === 'function') _wsgGlass(st, env, S, r, D + 0.001);
}

/* ---------- the figure atlas: each person and animal drawn ONCE a frame ---------- */
const WORLD_STAGE_ATLAS = 1024;            // the atlas texture's side (device px), doubled up to 2048 when a frame's figures need it
const WORLD_STAGE_FIG_MAX = 480;           // a figure larger than this (device px, either side) is drawn straight (no atlas)
/** The atlas: two render textures (the figures; the new views of the figures turning, for the dissolve). */
function _wsgAtlas(st, size) {
  let A = st.atlas;
  if (A && A.size >= size) return A;
  if (A) { try { st.scene.textures.remove(A.key); st.scene.textures.remove(A.key2); } catch (e) { /* gone */ } }
  const key = 'wsg' + st.id + '.fig' + (++st.texSeq), key2 = key + 'd';
  const dt = st.scene.textures.addDynamicTexture(key, size, size), dt2 = st.scene.textures.addDynamicTexture(key2, size, size);
  if (!dt || !dt2) return null;
  A = st.atlas = { key, key2, dt, dt2, size, tex: { key, w: size, h: size }, tex2: { key: key2, w: size, h: size } };
  return A;
}
/** A named frame of an atlas texture set to a rectangle (made once per name, moved every frame). */
function _wsgFrameSet(dt, pre, k, x, y, w, h) {
  const name = pre + k;
  let f = dt.has && dt.has(name) ? dt.get(name) : null;
  if (!f) f = dt.add(name, 0, x, y, Math.max(1, w), Math.max(1, h));
  else { f.setSize(Math.max(1, w), Math.max(1, h), x, y); if (typeof f.updateUVs === 'function') f.updateUVs(); }
  return name;
}
/** Offscreen objects a render texture draws later (its commands keep the object, not its state: one object per draw a frame). */
function _wsgOff(st) { return st.off || (st.off = { pairs: [], pu: 0, imgs: [], iu: 0, gfx: [], gu: 0 }); }
function _wsgOffImg(st, key, frame) {
  const O = _wsgOff(st);
  let img = O.imgs[O.iu++];
  if (!img) { img = st.scene.make.image({ x: 0, y: 0, key, frame, add: false }); O.imgs.push(img); }
  else img.setTexture(key, frame);
  img.setOrigin(0, 0); img.setAlpha(1); img.setRotation(0); img.setScale(1, 1); img.setBlendMode(0); img.clearTint(); img.setTintMode(Phaser.TintModes.MULTIPLY); if (img.isCropped) img.setCrop();
  return img;
}
function _wsgOffPair(st, key, frame) {
  const O = _wsgOff(st);
  let pr = O.pairs[O.pu++];
  if (!pr) { const inner = st.scene.make.image({ x: 0, y: 0, key, frame, add: false }); pr = { inner, box: st.scene.make.container({ x: 0, y: 0, add: false }) }; pr.box.add(inner); O.pairs.push(pr); }
  else pr.inner.setTexture(key, frame);
  pr.inner.setOrigin(0, 0); pr.inner.setAlpha(1); pr.inner.setBlendMode(0); pr.inner.clearTint(); pr.inner.setTintMode(Phaser.TintModes.MULTIPLY); if (pr.inner.isCropped) pr.inner.setCrop();
  return pr;
}
function _wsgOffGfx(st) {
  const O = _wsgOff(st);
  let g = O.gfx[O.gu++];
  if (!g) { g = st.scene.make.graphics({ x: 0, y: 0, add: false }); O.gfx.push(g); }
  g.clear();
  return g;
}
/** Set a pair (container R S + inner R) to a matrix with a shear (its SVD). */
function _wsgPairSet(pr, A) {
  const a = A[0], b = A[1], c = A[2], d = A[3], E = (a + d) / 2, F = (a - d) / 2, G = (b + c) / 2, H = (b - c) / 2, Q = Math.hypot(E, H), R = Math.hypot(F, G);
  const a1 = Math.atan2(G, F), a2 = Math.atan2(H, E);
  pr.box.setPosition(A[4], A[5]); pr.box.setRotation((a2 + a1) / 2); pr.box.setScale(Q + R, Q - R);
  pr.inner.setPosition(0, 0); pr.inner.setRotation((a2 - a1) / 2); pr.inner.setScale(1, 1);
}
/** Draw texture tx through A (texture px -> the render texture's px) into a render texture: a stamp, or a pair when A shears. */
function _wsgInto(st, dt, tx, A, alpha, frame) {
  const a = A[0], b = A[1], c = A[2], d = A[3], n2 = a * a + b * b + c * c + d * d;
  if (!(n2 > 1e-12) || !(alpha > 0.002)) return;
  if (Math.abs(a * c + b * d) <= 1e-5 * n2) {
    const rot = Math.atan2(b, a), sx = Math.hypot(a, b), sy = d * Math.cos(rot) - c * Math.sin(rot);
    dt.stamp(tx.key, frame, A[4], A[5], { rotation: rot, scaleX: sx, scaleY: sy, originX: 0, originY: 0, alpha: Math.min(1, alpha) });
  } else {
    const pr = _wsgOffPair(st, tx.key, frame);
    _wsgPairSet(pr, A); pr.inner.setAlpha(Math.min(1, alpha));
    dt.draw(pr.box);
  }
}
/** One drawing of a figure (5frame _wfrDrawMover0's blits) into a render texture, the device frame moved by (dx, dy). */
function _wsgFigParts(st, env, S, P, rec, dt, dx, dy) {
  const sh = typeof sceneObjShapes === 'function' ? sceneObjShapes(rec.o, rec.v, rec.season || S.season) : null;
  const L = env.Lnow || env.L, night = !!(L && (L.windows || L.dark > 0.5)), lit = night && /vehicle|tram|train|boat|bus|car/.test(String(rec.ent.cls || rec.obj));
  const hooks = typeof sceneAnimPose === 'function' ? _wfrHooks(env, S, rec, sh, P.tau) : [];
  const plan = _wfrPosePlan(rec, hooks, P.tau, L, env.vs, _wfrM(env, rec)), x = { litGlow: lit, bucket: rec.bucket };
  rec.spNow = null;
  plan.blits.forEach((b, i) => {
    const sp = _wfrSpriteOf(env, S, rec, b.part, x), tx = _wsgSpriteTex(st, sp);
    if (i === 0 && b.part === '*') rec.spNow = sp;
    if (!tx) return;
    const A = _wsgSpriteA(sp, tx, b.M);
    A[4] += dx; A[5] += dy;
    _wsgInto(st, dt, tx, A, b.a);
  });
  return plan;
}
/** Erase what lies below a floater's waterline cut (5frame _wfrClipCut keeps what is above it), device px moved by (dx, dy). */
function _wsgCutErase(st, env, dt, cut, dx, dy) {
  const vs = env.vs, ox = env.ox + dx, oy = env.oy + dy, g = _wsgOffGfx(st), B = 1e5;
  g.fillStyle(0xffffff, 1);
  if (cut.kind === 'line' && Array.isArray(cut.pts) && cut.pts.length >= 2) {
    const xs = [...new Set(cut.pts.map(p => p[0]))].sort((a, b) => a - b);
    const low = (X) => { let y = -Infinity; const Pp = cut.pts; for (let i = 0, j = Pp.length - 1; i < Pp.length; j = i++) { const a = Pp[j], b = Pp[i]; if (Math.min(a[0], b[0]) > X || Math.max(a[0], b[0]) < X) continue; const yy = a[0] === b[0] ? Math.max(a[1], b[1]) : a[1] + (b[1] - a[1]) * (X - a[0]) / (b[0] - a[0]); if (yy > y) y = yy; } return y; };
    const ch = xs.map(X => [X * vs + ox, low(X) * vs + oy]).filter(p => Number.isFinite(p[1]));
    if (ch.length >= 2) {
      const pts = [{ x: -B, y: ch[0][1] }].concat(ch.map(p => ({ x: p[0], y: p[1] })), [{ x: B, y: ch[ch.length - 1][1] }, { x: B, y: B }, { x: -B, y: B }]);
      g.fillPoints(pts, true);
      dt.erase(g);
      return;
    }
  }
  const row = cut.row != null ? cut.row : cut.footRow;
  if (!Number.isFinite(row)) return;
  g.fillRect(-B, row * vs + oy, 2 * B, B);
  dt.erase(g);
}
/**
 * The figure atlas of a frame: every person, animal and boat sprite (not a hull drawn in perspective, not a rocking bitmap) drawn
 * whole, once, into its own rectangle at its own sub-pixel place: a view change as a true dissolve (the old view whole, faded by
 * 1 - k, plus the new view whole times k: 5frame _wfrDrawDissolve), cut at its waterline. P.figs: record -> { x0, y0, w, h (device
 * px), ax, ay (in the atlas), frame }. The body is then one image at the figure's opacity (no part shows through another), and its
 * mirror and its shadow come from the same posed drawing.
 */
function _wsgFigures(st, env, S, P) {
  P.figs = new Map();
  const O = _wsgOff(st); O.pu = 0; O.iu = 0; O.gu = 0;
  if (!P.aRecs.length) return;
  const vs = env.vs, ox = env.ox, oy = env.oy, list = [];
  for (const r of P.aRecs) {
    if (r.prim || r.bmp || !r.box) continue;
    const fr = r.agent ? _wfrFadeRecs(r, r.mem, P.tau) : [{ rec: r, a: 1 }];
    r._fr = fr;
    let b = r.box;
    if (fr.length === 2) { const q = fr[0].rec.box; b = { x0: Math.min(b.x0, q.x0), y0: Math.min(b.y0, q.y0), x1: Math.max(b.x1, q.x1), y1: Math.max(b.y1, q.y1) }; }
    const bw = (b.x1 - b.x0) * vs, bh = (b.y1 - b.y0) * vs, pad = Math.ceil(Math.max(4, Math.max(bw, bh) * 0.25));
    const x0 = Math.floor(b.x0 * vs + ox) - pad, y0 = Math.floor(b.y0 * vs + oy) - pad, w = Math.ceil(bw) + 2 * pad, h = Math.ceil(bh) + 2 * pad;
    if (!(w > 0 && h > 0) || w > WORLD_STAGE_FIG_MAX || h > WORLD_STAGE_FIG_MAX) continue;
    list.push({ r, fr, x0, y0, w, h });
  }
  if (!list.length) return;
  // shelf packing (1 px apart); the atlas doubles once when a frame's figures do not fit
  const pack = (size) => { let x = 0, y = 0, rowH = 0; for (const f of list) { if (x + f.w > size) { x = 0; y += rowH + 1; rowH = 0; } if (y + f.h > size) { f.ax = -1; continue; } f.ax = x; f.ay = y; x += f.w + 1; rowH = Math.max(rowH, f.h); } return list.every(f => f.ax >= 0); };
  let size = st.atlas ? st.atlas.size : WORLD_STAGE_ATLAS;
  if (!pack(size) && size < 2048) { size = 2048; pack(size); }
  const A = _wsgAtlas(st, size);
  if (!A) return;
  const placed = list.filter(f => f.ax >= 0);
  // 1. the new views of the figures turning, whole, into the second texture (the dissolve's source)
  const turning = placed.filter(f => f.fr.length === 2);
  if (turning.length) {
    A.dt2.clear(0, 0, A.size, Math.min(A.size, Math.max(...turning.map(f => f.ay + f.h)) + 1));
    turning.forEach((f, i) => { _wsgFigParts(st, env, S, P, f.fr[1].rec, A.dt2, f.ax - f.x0, f.ay - f.y0); f.dname = _wsgFrameSet(A.dt2, 'd', i, f.ax, f.ay, f.w, f.h); });
    A.dt2.render();
  }
  // 2. the figures: a single view whole; a turning one as its old view whole, faded by 1 - k, plus the new one times k ('add')
  // (only the rows the last frame and this one use are cleared: the rest of the atlas is empty)
  const usedH = Math.min(A.size, Math.max(...placed.map(f => f.ay + f.h)) + 1);
  A.dt.clear(0, 0, A.size, Math.max(usedH, A.usedH || 0));
  A.usedH = usedH;
  placed.forEach((f, k) => {
    const dx = f.ax - f.x0, dy = f.ay - f.y0;
    if (f.fr.length === 2) {
      const kk = f.fr[1].a;
      _wsgFigParts(st, env, S, P, f.fr[0].rec, A.dt, dx, dy);
      const e = _wsgOffImg(st, st.fxWhite.key);
      e.setPosition(f.ax, f.ay); e.setScale(f.w / st.fxWhite.w, f.h / st.fxWhite.h); e.setAlpha(kk);
      A.dt.erase(e);
      A.dt.stamp(A.key2, f.dname, f.ax, f.ay, { originX: 0, originY: 0, alpha: kk, blendMode: 1 });
      const cut = f.fr[1].rec.cut || f.fr[0].rec.cut;
      if (cut) _wsgCutErase(st, env, A.dt, cut, dx, dy);
    } else {
      const plan = _wsgFigParts(st, env, S, P, f.fr[0].rec, A.dt, dx, dy);
      if (S.figs && f.r.agent) _wsgFigRec(env, S, f.r, plan, _wfrAgentAlpha(f.r));
      if (f.fr[0].rec.cut) _wsgCutErase(st, env, A.dt, f.fr[0].rec.cut, dx, dy);
    }
    f.frame = _wsgFrameSet(A.dt, 'f', k, f.ax, f.ay, f.w, f.h);
    f.k = k;
    P.figs.set(f.r, f);
  });
  A.dt.render();
  st.st.figures = placed.length;
}
/** A figure's body in the depth order: its atlas rectangle at its own opacity (ga: life's fade or ghost pass). */
function _wsgFigureDraw(st, env, S, P, r, fr, ga, D) {
  const f = P.figs && P.figs.get(r);
  if (!f || !st.atlas) return false;
  _wsgBlit(st, st.atlas.tex, [1, 0, 0, 1, f.x0, f.y0], ga, D, { frame: f.frame });
  return true;
}
