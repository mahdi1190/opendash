/* ============================================================
   WORLD STAGE, the static layers (docs/dev/WORLD_STAGE.md 3). Private names: _wsg. Browser only.
   Textures: every bitmap of a bake (the baker's sky, clouds and ground groups; the world compositor's ground marks, water, walls,
   shadows, light pools, chunks with their lit glass and halos; the stage's own decks, walls with their low-deck holes and night
   path key) is uploaded ONCE (textures.addImage: never a CanvasTexture for a big bitmap, which reads it back), keyed by the canvas
   itself, in slices of a few ms a frame. Slots: each static place on the screen ('sky', 'g0', 'ch3', 'pools' ...) shows one
   texture; when its bitmap changes (a re-bake, a relit chunk, the lamps coming on) the new one cross-fades in over
   WORLD_STAGE_FADE_S (an additive layer fades the old one out at the same time); a place that goes away fades out. Nothing on the
   screen is swapped or dropped in one frame.
   Depths: the sky 0, stars 1, clouds 2, the ground groups 10+, the world under-layers 1000+, then the world's own depth order from
   2000 (chunks, movers, redraws: 79-world-7stage-2movers.js), the weather and particles on top (WSG_D_POST).
   ============================================================ */

const WSG_D_SKY = 0, WSG_D_STARS = 1, WSG_D_CLOUD = 2, WSG_D_GROUP = 10, WSG_D_UNDERFX = 900, WSG_D_WORLD = 1000, WSG_D_ORDER = 2000, WSG_D_POST = 1e7;
const _WSG_WORLD_DEPTH = { marks: 0, water: 1, falls: 2, mirror: 3, waterfx: 4, glitter: 5, decks: 6, wallimg: 7, walls: 8, shadow: 9, agentShadows: 10, pathkey: 11, pools: 12, beams: 13 };

function _wsgLayersInit(st) {
  st.tex = new Map(); st.texSeq = 0; st.texDrop = [];
  st.slots = new Map();
  st.pool = { img: [], used: 0, pair: [], pairUsed: 0 };
  const s = st.scene;
  st.gfx = {
    stars: s.add.graphics().setDepth(WSG_D_STARS),
    post: s.add.graphics().setDepth(WSG_D_POST + 10),
    veil: s.add.graphics().setDepth(WSG_D_POST + 20),
  };
  // a white pixel (fills, erases) and the shared light textures (halo, beam): made once per game
  if (typeof _wsgFxInit === 'function') _wsgFxInit(st);
}
function _wsgLayersFree(st) {
  if (st.tex) st.tex.clear();
  if (st.slots) st.slots.clear();
  if (st.gen) st.gen.clear();
  st.pool = null;
}

/* ---------- textures ---------- */
/** The uploaded texture of a canvas (null: not uploaded yet). */
function _wsgTexOf(st, c) { const t = c ? st.tex.get(c) : null; if (t) t.last = st.frameNo; return t || null; }
/** Upload a canvas now (once): -> the texture record { key, c, w, h, bytes, refs, last, kind } or null (an empty canvas). */
function _wsgTexUp(st, c, kind) {
  if (!c) return null;
  let t = st.tex.get(c);
  if (t) { t.last = st.frameNo; return t; }
  const w = c.width | 0, h = c.height | 0;
  if (!w || !h || !st.scene) return null;
  const a = _wsgNow(), key = 'wsg' + st.id + '.' + (++st.texSeq);
  try { st.scene.textures.addImage(key, c); } catch (e) { st.st.errors.push('upload: ' + (e && e.message)); return null; }
  const took = _wsgNow() - a;
  t = { key, c, w, h, bytes: w * h * 4, refs: 0, last: st.frameNo, kind: kind || 'static' };
  st.tex.set(c, t);
  st.st.uploads++; st.st.uploadMs += took; st.st.uploadMax = Math.max(st.st.uploadMax, took); st.st.textures = st.tex.size; st.st.texBytes += t.bytes;
  if (st.upLeft != null) st.upLeft -= took;
  return t;
}
/** Let a texture go once nothing shows it (a few seconds later: the next bake often reuses it). */
function _wsgTexDrop(st, t) {
  if (!t || !st.scene) return;
  if (t.refs > 0) return;
  t.dropAt = st.frameNo + 120;
  st.texDrop.push(t);
}
function _wsgTexSweep(st) {
  if (!st.texDrop.length || !st.scene) return;
  const keep = [];
  for (const t of st.texDrop) {
    if (t.refs > 0 || st.tex.get(t.c) !== t) continue;
    if (st.frameNo < t.dropAt || (st.genWant && st.genWant.has(t.c))) { keep.push(t); continue; }
    st.tex.delete(t.c); st.st.texBytes -= t.bytes;
    try { st.scene.textures.remove(t.key); } catch (e) { /* gone */ }
  }
  st.texDrop = keep;
  st.st.textures = st.tex.size;
}
/** Mover sprites (small, many): uploaded at first use, let go when unused for 20 s. */
function _wsgSpriteSweep(st) {
  if (st.frameNo % 300 !== 0 || !st.scene) return;
  for (const [c, t] of st.tex) {
    if (t.kind !== 'sprite' || t.refs > 0 || st.frameNo - t.last < 1200) continue;
    st.tex.delete(c); st.st.texBytes -= t.bytes;
    try { st.scene.textures.remove(t.key); } catch (e) { /* gone */ }
  }
  st.st.textures = st.tex.size;
}

/* ---------- a bake's static bitmaps (a generation) ---------- */
/** A water region's two images as canvases (worldWaterDraw makes them the same way, on first draw). */
function _wsgWaterCanvases(res) {
  if (!res || typeof document === 'undefined') return;
  const mk = (img) => { const c = document.createElement('canvas'); c.width = res.w; c.height = res.h; c.getContext('2d').putImageData(new ImageData(img.data, res.w, res.h), 0, 0); return c; };
  if (!res.baseCanvas && res.base) res.baseCanvas = mk(res.base);
  if (!res.reflCanvas && res.refl) res.reflCanvas = mk(res.refl);
}
/**
 * The stage's own bitmaps of a bake, made once: the decks over the water (the compositor draws them as vectors every frame), the
 * channel walls with the low decks cut out (it clips them every frame), the night key on the paths (a 'screen' fill every frame),
 * the walls' image in the water (made lazily by the first frame there) and each water region's mask (what is not water: its
 * mirrors, glints and rings never show there).
 */
function _wsgGenOf(st, env) {
  let G = st.gen.get(env);
  if (G) return G;
  G = { env, list: null, decks: null, walls: null, pathKey: null };
  st.gen.set(env, G);
  // only the shown generation and the one being prepared are kept
  if (st.gen.size > 3) for (const k of [...st.gen.keys()]) if (k !== env && k !== st.envShown && st.gen.size > 2) st.gen.delete(k);
  const S = env._wfr, out = env.out, W = out.W, H = out.H;
  const cv = (w, h) => { const c = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(Math.max(1, w), Math.max(1, h)) : Object.assign(document.createElement('canvas'), { width: Math.max(1, w), height: Math.max(1, h) }); return c; };
  try {
    if (S && S.wet && S.wet.decks && S.wet.decks.length && typeof _wfrDrawDecks === 'function') {
      const c = cv(W, H); _wfrDrawDecks(c.getContext('2d'), env, S); G.decks = c;
    }
  } catch (e) { st.st.errors.push('decks: ' + (e && e.message)); }
  try {
    if (S && S.groundWalls && S.groundWalls.c) {
      const gw = S.groundWalls, low = S.lowDeckClips || [];
      if (!low.length) G.walls = gw;
      else {
        const c = cv(gw.c.width, gw.c.height), g = c.getContext('2d');
        g.drawImage(gw.c, 0, 0);
        g.setTransform(env.vs, 0, 0, env.vs, env.ox - gw.x, env.oy - gw.y);
        g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
        g.beginPath(); for (const P of low) { g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); g.closePath(); } g.fill('evenodd');   // (5frame _wfrHoleClip is even-odd)
        G.walls = { c, x: gw.x, y: gw.y };
      }
    }
  } catch (e) { st.st.errors.push('walls: ' + (e && e.message)); }
  try {
    const NK = S && S.sky && S.sky.nightKey;
    if (NK && NK.n > 0.01 && S.paths && S.paths.length) {
      const c = cv(W, H), g = c.getContext('2d');
      g.setTransform(env.vs, 0, 0, env.vs, env.ox, env.oy);
      g.fillStyle = NK.col; g.beginPath();
      for (const P of S.paths) { g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); g.closePath(); }
      g.fill('nonzero');
      if (S.wet && S.wet.water.length) { g.globalCompositeOperation = 'destination-out'; g.beginPath(); for (const P of S.wet.water) { g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); g.closePath(); } g.fill('evenodd'); }
      G.pathKey = { c, a: Math.min(0.22, 0.2 * NK.n * NK.k) };
    }
  } catch (e) { st.st.errors.push('pathKey: ' + (e && e.message)); }
  try { if (S && S.water && S.water.length && !S.wallImg && !S.wallImageOff && typeof _wfrWallImages === 'function') _wfrWallImages(_wsgTiny().sky, env, S); } catch (e) { S.wallImageOff = true; }
  for (const w of (S && S.water) || []) _wsgWaterCanvases(w.res);
  if (typeof _wsgWaterGen === 'function') { try { _wsgWaterGen(st, env, G); } catch (e) { st.st.errors.push('waterGen: ' + (e && e.message)); } }
  if (typeof _wsgBaseWaterGen === 'function') { try { _wsgBaseWaterGen(st, env, G); } catch (e) { st.st.errors.push('baseWaterGen: ' + (e && e.message)); } }
  return G;
}
/** Every bitmap a frame of this bake shows (the upload list). */
function _wsgGenList(st, env, G) {
  const out = env.out, S = env._wfr, L = [];
  const add = (c) => { if (c && c.width && c.height) L.push(c); };
  add(out.sky);
  for (const cl of out.clouds || []) add(cl.c);
  for (const g of out.groups || []) { add(g.c); for (const s of g.strips || []) add(s.c); }
  if (S) {
    if (S.groundMarks) add(S.groundMarks.c);
    for (const w of S.water || []) { if (w.res) { add(w.res.baseCanvas); add(w.res.reflCanvas); } }
    if (G.water) for (const w of G.water) if (w) { add(w.over); add(w.out); }
    add(G.wetMask);
    for (const b of G.baseWater || []) { add(b.R.refl); add(b.inv); }
    add(G.decks);
    if (S.wallImg) add(S.wallImg.c);
    if (G.walls) add(G.walls.c);
    if (S.shadow) add(S.shadow.c);
    if (G.pathKey) add(G.pathKey.c);
    if (S.lights && S.lights.ground) add(S.lights.ground.c);
    for (const o of S.chunks || []) add(o.c);
    if (S.lights && S.lights.byChunk) for (const li of S.lights.byChunk.values()) { if (li.glass) add(li.glass.c); if (li.glow) add(li.glow.c); }
  }
  return L;
}
/** Upload a bake's bitmaps within a budget (ms): true once all of them are on the GPU. */
function _wsgGenReady(st, env, budgetMs) {
  if (!st.scene) return false;
  const G = _wsgGenOf(st, env);
  if (!G.list) { G.list = _wsgGenList(st, env, G); G.i = 0; st.genWant = new Set(G.list); }
  const a = _wsgNow();
  while (G.i < G.list.length) {
    const c = G.list[G.i];
    if (!st.tex.has(c)) { _wsgTexUp(st, c, 'static'); if (_wsgNow() - a > budgetMs) { G.i++; return G.i >= G.list.length; } }
    G.i++;
  }
  return true;
}

/* ---------- slots ---------- */
/**
 * Show canvas c in slot key at (x, y), depth d. o: { blend ('add' | 'screen' | null), alpha (1), crop [x, y, w, h] (texture px),
 * now (no fade: the first frames, a new size) }. A new bitmap in a slot cross-fades in; a slot not shown this frame fades out
 * (_wsgSlotsEnd).
 */
function _wsgSlot(st, key, c, x, y, d, o) {
  o = o || {};
  let s = st.slots.get(key);
  if (!s) { s = { key, cur: null, prev: null, f0: 0, fadeIn: false, out: 0, a: 1 }; st.slots.set(key, s); }
  s.seen = st.frameNo;
  const instant = !!o.now || !st.shown, wall = _wsgNow();
  if (c && (!s.cur || s.cur.t.c !== c)) {
    let t = _wsgTexOf(st, c);
    if (!t && (st.upLeft == null || st.upLeft > 0)) t = _wsgTexUp(st, c, 'static');
    if (t) {
      const img = st.scene.add.image(0, 0, t.key).setOrigin(0, 0);
      t.refs++;
      if (s.cur && !instant) { if (s.prev) _wsgSlotFree(st, s.prev); s.prev = s.cur; s.f0 = wall; st.st.fades++; }
      else { if (s.cur) _wsgSlotFree(st, s.cur); if (s.prev) { _wsgSlotFree(st, s.prev); s.prev = null; } s.fadeIn = !s.cur && !instant && s.out === 0 && st.shown && !!o.fadeIn; if (s.fadeIn) s.f0 = wall; }
      s.cur = { t, img };
    }
  }
  s.out = 0;
  if (!s.cur) return null;
  const k = s.prev || s.fadeIn ? Math.max(0, Math.min(1, (wall - s.f0) / (WORLD_STAGE_FADE_S * 1000))) : 1;
  const A = o.alpha == null ? 1 : o.alpha, add = o.blend === 'add' || o.blend === 'screen';
  const mode = o.blend === 'add' ? Phaser.BlendModes.ADD : o.blend === 'screen' ? Phaser.BlendModes.SCREEN : Phaser.BlendModes.NORMAL;
  const put = (e, a, dd) => {
    const img = e.img;
    img.setVisible(!o.hide && a > 0.002); img.setPosition(x, y); img.setAlpha(a); if (img.depth !== dd) img.setDepth(dd); if (img.blendMode !== mode) img.setBlendMode(mode);
    if (o.crop) img.setCrop(o.crop[0], o.crop[1], o.crop[2], o.crop[3]); else if (img.isCropped) img.setCrop();
  };
  put(s.cur, A * k, d);
  if (s.prev) {
    put(s.prev, add ? A * (1 - k) : A, d - 1e-4);
    if (k >= 1) { _wsgSlotFree(st, s.prev); s.prev = null; }
  }
  if (s.fadeIn && k >= 1) s.fadeIn = false;
  s.a = A; s.d = d;
  st.st.statics++;
  return s.cur.img;
}
function _wsgSlotFree(st, e) {
  if (!e) return;
  try { e.img.destroy(); } catch (err) { /* gone */ }
  e.t.refs--;
  if (e.t.refs <= 0) _wsgTexDrop(st, e.t);
}
/** End of a frame: a slot not shown this frame fades out (instantly before the stage shows), then lets its texture go. */
function _wsgSlotsEnd(st) {
  const wall = _wsgNow();
  for (const [key, s] of st.slots) {
    if (s.seen === st.frameNo) continue;
    if (!st.shown || !s.cur) { _wsgSlotFree(st, s.cur); _wsgSlotFree(st, s.prev); st.slots.delete(key); continue; }
    if (!s.out) s.out = wall;
    const k = 1 - (wall - s.out) / (WORLD_STAGE_FADE_S * 1000);
    if (k <= 0) { _wsgSlotFree(st, s.cur); _wsgSlotFree(st, s.prev); st.slots.delete(key); continue; }
    s.cur.img.setAlpha(s.a * k);
    if (s.prev) { _wsgSlotFree(st, s.prev); s.prev = null; }
  }
}
/** A new size: every slot goes at once (nothing of the old bake fits the new frame). */
function _wsgSlotsReset(st) {
  for (const s of st.slots.values()) { _wsgSlotFree(st, s.cur); _wsgSlotFree(st, s.prev); }
  st.slots.clear();
}

/* ---------- a frame ---------- */
/** The frame at t of a bake env: the static layers in their slots, the world in depth order, the weather; warming: hidden frames. */
function _wsgDraw(st, env, t, warming) {
  const out = env.out, S = env._wfr, a0 = _wsgNow();
  st.upLeft = st.shown ? 4 : 1e9;   // uploads a shown frame may still do (ms): new sprites, a relit chunk
  st.pool.used = 0; st.pool.pairUsed = 0;
  st.st.statics = 0;
  const L = env.Lnow || env.L || out.L;
  // the plan of the world at t (the people, the live statics, the depth order): I1 (worldFramePlanAt) or the stage's copy
  const P = typeof _wsgPlan === 'function' ? _wsgPlan(st, env, t, warming) : null;
  // the figure atlas (people and animals drawn once each: their bodies, mirrors and shadows all come from it)
  if (P && typeof _wsgFigures === 'function') { try { _wsgFigures(st, env, S, P); } catch (e) { P.figs = null; st.st.errors.push('figures: ' + (e && e.message)); } }
  // 1. the sky, the stars, the clouds, the ground groups (the baker's bitmaps)
  // (no clear of the drawing buffer: the sky and the ground groups cover every pixel; each is drawn only down to where nearer opaque
  // ground hides it, as frameBody blits them: skyBelow, hideBelow)
  const vs = out.vs, ox = out.ox, oy = out.oy, hb = out.skyBelow == null ? out.H : out.skyBelow;
  _wsgSlot(st, 'sky', out.sky, 0, 0, WSG_D_SKY, { crop: [0, 0, out.W, Math.max(1, Math.min(out.H, Math.ceil(hb)))] });
  _wsgStars(st, out, L, t);
  (out.clouds || []).forEach((cl, i) => {
    const tx = _wsgTexOf(st, cl.c), w = tx ? tx.w : (cl.c && cl.c.width) || 0;
    const x = Math.round(sceneCloudX(cl, t) * vs + ox), y = Math.round((cl.y - cl.h) * vs + oy);
    _wsgSlot(st, 'cl' + i, cl.c, x, y, WSG_D_CLOUD + i * 1e-3, { hide: y > hb || x > out.W || x + w < 0 });
  });
  (out.groups || []).forEach((g, gi) => {
    const below = out.hideBelow && Number.isFinite(out.hideBelow[gi]) ? out.hideBelow[gi] : out.H;
    if (g.c && below > g.y) _wsgSlot(st, 'g' + gi, g.c, g.x, g.y, WSG_D_GROUP + gi, { crop: [0, 0, g.w || g.c.width, Math.max(1, Math.min(g.h || g.c.height, Math.ceil(below - g.y)))] });
    (g.strips || []).forEach((s, si) => { if (s.y < (out.hideBelow ? out.hideBelow[gi] : out.H)) _wsgStrip(st, s, t, L, WSG_D_GROUP + gi + 0.1 + si * 1e-3); });
  });
  if (typeof _wsgBaseWater === 'function') _wsgBaseWater(st, env, t);
  if (typeof _wsgUnderFx === 'function') _wsgUnderFx(st, env, t);
  // 2. the world: its under-layers, then the depth order
  if (S && S.ready && S.plan && P) {
    _wsgWorldUnder(st, env, S, P, t);
    if (typeof _wsgDepth === 'function') _wsgDepth(st, env, S, P, t);
  }
  // 3. the season's particles, rain, snow, the fog veil, the weather's own frame (v2 framePost passes)
  _wsgPost(st, env, out, L, t);
  _wsgSlotsEnd(st);
  if (typeof _wsgPoolEnd === 'function') _wsgPoolEnd(st);
  _wsgTexSweep(st); _wsgSpriteSweep(st);
  st.st.drawMs = _wsgNow() - a0;
  return P;
}
/** The stars: three twinkle groups (78-scene-canvas.js frameBody), above the land only. */
function _wsgStars(st, out, L, t) {
  const g = st.gfx.stars;
  g.clear();
  if (!out.stars || !out.stars.length || !L) return;
  const hb = out.skyBelow == null ? out.H : out.skyBelow, base = 0.35 + 0.65 * (L.stars || 0);
  for (let gq = 0; gq < 3; gq++) {
    g.fillStyle(0xfffaf0, Math.max(0, Math.min(1, base * (0.65 + 0.35 * Math.sin(t * (1.1 + gq * 0.6) + gq * 2)))));
    for (const s of out.stars) if (s[3] === gq && s[1] < hb) g.fillRect(s[0], s[1], s[2], s[2]);
  }
}
/** A ground group's wind strip: its bitmap sheared by the wind about its base row (a matrix with a shear: a container pair). */
function _wsgStrip(st, s, t, L, d) {
  const tx = _wsgTexOf(st, s.c) || _wsgTexUp(st, s.c, 'static');
  if (!tx || typeof _wsgBlit !== 'function') return;
  const k = (s.amp || 1) * (typeof sceneWindSafe === 'function' ? sceneWindSafe(t, s.xMid, L) : 0) * 0.02;
  const sx = s.dw ? s.dw / tx.w : 1, sy = s.dh ? s.dh / tx.h : 1;
  // device = [1, 0, k, 1, -k * base, 0] * (texture px -> its place)
  _wsgBlit(st, tx, [sx, 0, k * sy, sy, s.x + k * s.y - k * s.base, s.y], 1, d);
}
/**
 * The world under the depth order (5frame _wfrDraw steps 0 to 2b): the ground marks, the water (79-world-7stage-3fx.js: rippled,
 * masked, with the mirrors, glints and rings), the falls, the decks, the walls' image, the channel walls, the shadows, the night
 * path key ('screen'), the lamp pools ('add').
 */
function _wsgWorldUnder(st, env, S, P, t) {
  const G = _wsgGenOf(st, env), D = (k) => WSG_D_WORLD + _WSG_WORLD_DEPTH[k];
  if (S.groundMarks && S.groundMarks.c) _wsgSlot(st, 'marks', S.groundMarks.c, S.groundMarks.x, S.groundMarks.y, D('marks'));
  if (typeof _wsgWater === 'function') _wsgWater(st, env, S, P, G, D('water'));
  if (G.decks) _wsgSlot(st, 'decks', G.decks, 0, 0, D('decks'));
  if (S.wallImg && S.wallImg.c) _wsgSlot(st, 'wallimg', S.wallImg.c, 0, 0, D('wallimg'));
  if (G.walls) _wsgSlot(st, 'walls', G.walls.c, G.walls.x, G.walls.y, D('walls'));
  if (S.shadow && S.shadow.c) _wsgSlot(st, 'shadow', S.shadow.c, S.shadow.x, S.shadow.y, D('shadow'), { fadeIn: true });
  if (typeof _wsgAgentShadows === 'function') _wsgAgentShadows(st, env, S, P, D('agentShadows'));
  if (G.pathKey) _wsgSlot(st, 'pathkey', G.pathKey.c, 0, 0, D('pathkey'), { blend: 'screen', alpha: G.pathKey.a, fadeIn: true });
  if (S.lights && S.lights.ground && S.lights.ground.c) _wsgSlot(st, 'pools', S.lights.ground.c, S.lights.ground.x, S.lights.ground.y, D('pools'), { blend: 'add', fadeIn: true });
  if (typeof _wsgBeams === 'function') _wsgBeams(st, env, S, P, D('beams'));
}
/** On top: the season's particles, rain, snow, the fog veil (78-scene-canvas.js frameBody), the weather pass's own frame. */
function _wsgPost(st, env, out, L, t) {
  const g = st.gfx.post, vs = out.vs, ox = out.ox, oy = out.oy;
  g.clear();
  const hex = (c) => { const n = typeof _scHex === 'function' ? _scHex(c) : [255, 255, 255]; return (n[0] << 16) | (n[1] << 8) | n[2]; };
  const parts = (set, col, kind) => {
    const byCol = new Map();
    for (const p of set) { let a = byCol.get(p.col); if (!a) byCol.set(p.col, a = []); a.push(p); }
    for (const [c, list] of byCol) {
      g.fillStyle(hex(col(c)), kind === 'motes' ? 0.7 : 0.85);
      for (const p of list) {
        const q = sceneParticleAt(p, t), X = q.x * vs + ox, Y = q.y * vs + oy;
        if (kind === 'snow' || kind === 'motes') g.fillRect(X, Y, p.size * vs, p.size * vs);
        else {
          // a leaf or a petal: the ellipse turned by its spin (an 8-point outline)
          const a = t * p.f + p.ph, ca = Math.cos(a), sa = Math.sin(a), rx = p.size * vs, ry = p.size * 0.55 * vs, pts = [];
          for (let k = 0; k < 8; k++) { const u = k * Math.PI / 4, ex = Math.cos(u) * rx, ey = Math.sin(u) * ry; pts.push({ x: X + ex * ca - ey * sa, y: Y + ex * sa + ey * ca }); }
          g.fillPoints(pts, true);
        }
      }
    }
  };
  try {
    if (out.particles && out.C && out.C.particles) parts(out.particles, out.pcol || ((c) => c), out.C.particles.kind);
    if (out.snow) parts(out.snow, (c) => c, 'snow');
    if (out.rain) {
      g.lineStyle(1.2 * vs, 0xc8d4e0, 0.5);
      for (const p of out.rain) { const q = sceneParticleAt(p, t); g.lineBetween(q.x * vs + ox, q.y * vs + oy, (q.x - 2) * vs + ox, (q.y + p.size) * vs + oy); }
    }
  } catch (e) { st.st.errors.push('particles: ' + (e && e.message)); }
  const v = st.gfx.veil;
  v.clear();
  if (out.fogVeil) {
    const m = /rgba\((\d+),(\d+),(\d+),([\d.]+)\)/.exec(out.fogVeil);
    if (m) { v.fillStyle((+m[1] << 16) | (+m[2] << 8) | +m[3], +m[4]); v.fillRect(0, 0, out.W, out.H); }
  }
  if (typeof _wsgPostFx === 'function') _wsgPostFx(st, env, t);
}
