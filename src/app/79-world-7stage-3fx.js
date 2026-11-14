/* ============================================================
   WORLD STAGE, the effects (docs/dev/WORLD_STAGE.md 5). Private names: _wsg. Browser only.
   - Water: per region its baked surface and reflection (the compositor's own images); the reflection as bands of two rows, each
     shifted by the ripple at the frame's scene time (worldWaterRipple, every frame: the GPU makes it free); the agents' mirror, the
     glints and the rings drawn into the same region texture; then what is not water there (outside the outline, under a deck or a
     towpath edge laid over it) is erased with the region's mask: the canvas path's clips, exactly.
   - The lit glass of a static drawn live or over a mover: its own small bitmap per lit set.
   - Lamps: the halos of a live lamp and a carried light, as one shared radial texture tinted and added (the same profile as
     worldDrawLights: 1, .42, .12, 0 at 0, .18, .45, 1 of its radius); a vehicle's beam as a shared gradient triangle.
   - The weather's own frame (v2 framePost passes: rain streaks, lightning) and the falls: drawn by their Canvas 2D code into an
     overlay bitmap, refreshed at most 15 times a second and only while they draw.
   ============================================================ */

const WORLD_STAGE_FX_HZ = 15;
const _WSG_HALO = [[0, 1], [0.18, 0.42], [0.45, 0.12], [1, 0]];

function _wsgCv(w, h) { return typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(Math.max(1, w | 0), Math.max(1, h | 0)) : Object.assign(document.createElement('canvas'), { width: Math.max(1, w | 0), height: Math.max(1, h | 0) }); }
function _wsgFxInit(st) {
  // the shared textures: a white pixel, a halo (radial, white), a beam (a triangle fading from its apex)
  const white = _wsgCv(4, 4), wg = white.getContext('2d'); wg.fillStyle = '#fff'; wg.fillRect(0, 0, 4, 4);
  st.fxWhite = _wsgTexUp(st, white, 'fixed');
  const halo = _wsgCv(128, 128), hg = halo.getContext('2d'), gr = hg.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [u, a] of _WSG_HALO) gr.addColorStop(u, `rgba(255,255,255,${a})`);
  hg.fillStyle = gr; hg.fillRect(0, 0, 128, 128);
  st.fxHalo = _wsgTexUp(st, halo, 'fixed');
  const beam = _wsgCv(128, 128), bg = beam.getContext('2d'), lg = bg.createLinearGradient(64, 0, 64, 128);
  lg.addColorStop(0, 'rgba(255,255,255,1)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
  bg.fillStyle = lg; bg.beginPath(); bg.moveTo(64, 0); bg.lineTo(0, 128); bg.lineTo(128, 128); bg.closePath(); bg.fill();
  st.fxBeam = _wsgTexUp(st, beam, 'fixed');
}
const _wsgHexMemo = new Map();
function _wsgHex(c) {
  let v = _wsgHexMemo.get(c);
  if (v === undefined) {
    let r = 255, g = 255, b = 255;
    const m = /^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(String(c));
    if (m) { r = +m[1]; g = +m[2]; b = +m[3]; } else if (typeof _scHex === 'function') { const h = _scHex(String(c)); r = h[0]; g = h[1]; b = h[2]; }
    v = (r << 16) | (g << 8) | b;
    if (_wsgHexMemo.size > 512) _wsgHexMemo.clear();
    _wsgHexMemo.set(c, v);
  }
  return v;
}

/* ---------- water ---------- */
/**
 * Per water region of a bake, its two masks (region px; opaque where the effect must not show):
 *   over  what lies over the water (a deck, a towpath edge laid over it): the water, its mirrors and glints never show there
 *         (5frame clips the water with _wfrHoleClip(S.wet.over));
 *   out   outside the region's outline: the agents' mirror and the glints stay inside it (5frame clips them to R.clips);
 * and one of the frame: the wet area (every water outline), where no agent's shadow falls (L2).
 */
function _wsgWaterGen(st, env, G) {
  const S = env._wfr, vs = env.vs, ox = env.ox, oy = env.oy;
  const path = (g, P, dx, dy) => { g.moveTo(P[0][0] * vs + ox - dx, P[0][1] * vs + oy - dy); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0] * vs + ox - dx, P[i][1] * vs + oy - dy); g.closePath(); };
  G.water = [];
  for (const w of S.water || []) {
    const res = w.res, R = w.R;
    if (!res || !res.w || !res.h) { G.water.push(null); continue; }
    let over = null;
    if (S.wet && S.wet.over.length) {
      over = _wsgCv(res.w, res.h);
      const g = over.getContext('2d');
      g.fillStyle = '#000'; g.beginPath(); for (const P of S.wet.over) path(g, P, res.x0, res.y0); g.fill('evenodd');   // (as 5frame _wfrHoleClip: even-odd)
    }
    const out = _wsgCv(res.w, res.h), g = out.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, res.w, res.h);
    g.globalCompositeOperation = 'destination-out';
    const PP = (Array.isArray(R.clips) && R.clips.length ? R.clips : [R.clip]).filter(P => Array.isArray(P) && P.length >= 3);
    g.beginPath(); for (const P of PP) path(g, P, res.x0, res.y0); g.fill('nonzero');
    G.water.push({ over, out });
  }
  if (S.wet && S.wet.water.length) {
    const c = _wsgCv(env.W, env.H), g = c.getContext('2d');
    g.fillStyle = '#000'; g.beginPath(); for (const P of S.wet.water) path(g, P, 0, 0); g.fill('evenodd');
    G.wetMask = c;
  }
}
/** An offscreen image of a mask texture at (0, 0), origin 0 (a render texture erases with it). */
function _wsgMaskImg(st, tx) {
  if (!tx) return null;
  if (!tx.maskImg) tx.maskImg = st.scene.make.image({ x: 0, y: 0, key: tx.key, add: false }).setOrigin(0, 0);
  return tx.maskImg;
}
/**
 * The water regions of the frame, each a render texture of its own: the surface, the reflection rippled row by row at the frame's
 * scene time, the agents' mirror and the glints (an fx texture first erased outside the outline), then everything under a deck or
 * an edge laid over the water erased: the canvas path's clips, exactly. The rings and wakes go on top, unclipped (as 5frame draws them).
 */
function _wsgWater(st, env, S, P, G, D) {
  const W = st.waterRT || (st.waterRT = new Map());
  for (const rt of W.values()) rt.seen = false;
  if (S.water && S.water.length) {
    const L = P.L, vs = env.vs, oy = env.oy, wind = L && L.wind != null ? L.wind : 1, tau = P.tau;
    S.water.forEach((w, i) => {
      const res = w.res, gw = G.water && G.water[i];
      if (!res || !res.w || !res.h || !gw) return;
      const base = _wsgTexOf(st, res.baseCanvas), refl = _wsgTexOf(st, res.reflCanvas), over = gw.over ? _wsgTexOf(st, gw.over) : null, out = _wsgTexOf(st, gw.out);
      const rt = _wsgWaterRT(st, 'w' + i, res, true);
      if (!rt) return;
      // the agents' mirror and the glints, inside the outline
      let fx = null;
      if (out && typeof _wsgMirrorInto === 'function') {
        fx = _wsgWaterRT(st, 'x' + i, res, false);
        fx.dt.clear();
        let n = _wsgMirrorInto(st, env, S, P, w, res, fx.dt);
        n += _wsgGlintsInto(st, env, S, P, w, i, res, fx.dt);
        if (n > 0) { fx.dt.erase(_wsgMaskImg(st, out)); fx.dt.render(); } else fx = null;
      }
      const dt = rt.dt;
      dt.clear();
      if (base) dt.stamp(base.key, undefined, 0, 0, { originX: 0, originY: 0 });
      if (refl) {
        // the reflection's rows, two at a time, each shifted by the ripple at its row (the canvas path's 0.3 px bands, at frame rate)
        const fr = _wsgBands(st, refl, res.h);
        for (let y = 0, k = 0; y < res.h; y += 2, k++) dt.stamp(refl.key, fr[k], worldWaterRipple(w.R, res.y0 + y, tau, { vs, oy, wind }), y, { originX: 0, originY: 0 });
      }
      if (fx) dt.stamp(fx.key, undefined, 0, 0, { originX: 0, originY: 0 });
      if (over) dt.erase(_wsgMaskImg(st, over));
      dt.render();
      rt.img.setPosition(res.x0, res.y0);
      if (rt.img.depth !== D + i * 0.01) rt.img.setDepth(D + i * 0.01);
      rt.img.setVisible(true);
      rt.seen = true;
    });
  }
  for (const rt of W.values()) if (!rt.seen && rt.img) rt.img.setVisible(false);
  _wsgRings(st, env, S, P, WSG_D_WORLD + _WSG_WORLD_DEPTH.waterfx);
}
/** A region's render texture ('w<i>': shown; 'x<i>': its fx, stamped into it), made once per size. */
function _wsgWaterRT(st, name, res, shown) {
  const M = st.waterRT || (st.waterRT = new Map());
  let rt = M.get(name);
  if (rt && (rt.w !== res.w || rt.h !== res.h)) { try { if (rt.img) rt.img.destroy(); st.scene.textures.remove(rt.key); } catch (e) { /* gone */ } M.delete(name); rt = null; }
  if (!rt) {
    const key = 'wsg' + st.id + '.' + name + '.' + (++st.texSeq);
    const dt = st.scene.textures.addDynamicTexture(key, res.w, res.h);
    if (!dt) return null;
    rt = { key, dt, img: shown ? st.scene.add.image(res.x0, res.y0, key).setOrigin(0, 0) : null, w: res.w, h: res.h };
    M.set(name, rt);
  }
  return rt;
}
/** The reflection texture's frames of two rows each (made once per texture). */
function _wsgBands(st, tx, h) {
  if (tx.bands) return tx.bands;
  const T = st.scene.textures.get(tx.key), out = [];
  for (let y = 0, k = 0; y < h; y += 2, k++) { const name = 'b' + k; T.add(name, 0, 0, y, tx.w, Math.min(2, h - y)); out.push(name); }
  tx.bands = out;
  return out;
}
/**
 * The agents' mirror on one region (5frame _wfrMirrorAgents), far to near, into the region's fx texture: each figure's atlas drawing
 * (the POSED figure, its view dissolve and waterline cut included) flipped about its contact row, only its rows that mirror below
 * that row, at the kind's mirror strength times the figure's own opacity; a hull drawn now, flipped the same way. -> draws.
 */
function _wsgMirrorInto(st, env, S, P, w, res, dt) {
  if (!P.aRecs.length || typeof worldWaterContactRow !== 'function' || typeof _wfrContact !== 'function') return 0;
  const R = w.R, vs = env.vs, oy = env.oy, cam = P.cam, A = st.atlas;
  const look = R.look || {}, k = Math.max(0, Math.min(1, look.mirror == null ? 0.7 : look.mirror)) * 0.6;
  const list = P.aRecs.filter(r => r.box.x1 > R.box[0] && r.box.x0 < R.box[2] && r.box.y0 < R.box[3] && r.z >= (R.dNear || 0) - 1 && !/^air/.test(String(r.ent.attach || ''))).sort((a, b) => b.z - a.z);
  let n = 0;
  for (const r of list) {
    let c = null;
    try { c = _wfrContact(R, r, cam); } catch (e) { c = null; }
    if (!c) continue;
    const row0 = worldWaterContactRow(R, c, r.X), base = c.kind === 'bank' && typeof worldWaterContactBase === 'function' ? worldWaterContactBase(R, c, r.X) : row0;
    const row = Number.isFinite(base) ? (row0 + base) / 2 : row0;
    if (!Number.isFinite(row) || !(r.box.y0 < row)) continue;
    const Yc = row * vs + oy, Kc = typeof worldWaterContactClip === 'function' ? worldWaterContactClip(R, c, r.X) * vs + oy : -Infinity, yClip = Math.max(Yc, Kc);
    const a = k * _wfrAgentAlpha(r);
    let src = null;
    const f = P.figs && P.figs.get(r);
    if (f && A) src = { key: A.key, dt: A.dt, x0: f.x0, y0: f.y0, w: f.w, h: f.h, ax: f.ax, ay: f.ay, pre: 'm' + f.k };
    else if (r.prim && typeof _wsgPrimTex === 'function') { const p = _wsgPrimTex(st, env, S, r); if (p) src = { key: p.tx.key, dt: st.scene.textures.get(p.tx.key), x0: p.x0, y0: p.y0, w: p.w, h: p.h, ax: 0, ay: 0, pre: 'm' }; }
    if (!src) continue;
    const hc = Math.min(src.h, Math.floor(2 * Yc - yClip - src.y0));
    if (!(hc > 0)) continue;
    const name = _wsgFrameSet(src.dt, src.pre, '', src.ax, src.ay, src.w, hc);
    dt.stamp(src.key, name, src.x0 - res.x0, 2 * Yc - src.y0 - res.y0, { originX: 0, originY: 0, scaleY: -1, alpha: Math.min(1, a) });
    n++;
  }
  return n;
}
/** The glitter road of one region (look's worldGlitterPlan, planned once per bake): three groups of glints twinkling, rippled. */
function _wsgGlintsInto(st, env, S, P, w, i, res, dt) {
  if (typeof worldGlitterPlan !== 'function' || !S.sky) return 0;
  if (!S._wsgGlitter) { try { S._wsgGlitter = S.water.map(x => ({ R: x.R, plan: worldGlitterPlan(x.R, S.sky, P.cam, { H: env.H / env.vs }) })); } catch (e) { S._wsgGlitter = []; } }
  const gp = S._wsgGlitter[i], plan = gp && gp.plan;
  if (!plan || !plan.kind || !plan.glints || !plan.glints.length) return 0;
  const vs = env.vs, ox = env.ox, oy = env.oy, t = P.tau, L = P.L, o = { vs, ox, oy, wind: L && L.wind != null ? L.wind : 1 }, g = _wsgOffGfx(st), col = _wsgHex(plan.col);
  for (let q = 0; q < 3; q++) {
    g.lineStyle(2.2 * vs, col, Math.max(0, Math.min(1, 0.85 * plan.k * (0.4 + 0.6 * Math.abs(Math.sin((t || 0) * (1.3 + q * 0.55) + q * 2.1))))));
    for (const s of plan.glints) {
      if (s.g !== q) continue;
      const dx = worldWaterRipple(w.R, s.y * vs + oy, t, o), x = s.x * vs + ox + dx - res.x0, y = s.y * vs + oy - res.y0;
      g.lineBetween(x, y, x + s.len * vs, y);
    }
  }
  dt.draw(g);
  return 1;
}
/** Rings, wakes and floating leaves on the world's water (look's worldWaterDrawFx), unclipped as in the canvas path. */
function _wsgRings(st, env, S, P, D) {
  const g = st.gfx.waterfx || (st.gfx.waterfx = st.scene.add.graphics());
  g.clear();
  if (g.depth !== D) g.setDepth(D);
  const Wt = P.world && P.world.water, cam = P.cam;
  if (!Wt || !cam || typeof _wwaRow !== 'function') return;
  const vs = env.vs, ox = env.ox, oy = env.oy, Pj = (x, z, y) => { const d = Math.max(0.3, z); return [(cam.x0 + cam.f * x / d) * vs + ox, (_wwaRow(cam, d, y || 0)) * vs + oy, cam.f / d * vs]; };
  const lw = Math.max(0.6, vs * 0.8);
  for (const r of Wt.rings || []) {
    const R = (Wt.regions || []).find(q => typeof _wwaInPoly === 'function' && _wwaInPoly(r.x, r.z, q.P));
    const u = r.age / r.life, rad = r.r0 + 1.1 * u, [X, Y, k] = Pj(r.x, r.z, R ? R.level : 0), rx = rad * k, ry = Math.max(0.4, rx * (cam.eye - (R ? R.level : 0)) / Math.max(0.3, r.z));
    g.lineStyle(lw, 0xecf4f8, Math.max(0, 0.55 * (1 - u) * (1 - u))); g.strokeEllipse(X, Y, 2 * rx, 2 * ry);
  }
  for (const q of Wt.wakes || []) {
    const u = q.age / q.life, sp = Math.max(0.3, q.speed), len = 1 + q.age * sp * 0.7, h = Math.hypot(q.vx, q.vz) || 1, bx = -q.vx / h, bz = -q.vz / h, s = Math.tan(19.5 * Math.PI / 180);
    const a = Pj(q.x, q.z), l = Pj(q.x + (bx - bz * s) * len, q.z + (bz + bx * s) * len), rr = Pj(q.x + (bx + bz * s) * len, q.z + (bz - bx * s) * len);
    g.lineStyle(lw, 0xecf4f8, Math.max(0, 0.5 * (1 - u))); g.beginPath(); g.moveTo(l[0], l[1]); g.lineTo(a[0], a[1]); g.lineTo(rr[0], rr[1]); g.strokePath();
  }
  for (const q of Wt.leaves || []) {
    const [X, Y, k] = Pj(q.x, q.z), rx = Math.max(0.6, 0.06 * k), ry = Math.max(0.4, 0.03 * k), ca = Math.cos(q.spin || 0), sa = Math.sin(q.spin || 0), pts = [];
    for (let j = 0; j < 8; j++) { const v = j * Math.PI / 4, ex = Math.cos(v) * rx, ey = Math.sin(v) * ry; pts.push({ x: X + ex * ca - ey * sa, y: Y + ex * sa + ey * ca }); }
    g.fillStyle(0xb8742c, 0.85); g.fillPoints(pts, true);
  }
}
/**
 * The agents' shadows (5frame step 2: look's worldShadowPlan per frame), into a render texture of the frame: each figure's atlas
 * drawing (the posed figure) as a silhouette in the shadow colour through sceneShadowMatrix (a shear: a container pair), a figure
 * outside the atlas by its rest sprite, the rest as their polygons; then the wet area erased (never on water, L2).
 */
function _wsgAgentShadows(st, env, S, P, D) {
  const rt = st.shadowRT;
  const L = P.L, sunOn = S.sky ? S.sky.sun.alt > 0 && S.sky.dark < 0.6 : !!(L && (L.alt || 0) > 0 && !(L.dark > 0.6));
  if (!P.aRecs.length || !sunOn || typeof worldShadowPlan !== 'function' || S.agentShadowOff) { if (rt) rt.img.setVisible(false); return; }
  let plan = [];
  try { plan = worldShadowPlan({ entities: [], surfaces: P.world.surfaces, cam: P.cam }, P.cam, S.sky || L, { agents: P.aRecs.map(r => ({ ...r.ent, id: r.id })), statics: false, W: 2 * (P.cam.x0 || 800) }) || []; }
  catch (e) { S.agentShadowOff = true; return; }
  if (!plan.length) { if (rt) rt.img.setVisible(false); return; }
  const W = env.W, H = env.H;
  let R = st.shadowRT;
  if (R && (R.w !== W || R.h !== H)) { try { R.img.destroy(); st.scene.textures.remove(R.key); } catch (e) { /* gone */ } R = st.shadowRT = null; }
  if (!R) { const key = 'wsg' + st.id + '.shadows.' + (++st.texSeq), dt = st.scene.textures.addDynamicTexture(key, W, H); if (!dt) return; R = st.shadowRT = { key, dt, w: W, h: H, img: st.scene.add.image(0, 0, key).setOrigin(0, 0) }; }
  const vs = env.vs, ox = env.ox, oy = env.oy, cam = P.cam, sun = typeof worldSunOf === 'function' ? worldSunOf(S.sky || L, cam) : null, byId = new Map(P.aRecs.map(r => [String(r.id), r])), col = 0x14202e;
  const dt = R.dt, A = st.atlas;
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  const grow = (x, y) => { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; };
  // only what the last frame drew is cleared (the rest of the texture is empty)
  if (R.box) dt.clear(R.box[0], R.box[1], R.box[2], R.box[3]); else dt.clear();
  R.box = null;
  const g = _wsgOffGfx(st);
  let polys = 0, n = 0;
  for (const s of plan) {
    if (!s.scr || s.scr.length < 3 || !(s.op > 0)) continue;
    const r = byId.get(String(s.ref)), f = r && P.figs ? P.figs.get(r) : null;
    let done = false;
    if (s.sil && r && !r.prim && sun && typeof sceneShadowMatrix === 'function') {
      const sp = _wfrSpriteOf(env, S, r, '*', { bucket: r.bucket });
      if (sp && sp.c) {
        const fz = Math.max(0.5, (s.poly && s.poly[0] && s.poly[0][1]) || 1);
        const M = sceneShadowMatrix(cam, { X: r.X, Y: r.Y, x: r.x, d: r.z || fz }, r.s || 1, -(sp.y0 || -1), r.flip, sun, vs, ox, oy);
        let Am = null, key = null, frame, fw = 0, fh = 0;
        if (f && A) {
          // the atlas drawing: device -> the rest sprite's art units (its own matrix inverted) -> the shadow
          const Rm = _wfrM(env, r), inv = [1 / Rm[0], 0, 0, 1 / Rm[3], -Rm[4] / Rm[0], -Rm[5] / Rm[3]];
          Am = _wfrMul(_wfrMul(M, inv), [1, 0, 0, 1, f.x0, f.y0]); key = A.key; frame = f.frame; fw = f.w; fh = f.h;
        } else {
          const tx = _wsgSpriteTex(st, sp);
          if (tx) { Am = _wsgSpriteA(sp, tx, M); key = tx.key; fw = tx.w; fh = tx.h; }
        }
        if (Am) {
          const pr = _wsgOffPair(st, key, frame);
          _wsgPairSet(pr, Am);
          pr.inner.setTint(col); pr.inner.setTintMode(Phaser.TintModes.FILL); pr.inner.setAlpha(Math.min(1, s.op));
          dt.draw(pr.box);
          for (const [u, v] of [[0, 0], [fw, 0], [0, fh], [fw, fh]]) grow(Am[0] * u + Am[2] * v + Am[4], Am[1] * u + Am[3] * v + Am[5]);
          done = true; n++;
        }
      }
    }
    if (!done) {
      g.fillStyle(col, Math.min(1, s.op));
      g.fillPoints(s.scr.map(q => { const x = q[0] * vs + ox, y = q[1] * vs + oy; grow(x, y); return { x, y }; }), true);
      polys++; n++;
    }
  }
  if (polys) dt.draw(g);
  if (!n) { R.img.setVisible(false); return; }
  // shown, cleared next frame and erased only over the shadows' own box (the rest of the texture is empty)
  const x0 = Math.max(0, Math.floor(bx0) - 2), y0 = Math.max(0, Math.floor(by0) - 2), x1 = Math.min(W, Math.ceil(bx1) + 2), y1 = Math.min(H, Math.ceil(by1) + 2);
  if (!(x1 > x0 && y1 > y0)) { dt.render(); R.box = [0, 0, W, H]; R.img.setVisible(false); return; }
  R.box = [x0, y0, x1 - x0, y1 - y0];
  const G = st.gen.get(st.envShown), wet = G && G.wetMask ? _wsgTexOf(st, G.wetMask) : null;
  if (wet) { const m = _wsgMaskImg(st, wet); m.setCrop(x0, y0, x1 - x0, y1 - y0); dt.erase(m); }
  dt.render();
  R.img.setCrop(x0, y0, x1 - x0, y1 - y0);
  if (R.img.depth !== D) R.img.setDepth(D);
  R.img.setVisible(true);
}

/* ---------- the v2 base water (78-scene-water.js frameGroup 20): where the world's own water does not reach ---------- */
/** Per v2 water region of the bake: its reflection and the INVERSE of its mask (an erase with it is the pass's destination-in). */
function _wsgBaseWaterGen(st, env, G) {
  G.baseWater = [];
  const W = env.water;
  if (!W || !W.regions) return;
  for (const R of W.regions) {
    if (!R.mask || !R.refl || !R.db) continue;
    const inv = _wsgCv(R.bw, R.bh), g = inv.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, R.bw, R.bh);
    g.globalCompositeOperation = 'destination-out'; g.drawImage(R.mask, 0, 0);
    G.baseWater.push({ R, inv });
  }
}
/**
 * The v2 base water's frame (_scwaFrame): its reflection in bands shifted by the pass's own ripple (_scwaShift) and its glints, kept
 * only where its mask is (the inverse mask erased), after the region's ground group. At frame rate (the canvas pass refreshes at 15 Hz).
 */
function _wsgBaseWater(st, env, t) {
  const G = st.gen.get(env), M = st.baseRT || (st.baseRT = new Map());
  for (const rt of M.values()) rt.seen = false;
  if (G && G.baseWater && G.baseWater.length && typeof _scwaShift === 'function') {
    const L = env.Lnow || env.L, wind = L ? L.wind : 1, vs = env.vs, ox = env.ox, oy = env.oy;
    G.baseWater.forEach((bw, i) => {
      const R = bw.R, refl = _wsgTexOf(st, R.refl), inv = _wsgTexOf(st, bw.inv);
      if (!refl || !inv || R.calmNow && !(R.glints && R.glints.length && R.glintSrc)) return;
      let rt = M.get(i);
      if (rt && (rt.w !== R.bw || rt.h !== R.bh)) { try { rt.img.destroy(); st.scene.textures.remove(rt.key); } catch (e) { /* gone */ } rt = null; }
      if (!rt) {
        const key = 'wsg' + st.id + '.base' + i + '.' + (++st.texSeq), dt = st.scene.textures.addDynamicTexture(key, R.bw, R.bh);
        if (!dt) return;
        rt = { key, dt, w: R.bw, h: R.bh, img: st.scene.add.image(R.db[0], R.db[1], key).setOrigin(0, 0) };
        M.set(i, rt);
      }
      const dt = rt.dt;
      dt.clear();
      if (!R.calmNow) {
        if (!refl.vbands) { const T = st.scene.textures.get(refl.key); refl.vbands = R.bands.map((b, k) => (b.x1 > b.x0 ? (T.add('v' + k, 0, b.x0, b.y, b.x1 - b.x0, b.h), 'v' + k) : null)); }
        R.bands.forEach((b, k) => { const f = refl.vbands[k]; if (f) dt.stamp(refl.key, f, b.x0 + _scwaShift(R, b.y + b.h / 2, t, wind), b.y, { originX: 0, originY: 0 }); });
      }
      if (R.glints && R.glints.length && R.glintSrc) {
        const g = _wsgOffGfx(st), col = _wsgHex(R.glintSrc.col);
        for (let gq = 0; gq < 3; gq++) {
          g.lineStyle(2.2 * vs, col, Math.max(0, Math.min(1, 0.85 * R.glintSrc.k * (0.4 + 0.6 * Math.abs(Math.sin(t * (1.3 + gq * 0.55) + gq * 2.1))))));
          for (const s of R.glints) {
            if (s.g !== gq) continue;
            const dx = _scwaShift(R, s.y * vs + oy - R.db[1], t, wind) / vs + Math.sin(t * 0.9 + gq * 2) * 3, x = (s.x + dx) * vs + ox - R.db[0], y = s.y * vs + oy - R.db[1];
            g.lineBetween(x, y, x + s.len * vs, y);
          }
        }
        dt.draw(g);
      }
      dt.erase(_wsgMaskImg(st, inv));
      dt.render();
      const d = WSG_D_GROUP + (R.gi || 0) + 0.2;
      if (rt.img.depth !== d) rt.img.setDepth(d);
      rt.img.setVisible(true);
      rt.seen = true;
    });
  }
  for (const rt of M.values()) if (!rt.seen) rt.img.setVisible(false);
}

/* ---------- lit glass of one static ---------- */
/**
 * The lit glass of a static (5frame _wfrDrawGlass): its own small bitmap per lit set, drawn over it at depth D; clip: only inside
 * this device rectangle (an occluder redraw).
 */
function _wsgGlass(st, env, S, r, D, clip) {
  if (r.prim || typeof _wfrGlassOn !== 'function' || typeof _wfrDrawGlass !== 'function') return 0;
  const LN = S.lightNow, on = _wfrGlassOn(S, r, LN);
  if (!on.length) return 0;
  const memo = st.glassMemo || (st.glassMemo = new Map()), key = r.id + '|' + on.join('.') + '|' + Math.round(env.vs * 1e4) + '|' + Math.round(env.ox) + ',' + Math.round(env.oy) + '|' + r.X.toFixed(2) + ',' + r.Y.toFixed(2);
  let e = memo.get(key);
  if (!e) {
    const b = r.box, vs = env.vs, x0 = Math.max(0, Math.floor(b.x0 * vs + env.ox) - 1), y0 = Math.max(0, Math.floor(b.y0 * vs + env.oy) - 1), x1 = Math.min(env.W, Math.ceil(b.x1 * vs + env.ox) + 1), y1 = Math.min(env.H, Math.ceil(b.y1 * vs + env.oy) + 1);
    e = { c: null, x: x0, y: y0 };
    if (x1 - x0 > 0 && y1 - y0 > 0 && (x1 - x0) * (y1 - y0) <= 2.5e6) {
      e.c = _wsgCv(x1 - x0, y1 - y0);
      try { if (!_wfrDrawGlass(e.c.getContext('2d'), env, S, r, x0, y0, LN)) e.c = null; } catch (err) { e.c = null; }
    }
    if (memo.size > 256) memo.clear();
    memo.set(key, e);
  }
  if (!e.c) return 0;
  const tx = _wsgTexOf(st, e.c) || _wsgTexUp(st, e.c, 'sprite');
  if (!tx) return 0;
  let crop = null;
  if (clip) {
    const x0 = Math.max(clip[0], e.x), y0 = Math.max(clip[1], e.y), x1 = Math.min(clip[2], e.x + tx.w), y1 = Math.min(clip[3], e.y + tx.h);
    if (!(x1 > x0 && y1 > y0)) return 0;
    crop = [x0 - e.x, y0 - e.y, x1 - x0, y1 - y0];
  }
  return _wsgBlit(st, tx, [1, 0, 0, 1, e.x, e.y], 1, D, crop ? { crop } : null) ? 1 : 0;
}

/* ---------- lamps ---------- */
/** The lights the agents carry this frame (5frame step 2b), and their head-lamp beams on the ground. */
function _wsgBeams(st, env, S, P, D) {
  P.agentLights = null;
  if (!P.aRecs.length || !P.lightsOn || typeof worldLights !== 'function' || typeof worldLightDraws !== 'function') return;
  try {
    const al = (worldLights({ entities: [] }, { sky: S.sky || undefined, L: P.L, season: S.season, agents: P.aRecs.map(r => ({ ...r.ent, id: r.id, mirror: !!r.flip })) }) || []).filter(x => x.on);
    if (!al.length) return;
    const recOf = new Map(P.aRecs.map(r => [String(r.id), r]));
    P.agentLights = new Map();
    for (const l of al) { if (typeof _wfrLightOnRec === 'function') _wfrLightOnRec(l, recOf.get(String(l.ref))); if (!P.agentLights.has(l.ref)) P.agentLights.set(l.ref, []); P.agentLights.get(l.ref).push(l); }
    const vs = env.vs, ox = env.ox, oy = env.oy;
    let k = 0;
    for (const d of worldLightDraws(al.filter(l => l.beam), P.cam, { stage: 'ground', sky: S.sky || undefined })) {
      if (d.kind !== 'beam' || !d.pts) continue;
      // the unit triangle (64, 0), (0, 128), (128, 128) onto the apex and the two far corners: an affine map (a pair when it shears)
      const [A, B, C] = d.pts.map(p => [p[0] * vs + ox, p[1] * vs + oy]);
      const a = (C[0] - B[0]) / 128, b = (C[1] - B[1]) / 128, c = (B[0] - A[0] + 64 * a) / 128, dd = (B[1] - A[1] + 64 * b) / 128;
      _wsgBlit(st, st.fxBeam, [a, b, c, dd, A[0] - 64 * a, A[1] - 64 * b], Math.min(1, d.a), D + (k++) * 1e-4, { blend: 'add', mul: _wsgHex(d.col) });
    }
  } catch (e) { P.agentLights = null; }
}
/** A mover's own lamps (a carried light, a live lamp's halo) right after it, so whatever is nearer hides them. */
function _wsgOwnLights(st, env, S, P, r, D) {
  const own = (P.agentLights && P.agentLights.get(r.id)) || (r.static && S.liveLights && S.liveLights.get(r.id));
  if (!own || !own.length || typeof worldLightDraws !== 'function') return;
  const vs = env.vs, ox = env.ox, oy = env.oy;
  let k = 0;
  for (const d of worldLightDraws(own, P.cam, { stage: 'glow', sky: S.sky || undefined })) {
    if (d.kind !== 'halo') continue;
    const R = d.rx * vs, s = 2 * R / 128;
    if (!(R > 0.5)) continue;
    _wsgBlit(st, st.fxHalo, [s, 0, 0, s, d.X * vs + ox - R, d.Y * vs + oy - R], Math.min(1, d.a), D + (k++) * 1e-4, { blend: 'add', mul: _wsgHex(d.col) });
  }
}

/* ---------- the weather's frame and the falls: Canvas 2D into an overlay, at most WORLD_STAGE_FX_HZ ---------- */
/**
 * The v2 frame passes the stage does not draw natively (the weather's rings, the fog banks: frameGroup; the falling rain and snow
 * streaks, lightning: framePost) and the world's falls: their own Canvas 2D drawing into one overlay of the frame, refreshed at
 * most WORLD_STAGE_FX_HZ a second and uploaded only while something is drawn.
 */
function _wsgFxLayer(st, key, env, t, D, draw) {
  const M = st.fxLayers || (st.fxLayers = new Map());
  let f = M.get(key);
  const W = env.out.W, H = env.out.H;
  if (!f || f.W !== W || f.H !== H) { f = { c: _wsgCv(W, H), W, H, k: null, tx: null, img: null, n: 0 }; M.set(key, f); }
  const k = Math.floor((t || 0) * WORLD_STAGE_FX_HZ);
  if (f.k !== k) {
    f.k = k;
    const cx = f.c.getContext('2d');
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; cx.clearRect(0, 0, W, H);
    let n = 0;
    try { n = draw(cx) || 0; } catch (e) { n = 0; }
    f.n = n;
    if (n > 0) f.tx = _wsgDynTex(st, f.c, ++f.ver || (f.ver = 1));
  }
  if (!(f.n > 0) || !f.tx) { if (f.img) f.img.setVisible(false); return; }
  if (!f.img || f.img._k !== f.tx.key) { if (f.img) f.img.destroy(); f.img = st.scene.add.image(0, 0, f.tx.key).setOrigin(0, 0); f.img._k = f.tx.key; }
  f.img.setVisible(true); if (f.img.depth !== D) f.img.setDepth(D);
}
/** Under the world: the weather's rings and the fog banks of every group (frameGroup passes 'weather' and 'atmos'). */
function _wsgUnderFx(st, env, t) {
  const C = env.C, out = env.out;
  if (typeof sceneRenderPasses !== 'function') return;
  const list = sceneRenderPasses('frameGroup', C).filter(p => p.id === 'weather' || p.id === 'atmos');
  if (!list.length) return;
  _wsgFxLayer(st, 'under', env, t, WSG_D_UNDERFX, (cx) => {
    let n = 0;
    (out.groups || []).forEach((g, gi) => {
      for (const p of list) { if (env.broken && env.broken.has(p.id)) continue; try { const r = p.frameGroup(env, g, cx, t, out.hideBelow ? out.hideBelow[gi] : out.H); if (r > 0) n += r; } catch (e) { /* the pass draws nothing */ } }
    });
    return n;
  });
}
/** On top: the v2 framePost passes (the weather's falling rain and snow, lightning) and the world's falls (over the water). */
function _wsgPostFx(st, env, t) {
  const C = env.C;
  if (typeof sceneRenderPasses === 'function') {
    const list = sceneRenderPasses('framePost', C).filter(p => p.id !== 'world-frame' && p.id !== 'world-debug');
    if (list.length) _wsgFxLayer(st, 'post', env, t, WSG_D_POST + 30, (cx) => {
      let n = 0;
      for (const p of list) { if (env.broken && env.broken.has(p.id)) continue; try { const r = p.framePost(env, cx, t); if (r > 0) n += r; } catch (e) { /* the pass draws nothing */ } }
      return n;
    });
  }
  const S = env._wfr;
  if (S && S.falls && S.falls.length && typeof worldWaterDrawFalls === 'function') {
    const tau = S.stats ? S.stats.tau : t;
    _wsgFxLayer(st, 'falls', env, tau, WSG_D_WORLD + _WSG_WORLD_DEPTH.falls, (cx) => worldWaterDrawFalls(cx, S.falls, tau, { vs: env.vs, ox: env.ox, oy: env.oy }));
  }
}
