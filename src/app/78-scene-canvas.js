/* ============================================================
   SCENE ENGINE: the Canvas 2D renderer (docs/dev/SCENE_ENGINE.md 6.3; builder B). Browser only.

   Static is free, motion is budgeted. Every library object is rasterised ONCE per (object, variant,
   part, season, haze, tint, scale bucket, light) into a cached sprite, with the live grade already in
   its pixels (an object with detailPx drops its detail shapes below that on-screen height: sceneDetailAt,
   a function of the key's scale, so the cache stays valid). Static placements (thousands of them) are drawn once into at most 5 layer bitmaps
   (plus the sky), each cropped to what it holds. A frame then draws: the sky bitmap, stars, clouds,
   and per bitmap: the bitmap, its wind strips (one skewed blit each), its water shimmer, its animated
   parts, actors and flocks (one setTransform + drawImage each, y-sorted), then particles and weather.
   A light change (the quantised light key: real dusk, cloud, moon, season) re-bakes in idle slices of
   8 ms or less into new bitmaps; the old ones keep drawing until the swap (no flash, no long frame).

     const r = sceneRendererCreate(canvas, dataOrItem, { lod, still, season, dpr, L, compiled, time, flush, profile, onBaked });
     r.resize(cssW, cssH)  r.bakeIdle(cssW, cssH)  r.setLight(L)  r.setSeason(s)  r.setLod(k)  r.start()  r.stop()
     r.frame(tSec)  r.attach(canvas)  r.stats()  r.resetStats()  r.destroy()
     sceneCanvasSupported()   sceneSprites (the shared LRU sprite cache, 96 MB)

   Bake canvases (sprites, bitmaps) are CPU-backed (willReadFrequently): 2D canvases record their drawing and
   rasterise it on first use, so the bake forces that work inside its own slices with a 1-pixel read (cheap on the
   CPU, a stall on a GPU canvas); otherwise the first frame after a swap would pay for the whole bake. The main
   canvas stays GPU-backed where the browser can. Layer bitmaps hide what is farther: below the first row where a
   group's ground covers the whole width (found from the geometry with isPointInPath), farther bitmaps, stars,
   clouds and movers are not drawn.

   stats(): { drawMs, dynMs: { median, p95, max, n }, bakeMs, firstBakeMs, bakes, sprites, spriteBytes, bitmaps,
              blitPx, animatedDraws, actors, placements }
     drawMs is the whole frame, dynMs the frame minus the bitmap blits (the sky and land bitmaps): what the
     animated sprites, strips, actors, flocks, shimmer, particles and weather cost. CPU time round the 2D calls
     (performance.now()); with opts.flush (the perf harness, software raster) the pending raster work is forced
     (a 1-pixel read-back) round every blit and at the end of the frame ('end': only at the end), so the times
     include the rasterisation. On a GPU canvas use no flush (a read-back stalls the GPU) and read the rAF cadence.
     opts.profile adds per-section times (sky, stars, clouds, blits, strips, water, movers by kind, particles).
   ============================================================ */
let _sccSupported = null, _sccRid = 0;
/** A canvas with a 2d context and Path2D (the browser bundle only; Node never has it). */
function sceneCanvasSupported() {
  if (_sccSupported != null) return _sccSupported;
  try { _sccSupported = typeof document !== 'undefined' && typeof Path2D === 'function' && !!document.createElement('canvas').getContext('2d'); }
  catch (e) { _sccSupported = false; }
  return _sccSupported;
}
const SCENE_SPRITE_CAP_BYTES = 96 * 1024 * 1024, SCENE_BACKING_MAX = [2560, 1440], SCENE_SLICE_MS = 8;
const _SCC_PAD = 2;
// Bake canvases (sprites, layer bitmaps) rasterise on the CPU: the bake forces their pending work in its own idle slices
// with a 1-pixel read, which on a GPU canvas would stall on a read-back. The main canvas stays GPU-backed where it can be.
const _SCC_CPU = { willReadFrequently: true };
/** The shared sprite cache: key -> { c, x0, y0, w, h, sc, bytes } (LRU by use; every renderer on the page shares it). */
const sceneSprites = (() => {
  const map = new Map();
  let bytes = 0;
  const api = {
    get(key, build) {
      let s = map.get(key);
      if (s) { map.delete(key); map.set(key, s); return s; }
      s = build();
      if (!s) return null;
      map.set(key, s); bytes += s.bytes;
      if (bytes > SCENE_SPRITE_CAP_BYTES) api.trim(SCENE_SPRITE_CAP_BYTES * 0.8);
      return s;
    },
    has: (key) => map.has(key),
    get bytes() { return bytes; },
    get size() { return map.size; },
    /** Drop the least recently used sprites until the cache holds at most maxBytes (renderers keep their own references to what they draw). */
    trim(maxBytes) { for (const [k, s] of map) { if (bytes <= maxBytes) break; map.delete(k); bytes -= s.bytes; } },
    clear() { map.clear(); bytes = 0; },
  };
  return api;
})();
const _sccPaths = new Map();
/** Path2D per path string, shared (the same d is drawn by many sprites, reflections and glows). */
function _sccPath(d) {
  let p = _sccPaths.get(d);
  if (!p) { if (_sccPaths.size > 40000) _sccPaths.clear(); p = new Path2D(d); _sccPaths.set(d, p); }
  return p;
}
function _sccCanvas(w, h) {
  w = Math.max(1, Math.ceil(w)); h = Math.max(1, Math.ceil(h));
  if (typeof OffscreenCanvas === 'function') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}
const _sccNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
function _sccStat(a) {
  if (!a.length) return { median: 0, p95: 0, max: 0, n: 0 };
  const s = a.slice().sort((x, y) => x - y), q = p => s[Math.min(s.length - 1, Math.floor(s.length * p))];
  const r = v => Math.round(v * 100) / 100;
  return { median: r(q(0.5)), p95: r(q(0.95)), max: r(s[s.length - 1]), n: s.length };
}
const _sccIdle = (fn) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: 120 }) : setTimeout(fn, 16));
/**
 * One planned cloud (sceneCloudPlan) painted into its own sprite at device scale k, once per bake (a frame only draws it).
 * Heaps and strips: overlapping lobes whose radial gradients fade to nothing (the soft edge: no outline), cut flat and soft
 * at the base; then, only where the cloud is, the shade toward the base (or the low sun's glow under it) and on the side away
 * from the light, a lit top on every lobe and a bright rim on the sun's (or the moon's) side; a ragged soft underside.
 * Cirrus: soft streaks and a few fine fibres. The opacity is baked in.
 */
function _sccCloudSprite(p, k) {
  const c = _sccCanvas(p.w * k + 4, p.h * k + 4), cx = c.getContext('2d', _SCC_CPU), t = p.tone, sd = t.side;
  const rgba = (hex, a) => { const v = _scHex(hex); return `rgba(${v[0]},${v[1]},${v[2]},${Math.round(a * 1000) / 1000})`; };
  const grad = (g, col, stops) => { for (const [o, a] of stops) g.addColorStop(o, rgba(col, a)); return g; };
  const blob = (x, y, rx, ry, col, stops, ang) => {      // a soft ellipse: a radial gradient in a scaled (and turned) frame
    cx.setTransform(k, 0, 0, k, 2, 2); cx.translate(x, y); if (ang) cx.rotate(ang); cx.scale(1, ry / rx);
    cx.fillStyle = grad(cx.createRadialGradient(0, 0, 0, 0, 0, rx), col, stops); cx.fillRect(-rx, -rx, 2 * rx, 2 * rx);
  };
  const cover = (fill) => { cx.setTransform(k, 0, 0, k, 2, 2); cx.fillStyle = fill; cx.fillRect(0, 0, p.w, p.h); };
  if (p.kind === 'cirrus') {
    for (const s of p.streaks) blob(s[0], s[1], s[2], s[3], t.wisp, [[0, 0.6], [0.5, 0.32], [1, 0]], s[4]);
    cx.setTransform(k, 0, 0, k, 2, 2); cx.lineCap = 'round';
    for (const f of p.fibres) {
      cx.strokeStyle = grad(cx.createLinearGradient(f[0], 0, f[4], 0), t.wisp, [[0, 0], [0.35, 0.55], [1, 0]]); cx.lineWidth = f[6];
      cx.beginPath(); cx.moveTo(f[0], f[1]); cx.quadraticCurveTo(f[2], f[3], f[4], f[5]); cx.stroke();
    }
  } else {
    const strip = p.kind === 'strip', edge = strip ? 0.55 : 0.8, hk = t.hk * (strip ? 0.6 : 0.85), rk = t.rimK * (strip ? 0.6 : 1);
    for (const l of [p.shelf, ...p.lobes]) blob(l[0], l[1], l[2], l[3], t.body, [[0, 1], [edge, 1], [1, 0]]);
    cx.globalCompositeOperation = 'destination-out';
    cover(grad(cx.createLinearGradient(0, p.base - 5, 0, p.base + 3), '#000000', [[0, 0], [1, 1]]));
    cx.globalCompositeOperation = 'source-atop';
    cover(grad(cx.createLinearGradient(0, 0, 0, p.base), t.baseCol, [[0, 0], [0.45, 0], [1, strip ? 0.6 : 0.82]]));
    cover(grad(cx.createLinearGradient(sd > 0 ? 0 : p.w, 0, sd > 0 ? p.w : 0, 0), t.shade, [[0, 0.38], [0.55, 0], [1, 0]]));
    for (const l of p.lobes) {
      blob(l[0] - sd * 0.15 * l[2], l[1] + 0.35 * l[3], l[2] * 0.85, l[3] * 0.85, t.shade, [[0, 0.2], [1, 0]]);
      blob(l[0] + sd * 0.28 * l[2], l[1] - 0.32 * l[3], l[2] * 0.78, l[3] * 0.78, t.lit, [[0, 0.9 * hk], [0.55, 0.5 * hk], [1, 0]]);
      if (rk > 0.02 && l[1] - l[3] < p.base * 0.55) blob(l[0] + sd * 0.5 * l[2], l[1] - 0.5 * l[3], l[2] * 0.55, l[3] * 0.55, t.rim, [[0, rk], [1, 0]]);
    }
    cx.globalCompositeOperation = 'source-over';
    for (const g of p.rag) blob(g[0], g[1], g[2], g[3], t.ragCol, [[0, 0.5], [1, 0]]);
  }
  cx.globalCompositeOperation = 'destination-out';
  cover(`rgba(0,0,0,${Math.round((1 - t.op) * 1000) / 1000})`);
  cx.globalCompositeOperation = 'source-over';
  return c;
}

/**
 * Create a renderer for one canvas. src: scene data, a thunk, a composed item, or (tests) { compiled: C }.
 * o: { lod (1), still (false), season (null: from the light), dpr, L (the light; default the authored moment),
 *      compiled (a section 4 compiled scene: skip the compiler), time (() => seconds; default since start), flush (perf) }
 */
function sceneRendererCreate(canvas, src, o) {
  o = o || {};
  let ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('no 2d context');
  const fixed = o.compiled || (src && src.compiled) || null;
  const data = fixed ? null : _scDataOf(src);
  if (!fixed && (!data || typeof sceneCompile !== 'function')) throw new Error('no scene data');
  const view = fixed ? fixed.view : Object.assign({}, data.view || {}, { at: data.at || (data.view && data.view.at) });
  let lod = o.lod == null ? 1 : o.lod, season = o.season || (fixed ? fixed.season : _scSeasonOf(data, {})), L = o.L || (typeof sceneLight === 'function' ? sceneLight({}, Object.assign({}, view, { season })) : null);
  let cssW = canvas.clientWidth || 1600, cssH = canvas.clientHeight || 900, dpr = o.dpr || (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
  let S = null;            // the live baked state (bitmaps, draw lists); replaced whole by a re-bake
  let pending = null;      // a re-bake in progress { gen, target }
  let raf = 0, running = false, destroyed = false, t0 = _sccNow();
  const prof = {}, drawTimes = [], dynTimes = [], st = { bakeMs: 0, firstBakeMs: 0, bakes: 0, blitPx: 0, animatedDraws: 0 };
  const timeFn = o.time || (() => (_sccNow() - t0) / 1000), rid = ++_sccRid;

  const compile = () => fixed || sceneCompile(data, { season, lod, L });
  /** Device size of the backing store for a css size (dpr-aware, capped at 2560 x 1440). */
  const deviceSize = (w, h) => {
    let W = Math.max(1, Math.round(w * dpr)), H = Math.max(1, Math.round(h * dpr));
    const k = Math.min(1, SCENE_BACKING_MAX[0] / W, SCENE_BACKING_MAX[1] / H);
    return [Math.max(1, Math.round(W * k)), Math.max(1, Math.round(H * k))];
  };

  /* ---------- sprites ---------- */
  const colourFns = new Map();
  const colourFn = (Lx, haze, tint, plain, lift, liftCol) => {
    if (plain || !Lx) return c => c;
    if (colourFns.size > 400) colourFns.clear();
    const key = sceneLightKey(Lx, season) + '|' + (Lx.alt != null ? Math.round(Lx.alt * 4) : '') + '|' + (haze || 0) + '|' + (tint ? tint[0] + ':' + tint[1] : '') + (lift ? '|l' + lift + (liftCol || '') : '');
    let f = colourFns.get(key);
    // v2 (V2 7.4): a placement near a night light is lifted: its graded colours mixed toward the (ungraded) light colour
    if (!f) { const memo = new Map(); f = c => { let v = memo.get(c); if (!v) { v = typeof sceneColour === 'function' ? sceneColour(c, { L: Lx, haze, tint }) : c; if (lift) v = _scMixHex(v, liftCol || '#ffd9a0', lift); memo.set(c, v); } return v; }; colourFns.set(key, f); }
    return f;
  };
  const paint = (cx, p, col) => {
    if (typeof p === 'string') return col(p);
    const stops = p.lin || p.rad, g = p.lin ? cx.createLinearGradient(p.x1 || 0, p.y1 || 0, p.x2 || 0, p.y2 != null ? p.y2 : 1) : cx.createRadialGradient(p.cx || 0, p.cy || 0, 0, p.cx || 0, p.cy || 0, p.r || 1);
    for (const [off, c, op] of stops) { const rgb = _scHex(col(c)); g.addColorStop(_scClamp(off, 0, 1), op == null || op === 1 ? col(c) : `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${op})`); }
    return g;
  };
  const drawShape = (cx, sh, col) => {
    const m = sh.m;
    if (m) { cx.save(); cx.transform(m[0], m[1], m[2], m[3], m[4], m[5]); }
    cx.globalAlpha = sh.op == null ? 1 : sh.op;
    const path = _sccPath(sh.d);
    if (sh.f) { cx.fillStyle = paint(cx, sh.f, col); cx.fill(path); }
    if (sh.s) { cx.strokeStyle = paint(cx, sh.s, col); cx.lineWidth = sh.w || 1; cx.lineCap = sh.cap || 'butt'; cx.stroke(path); }
    if (m) cx.restore();
  };
  /**
   * A sprite: the shapes of `which` ('*' every part but 'lit'; 'rest:a,b' every part but those; a part name; 'lit')
   * at device scale sc. litGlow: glow shapes in their night colours (moving parts and actors after real dusk). withLit: the
   * object's 'lit' part too, on top and ungraded (after real dusk, so a moving object's halo moves with it at no extra draw).
   */
  // x (v2 only, V2 13.2): { env, flip, lift, cls, i } - the passes' sprite keys, the flip bit (shaded classes) and the lift
  // join the key; the colours take the lift; the sprite passes (shading, rim, snow caps) run after the rasterising
  const sprite = (Lx, lk, oid, v, se, which, haze, tint, sc, litGlow, withLit, x) => {
    let key = sceneSpriteKey(oid, v, which + (litGlow ? '+g' : '') + (withLit ? '+l' : ''), se, haze, tint, sc, lk), req = null;
    if (x && x.env) {
      const env = x.env, sp = env.passes.sprite || (env.passes.sprite = sceneRenderPasses('sprite', env.C));
      req = { o: oid, v, part: which, season: se, haze, tint, scale: sc, flip: !!x.flip, cls: x.cls || null, lift: x.lift || 0, i: x.i };
      if (sp.length) key += '|f' + (x.flip ? 1 : 0) + sceneRenderSpriteKey(Lx, env.C, req);
      if (x.lift) key += '|l' + x.lift;
      if (!sp.length && !x.lift) req = null;
    }
    return sceneSprites.get(key, () => {
      const sh = sceneObjShapes(oid, v, se);
      if (!sh) return null;
      const names = (which === '*' ? sh.order.filter(p => p !== 'lit') : which.startsWith('rest:') ? sh.order.filter(p => p !== 'lit' && !which.slice(5).split(',').includes(p)) : [which])
        .concat(withLit && which !== 'lit' && sh.parts.lit ? ['lit'] : []);
      const detail = lod >= 0.5 && (typeof sceneDetailAt !== 'function' || sceneDetailAt(oid, sh, sc)), def = litGlow && typeof sceneObj === 'function' ? sceneObj(oid) : null, nc = (def && def.night && def.night.glow) || {};
      const tb = _sccPartsBox(sh, names, detail);
      if (!tb) return { c: null, x0: 0, y0: 0, w: 0, h: 0, sc, bytes: 0 };
      let [x0, y0, x1, y1] = tb;
      let k = sc;
      const maxDim = 2048;
      if ((x1 - x0) * k > maxDim || (y1 - y0) * k > maxDim) k = Math.min(maxDim / (x1 - x0), maxDim / (y1 - y0));
      const w = Math.ceil((x1 - x0) * k + 2 * _SCC_PAD), h = Math.ceil((y1 - y0) * k + 2 * _SCC_PAD);
      const c = _sccCanvas(w, h), cx = c.getContext('2d', _SCC_CPU);
      cx.setTransform(k, 0, 0, k, _SCC_PAD - x0 * k, _SCC_PAD - y0 * k);
      const col = req && req.lift ? colourFn(Lx, haze, tint, which === 'lit', req.lift, x.liftCol) : colourFn(Lx, haze, tint, which === 'lit'), plain = x => x;
      let any = false;
      for (const p of names) for (const s0 of sh.parts[p] || []) {
        if (!detail && s0.detail) continue;
        if (litGlow && s0.glow) drawShape(cx, Object.assign({}, s0, { f: nc[s0.glow] || (s0.glow === 'lamp' ? '#ffe2a0' : '#ffd98a'), s: null, op: 1 }), plain);
        else drawShape(cx, s0, p === 'lit' ? plain : col);
        any = true;
      }
      if (!any) { c.width = 0; return { c: null, x0, y0, w: 0, h: 0, sc: k, bytes: 0 }; }
      if (req && which !== 'lit') {
        // the sprite passes (V2 13.1): shading, rim light, snow caps, frost; they see the box in device px and the local frame
        Object.assign(req, { k, x0: x0 - _SCC_PAD / k, y0: y0 - _SCC_PAD / k, w, h, box: tb, shapes: sh });
        cx.globalAlpha = 1;
        sceneRunPasses(x.env, 'sprite', [cx, req]);
        cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; cx.filter = 'none';
      }
      return { c, x0: x0 - _SCC_PAD / k, y0: y0 - _SCC_PAD / k, w: w / k, h: h / k, sc: k, bytes: w * h * 4 };
    });
  };
  /**
   * A projected building (V2 13.2, 19): its shapes (scene units) filled straight into the layer bitmap with the item's colour
   * function (haze, lift); after real dusk its glow shapes light by the item's glowOn, else by the window share (7.3).
   */
  const drawDirect = (gx, TG, it, col, Lx, share) => {
    const dr = it.direct, night = !!(Lx && Lx.windows), plain = x => x;
    let gi = 0;
    for (const sh of dr.shapes || []) {
      gx.setTransform(TG[0], TG[1], TG[2], TG[3], TG[4], TG[5]);
      if (sh.glow) {
        const on = night && (Array.isArray(dr.glowOn) ? !!dr.glowOn[gi % dr.glowOn.length] : _scHashS((it.seed | 0) + '|g|' + gi) / 4294967296 < (share == null ? 0.6 : share));
        gi++;
        if (on) { drawShape(gx, Object.assign({}, sh, { f: (dr.glowCol && dr.glowCol[sh.glow]) || (sh.glow === 'lamp' ? '#ffe2a0' : '#ffd98a'), s: null, op: 1 }), plain); continue; }
      }
      drawShape(gx, sh, col);
    }
    gx.globalAlpha = 1;
  };
  const drawSprite = (cx, sp, M, alpha) => {
    if (!sp || !sp.c) return false;
    cx.globalAlpha = alpha == null ? 1 : alpha;
    cx.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]);
    cx.drawImage(sp.c, sp.x0, sp.y0, sp.w, sp.h);
    return true;
  };

  /* ---------- the bake (a generator: run to the end at once, or in idle slices) ---------- */
  function* bake(W, H, Lx, C) {
    // v2 (V2 13): a v2 compiled scene, or a v1 one with fx, runs the render passes at the hook points below; v1: none of it
    const v2 = typeof sceneRenderIsV2 === 'function' && typeof sceneRunPasses === 'function' && sceneRenderIsV2(C);
    const lk = sceneLightKey(Lx, C.season, v2 ? C : undefined), vs = Math.max(W / SCENE_W_SAFE, H / SCENE_H_SAFE), ox = (W - SCENE_W_SAFE * vs) / 2, oy = (H - SCENE_H_SAFE * vs) / 2;
    const T = [vs, 0, 0, vs, ox, oy];                     // scene units -> device px
    const placeM = (x, y, s, flip) => [vs * s * (flip ? -1 : 1), 0, 0, vs * s, vs * x + ox, vs * y + oy];
    const out = { W, H, vs, ox, oy, lk, L: Lx, C, groups: [], sky: null, stars: [], clouds: [], strips: [], particles: null, rain: null, snow: null, opaque: [], sprites: new Set() };
    const keep = (sp) => { if (sp && sp.c) out.sprites.add(sp); return sp; };
    const env = v2 ? _sccEnv({ C, L: Lx, W, H, vs, ox, oy, T, out, keep, placeM, lod, still: !!o.still, profile: !!o.profile, governor: o.governor,
      sprite: (req) => sprite(Lx, lk, req.o, req.v || 0, req.season || C.season, req.part || '*', req.haze || 0, req.tint || null, req.scale, !!req.litGlow, !!req.withLit, req.plain ? null : { env, flip: req.flip, lift: req.lift || 0, cls: req.cls, i: req.i }),
      // the very sprite item i is drawn with (the shadow and water passes reuse it: no extra rasterising)
      itemSprite: (i) => { const it = C.items[i]; return keep(sprite(Lx, lk, it.o, it.v, it.season, '*', v2Haze(i, it, hz(it.layer)), it.tint, bucket(it.s) * vs, false, false, { env, flip: it.flip, lift: v2Lift(i), cls: it.cls, i })); } }) : null;
    if (env) { out.env = env; sceneRunPasses(env, 'prebake', []); }
    // the v2 haze (V2 7.1) and lift (7.4) of an item: from the passes' per-item arrays (bucketed), not the layer's haze
    const v2Haze = (i, it, layerHaze) => (env && it.haze == null ? Math.round((env.itemHaze[i] || 0) * 10) / 10 : layerHaze);
    const v2Lift = (i) => (env ? env.itemLift[i] || 0 : 0);
    const box = (b) => [Math.floor(b[0] * vs + ox), Math.floor(b[1] * vs + oy), Math.ceil(b[2] * vs + ox), Math.ceil(b[3] * vs + oy)];
    const clipBox = (b) => [Math.max(0, b[0]), Math.max(0, b[1]), Math.min(W, b[2]), Math.min(H, b[3])];
    const union = (a, b) => (!a ? b : !b ? a : [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]);
    const itemBox = (it, sh) => { const s = it.s, b = sh.box; return it.flip ? [it.x - b[2] * s, it.y + b[1] * s, it.x - b[0] * s, it.y + b[3] * s] : [it.x + b[0] * s, it.y + b[1] * s, it.x + b[2] * s, it.y + b[3] * s]; };
    const hz = (layer) => (C.layers[layer] ? Math.round(C.layers[layer].haze * 10) / 10 : 0);
    const bucket = (s) => (typeof sceneScaleBucket === 'function' ? sceneScaleBucket(s) : s);
    let tick = _sccNow();
    // 2D canvases record their drawing and rasterise it later (when a bitmap is first drawn from): force that work here, in
    // the bake's own slices (a 1-pixel read), or the first frame after a swap would pay for the whole bake at once
    const flushCx = (cx) => { try { cx.getImageData(0, 0, 1, 1); } catch (e) { /* nothing pending */ } };
    let since = 0;
    const slice = function* (cx) {
      if (cx && ++since % 8 === 0) flushCx(cx);
      if (_sccNow() - tick > SCENE_SLICE_MS) { if (cx) flushCx(cx); yield; tick = _sccNow(); }
    };

    // 1. the sky bitmap: gradient, the sun's glow and disc, the moon in its real phase (stars and clouds move: per frame)
    const sky = _sccCanvas(W, H), sx = sky.getContext('2d', { alpha: false, willReadFrequently: true });
    const hor = (Lx && Lx.horizon) || C.view.horizon || 560, y1 = hor + 120;
    sx.setTransform(T[0], 0, 0, T[3], T[4], T[5]);
    const g = sx.createLinearGradient(0, 0, 0, y1);
    const top = (Lx && Lx.top) || '#3a80c4', mid = (Lx && Lx.mid) || '#98c4e4', low = (Lx && Lx.low) || '#dcebf2';
    g.addColorStop(0, top); g.addColorStop(0.58 * Math.min(1, hor / y1), mid); g.addColorStop(_scClamp(hor / y1, 0, 1), low); g.addColorStop(1, low);
    sx.fillStyle = g; sx.fillRect(-200, -100, 2000, 1100);
    if (Lx && C.sky) {
      const glow = (x, y, r, col, op) => { const rg = sx.createRadialGradient(x, y, 0, x, y, r), c = _scHex(col); rg.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${op})`); rg.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`); sx.fillStyle = rg; sx.fillRect(x - r, y - r, 2 * r, 2 * r); };
      const sun = Lx.sun || {}, fov = Lx.fov || 80;
      const gk = _scClamp(1 - Math.abs(sun.rel || 0) / (fov / 2 + 70), 0, 1) * (1 - (Lx.cover || 0) * 0.7), lowSun = _scClamp(1 - Math.abs(Lx.alt - 2) / 16, 0, 1);
      if (gk > 0 && Lx.alt > -9) glow(_scClamp(sun.x, -500, 2100), Math.min(sun.y, hor + 40), 380 + 520 * lowSun, _scMixHex(Lx.lowSun || low, '#fff6dc', _scClamp(Lx.alt / 30, 0, 0.8)), (0.25 + 0.5 * lowSun) * gk);
      const m = Lx.moon;
      if (m && m.show) {
        const mr = C.sky.moonR || 20, f = Math.acos(_scClamp(1 - 2 * m.illum, -1, 1)) / (2 * Math.PI);
        glow(m.x, m.y, mr * (3 + 4 * m.illum), '#cfdcf0', 0.18 + 0.32 * m.illum);
        sx.save(); sx.translate(m.x, m.y);
        sx.globalAlpha = 0.25 * (Lx.dark || 0); sx.fillStyle = '#3a4660'; sx.beginPath(); sx.arc(0, 0, mr, 0, Math.PI * 2); sx.fill();
        sx.globalAlpha = 1; sx.rotate(((m.limb || 90) - 90) * Math.PI / 180); sx.fillStyle = '#f3eedc';
        sx.fill(new Path2D(typeof almMoonDiscPath === 'function' ? almMoonDiscPath(_scClamp(f, 0.001, 0.4995), mr) : sceneD.circ(0, 0, mr)));
        sx.restore();
      }
      if (sun.show && C.sky.sunR) {
        const sr = C.sky.sunR, core = _scMixHex('#fff9e8', Lx.lowSun || low, _scClamp(1 - Lx.alt / 12, 0, 0.85));
        sx.globalAlpha = 0.35; sx.fillStyle = core; sx.beginPath(); sx.arc(sun.x, sun.y, sr * 1.8, 0, Math.PI * 2); sx.fill();
        sx.globalAlpha = 1; sx.beginPath(); sx.arc(sun.x, sun.y, sr, 0, Math.PI * 2); sx.fill();
      }
      // stars (positions now, twinkle per frame), by darkness, fewer under a bright moon or cloud
      const ns = Math.min(220, Math.round((C.sky.stars || 0) * (Lx.stars || 0) * Math.max(0.3, lod)));
      const r = _scRndOf(41);
      for (let i = 0; i < ns; i++) { const x = -100 + r() * 1800, y = Math.pow(r(), 1.4) * (hor - 30), s = 0.7 + r() * 1.2; out.stars.push([x * vs + ox, y * vs + oy, Math.max(1, s * vs * 1.2), i % 3]); }
    }
    flushCx(sx);
    // clouds: the scene's own natural sky (sceneCloudPlan: kinds by cover, depth bands, lit by the light), each painted once
    // into its own sprite here, a slice per cloud; a frame drifts them (one drawImage each)
    for (const p of sceneCloudPlan(C, Lx)) {
      const c = _sccCloudSprite(p, vs);
      out.clouds.push({ c, w: p.w, h: p.h, x0: p.x0, y: p.y, sp: p.sp, kind: p.kind, band: p.band });
      out.sprites.add({ c, bytes: c.width * c.height * 4 });
      flushCx(c.getContext('2d'));
      yield* slice();
    }
    out.sky = sky;
    yield* slice();

    // 2. the land: bake groups (sceneBakePlan), each bitmap cropped to what it draws
    const plan = sceneBakePlan(C), byLayer = C.layers.map(() => []);
    C.items.forEach((it, i) => byLayer[it.layer] && byLayer[it.layer].push(i));
    const layerOfGroup = [];
    plan.forEach((gr, gi) => gr.layers.forEach(l => { layerOfGroup[l] = gi; }));
    for (let gi = 0; gi < plan.length; gi++) {
      const gr = plan[gi];
      // the crop: ground, water, signs and every item drawn into this bitmap
      let bb = null;
      for (const l of gr.layers) {
        for (const gd of C.ground) if (gd.layer === l) bb = union(bb, scenePathBox(gd.d));
        for (const w of C.water) if (w.layer === l) bb = union(bb, scenePathBox(w.d));
        for (const s of C.signs) if (s.layer === l) bb = union(bb, [s.x - s.w, s.y - s.h * 3, s.x + s.w, s.y + s.h]);
        let n = 0;
        for (const i of byLayer[l]) { const it = C.items[i]; if (it.strip >= 0) continue; const sh = sceneObjShapes(it.o, it.v, it.season); if (sh) bb = union(bb, itemBox(it, sh)); if (++n % 256 === 0) yield* slice(); }
        if (env) {
          // v2: projected buildings (direct fills) and what the passes draw beyond the items (long shadows, water edges)
          for (const i of byLayer[l]) { const it = C.items[i]; if (it.direct && it.direct.box) bb = union(bb, it.direct.box); }
          if (env.extraBox[l]) bb = union(bb, env.extraBox[l]);
        }
      }
      const db = bb ? clipBox(box(bb)) : null;
      const grp = { layers: gr.layers, c: null, x: 0, y: 0, w: 0, h: 0, movers: [], strips: [], water: [], opaqueY: H + 1 };
      out.groups.push(grp);
      if (db && db[2] > db[0] && db[3] > db[1]) {
        grp.x = db[0]; grp.y = db[1]; grp.w = db[2] - db[0]; grp.h = db[3] - db[1];
        grp.c = _sccCanvas(grp.w, grp.h);
      }
      const gx = grp.c ? grp.c.getContext('2d', _SCC_CPU) : null;
      const toG = (M) => [M[0], M[1], M[2], M[3], M[4] - grp.x, M[5] - grp.y];
      const TG = toG(T);
      if (env) { env.grp = grp; env.gi = gi; env.gx = gx; env.TG = TG; }
      for (const l of gr.layers) {
        const haze = hz(l), col = colourFn(Lx, haze, null);
        if (gx) {
          // ground
          for (const gd of C.ground) if (gd.layer === l) { gx.setTransform(...TG); gx.globalAlpha = 1; gx.fillStyle = paint(gx, gd.fill, col); gx.fill(_sccPath(gd.d)); }
          if (env) { sceneRunPasses(env, 'ground', [l, gx]); _sccReset(gx); }
          // water: the live sky's colours, then the reflection of what stands above its line (sky, farther bitmaps, its own bank)
          for (const w of C.water) if (w.layer === l) {
            if (env && env.own.water.has(w)) continue;   // v2: the water pass draws it (V2 5.3)
            const cols = Lx && Lx.water ? Lx.water(w.base) : w.base, wg = gx.createLinearGradient(0, w.y0, 0, w.y1), wp = _sccPath(w.d);
            wg.addColorStop(0, cols[0]); wg.addColorStop(0.5, cols[1]); wg.addColorStop(1, cols[2]);
            gx.setTransform(...TG); gx.globalAlpha = 1; gx.fillStyle = wg; gx.fill(wp);
            if (w.reflect) {
              gx.save(); gx.setTransform(...TG); gx.clip(wp);
              const Y = w.y0 * vs + oy - grp.y;          // the water line in this bitmap's pixels
              gx.globalAlpha = 0.35;
              gx.setTransform(1, 0, 0, -1, -grp.x, 2 * Y + grp.y);
              gx.drawImage(out.sky, 0, 0);
              for (const pg of out.groups) if (pg !== grp && pg.c) gx.drawImage(pg.c, pg.x, pg.y);
              for (const i of byLayer[l]) { const it = C.items[i]; if (!it.reflect || it.y > w.y0 + 8 || it.strip >= 0) continue; const sp = keep(sprite(Lx, lk, it.o, it.v, it.season, '*', haze, it.tint, bucket(it.s) * vs, false)); const M = placeM(it.x, it.y, it.s, it.flip); gx.setTransform(M[0], 0, 0, -M[3], M[4] - grp.x, 2 * Y - M[5] + grp.y); if (sp && sp.c) gx.drawImage(sp.c, sp.x0, sp.y0, sp.w, sp.h); }
              gx.setTransform(...TG); gx.globalAlpha = 0.25; gx.fillStyle = cols[1]; gx.fill(wp);
              gx.restore();
            }
            if (w.shimmer || w.lightPath) grp.water.push(_sccWaterFx(w, Lx, vs, ox, oy, C.id));
          }
          // shadows along the live sun (static: baked)
          if (Lx && Lx.shadow && !(env && env.own.shadows)) for (const i of byLayer[l]) { const it = C.items[i]; if (it.shadow) _sccShadow(gx, TG, it, Lx); }
          // v2: the passes under the layer's objects (water 20, shadows 30)
          if (env) { sceneRunPasses(env, 'layer:under', [l, gx, 'under']); _sccReset(gx); }
        }
        // the items: static ones into the bitmap; moving parts into the group's draw list
        for (const i of byLayer[l]) {
          const it = C.items[i];
          if (it.strip >= 0) continue;
          if (env && it.direct) { if (gx) drawDirect(gx, TG, it, colourFn(Lx, v2Haze(i, it, hz(l)), it.tint, false, v2Lift(i), env.liftCol), Lx, env.windowShare); yield* slice(gx); continue; }
          const x2 = env ? { env, flip: it.flip, lift: v2Lift(i), cls: it.cls, i } : undefined, haze = env ? v2Haze(i, it, hz(l)) : hz(l);
          const M = placeM(it.x, it.y, it.s, it.flip), sc = bucket(it.s) * vs;
          const moving = it.anim && it.anim.length ? it.anim : null;
          const night = !!(Lx && Lx.windows);
          let skip = null, litMoves = false;
          if (!moving) { if (gx) drawSprite(gx, keep(sprite(Lx, lk, it.o, it.v, it.season, '*', haze, it.tint, sc, false, false, x2)), toG(M)); }
          else {
            // after real dusk: the moving sprites carry their lit glows (every one, when any of the placement's is on) and, for
            // a whole-object hook, the lit part; the parts that stay get their glows in the bitmap below, as a static placement
            const whole = moving.find(a => _scAnimParts(a)[0] === '*'), moved = whole ? [] : [...new Set(moving.flatMap(_scAnimParts))];
            if (!whole && gx) drawSprite(gx, keep(sprite(Lx, lk, it.o, it.v, it.season, 'rest:' + moved.join(','), haze, it.tint, sc, false, false, x2)), toG(M));
            const lit = night && !!it.glowOn && it.glowOn.some(Boolean);
            litMoves = !!whole && night && it.lit; skip = whole ? sceneObjShapes(it.o, it.v, it.season).order : moved;
            const parts = whole ? [{ a: whole, sp: keep(sprite(Lx, lk, it.o, it.v, it.season, '*', haze, it.tint, sc, lit, litMoves, x2)) }]
              : moving.flatMap(a => _scAnimParts(a).map((p, j) => ({ a, j, sp: keep(sprite(Lx, lk, it.o, it.v, it.season, p, haze, it.tint, sc, lit, false, x2)) })));
            grp.movers.push({ kind: 'item', y: it.y, x: it.x, M, parts, b: itemBox(it, sceneObjShapes(it.o, it.v, it.season)) });
          }
          if (gx && night) {
            if (it.lit && !litMoves) drawSprite(gx, keep(sprite(Lx, lk, it.o, it.v, it.season, 'lit', 0, null, sc, false)), toG(M));
            if (it.glowOn) _sccGlows(gx, toG(M), it, skip, env ? env.windowShare : null);
          }
          yield* slice(gx);
        }
        // v2: the passes over the layer's objects (pools, spill, halos, streaks)
        if (env && gx) { sceneRunPasses(env, 'layer:over', [l, gx, 'over']); _sccReset(gx); }
        // signs (8.3): plain board, line-colour stripes, the name in the system font (fillText never parses markup)
        // (in its own small bitmap, drawn in depth order with the movers, so the layer's wind strips never cover it)
        for (const s of C.signs) if (s.layer === l) {
          const g = sceneSignLayout(s), parts = [g.board, ...g.bars.map(b => b.slice(0, 4))].concat(g.post ? [g.post] : []);
          const sb = clipBox(box([Math.min(...parts.map(p => p[0])) - 2, Math.min(...parts.map(p => p[1])) - 2, Math.max(...parts.map(p => p[0] + p[2])) + 2, Math.max(...parts.map(p => p[1] + p[3])) + 2]));
          if (sb[2] <= sb[0] || sb[3] <= sb[1]) continue;
          const c = _sccCanvas(sb[2] - sb[0], sb[3] - sb[1]);
          _sccSign(c.getContext('2d', _SCC_CPU), s, [vs, 0, 0, vs, ox - sb[0], oy - sb[1]], vs, Lx);
          flushCx(c.getContext('2d'));
          grp.movers.push({ kind: 'sign', y: s.y, c, x: sb[0], top: sb[1] });
          out.sprites.add({ c, bytes: c.width * c.height * 4 });
        }
        // actors and flocks of this layer: moving every frame
        for (const a of C.actors) if (a.layer === l) {
          const sh = sceneObjShapes(a.o, a.v, C.season); if (!sh) continue;
          const sMax = (a.s || 1) * (a.sByY ? Math.max(...a.sByY.map(p => p[1])) : 1), sc = bucket(sMax) * vs, lit = !!(Lx && Lx.windows);
          const anim = a.anim || [], whole = anim.find(h => _scAnimParts(h)[0] === '*'), moved = [...new Set(anim.flatMap(_scAnimParts))].filter(p => p !== '*');
          // the lit part rides in the rest sprite (it moves with the body, at no extra draw)
          const parts = [{ a: whole || null, sp: keep(sprite(Lx, lk, a.o, a.v, C.season, moved.length ? 'rest:' + moved.join(',') : '*', hz(l), null, sc, lit, lit && !!(sh.parts.lit && sh.parts.lit.length))), rest: true }]
            .concat(anim.filter(h => _scAnimParts(h)[0] !== '*').flatMap(h => _scAnimParts(h).map((p, j) => ({ a: h, j, sp: keep(sprite(Lx, lk, a.o, a.v, C.season, p, hz(l), null, sc, lit)) }))));
          grp.movers.push({ kind: 'actor', actor: a, parts, box: sh.box, y: 0 });
        }
        for (const f of C.flocks) if (f.layer === l) {
          const sh = sceneObjShapes(f.o, 0, C.season); if (!sh) continue;
          const sc = bucket((f.s || 0.5) * 1.15) * vs, flap = (sh.anim || []).find(h => h.kind === 'flap');
          const parts = flap ? [{ sp: keep(sprite(Lx, lk, f.o, 0, C.season, 'rest:' + flap.part, hz(l), null, sc, false)), rest: true }, { a: Object.assign({ period: 0.5, phase: 0, pivot: [0, 0] }, flap), sp: keep(sprite(Lx, lk, f.o, 0, C.season, flap.part, hz(l), null, sc, false)) }]
            : [{ sp: keep(sprite(Lx, lk, f.o, 0, C.season, '*', hz(l), null, sc, false)), rest: true }];
          for (let i = 0; i < f.n; i++) grp.movers.push({ kind: 'bird', flock: f, i, parts, box: sh.box, y: 0 });
        }
      }
      // wind strips of this group's layers: one bitmap each, skewed per frame
      for (const s of C.strips) if (gr.layers.includes(s.layer)) {
        let sb = null;
        const its = s.items.map(i => C.items[i]);
        for (const it of its) { const sh = sceneObjShapes(it.o, it.v, it.season); if (sh) sb = union(sb, itemBox(it, sh)); }
        if (!sb) continue;
        const d = clipBox(box(sb));
        if (d[2] <= d[0] || d[3] <= d[1]) continue;
        const c = _sccCanvas(d[2] - d[0], d[3] - d[1]), cx = c.getContext('2d', _SCC_CPU);
        for (const it of its) { const M = placeM(it.x, it.y, it.s, it.flip); drawSprite(cx, keep(sprite(Lx, lk, it.o, it.v, it.season, '*', hz(s.layer), it.tint, bucket(it.s) * vs, false)), [M[0], M[1], M[2], M[3], M[4] - d[0], M[5] - d[1]]); }
        flushCx(cx);
        grp.strips.push({ c, x: d[0], y: d[1], base: s.y1 * vs + oy, xMid: (s.x0 + s.x1) / 2, amp: s.amp || 1 });
        out.sprites.add({ c, bytes: c.width * c.height * 4 });
        yield* slice();
      }
      // fog: mist bands baked into the nearest group
      if (gx && Lx && Lx.fog && gi === plan.length - 1) {
        gx.setTransform(...TG);
        for (let i = 0; i < 4; i++) { const y = hor + 40 + i * 70, mg = gx.createLinearGradient(0, y - 40, 0, y + 40), c = _scHex(_scMixHex('#f0f2f2', '#3a4256', Lx.dark || 0)); mg.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},0)`); mg.addColorStop(0.5, `rgba(${c[0]},${c[1]},${c[2]},0.45)`); mg.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`); gx.globalAlpha = 1; gx.fillStyle = mg; gx.fillRect(-200, y - 40, 2000, 80); }
      }
      // v2: the group bitmap is complete (water: reflection bitmaps and masks; atmosphere: the depth veil)
      if (env) { sceneRunPasses(env, 'group', [grp]); if (gx) _sccReset(gx); }
      if (gx) flushCx(gx);
      yield* slice();
    }
    // 3. where each bitmap is fully opaque from some row down (it hides everything farther there: smaller blits)
    for (const grp of out.groups) { grp.opaqueY = _sccOpaqueFromGround(C, grp.layers, vs, ox, oy, W); yield* slice(); }
    // 4. particles (the season's) and weather (live)
    if (C.particles && C.particles.kind !== 'none' && C.particles.n) out.particles = sceneParticleSet(C.particles.kind, Math.min(250, Math.round(C.particles.n * Math.max(0.3, lod))), _scHashS(C.id + '|p'));
    if (Lx && Lx.rain) out.rain = sceneParticleSet('rain', Math.round(250 * Math.max(0.4, lod)), 91);
    if (Lx && Lx.snow) out.snow = sceneParticleSet('wsnow', Math.round(200 * Math.max(0.4, lod)), 93);
    out.fogVeil = Lx && Lx.fog ? `rgba(${_scHex(_scMixHex('#dfe4e6', '#2a3040', Lx.dark || 0)).join(',')},0.32)` : null;
    out.pcol = (c) => (C.particles.kind === 'motes' || !Lx ? c : colourFn(Lx, 0, null)(c));
    return out;
  }

  /* ---------- frames ---------- */
  const flush = () => { try { ctx.getImageData(0, 0, 1, 1); } catch (e) { /* nothing to force */ } };
  function frame(t) {
    if (!S || destroyed) return;
    const F = o.flush || false, tStart = _sccNow(), P = o.profile ? prof : null;
    let pm = tStart;
    const mark = P ? (name) => { flush(); const n = _sccNow(); P[name] = (P[name] || 0) + n - pm; pm = n; } : () => {};
    let blit = 0, blitPx = 0, draws = 0;
    const Lx = L || S.L, W = S.W, H = S.H, vs = S.vs, ox = S.ox, oy = S.oy;
    const blitAt = (c, x, y, sy0, sy1) => {          // a bitmap, only its rows sy0..sy1 (device px)
      const h = Math.min(c.height, sy1 - y) - Math.max(0, sy0 - y);
      if (h <= 0) return;
      const s0 = Math.max(0, sy0 - y);
      if (F && F !== "end") flush();
      const a = _sccNow();
      ctx.drawImage(c, 0, s0, c.width, h, x, y + s0, c.width, h);
      if (F && F !== "end") flush();
      blit += _sccNow() - a; blitPx += c.width * h;
    };
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    // what the nearer bitmaps hide: nothing farther needs drawing below their opaque rows
    const hideBelow = []; let hb = H;
    for (let i = S.groups.length - 1; i >= 0; i--) { hideBelow[i] = hb; hb = Math.min(hb, S.groups[i].opaqueY); }
    // v2: every mover's place now, before the frame passes (water wakes and reflections, actor shadows read them)
    const env = S.env;
    if (env) _sccMoversNow(env, S, t, Lx);
    mark('pre'); blitAt(S.sky, 0, 0, 0, hb); mark('blit');
    // stars: three twinkle groups
    if (S.stars.length) {
      ctx.fillStyle = '#fffaf0';
      const base = 0.35 + 0.65 * (Lx.stars || 0);
      for (let gq = 0; gq < 3; gq++) { ctx.globalAlpha = base * (0.65 + 0.35 * Math.sin(t * (1.1 + gq * 0.6) + gq * 2)); for (const s of S.stars) if (s[3] === gq && s[1] < hb) ctx.fillRect(s[0], s[1], s[2], s[2]); }
      ctx.globalAlpha = 1;
    }
    mark('stars');
    for (const c of S.clouds) {
      // whole device pixels: an unscaled blit at an integer offset is a plain copy (no filtering) in a software raster
      const x = Math.round(sceneCloudX(c, t) * vs + ox), y = Math.round((c.y - c.h) * vs + oy);
      if (y > hb || x > W || x + c.c.width < 0) continue;   // hidden by the land, or wrapping off-screen
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(c.c, x, y); draws++;
    }
    S.groups.forEach((g, gi) => {
      const below = hideBelow[gi];
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
      mark(gi ? 'movers' : 'clouds'); if (g.c) blitAt(g.c, g.x, g.y, 0, below); mark('blit');
      for (const s of g.strips) {
        if (s.y >= below) continue;
        const k = (s.amp || 1) * sceneWindSafe(t, s.xMid, Lx) * 0.02;
        ctx.setTransform(1, 0, k, 1, -k * s.base, 0);
        ctx.drawImage(s.c, s.x, s.y); draws++;
      }
      mark('strips'); for (const w of g.water) _sccWaterFrame(ctx, w, t); mark('water');
      // v2: the frame passes of this group (flows 10, water 20, actor shadows 25, puddle rings 50), before its movers
      if (env) { draws += sceneRunPasses(env, 'frameGroup', [g, ctx, t, below], true); _sccReset(ctx); mark('passes'); }
      // the movers, y-sorted (actors and birds are placed now)
      let list = g.movers;
      if (!env) for (const m of list) {
        if (m.kind === 'actor') { const p = sceneActorAt(m.actor, t); m.p = p; m.y = p.y; }
        else if (m.kind === 'bird') { const p = sceneFlockAt(m.flock, m.i, t); m.p = p; m.y = p.y; }
      }
      if (env) { const extra = []; sceneRunPasses(env, 'movers', [g, t, (m) => { if (m && typeof m.draw === 'function') extra.push(Object.assign({ kind: 'custom' }, m)); }], true); if (extra.length) list = list.concat(extra); }
      list.sort((a, b) => a.y - b.y);
      const drawMover = (m) => {
        if (m.kind === 'sign') { if (m.top < below) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.drawImage(m.c, m.x, m.top); } return; }
        if (m.kind === 'custom') { const n = m.draw(ctx); if (n > 0) draws += n; _sccReset(ctx); return; }
        if (m.kind === 'item') {
          if (m.b[1] * vs + oy > below) return;
          for (const pt of m.parts) {
            const pose = sceneAnimPose(pt.a, t, Lx, m.x), A = pt.j === 1 && pose.m2 ? pose.m2 : pose.m;
            if (drawSprite(ctx, pt.sp, _scMul(m.M, A), pose.alpha)) draws++;
          }
        } else {
          const p = m.p, b = m.box, fl = p.dir < 0;
          const x0 = fl ? p.x - b[2] * p.s : p.x + b[0] * p.s, x1 = fl ? p.x - b[0] * p.s : p.x + b[2] * p.s;
          if (x1 * vs + ox < 0 || x0 * vs + ox > W || (p.y + b[1] * p.s) * vs + oy > below) return;
          const M = [vs * p.s * (fl ? -1 : 1), 0, 0, vs * p.s, vs * p.x + ox, vs * p.y + oy];
          let bob = 0;
          if (m.kind === 'actor') for (const pt of m.parts) if (pt.a && pt.a.kind === 'walk') { bob = sceneAnimPose(pt.a, t, Lx, p.x).bob || 0; break; }
          for (const pt of m.parts) {
            let A = _SC_ID;
            if (pt.a) {
              const a = m.kind === 'bird' ? Object.assign({}, pt.a, { phase: p.phase }) : pt.a, pose = sceneAnimPose(a, t, Lx, p.x);
              A = pt.j === 1 && pose.m2 ? pose.m2 : pose.m;
            }
            const MM = _scMul(M, A);
            if (pt.rest && bob) MM[5] += bob * vs * p.s;
            if (drawSprite(ctx, pt.sp, MM, p.alpha)) draws++;
          }
        }
      };
      if (!P) for (const m of list) drawMover(m);
      else for (const m of list) { mark('movers'); drawMover(m); mark('m:' + m.kind + (m.parts && m.parts[0] && m.parts[0].a ? ':' + m.parts[0].a.kind : '')); }
      ctx.globalAlpha = 1;
    });
    // particles (the season) and weather
    ctx.setTransform(vs, 0, 0, vs, ox, oy);
    mark('movers'); if (S.particles) _sccParticles(ctx, S.particles, t, S.pcol, S.C.particles.kind); mark('particles');
    if (S.snow) _sccParticles(ctx, S.snow, t, (c) => c, 'snow');
    if (S.rain) {
      ctx.strokeStyle = 'rgba(200,212,224,0.5)'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (const p of S.rain) { const q = sceneParticleAt(p, t); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - 2, q.y + p.size); }
      ctx.stroke();
    }
    if (S.fogVeil) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = S.fogVeil; ctx.fillRect(0, 0, W, H); }
    ctx.globalAlpha = 1;
    // v2: after every group (weather 50, fog banks 60, lightning 90)
    if (env) { draws += sceneRunPasses(env, 'framePost', [ctx, t], true); _sccReset(ctx); }
    if (F) flush();
    mark('weather');
    if (P) P.frames = (P.frames || 0) + 1;
    const total = _sccNow() - tStart;
    drawTimes.push(total); dynTimes.push(Math.max(0, total - blit));
    if (drawTimes.length > 900) { drawTimes.splice(0, 300); dynTimes.splice(0, 300); }
    st.blitPx = blitPx; st.animatedDraws = draws;
    if (env && !o.still && t > 0) _sccGovern(env, Math.max(0, total - blit), o);
  }

  /* ---------- bake runners ---------- */
  function bakeSync(W, H) {
    const a = _sccNow(), C = compile(), it = bake(W, H, L, C);
    let r = it.next();
    while (!r.done) r = it.next();
    adopt(r.value, W, H);
    if (o.onBaked) try { o.onBaked(); } catch (e) { /* the host's business */ }
    st.bakeMs = Math.round((_sccNow() - a) * 10) / 10;
    if (!st.bakes) st.firstBakeMs = st.bakeMs;
    st.bakes++;
  }
  function adopt(next, W, H) {
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const old = S;
    S = next;
    if (old) for (const g of old.groups) if (g.c && g.c !== null) { g.c.width = 0; }
    if (old && old.sky) old.sky.width = 0;
  }
  /** Re-bake in idle slices (8 ms or less each) into new bitmaps; the old ones draw until the swap. */
  function bakeLater(W, H) {
    if (pending) pending.cancel = true;
    const job = { cancel: false, ms: 0 }, C = compile(), it = bake(W, H, L, C);
    pending = job;
    const step = () => {
      if (job.cancel || destroyed) return;
      const a = _sccNow();
      let r = it.next();
      while (!r.done && _sccNow() - a < SCENE_SLICE_MS) r = it.next();
      const took = _sccNow() - a;
      job.ms += took; job.maxSlice = Math.max(job.maxSlice || 0, took);
      if (!r.done) { _sccIdle(step); return; }
      pending = null;
      adopt(r.value, W, H);
      st.bakeMs = Math.round(job.ms * 10) / 10; st.maxSliceMs = Math.round(job.maxSlice * 10) / 10;
      if (!st.bakes) st.firstBakeMs = st.bakeMs;
      st.bakes++;
      if (!running) frame(o.still ? 0 : timeFn());
      if (o.onBaked) try { o.onBaked(); } catch (e) { /* the host's business */ }
    };
    _sccIdle(step);
  }
  function loop() {
    if (!running) return;
    frame(timeFn());
    raf = requestAnimationFrame(loop);
  }
  const api = {
    get baked() { return !!S; },
    /** The v2 env of the current bake (V2 13.1; tests and tools read the passes' state), or null (v1). */
    get env() { return S ? S.env || null : null; },
    /** A bake is running in idle slices. */
    get baking() { return !!pending; },
    /** The first bake in idle slices (gallery tiles: no long task while a page of tiles mounts). */
    bakeIdle(w, h) { cssW = w || cssW; cssH = h || cssH; if (S || pending) return; const [W, H] = deviceSize(cssW, cssH); bakeLater(W, H); },
    /** The css size of the box (the backing store follows: dpr-aware, capped). A resize re-bakes (in slices once there is a frame). */
    resize(w, h) {
      cssW = w || cssW; cssH = h || cssH;
      const [W, H] = deviceSize(cssW, cssH);
      if (S && S.W === W && S.H === H) return;
      if (!S) { bakeSync(W, H); frame(o.still ? 0 : timeFn()); }
      else bakeLater(W, H);
    },
    /** A new light (sceneLight). Re-bakes only when the quantised light key changes. */
    setLight(nl) {
      if (!nl) return;
      const before = S ? S.lk : null;
      L = nl;
      if (!S) return;
      const v2 = S.env ? S.C : undefined;
      if (sceneLightKey(nl, season, v2) !== before) bakeLater(S.W, S.H);
      else if (S.env) { S.env.Lnow = nl; sceneRunPasses(S.env, 'relight', [nl]); }   // v2: a refresh that needs no re-bake (flow density)
    },
    setSeason(s) { if (!s || s === season) return; season = s; if (S) bakeLater(S.W, S.H); },
    setLod(k) { if (k == null || k === lod) return; lod = k; if (S) bakeLater(S.W, S.H); },
    start() { if (running || destroyed) return; if (!S) api.resize(cssW, cssH); running = true; raf = requestAnimationFrame(loop); },
    stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    get running() { return running; },
    /** Draw one frame at time t (seconds). The still (reduced motion, tiles) is frame(0). */
    frame(t) { if (!S) api.resize(cssW, cssH); frame(t || 0); },
    /** Move this renderer to another canvas (a re-mounted host with the same key keeps its bitmaps). */
    attach(c2) {
      if (!c2 || c2 === canvas) return;
      const k = c2.getContext('2d', { alpha: false });
      if (!k) return;
      canvas = c2; ctx = k;
      if (S) { canvas.width = S.W; canvas.height = S.H; frame(o.still ? 0 : timeFn()); }
    },
    stats() {
      let bytes = 0;
      if (S) for (const sp of S.sprites) bytes += sp.bytes || 0;
      return { rid, drawMs: _sccStat(drawTimes), dynMs: _sccStat(dynTimes), bakeMs: st.bakeMs, maxSliceMs: st.maxSliceMs || 0, firstBakeMs: st.firstBakeMs, bakes: st.bakes, sprites: S ? S.sprites.size : 0, spriteBytes: bytes,
        bitmaps: S ? 1 + S.groups.filter(g => g.c).length : 0, blitPx: st.blitPx, animatedDraws: st.animatedDraws, actors: S ? S.C.actors.length : 0, placements: S ? S.C.items.length : 0,
        lightKey: S ? S.lk : null, size: S ? [S.W, S.H] : null, profile: o.profile ? Object.fromEntries(Object.entries(prof).map(([k, v]) => [k, k === 'frames' ? v : Math.round(v / Math.max(1, prof.frames) * 100) / 100])) : undefined,
        passes: S && S.env ? _sccPassStats(S.env) : undefined, governor: S && S.env ? { level: S.env.gov.level, log: S.env.gov.log.slice() } : undefined };
    },
    resetStats() { drawTimes.length = 0; dynTimes.length = 0; for (const k in prof) delete prof[k]; if (S && S.env) for (const k in S.env.passStats) { const p = S.env.passStats[k]; p.frameMs = 0; p.frames = 0; } },
    destroy() {
      api.stop(); destroyed = true;
      if (pending) pending.cancel = true;
      if (S) { for (const g of S.groups) if (g.c) g.c.width = 0; for (const s of S.strips || []) if (s.c) s.c.width = 0; if (S.sky) S.sky.width = 0; S = null; }
    },
  };
  return api;
}
/** sceneWind when the core has it, else a gentle sine (the renderer never fails on a missing core function). */
function sceneWindSafe(t, x, L) { return typeof sceneWind === 'function' ? sceneWind(t, x, L) : Math.sin(t + x * 0.003); }
const SCENE_W_SAFE = 1600, SCENE_H_SAFE = 900;

const _sccBoxes = new WeakMap();
/** The tight bounds of some parts of a resolved object (memoised per resolved form): a swaying crown's sprite is the crown, not the whole tree. */
function _sccPartsBox(sh, names, detail) {
  let memo = _sccBoxes.get(sh);
  if (!memo) { memo = new Map(); _sccBoxes.set(sh, memo); }
  const key = names.join(',') + (detail ? '' : '|nd');
  if (memo.has(key)) return memo.get(key);
  let b = null;
  for (const p of names) for (const s of sh.parts[p] || []) {
    if (!detail && s.detail) continue;
    const q = scenePathBox(s.d, s.m);
    if (!q) continue;
    const w = s.s ? (s.w || 1) / 2 + 1 : 1;
    b = b ? [Math.min(b[0], q[0] - w), Math.min(b[1], q[1] - w), Math.max(b[2], q[2] + w), Math.max(b[3], q[3] + w)] : [q[0] - w, q[1] - w, q[2] + w, q[3] + w];
  }
  if (b) b = [Math.max(b[0], sh.box[0] - 4), Math.max(b[1], sh.box[1] - 4), Math.min(b[2], sh.box[2] + 4), Math.min(b[3], sh.box[3] + 4)];
  memo.set(key, b);
  return b;
}
/** A placement's ground shadow along the live sun: a foot ellipse and a cast ellipse fading away (as K.shadow). */
function _sccShadow(gx, TG, it, L) {
  const def = typeof sceneObj === 'function' ? sceneObj(it.o) : null, sd = def && def.shadow;
  if (!sd) return;
  const s = it.s, w = (sd.rx || 20) * 2 * s, h = (sd.h || 40) * s, sh = L.shadow;
  gx.setTransform(...TG);
  gx.globalAlpha = 0.2 * (1 - (L.dark || 0) * 0.6); gx.fillStyle = '#14261e';
  gx.beginPath(); gx.ellipse(it.x, it.y, w / 2, Math.max(2, sd.ry ? sd.ry * s : w * 0.08), 0, 0, Math.PI * 2); gx.fill();
  if (!sh.op) { gx.globalAlpha = 1; return; }
  const Lg = Math.min(h * sh.len, h * 2.2), ax = sh.gx * Lg, ay = sh.gy * Lg * 0.3, rx = Math.max(w * 0.3, Math.hypot(ax, ay) / 2), ry = Math.max(2, Math.hypot(-sh.gy * w * 0.5, sh.gx * w * 0.15));
  // fading away from the foot, as the kit's shadowFade gradient
  gx.translate(it.x + ax / 2, it.y + ay / 2); gx.rotate(Math.atan2(ay, ax));
  const fade = gx.createLinearGradient(-rx, 0, rx, 0);
  fade.addColorStop(0, 'rgba(20,32,48,1)'); fade.addColorStop(0.55, 'rgba(20,32,48,0.7)'); fade.addColorStop(1, 'rgba(20,32,48,0)');
  gx.globalAlpha = sh.op; gx.fillStyle = fade;
  gx.beginPath(); gx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); gx.fill();
  gx.globalAlpha = 1;
}
/**
 * Lit windows and lamps of a placement (after real dusk), in the object's night colours, as its glowOn says. skip: parts
 * left out (an animated placement's moving parts, whose sprites carry their own lit glows).
 */
function _sccGlows(gx, M, it, skip, share) {
  const sh = sceneObjShapes(it.o, it.v, it.season), def = sceneObj(it.o), nc = (def && def.night && def.night.glow) || {};
  gx.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]);
  let gi = 0;
  // v2 (V2 7.3): each window has a seeded threshold and is lit while it is under the share of windows lit at this hour
  const on = share == null ? (k) => it.glowOn[k % it.glowOn.length] : (k) => _scHashS((it.seed | 0) + '|w|' + k) / 4294967296 < share;
  for (const p of sh.order) for (const s of sh.parts[p] || []) if (s.glow) {
    if (on(gi) && !(skip && skip.includes(p))) {
      if (s.m) { gx.save(); gx.transform(...s.m); }
      gx.globalAlpha = 1; gx.fillStyle = nc[s.glow] || (s.glow === 'lamp' ? '#ffe2a0' : '#ffd98a'); gx.fill(_sccPath(s.d));
      if (s.m) gx.restore();
    }
    gi++;
  }
}
/** A sign baked into its layer (8.3): board, frame, line-colour stripes, the name fitted with measureText. No circles. */
function _sccSign(gx, s, TG, vs, L) {
  const text = _scSignOk(s);
  if (text == null) return;
  const g = sceneSignLayout(s), col = c => _scCol(c, L);
  gx.setTransform(...TG); gx.globalAlpha = 1;
  if (g.post) { gx.fillStyle = col('#3a3f44'); gx.fillRect(...g.post); }
  gx.fillStyle = col(s.board || '#f4f1e8'); gx.fillRect(...g.board);
  if (g.frame) { gx.strokeStyle = col('#2a2e33'); gx.lineWidth = 1.5; gx.strokeRect(...g.board); }
  for (const b of g.bars) { gx.fillStyle = b[4]; gx.fillRect(b[0], b[1], b[2], b[3]); }
  // the text in device pixels (crisp), shrunk to fit, at least 9 px
  const font = (typeof SCENE_SIGN_FONT === 'string' ? SCENE_SIGN_FONT : '600 {px}px ' + SCENE_SIGN_FAMILY);
  let px = Math.max(9, g.fs * vs);
  gx.setTransform(1, 0, 0, 1, TG[4], TG[5]);
  gx.font = font.replace('{px}', px.toFixed(1));
  const wMax = g.tw * vs, wNow = gx.measureText(text).width;
  if (wNow > wMax) { px = Math.max(9, px * wMax / wNow); gx.font = font.replace('{px}', px.toFixed(1)); }
  gx.fillStyle = col(s.ink || '#1d2226'); gx.textAlign = 'center'; gx.textBaseline = 'middle';
  gx.fillText(text, g.text[0] * vs, g.text[1] * vs);
}
/** The water's moving light: shimmer strokes and the sun's or moon's glitter road, in three twinkle groups. */
function _sccWaterFx(w, L, vs, ox, oy, id) {
  const segs = [[], [], []], r = _scRndOf(_scHashS(id + '|w|' + w.y0)), cols = L && L.water ? L.water(w.base) : w.base;
  for (let i = 0; i < Math.min(40, w.shimmer || 0); i++) { const y = w.y0 + 4 + r() * (w.y1 - w.y0 - 8), x = -100 + r() * 1800; segs[i % 3].push([x, y, 10 + r() * 26]); }
  const road = [[], [], []];
  const src = L && w.lightPath ? (L.sun && L.sun.show && L.alt < 35 ? L.sun : L.moon && L.moon.show && L.moon.alt < 45 ? L.moon : null) : null;
  if (src) { const rr = _scRndOf(43); for (let i = 0; i < 30; i++) { const t = Math.pow(rr(), 0.8), y = w.y0 + t * (w.y1 - w.y0), hw = 60 * (0.3 + t * 1.6); road[i % 3].push([src.x + (rr() * 2 - 1) * hw, y, (6 + rr() * 16) * (0.4 + t)]); } }
  return { path: _sccPath(w.d), T: [vs, 0, 0, vs, ox, oy], segs, road, shim: _scMixHex(cols[0], '#ffffff', 0.5), roadCol: src ? (src === L.sun ? _scMixHex('#fff4d8', L.lowSun || '#ffffff', 0.4) : '#e8eef6') : null, k: src && src !== L.sun ? 0.6 * (L.moon.illum || 0) + 0.2 : 1 };
}
function _sccWaterFrame(ctx, w, t) {
  ctx.save();
  ctx.setTransform(...w.T);
  ctx.clip(w.path);
  ctx.lineCap = 'round';
  const draw = (sets, col, lw, op, k) => {
    ctx.strokeStyle = col; ctx.lineWidth = lw;
    sets.forEach((set, i) => {
      if (!set.length) return;
      ctx.globalAlpha = op * (0.45 + 0.55 * Math.abs(Math.sin(t * (1.2 + i * 0.5) + i)));
      const dx = Math.sin(t * 0.8 + i * 2) * 6 * k;
      ctx.beginPath();
      for (const s of set) { ctx.moveTo(s[0] + dx, s[1]); ctx.lineTo(s[0] + dx + s[2], s[1]); }
      ctx.stroke();
    });
  };
  draw(w.segs, w.shim, 1.6, 0.5, 1);
  if (w.roadCol) draw(w.road, w.roadCol, 2.4, 0.8 * w.k, 0.6);
  ctx.restore();
}
function _sccParticles(ctx, set, t, col, kind) {
  const byCol = new Map();
  for (const p of set) { let a = byCol.get(p.col); if (!a) byCol.set(p.col, a = []); a.push(p); }
  for (const [c, list] of byCol) {
    ctx.fillStyle = col(c); ctx.globalAlpha = kind === 'motes' ? 0.7 : 0.85;
    if (kind === 'snow' || kind === 'motes') { for (const p of list) { const q = sceneParticleAt(p, t); ctx.fillRect(q.x, q.y, p.size, p.size); } }
    else { ctx.beginPath(); for (const p of list) { const q = sceneParticleAt(p, t), a = t * p.f + p.ph; ctx.moveTo(q.x + p.size, q.y); ctx.ellipse(q.x, q.y, p.size, p.size * 0.55, a, 0, Math.PI * 2); } ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}
let _sccHit = null;
/**
 * The first row (device px) from which a group's ground paths cover the whole visible width down to the bottom: nearer
 * bitmaps hide everything farther below it, so farther blits and movers stop there. Geometry only (isPointInPath on a
 * scratch context: no raster, no read-back): 48 columns, a binary search for each column's top edge. Infinity: no full cover.
 */
function _sccOpaqueFromGround(C, layers, vs, ox, oy, W) {
  if (!_sccHit) { const c = _sccCanvas(1, 1); _sccHit = c.getContext('2d'); }
  const paths = C.ground.filter(g => layers.includes(g.layer)).map(g => _sccPath(g.d));
  if (!paths.length) return Infinity;
  const xa = -ox / vs, xb = (W - ox) / vs, yBottom = SCENE_H_SAFE - 1;
  let worst = -Infinity;
  for (let k = 0; k <= 47; k++) {
    const x = xa + (xb - xa) * k / 47;
    let best = Infinity;
    for (const p of paths) {
      if (!_sccHit.isPointInPath(p, x, yBottom)) continue;
      let lo = -200, hi = yBottom;                  // hi inside; find the highest y still inside (a convex-down ground band)
      if (_sccHit.isPointInPath(p, x, lo)) { best = lo; continue; }
      for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (_sccHit.isPointInPath(p, x, mid)) hi = mid; else lo = mid; }
      best = Math.min(best, hi);
    }
    if (!isFinite(best)) return Infinity;
    worst = Math.max(worst, best);
  }
  return Math.ceil((worst + 2) * vs + oy);
}

/* ---------- v2 hooks (V2 13; builder B): the env, the movers' places, the governor, the stats ---------- */
/** Reset the state a pass may leave on a context (transform, alpha, composite, filter). */
function _sccReset(cx) {
  if (!cx) return;
  cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
  if (cx.filter !== undefined && cx.filter !== 'none') cx.filter = 'none';
}
/**
 * The env of one v2 bake (V2 13.1), kept for its frames: { C, L, W, H, vs, ox, oy, T, lod, still, cam, groups, plan,
 * layerOfGroup, bitmapOf(layer), sprite(req) -> spr, keep(spr), slice(), placeM(x, y, s, flip), lights, waterExtra,
 * itemHaze, itemLift, flowNow, actorsNow, profile, own: { water: Set, shadows }, extraBox: [per layer], windowShare,
 * gov: { level, log }, passes (stage -> list), passStats, frameNo }.
 * req (env.sprite): { o, v, part ('*'), season, haze, tint, scale (device), flip, cls, lift, litGlow, withLit, plain }.
 */
function _sccEnv(a) {
  const C = a.C, L = a.L, n = C.items.length, plan = sceneBakePlan(C), layerOfGroup = [];
  plan.forEach((g, gi) => g.layers.forEach(l => { layerOfGroup[l] = gi; }));
  const so = typeof window !== 'undefined' && window.__sceneOpts ? window.__sceneOpts : {};
  const byLayer = C.layers.map(() => []);
  C.items.forEach((it, i) => byLayer[it.layer] && byLayer[it.layer].push(i));
  return { C, L, Lnow: L, W: a.W, H: a.H, vs: a.vs, ox: a.ox, oy: a.oy, T: a.T, lod: a.lod, still: a.still, cam: sceneRenderCam(C),
    groups: a.out.groups, plan, layerOfGroup, byLayer, out: a.out,
    bitmapOf: (layer) => a.out.groups[layerOfGroup[layer]] || null,
    sprite: a.sprite, itemSprite: a.itemSprite, keep: a.keep, slice: () => {}, placeM: a.placeM,
    lights: [], waterExtra: [], itemHaze: new Float32Array(n), itemLift: new Float32Array(n), flowNow: [], actorsNow: [], profile: a.profile,
    passes: {}, passStats: {}, broken: new Set(), frameNo: 0, t: 0, own: { water: new Set(), shadows: false }, extraBox: [],
    windowShare: L && Number.isFinite(L.windowShare) ? L.windowShare : null, liftCol: '#ffd9a0', flowK: 1, governor: { level: 0, flowMax: 1 },
    gov: { level: 0, log: [], hist: [], since: 0, calm: 0, enabled: a.governor !== false && !a.still && so.governor !== false, sw: !!so.flush } };
}
/**
 * The movers' places at t, before the frame passes (V2 13.2 item 6): actors (A's sceneActorAtV2 for ground paths, else the
 * v1 path) and flock birds; env.actorsNow gets one record per actor: { m, a, gi, x, y, s, dir, alpha, d, o, v, cls, sp, box, speed }.
 */
function _sccMoversNow(env, S, t, L) {
  env.frameNo++; env.t = t; env.actorsNow.length = 0;
  const cam = env.cam;
  S.groups.forEach((g, gi) => {
    for (const m of g.movers) {
      if (m.kind === 'actor') {
        const a = m.actor;
        let p = null;
        if (a.ground && typeof sceneActorAtV2 === 'function') {
          try { const q = sceneActorAtV2(a, t, cam); if (q) p = { x: q.X != null ? q.X : q.x, y: q.Y != null ? q.Y : q.y, s: q.s, dir: q.dir != null ? q.dir : q.flip ? -1 : 1, alpha: q.alpha == null ? 1 : q.alpha, d: q.d }; } catch (e) { p = null; }
        }
        if (!p) p = sceneActorAt(a, t);
        m.p = p; m.y = p.y;
        const d = Number.isFinite(p.d) ? p.d : sceneCamDepthAt(cam, p.y);
        env.actorsNow.push({ m, a, gi, x: p.x, y: p.y, s: p.s, dir: p.dir, alpha: p.alpha == null ? 1 : p.alpha, d, o: a.o, v: a.v, cls: a.cls || sceneObjClassOf(a.o),
          sp: m.parts && m.parts[0] ? m.parts[0].sp : null, box: m.box, speed: a.speed || 0 });
      } else if (m.kind === 'bird') { const p = sceneFlockAt(m.flock, m.i, t); m.p = p; m.y = p.y; }
    }
  });
}
/**
 * The quality governor (V2 13.2 item 9; never in stills, captures or o.governor === false): when the median dynMs over the
 * last 2 s passes 6 ms (x 1.75 under software raster) it steps down one level (1 ripple at 7.5 Hz, 2 rings off, 3 projected
 * actor shadows become blobs, 4 flows x 0.7: env.flowK); after 10 s under 4 ms it steps back up. Each step is logged once.
 */
function _sccGovern(env, dyn, o) {
  const g = env.gov;
  if (!g.enabled) return;
  const now = _sccNow();
  g.hist.push([now, dyn]);
  while (g.hist.length && now - g.hist[0][0] > 2000) g.hist.shift();
  if (now - g.since < 1000 || g.hist.length < 20) return;
  const v = g.hist.map(h => h[1]).sort((a, b) => a - b), med = v[Math.floor(v.length / 2)], lim = 6 * (o.flush || g.sw ? 1.75 : 1);
  if (med > lim && g.level < 4) { g.level++; g.since = now; g.calm = 0; g.hist.length = 0; g.log.push({ level: g.level, dir: 'down', medianMs: Math.round(med * 100) / 100 }); }
  else if (g.level > 0 && med < 4) { if (!g.calm) g.calm = now; else if (now - g.calm > 10000) { g.level--; g.calm = 0; g.since = now; g.log.push({ level: g.level, dir: 'up', medianMs: Math.round(med * 100) / 100 }); } }
  else g.calm = 0;
  env.flowK = g.level >= 4 ? 0.7 : 1;
  env.governor = { level: g.level, flowMax: env.flowK };
}
/** r.stats().passes: per pass { bakeMs, frameMs (mean per frame), draws (the last frame), frames } plus what its stats(env) adds. */
function _sccPassStats(env) {
  const r = v => Math.round(v * 100) / 100, out = {};
  for (const [id, p] of Object.entries(env.passStats)) out[id] = { bakeMs: r(p.bakeMs), frameMs: r(p.frameMs / Math.max(1, p.frames)), draws: p.draws, frames: p.frames };
  for (const p of sceneRenderPasses('stats', env.C)) { try { out[p.id] = Object.assign(out[p.id] || {}, p.stats(env)); } catch (e) { /* no stats */ } }
  return out;
}
