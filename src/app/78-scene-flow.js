/* ============================================================
   SCENE ENGINE v2: the FLOW pass, crowds and traffic on the canvas (docs/dev/SCENE_ENGINE_V2.md 9.4 and 13; builder D).
   Browser only (Canvas 2D); nothing runs at load but the pass definition.

   The pure half is 70-scene-1flow.js (the compiled flows C.flows and sceneFlowAgents, a pure function of t). This file draws the
   agents: it plugs into B's render-pass registry (78-scene-0pass.js) as the pass 'flow', so the canvas renderer is never edited:
     prebake    the sprite pool: a far sprite (one drawImage, scaled) for every (object, variant) of every flow's palette, and the
                near sprites (half-octave scale buckets, walk-cycle parts) of the agents of the first seconds; at most 120 sprites
     frameGroup computes the agents for the frame ONCE (env.flowNow; B's shadow and water passes read it for the agents'
                shadows, reflections and wakes); without B's shadow pass it draws a soft contact blob under each agent itself
     movers     pushes each agent into the group whose bands hold its depth, y-sorted with that group's other movers (an agent
                walking toward the camera crosses from mid to near in the right order)
     relight    the light refresh (every 120 s): the density multipliers for the new hour and weather; never a re-bake
     stats      { agents, draws, sprites, built, fallbacks }
   An agent costs: 1 draw far away (its whole sprite), 1 + its walk parts near (a walker 3); 1 for its shadow; at night 1 for a
   vehicle's head and tail lights (C's sceneHeadlightSprite when loaded, else a glow of its own). New sprites are built at most 2
   a frame (the rest draw from the nearest bucket already in the pool), so a frame never stalls on rasterising.

     sceneFlowLayer(C, L, { vs, ox, oy, lod, still, data, sprite, governor }) -> a standalone layer for a harness or a fallback:
       { prebake(), relight(L), agents(t), frame(ctx, t) -> draws (shadows then agents, far to near), drawAgent(ctx, a, t),
         shadow(ctx, a), stats() }
   Private names: _scfl* (the flow prefix; this file uses _scflf*).
   ============================================================ */
const _SCFLF_BUILD_PER_FRAME = 2, _SCFLF_FAR_PX = 26;
let _scflfBlobC = null;
/** The scale bucket of a flow sprite: half-octave steps, rounded UP (a sprite is only ever drawn smaller than it was rasterised). */
function _scflfBucket(s) { return 2 ** (Math.ceil(Math.log2(Math.max(1e-3, s)) * 2) / 2); }
function _scflfCanvas(w, h) {
  w = Math.max(1, Math.ceil(w)); h = Math.max(1, Math.ceil(h));
  if (typeof OffscreenCanvas === 'function') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}
const _scflfPaths = new Map();
function _scflfPath(d) { let p = _scflfPaths.get(d); if (!p) { if (_scflfPaths.size > 20000) _scflfPaths.clear(); p = new Path2D(d); _scflfPaths.set(d, p); } return p; }
function _scflfHex(c) { let s = String(c || '').replace('#', ''); if (s.length === 3) s = s.replace(/./g, '$&$&'); const n = parseInt(s, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
/** The tight box of some parts of a resolved object (memoised on the resolved form). */
const _scflfBoxes = new WeakMap();
function _scflfPartsBox(sh, names, detail) {
  let memo = _scflfBoxes.get(sh);
  if (!memo) { memo = new Map(); _scflfBoxes.set(sh, memo); }
  const key = names.join(',') + (detail ? '' : '|nd');
  if (memo.has(key)) return memo.get(key);
  let b = null;
  for (const p of names) for (const s of sh.parts[p] || []) {
    if (!detail && s.detail) continue;
    const q = typeof scenePathBox === 'function' ? scenePathBox(s.d, s.m) : null;
    if (!q) continue;
    const w = s.s ? (s.w || 1) / 2 + 1 : 1;
    b = b ? [Math.min(b[0], q[0] - w), Math.min(b[1], q[1] - w), Math.max(b[2], q[2] + w), Math.max(b[3], q[3] + w)] : [q[0] - w, q[1] - w, q[2] + w, q[3] + w];
  }
  if (b) b = [Math.max(b[0], sh.box[0] - 4), Math.max(b[1], sh.box[1] - 4), Math.min(b[2], sh.box[2] + 4), Math.min(b[3], sh.box[3] + 4)];
  memo.set(key, b);
  return b;
}
/**
 * Rasterise the parts of an object at device scale k (the renderer's own sprite rules: the live grade and the haze in the pixels,
 * detail shapes only when big enough, glow shapes in their night colours when lit, the 'lit' part on top when withLit).
 * which: '*' (every part but 'lit'), 'rest:a,b' (every part but those), or a part name. Returns { c, x0, y0, w, h, sc, bytes }.
 */
function _scflfRaster(o, v, season, which, k, L, haze, litGlow, lodOk) {
  const sh = typeof sceneObjShapes === 'function' ? sceneObjShapes(o, v, season) : null;
  if (!sh) return null;
  const names = (which === '*' ? sh.order.filter(p => p !== 'lit') : which.startsWith('rest:') ? sh.order.filter(p => p !== 'lit' && !which.slice(5).split(',').includes(p)) : [which])
    .concat(litGlow && which !== 'lit' && !which.startsWith('part:') && sh.parts.lit && (which === '*' || which.startsWith('rest:')) ? ['lit'] : []);
  const detail = lodOk !== false && (typeof sceneDetailAt !== 'function' || sceneDetailAt(o, sh, k));
  const tb = _scflfPartsBox(sh, names, detail);
  if (!tb) return { c: null, x0: 0, y0: 0, w: 0, h: 0, sc: k, bytes: 0 };
  const [x0, y0, x1, y1] = tb, pad = 2;
  let kk = k;
  if ((x1 - x0) * kk > 2048 || (y1 - y0) * kk > 2048) kk = Math.min(2048 / (x1 - x0), 2048 / (y1 - y0));
  const w = Math.ceil((x1 - x0) * kk + 2 * pad), h = Math.ceil((y1 - y0) * kk + 2 * pad);
  const c = _scflfCanvas(w, h), cx = c.getContext('2d', { willReadFrequently: true });
  cx.setTransform(kk, 0, 0, kk, pad - x0 * kk, pad - y0 * kk);
  const memo = new Map(), col = (p) => { if (typeof p !== 'string') return p; let r = memo.get(p); if (!r) { r = typeof sceneColour === 'function' && L ? sceneColour(p, { L, haze }) : p; memo.set(p, r); } return r; };
  const def = typeof sceneObj === 'function' ? sceneObj(o) : null, nc = (def && def.night && def.night.glow) || {};
  const paint = (p, plain) => {
    if (typeof p === 'string') return plain ? p : col(p);
    const stops = p.lin || p.rad, g = p.lin ? cx.createLinearGradient(p.x1 || 0, p.y1 || 0, p.x2 || 0, p.y2 != null ? p.y2 : 1) : cx.createRadialGradient(p.cx || 0, p.cy || 0, 0, p.cx || 0, p.cy || 0, p.r || 1);
    for (const [off, c0, op] of stops) { const cc = plain ? c0 : col(c0), rgb = _scflfHex(cc); g.addColorStop(Math.max(0, Math.min(1, off)), op == null || op === 1 ? cc : `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${op})`); }
    return g;
  };
  let any = false;
  for (const p of names) for (const s of sh.parts[p] || []) {
    if (!detail && s.detail) continue;
    const plain = p === 'lit';
    if (s.m) { cx.save(); cx.transform(s.m[0], s.m[1], s.m[2], s.m[3], s.m[4], s.m[5]); }
    cx.globalAlpha = s.op == null ? 1 : s.op;
    const path = _scflfPath(s.d);
    if (litGlow && s.glow) { cx.globalAlpha = 1; cx.fillStyle = nc[s.glow] || (s.glow === 'lamp' ? '#ffe2a0' : '#ffd98a'); cx.fill(path); }
    else {
      if (s.f) { cx.fillStyle = paint(s.f, plain); cx.fill(path); }
      if (s.s) { cx.strokeStyle = paint(s.s, plain); cx.lineWidth = s.w || 1; cx.lineCap = s.cap || 'butt'; cx.stroke(path); }
    }
    if (s.m) cx.restore();
    any = true;
  }
  if (!any) { c.width = 0; return { c: null, x0, y0, w: 0, h: 0, sc: kk, bytes: 0 }; }
  return { c, x0: x0 - pad / kk, y0: y0 - pad / kk, w: w / kk, h: h / kk, sc: kk, bytes: w * h * 4 };
}
/** A soft dark ellipse (the contact shadow of an agent when B's shadow pass is not loaded), made once. */
function _scflfBlob() {
  if (_scflfBlobC) return _scflfBlobC;
  const c = _scflfCanvas(64, 16), cx = c.getContext('2d'), g = cx.createRadialGradient(32, 8, 0, 32, 8, 32);
  g.addColorStop(0, 'rgba(16,24,34,0.55)'); g.addColorStop(0.55, 'rgba(16,24,34,0.32)'); g.addColorStop(1, 'rgba(16,24,34,0)');
  cx.setTransform(1, 0, 0, 0.25, 0, 0); cx.fillStyle = g; cx.fillRect(0, 0, 64, 64);
  _scflfBlobC = c;
  return c;
}
const _scflfGlows = new Map();
/** A soft round glow in a colour (head and tail lights when C's sceneHeadlightSprite is not loaded). */
function _scflfGlow(col) {
  let c = _scflfGlows.get(col);
  if (c) return c;
  c = _scflfCanvas(32, 32);
  const cx = c.getContext('2d'), g = cx.createRadialGradient(16, 16, 0, 16, 16, 16), v = _scflfHex(col);
  g.addColorStop(0, `rgba(${v[0]},${v[1]},${v[2]},0.95)`); g.addColorStop(0.3, `rgba(${v[0]},${v[1]},${v[2]},0.45)`); g.addColorStop(1, `rgba(${v[0]},${v[1]},${v[2]},0)`);
  cx.fillStyle = g; cx.fillRect(0, 0, 32, 32);
  _scflfGlows.set(col, c);
  return c;
}
const _SCFLF_LIT_CLS = new Set(['car', 'bus', 'tram', 'train', 'tractor', 'boat']);

/**
 * A flow layer for one compiled scene under one light: the sprite pool, the agents of a frame, and drawing them. The pass below
 * wraps it; a harness (or a renderer without the pass registry) can use it directly. o: { vs, ox, oy (scene units to device px),
 * lod, still (build every sprite now: stills and captures are exact), data ({ at, view } for the authored hour), sprite (B's
 * env.sprite(req), else the layer rasterises itself), governor (a max scale, 0.7 when the quality governor steps down) }.
 */
function sceneFlowLayer(C, L, o) {
  o = o || {};
  const vs = o.vs || 1, ox = o.ox || 0, oy = o.oy || 0, season = C.season || 'summer';
  const data = o.data || { at: C.at || (C.view && C.view.at) || null, view: C.view || {} };
  const pool = new Map(), byBase = new Map(), st = { agents: 0, draws: 0, built: 0, fallbacks: 0, frames: 0 };
  let mults = typeof sceneFlowMults === 'function' ? sceneFlowMults(C, L, data) : [], budget = Infinity, lastT = NaN, now = [];
  const hazeOf = (a) => {
    if (typeof sceneHazeAt !== 'function' || !L) return 0;
    try { return Math.round(sceneHazeAt(a.d, C.atmos, L) * 10) / 10; } catch (e) { return 0; }
  };
  const lit = !!(L && L.windows);
  const keyOf = (oid, v, which, haze, b) => oid + '|' + v + '|' + which + '|' + haze + '|' + (lit ? 1 : 0) + '|' + b;
  /** A pooled sprite at a scale bucket; null when it may not be built now (the caller falls back to another bucket). */
  const get = (oid, v, which, haze, b, force) => {
    const key = keyOf(oid, v, which, haze, b);
    let sp = pool.get(key);
    if (sp !== undefined) return sp;
    if (!force && budget <= 0) return undefined;
    budget--;
    const k = b * vs;
    if (o.sprite) { try { sp = o.sprite({ o: oid, v, part: which, season, haze, tint: null, scale: k, flip: false, cls: null, litGlow: lit, withLit: lit }); } catch (e) { sp = null; } }
    if (!sp) {
      const ck = typeof sceneSpriteKey === 'function' ? sceneSpriteKey(oid, v, which + (lit ? '+g+l' : '') + '|flow', season, haze, null, k, typeof sceneLightKey === 'function' ? sceneLightKey(L, season) : '') : null;
      const mk = () => _scflfRaster(oid, v, season, which, k, L, haze, lit, (o.lod == null ? 1 : o.lod) >= 0.5);
      sp = ck && typeof sceneSprites !== 'undefined' && sceneSprites.get ? sceneSprites.get(ck, mk) : mk();
    }
    sp = sp || null;
    pool.set(key, sp); st.built++;
    const bk = oid + '|' + v + '|' + which + '|' + haze;
    if (!byBase.has(bk)) byBase.set(bk, []);
    byBase.get(bk).push([b, sp]);
    // the pool's cap: the flows' share of the sprite budget (the sprites stay in the shared LRU; the pool only drops its reference)
    if (pool.size > (typeof SCENE_FLOW_MAX_SPRITES === 'number' ? SCENE_FLOW_MAX_SPRITES : 120)) {
      for (const [k2] of pool) { if (k2 === key) continue; pool.delete(k2); const parts = k2.split('|'), bk2 = parts.slice(0, 4).join('|'), list = byBase.get(bk2); if (list) { const i = list.findIndex(x => keyOf(parts[0], parts[1], parts[2], parts[3], x[0]) === k2); if (i >= 0) list.splice(i, 1); } break; }
    }
    return sp;
  };
  /** The sprite to draw: the exact bucket, else the nearest bucket in the pool (scaled), else built now (first sight). */
  const spriteFor = (oid, v, which, haze, b) => {
    let sp = get(oid, v, which, haze, b, !!o.still);
    if (sp !== undefined) return sp;
    const list = byBase.get(oid + '|' + v + '|' + which + '|' + haze);
    if (list && list.length) { st.fallbacks++; let best = list[0]; for (const x of list) if (Math.abs(Math.log2(x[0] / b)) < Math.abs(Math.log2(best[0] / b))) best = x; return best[1]; }
    return get(oid, v, which, haze, b, true);
  };
  const draw = (ctx, sp, M, alpha) => {
    if (!sp || !sp.c) return 0;
    ctx.globalAlpha = alpha;
    ctx.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]);
    ctx.drawImage(sp.c, sp.x0, sp.y0, sp.w, sp.h);
    return 1;
  };
  const mul = typeof _scMul === 'function' ? _scMul : (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
  /** How an agent is drawn: whole (far, or no walk hook) or as walk parts; the hooks of its resolved form. */
  const planOf = (a) => {
    const sh = typeof sceneObjShapes === 'function' ? sceneObjShapes(a.o, a.v, season) : null;
    if (!sh) return null;
    const px = (sh.box[3] - sh.box[1]) * a.s * vs, walk = (sh.anim || []).find(h => h.kind === 'walk'), whole = (sh.anim || []).find(h => (h.part || '*') === '*' && !h.parts && h.kind !== 'walk');
    const near = px >= _SCFLF_FAR_PX && !!walk && a.moving;
    return { sh, px, walk: near ? walk : null, whole: whole || null };
  };
  const api = {
    /** The density multipliers for a new light (the hour, the weather): the crowd changes, no sprite is re-made. */
    relight(L2) { if (L2) L = L2; mults = typeof sceneFlowMults === 'function' ? sceneFlowMults(C, L, data) : mults; lastT = NaN; },
    /** Every visible agent at t (computed once per t; the pass shares it as env.flowNow). */
    agents(t) {
      if (t === lastT) return now;
      lastT = t;
      const gov = typeof o.governor === 'function' ? o.governor() : o.governor;
      now = typeof sceneFlowAgents === 'function' ? sceneFlowAgents(C, t, L, { mults, data, maxScale: gov > 0 ? gov : 1 }) : [];
      st.agents = now.length;
      return now;
    },
    /** Build the pool: the far sprite of every palette pair (and the bus, the umbrella walker), then the agents at t = 0. */
    prebake() {
      const save = budget; budget = Infinity;
      for (const f of C.flows || []) {
        const objs = (f.pairs || []).map(p => [p[0], p[1]]);
        if (f.bus) objs.push([f.bus.obj, 0]);
        if (f.rainObj) objs.push([f.rainObj, 0]);
        // the far sprite: at the bucket of the lane's farthest visible agent
        const dFar = Math.max(...f.lanes.map(ln => Math.max(...ln.path.map(p => p[1])))), cam = C.cam || null;
        for (const [oid, v] of objs) {
          const def = typeof sceneObj === 'function' ? sceneObj(oid) : null, real = typeof _scflReal === 'function' ? _scflReal(oid) : { h: 1.7 };
          if (!def) continue;
          const s = cam ? cam.f / dFar * real.h / def.size[1] : 0.1;
          get(oid, v, '*', 0, _scflfBucket(s), true);
        }
      }
      for (const a of api.agents(0)) api.drawAgent(null, a, 0);   // the still is exact; later agents build lazily, 2 a frame
      lastT = NaN; budget = save;
    },
    /** Draw one agent (null ctx: only make its sprites). Returns the draws. */
    drawAgent(ctx, a, t) {
      const pl = planOf(a);
      if (!pl) return 0;
      const haze = hazeOf(a), b = _scflfBucket(a.s), M = [vs * a.s * (a.flip ? -1 : 1), 0, 0, vs * a.s, vs * a.X + ox, vs * a.Y + oy];
      let n = 0;
      if (pl.walk) {
        const parts = pl.walk.parts || [pl.walk.part], rest = spriteFor(a.o, a.v, 'rest:' + parts.join(','), haze, b);
        const per = (pl.walk.period || 0.9) * Math.max(0.7, Math.min(1.4, 1.3 / Math.max(0.3, a.speed || 1.3)));
        const pose = typeof sceneAnimPose === 'function' ? sceneAnimPose(Object.assign({}, pl.walk, { period: per, phase: a.phase || 0 }), t, L, a.X) : { m: [1, 0, 0, 1, 0, 0], bob: 0 };
        if (!ctx) { for (const p of parts) spriteFor(a.o, a.v, p, haze, b); return 0; }
        // the far leg first, the body (bobbing), then the near leg: the people builder's order (legB, body, legA)
        const order = pl.sh.order.filter(p => parts.includes(p) || p === pl.sh.order.find(q => !parts.includes(q) && q !== 'lit'));
        for (const p of order) {
          if (!parts.includes(p)) { const MM = M.slice(); MM[5] += (pose.bob || 0) * vs * a.s; n += draw(ctx, rest, MM, a.alpha); continue; }
          const j = parts.indexOf(p), A = j === 1 && pose.m2 ? pose.m2 : pose.m;
          n += draw(ctx, spriteFor(a.o, a.v, p, haze, b), mul(M, A), a.alpha);
        }
        return n;
      }
      const sp = spriteFor(a.o, a.v, '*', haze, b);
      if (!ctx) return 0;
      let MM = M;
      if (pl.whole && a.kind === 'boat' && typeof sceneAnimPose === 'function') MM = mul(M, sceneAnimPose(Object.assign({}, pl.whole, { phase: a.phase || 0 }), t, L, a.X).m);
      n += draw(ctx, sp, MM, a.alpha);
      // head and tail lights at night (C's sprite when loaded): one draw, ahead of a vehicle seen side on, at its lamps head on
      if (lit && _SCFLF_LIT_CLS.has(a.cls) && a.kind !== 'boat') n += api.lights(ctx, a, b);
      return n;
    },
    /** A vehicle's head (or tail) light glow: one draw. */
    lights(ctx, a, b) {
      const def = typeof sceneObj === 'function' ? sceneObj(a.o) : null;
      if (!def) return 0;
      let spr = null;
      if (typeof sceneHeadlightSprite === 'function') { try { spr = sceneHeadlightSprite(b * vs, a.view); } catch (e) { spr = null; } }
      const hgt = def.size[1] * a.s, wid = def.size[0] * a.s;
      if (spr && spr.c) { ctx.globalAlpha = a.alpha; ctx.setTransform(vs * (a.flip ? -1 : 1), 0, 0, vs, vs * a.X + ox, vs * a.Y + oy); ctx.drawImage(spr.c, spr.x0 != null ? spr.x0 : -spr.c.width / 2, spr.y0 != null ? spr.y0 : -spr.c.height, spr.w || spr.c.width, spr.h || spr.c.height); return 1; }
      const tail = a.view === 'rear', g = _scflfGlow(tail ? '#ff4a30' : '#fff0c0'), r = Math.max(2, hgt * (a.view === 'side' ? 0.55 : 0.75));
      const gx = a.view === 'side' ? (a.flip ? -1 : 1) * wid * 0.5 : 0, gy = -hgt * 0.35;
      ctx.globalAlpha = a.alpha * (tail ? 0.7 : 0.85); ctx.setTransform(vs, 0, 0, vs, vs * (a.X + gx) + ox, vs * (a.Y + gy) + oy);
      ctx.drawImage(g, -r * (a.view === 'side' ? 1.4 : 1.2), -r * 0.6, r * (a.view === 'side' ? 2.8 : 2.4), r * 1.2);
      return 1;
    },
    /** The contact shadow of an agent (one draw): a soft ellipse under its foot, the length of the vehicle or the width of a person. */
    shadow(ctx, a) {
      const def = typeof sceneObj === 'function' ? sceneObj(a.o) : null;
      if (!def || a.kind === 'boat') return 0;
      const real = typeof _scflReal === 'function' ? _scflReal(a.o) : { l: 1, w: 0.5 }, k3 = a.k3 || 1;
      const side = a.view === 'side', len = side ? Math.max(0.6, real.l || 0.6) : Math.max(0.6, real.w || 0.6), w = len * k3 * 1.1, h = Math.max(1.5, w * 0.18);
      const op = (L && L.dark > 0.7 ? 0.6 : 1) * a.alpha;
      ctx.globalAlpha = op; ctx.setTransform(vs, 0, 0, vs, ox, oy);
      ctx.drawImage(_scflfBlob(), a.X - w / 2, a.Y - h / 2, w, h);
      return 1;
    },
    /** Shadows, then every agent far to near (the standalone order: no other movers to interleave). Returns the draws. */
    frame(ctx, t, shadows) {
      budget = o.still ? Infinity : _SCFLF_BUILD_PER_FRAME;
      const list = api.agents(t);
      let n = 0;
      if (shadows !== false) for (const a of list) n += api.shadow(ctx, a);
      for (const a of list) n += api.drawAgent(ctx, a, t);
      ctx.globalAlpha = 1;
      st.draws = n; st.frames++;
      return n;
    },
    /** Start a frame for the pass (the build budget per frame). */
    beginFrame() { budget = o.still ? Infinity : _SCFLF_BUILD_PER_FRAME; st.draws = 0; st.frames++; },
    count(n) { st.draws += n; },
    stats() { return Object.assign({ sprites: pool.size }, st); },
  };
  return api;
}

/* ---------- the pass (B's registry, 78-scene-0pass.js) ---------- */
const _scflfEnv = new WeakMap();
function _scflfLayerOf(env) {
  let s = _scflfEnv.get(env);
  if (s) return s;
  // the group of each layer: B's env.layerOfGroup (from the bake plan; the groups themselves are made later in the bake)
  const C = env.C, groupOf = new Map(), lg = env.layerOfGroup || [];
  lg.forEach((gi, l) => { if (gi != null) groupOf.set(l, gi); });
  if (!groupOf.size) (env.groups || []).forEach((g, gi) => (g.layers || []).forEach(l => groupOf.set(l, gi)));
  const layer = sceneFlowLayer(C, env.L, { vs: env.vs, ox: env.ox, oy: env.oy, lod: env.lod, still: !!env.still, sprite: typeof env.sprite === 'function' ? env.sprite : null,
    governor: () => (env.governor && env.governor.flowMax) || 1 });
  s = { layer, groupOf, shadowPass: false, t: NaN, last: Math.max(0, (env.groups || []).length - 1, ...[...groupOf.values()]) };
  try { s.shadowPass = typeof sceneRenderPasses === 'function' && sceneRenderPasses('frameGroup', C).some(p => p.id === 'shadow'); } catch (e) { s.shadowPass = false; }
  _scflfEnv.set(env, s);
  return s;
}
if (typeof sceneRenderPassDefine === 'function') {
  sceneRenderPassDefine({
    id: 'flow',
    order: { prebake: 30, frameGroup: 10, movers: 50, relight: 50, stats: 50, default: 50 },
    applies(C) { return !!(C && Array.isArray(C.flows) && C.flows.length); },
    prebake(env) { _scflfLayerOf(env).layer.prebake(); },
    frameGroup(env, grp, ctx, t) {
      const s = _scflfLayerOf(env);
      if (s.t !== t) { s.t = t; s.layer.beginFrame(); env.flowNow = s.layer.agents(t); }
      if (s.shadowPass) return 0;
      // no shadow pass: a soft contact blob under each agent of this group, before its movers (every agent stands on its shadow)
      const gi = (env.groups || []).indexOf(grp);
      let n = 0;
      for (const a of env.flowNow || []) if ((s.groupOf.has(a.layer) ? s.groupOf.get(a.layer) : s.last) === gi) n += s.layer.shadow(ctx, a);
      s.layer.count(n);
      return n;
    },
    movers(env, grp, t, push) {
      const s = _scflfLayerOf(env), gi = (env.groups || []).indexOf(grp);
      if (s.t !== t) { s.t = t; s.layer.beginFrame(); env.flowNow = s.layer.agents(t); }
      for (const a of env.flowNow || []) {
        if ((s.groupOf.has(a.layer) ? s.groupOf.get(a.layer) : s.last) !== gi) continue;
        push({ kind: 'custom', y: a.Y, agent: a, draw(ctx) { const n = s.layer.drawAgent(ctx, a, t); s.layer.count(n); return n; } });
      }
      return 0;
    },
    relight(env, L) { _scflfLayerOf(env).layer.relight(L); },
    stats(env) { return _scflfLayerOf(env).layer.stats(); },
  });
}
