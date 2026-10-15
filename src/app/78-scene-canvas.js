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
     sceneRasterImage(key)   sceneRasterWhenReady()   (raster objects: lazy decoding of the embedded images; r.waiting while one decodes)

   Bake canvases (sprites, bitmaps) are CPU-backed (willReadFrequently): 2D canvases record their drawing and
   rasterise it on first use, so the bake forces that work inside its own slices with a 1-pixel read (cheap on the
   CPU, a stall on a GPU canvas); otherwise the first frame after a swap would pay for the whole bake. The main
   canvas stays GPU-backed where the browser can. Layer bitmaps hide what is farther: below the first row where a
   group's ground covers the whole width (found from the geometry with isPointInPath), farther bitmaps, stars,
   clouds and movers are not drawn.

   stats(): { drawMs, dynMs: { median, p95, max, n }, bakeMs, firstBakeMs, bakes, sprites, spriteBytes, bitmaps,
              blitPx, animatedDraws, occDraws (the depth-order redraws over movers), actors, placements }
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
const SCENE_SPRITE_CAP_BYTES = 384 * 1024 * 1024, SCENE_BACKING_MAX = [3840, 2160], SCENE_SLICE_MS = 8;
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
/** A context that draws nothing (a restored bitmap's own drawing code runs for its side effects only: the stars' places). */
const _sccNullGrad = { addColorStop() {} };
const _sccNullCx = typeof Proxy === 'function' ? new Proxy({}, { get: (t, k) => (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createConicGradient' ? () => _sccNullGrad : () => {}), set: () => true }) : null;
/** Free a baked state's bitmaps (its groups, their wind strips, the sky); restored ones are closed. */
function _sccFreeState(st) {
  if (st.borrowed) return;   // a prebaked restore: the player owns those bitmaps (78-scene-player.js)
  for (const g of st.groups) { _sccFree(g.c); for (const s of g.strips || []) _sccFree(s.c); }
  _sccFree(st.sky);
  if (st.kept) for (const b of st.kept) _sccFree(b);
}
/** Free a bitmap: a canvas gives up its pixels, an ImageBitmap (a restored one) is closed. */
function _sccFree(c) {
  if (!c) return;
  try { if (typeof c.getContext !== 'function' && typeof c.close === 'function') c.close(); else c.width = 0; } catch (e) { /* gone */ }
}
function _sccStat(a) {
  if (!a.length) return { median: 0, p95: 0, max: 0, n: 0 };
  const s = a.slice().sort((x, y) => x - y), q = p => s[Math.min(s.length - 1, Math.floor(s.length * p))];
  const r = v => Math.round(v * 100) / 100;
  return { median: r(q(0.5)), p95: r(q(0.95)), max: r(s[s.length - 1]), n: s.length };
}
const _sccIdle = (fn) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: 120 }) : setTimeout(fn, 16));
/** The next task as soon as the browser can (a full-screen scene about to show: its slices back to back, frames in between). */
const _sccSoon = (() => {
  if (typeof MessageChannel !== 'function') return (fn) => setTimeout(fn, 0);
  let ch = null;
  const q = [];
  return (fn) => {
    if (!ch) { ch = new MessageChannel(); ch.port1.onmessage = () => { const f = q.shift(); if (f) f(); }; }
    q.push(fn); ch.port2.postMessage(0);
  };
})();
/** Resolves once a canvas's recorded drawing has gone to the raster (a snapshot: no pixel read-back, so a GPU canvas never stalls). */
function _sccFlushAsync(c) {
  try { if (typeof createImageBitmap === 'function' && c && c.width && c.height) return createImageBitmap(c, 0, 0, 1, 1).then(b => { try { b.close(); } catch (e) { /* gone */ } }, () => {}); }
  catch (e) { /* no snapshot: the next frame does it */ }
  return new Promise(r => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => r()) : setTimeout(r, 16)));
}
// The warm-up's sample times (seconds after now): every scripted act of a scene shows at least once (cycles of 6.8 to 26 s), so
// what a frame builds on first sight (flow sprites, shadow silhouettes, wakes, reflections) is built before the canvas shows.
const _SCC_WARM_T = [0, 0.5, 1.1, 1.7, 2.3, 2.9, 3.6, 4.3, 5.1, 6, 7.2, 8.5, 9.9, 10.6, 11.4, 12.3, 13.5, 15, 17, 19.5, 22, 24.5, 27, 31];
const _SCC_WARM_BYTES = 48 * 1024 * 1024;
let _sccWarmCx = null;   // the warm-up's unseen frames draw here (1 x 1: the first-sight sprites are made, nothing is rasterised)   // sprite pixels sent to the raster per warm-up step (a few frames for a whole scene)
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
  let raf = 0, running = false, destroyed = false, t0 = _sccNow(), warming = false, warmed = null, shown = false;
  const prof = {}, drawTimes = [], dynTimes = [], st = { bakeMs: 0, firstBakeMs: 0, bakes: 0, blitPx: 0, animatedDraws: 0 };
  // the last bake's phases (ms of CPU on the main thread; the load profiler, tools/scene-load-profile.mjs, reads them)
  let ph = {}, phNew = { sprites: 0, bytes: 0 };
  const phAdd = (k, ms) => { ph[k] = (ph[k] || 0) + ms; };
  let tl0 = 0;
  const tl = (label) => { (ph.tl || (ph.tl = [])).push(label + '@' + Math.round(_sccNow() - tl0)); };
  const timeFn = o.time || (() => (_sccNow() - t0) / 1000), rid = ++_sccRid;
  // prebaked scenes (78-scene-player.js): o.restore(W, H, job) -> Promise<R | null> gives the bake's bitmaps (no compile cache, no
  // static drawing); o.spriteVs: the device scale the build rasterised the frame sprites at (sprite keys and scales use it, so the
  // pre-rasterised sprites are found at any screen size); MX: the second light key's bitmaps blended over (setMix)
  let scK = 1, MX = null;

  const compile = () => fixed || sceneCompile(data, { season, lod, L });
  /** Device size of the backing store for a css size (dpr-aware, capped at 2560 x 1440). */
  const deviceSize = (w, h) => {
    let W = Math.max(1, Math.round(w * dpr)), H = Math.max(1, Math.round(h * dpr));
    // capped by pixel count, not by width, so ultrawide (21:9, 32:9) screens draw at their real resolution
    const k = Math.min(1, Math.sqrt((SCENE_BACKING_MAX[0] * SCENE_BACKING_MAX[1]) / (W * H)));
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
    if (!f) { const memo = new Map(); f = c => { let v = memo.get(c); if (!v) { v = typeof sceneColour === 'function' ? sceneColour(c, { L: Lx, haze, tint }) : c; if (lift) v = _scMixHex(v, liftCol || '#ffd9a0', lift); memo.set(c, v); } return v; }; 
      // ng: tint and haze without the light's grade (a raster object's own night image is already a night picture)
      f.ng = c => (typeof sceneColour === 'function' ? sceneColour(c, { haze, tint, hazeCol: Lx.haze }) : c);
      colourFns.set(key, f); }
    return f;
  };
  const paint = (cx, p, col) => {
    if (typeof p === 'string') return col(p);
    const stops = p.lin || p.rad, g = p.lin ? cx.createLinearGradient(p.x1 || 0, p.y1 || 0, p.x2 || 0, p.y2 != null ? p.y2 : 1) : cx.createRadialGradient(p.cx || 0, p.cy || 0, 0, p.cx || 0, p.cy || 0, p.r || 1);
    for (const [off, c, op] of stops) { const rgb = _scHex(col(c)); g.addColorStop(_scClamp(off, 0, 1), op == null || op === 1 ? col(c) : `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${op})`); }
    return g;
  };
  let rasterWait = false;   // a raster image was not decoded yet during this bake: bake again once it is (sceneRasterWhenReady)
  const drawShape = (cx, sh, col, Lx) => {
    if (sh.img) { if (!_sccRasterDraw(cx, sh, col, Lx)) rasterWait = true; return; }
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
    if (scK !== 1) sc *= scK;
    let key = sceneSpriteKey(oid, v, which + (litGlow ? '+g' : '') + (withLit ? '+l' : ''), se, haze, tint, sc, lk), req = null;
    if (x && x.env) {
      const env = x.env, sp = env.passes.sprite || (env.passes.sprite = sceneRenderPasses('sprite', env.C));
      req = { o: oid, v, part: which, season: se, haze, tint, scale: sc, flip: !!x.flip, cls: x.cls || null, lift: x.lift || 0, i: x.i };
      if (sp.length) key += '|f' + (x.flip ? 1 : 0) + sceneRenderSpriteKey(Lx, env.C, req);
      if (x.lift) key += '|l' + x.lift;
      if (!sp.length && !x.lift) req = null;
    }
    const sp = sceneSprites.get(key, () => {
      const ta = _sccNow();
      try { const r = buildSprite(); if (r && r.c) { phNew.sprites++; phNew.bytes += r.bytes; } return r; } finally { phAdd('spritesMs', _sccNow() - ta); }
    });
    function buildSprite() {
      const sh = sceneObjShapes(oid, v, se);
      if (!sh) return null;
      const names = (which === '*' ? _scStillParts(sh) : which.startsWith('rest:') ? _scStillParts(sh).filter(p => !which.slice(5).split(',').includes(p)) : [which])
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
      const litCol = (typeof sceneLitColourFn === 'function' && sceneLitColourFn(Lx, oid)) || plain;   // v2 light only (V2 7.3): mist kept in 'lit' is not a light
      let any = false;
      const waitBefore = rasterWait;
      rasterWait = false;
      for (const p of names) for (const s0 of sh.parts[p] || []) {
        if (!detail && s0.detail) continue;
        if (litGlow && s0.glow) drawShape(cx, Object.assign({}, s0, { f: nc[s0.glow] || (s0.glow === 'lamp' ? '#ffe2a0' : '#ffd98a'), s: null, op: 1 }), plain, Lx);
        else drawShape(cx, s0, p === 'lit' ? litCol : col, Lx);
        any = true;
      }
      // an image still decoding: no sprite this time (not cached); the bake runs again when the image is ready
      if (rasterWait) { c.width = 0; return null; }
      rasterWait = waitBefore;
      if (!any) { c.width = 0; return { c: null, x0, y0, w: 0, h: 0, sc: k, bytes: 0 }; }
      if (req) {
        // the sprite passes (V2 13.1): shading, rim light, snow caps, frost; they see the box in device px and the local frame
        // (a 'lit' sprite too, req.part 'lit': the atmos pass softens floodlights and drops ground pools it draws itself)
        Object.assign(req, { k, x0: x0 - _SCC_PAD / k, y0: y0 - _SCC_PAD / k, w, h, box: tb, shapes: sh });
        cx.globalAlpha = 1;
        sceneRunPasses(x.env, 'sprite', [cx, req]);
        cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; cx.filter = 'none';
      }
      return { c, x0: x0 - _SCC_PAD / k, y0: y0 - _SCC_PAD / k, w: w / k, h: h / k, sc: k, bytes: w * h * 4 };
    }
    if (!sp && sceneObjShapes(oid, v, se)) rasterWait = true;
    return sp;
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
        const on = night && (Array.isArray(dr.glowOn) ? !!dr.glowOn[gi % dr.glowOn.length] : _sccWindowU((it.seed | 0) + '|g|' + gi) < (share == null ? 0.6 : share));
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
  // R (a restore from the persistent cache, 78-scene-cache.js): { meta, get(name) -> ImageBitmap | null }. A restored group keeps
  // its bitmap and skips every static draw (and the sprites only those need); the movers, actors, flocks, signs and the passes'
  // frame state are built as usual (the passes' 'restore' stage takes what they kept: the water's reflection and mask).
  function* bake(W, H, Lx, C, R) {
    rasterWait = false;
    // v2 (V2 13): a v2 compiled scene, or a v1 one with fx, runs the render passes at the hook points below; v1: none of it
    const v2 = typeof sceneRenderIsV2 === 'function' && typeof sceneRunPasses === 'function' && sceneRenderIsV2(C);
    const lk = sceneLightKey(Lx, C.season, v2 ? C : undefined), vs = Math.max(W / SCENE_W_SAFE, H / SCENE_H_SAFE), ox = (W - SCENE_W_SAFE * vs) / 2, oy = (H - SCENE_H_SAFE * vs) / 2;
    scK = o.spriteVs ? o.spriteVs / vs : 1;
    const T = [vs, 0, 0, vs, ox, oy];                     // scene units -> device px
    const placeM = (x, y, s, flip) => [vs * s * (flip ? -1 : 1), 0, 0, vs * s, vs * x + ox, vs * y + oy];
    const out = { W, H, vs, ox, oy, lk, L: Lx, C, groups: [], sky: null, stars: [], clouds: [], strips: [], particles: null, rain: null, snow: null, opaque: [], sprites: new Set(), frameSprites: new Set() };
    // the season's life (user request, 9 Oct): the snow particles and the insects this day keeps; its key re-bakes (setLight)
    const life = _sccLife(Lx, C);
    out.life = life.key;
    // keep: a sprite a frame draws (the warm-up sends it to the raster); keepStatic: one only the bake draws (into a bitmap)
    const keep = (sp) => { if (sp && sp.c) { out.sprites.add(sp); out.frameSprites.add(sp); } return sp; };
    const keepStatic = (sp) => { if (sp && sp.c) out.sprites.add(sp); return sp; };
    const env = v2 ? _sccEnv({ C, L: Lx, W, H, vs, ox, oy, T, out, keep, placeM, lod, still: !!o.still, profile: !!o.profile, governor: o.governor, restoring: !!R,
      sprite: (req) => sprite(Lx, lk, req.o, req.v || 0, req.season || C.season, req.part || '*', req.haze || 0, req.tint || null, req.scale, !!req.litGlow, !!req.withLit, req.plain ? null : { env, flip: req.flip, lift: req.lift || 0, cls: req.cls, i: req.i }),
      // the very sprite item i is drawn with (the shadow and water passes reuse it: no extra rasterising)
      itemSprite: (i) => { const it = C.items[i]; return keepStatic(sprite(Lx, lk, it.o, it.v, it.season, '*', v2Haze(i, it, hz(it.layer)), it.tint, bucket(it.s) * vs, false, false, { env, flip: it.flip, lift: v2Lift(i), cls: it.cls, i })); } }) : null;
    if (env) {
      out.env = env;
      // one pass at a time, a yield between (a slice may end there: the flows' and the water's prebake are each a few ms)
      const pre = sceneRenderPasses('prebake', C);
      for (const p of pre) { env.passes.prebake = [p]; sceneRunPasses(env, 'prebake', []); yield; }
      env.passes.prebake = pre;
    }
    // the v2 haze (V2 7.1) and lift (7.4) of an item: from the passes' per-item arrays (bucketed), not the layer's haze
    // (a v1 scene that runs passes only for its winter weather keeps its layers' haze: no atmosphere pass fills itemHaze)
    const v1Haze = C.v !== 2 && !(C.fx && Object.keys(C.fx).some(k => C.fx[k] === 2)) && typeof _scwxPLite === 'function' && _scwxPLite(C);
    const v2Haze = (i, it, layerHaze) => (env && !v1Haze && it.haze == null ? Math.round((env.itemHaze[i] || 0) * 10) / 10 : layerHaze);
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
    let since = 0, phName = 'sky', phT = _sccNow();
    const phMark = (name) => { const n = _sccNow(); phAdd(phName + 'Ms', n - phT); phName = name; phT = n; };
    const slice = function* (cx) {
      if (cx && ++since % 8 === 0) flushCx(cx);
      if (_sccNow() - tick > SCENE_SLICE_MS) { if (cx) flushCx(cx); phAdd(phName + 'Ms', _sccNow() - phT); yield; tick = phT = _sccNow(); }
    };

    // 1. the sky bitmap: gradient, the sun's glow and disc, the moon in its real phase (stars and clouds move: per frame)
    const skyKept = R ? R.get('sky') : null;
    const sky = skyKept || _sccCanvas(W, H), sx = skyKept ? _sccNullCx : sky.getContext('2d', { alpha: false, willReadFrequently: true });
    const hor = sceneSkyPaint(sx, Lx, C, T, !!skyKept);
    if (Lx && C.sky) {
      // stars (positions now, twinkle per frame), by darkness, fewer under a bright moon or cloud
      const ns = Math.min(220, Math.round((C.sky.stars || 0) * (Lx.stars || 0) * Math.max(0.3, lod)));
      const r = _scRndOf(41);
      for (let i = 0; i < ns; i++) { const x = -100 + r() * 1800, y = Math.pow(r(), 1.4) * (hor - 30), s = 0.7 + r() * 1.2; out.stars.push([x * vs + ox, y * vs + oy, Math.max(1, s * vs * 1.2), i % 3]); }
    }
    if (!skyKept) flushCx(sx);
    // clouds: the scene's own natural sky (sceneCloudPlan: kinds by cover, depth bands, lit by the light), each painted once
    // into its own sprite here, a slice per cloud; a frame drifts them (one drawImage each)
    phMark('clouds');
    let ci = 0;
    for (const p of sceneCloudPlan(C, Lx)) {
      const kept = R ? R.get('cl' + ci) : null;
      ci++;
      const c = kept || _sccCloudSprite(p, vs);
      out.clouds.push({ c, w: p.w, h: p.h, x0: p.x0, y: p.y, sp: p.sp, kind: p.kind, band: p.band });
      out.sprites.add({ c, bytes: c.width * c.height * 4 });
      if (!kept) flushCx(c.getContext('2d'));
      yield* slice();
    }
    out.sky = sky;
    yield* slice();

    // 2. the land: bake groups (sceneBakePlan), each bitmap cropped to what it draws
    phMark('layers');
    const plan = sceneBakePlan(C), byLayer = C.layers.map(() => []);
    const actorsB = typeof sceneMotionFixed === 'function' ? sceneMotionFixed(C) : C.actors, actorLays = actorsB.map(a => _sccActorLayers(C, a)), actorCopies = actorsB.map(() => []);
    // the crowd pass's one-off work (its nav grids and the movers' groups, memoised per scene) in the bake, not the first frame
    if (env && typeof sceneXCrowdAt === 'function' && actorsB.length > 1) { try { sceneXCrowdAt(C, 0, Lx, { actors: actorsB, cam: env.cam }); } catch (e) { /* the frame will try again */ } yield* slice(); }
    let occOrd = 0;
    C.items.forEach((it, i) => byLayer[it.layer] && byLayer[it.layer].push(i));
    const layerOfGroup = [];
    plan.forEach((gr, gi) => gr.layers.forEach(l => { layerOfGroup[l] = gi; }));
    // a v1 scene's backdrop (70-scene-lib-backdrops.js; a v2 scene has it as direct items): drawn into its farthest layer after its ground
    const bd1 = C.v !== 2 && typeof sceneBackdropV1 === 'function' ? sceneBackdropV1(C) : null;
    const bdL = bd1 ? Math.min(...plan.flatMap(gr => gr.layers)) : -1;   // the farthest layer the plan bakes
    for (let gi = 0; gi < plan.length; gi++) {
      const gr = plan[gi], rg = R ? R.meta.groups[gi] : null;
      // the crop: ground, water, signs and every item drawn into this bitmap (a restored group: its kept layout)
      let bb = null;
      if (!rg) for (const l of gr.layers) {
        for (const gd of C.ground) if (gd.layer === l) bb = union(bb, scenePathBox(gd.d));
        for (const w of C.water) if (w.layer === l) bb = union(bb, scenePathBox(w.d));
        for (const s of C.signs) if (s.layer === l) bb = union(bb, [s.x - s.w, s.y - s.h * 3, s.x + s.w, s.y + s.h]);
        if (bd1 && bdL === l) for (const it of bd1.items) bb = union(bb, it.direct.box);
        let n = 0;
        for (const i of byLayer[l]) { const it = C.items[i]; if (it.strip >= 0) continue; const sh = sceneObjShapes(it.o, it.v, it.season); if (sh) bb = union(bb, itemBox(it, sh)); if (++n % 256 === 0) yield* slice(); }
        if (env) {
          // v2: projected buildings (direct fills) and what the passes draw beyond the items (long shadows, water edges)
          for (const i of byLayer[l]) { const it = C.items[i]; if (it.direct && it.direct.box) bb = union(bb, it.direct.box); }
          if (env.extraBox[l]) bb = union(bb, env.extraBox[l]);
        }
      }
      const db = rg ? (rg.w ? [rg.x, rg.y, rg.x + rg.w, rg.y + rg.h] : null) : bb ? clipBox(box(bb)) : null;
      const grp = { layers: gr.layers, c: null, x: 0, y: 0, w: 0, h: 0, movers: [], strips: [], water: [], opaqueY: H + 1, kept: !!rg };
      out.groups.push(grp);
      if (db && db[2] > db[0] && db[3] > db[1]) {
        grp.x = db[0]; grp.y = db[1]; grp.w = db[2] - db[0]; grp.h = db[3] - db[1];
        grp.c = rg ? R.get('g' + gi) : _sccCanvas(grp.w, grp.h);
      }
      // a restored group draws nothing into its bitmap (no ground, water, shadows, static sprites, glows, layer passes)
      const gx = grp.c && !rg ? grp.c.getContext('2d', _SCC_CPU) : null;
      const toG = (M) => [M[0], M[1], M[2], M[3], M[4] - grp.x, M[5] - grp.y];
      const TG = toG(T);
      if (env) { env.grp = grp; env.gi = gi; env.gx = gx; env.TG = TG; }
      for (const l of gr.layers) {
        const haze = hz(l), col = colourFn(Lx, haze, null);
        if (gx) {
          // ground
          for (const gd of C.ground) if (gd.layer === l) { gx.setTransform(...TG); gx.globalAlpha = 1; gx.fillStyle = paint(gx, gd.fill, col); gx.fill(_sccPath(gd.d)); }
          if (bd1 && bdL === l) for (const it of bd1.items) drawDirect(gx, TG, it, col, Lx, null);
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
              for (const i of byLayer[l]) { const it = C.items[i]; if (!it.reflect || it.y > w.y0 + 8 || it.strip >= 0) continue; const sp = keepStatic(sprite(Lx, lk, it.o, it.v, it.season, '*', haze, it.tint, bucket(it.s) * vs, false)); const M = placeM(it.x, it.y, it.s, it.flip); gx.setTransform(M[0], 0, 0, -M[3], M[4] - grp.x, 2 * Y - M[5] + grp.y); if (sp && sp.c) gx.drawImage(sp.c, sp.x0, sp.y0, sp.w, sp.h); }
              gx.setTransform(...TG); gx.globalAlpha = 0.25; gx.fillStyle = cols[1]; gx.fill(wp);
              gx.restore();
            }
            if (w.shimmer || w.lightPath) grp.water.push(_sccWaterFx(w, Lx, vs, ox, oy, C.id));
          }
          // shadows along the live sun (static: baked)
          // (shared fix, 9 Oct) never on water: the long golden-hour strips of the far bank's trees lay across ponds as dark
          // stripes and ovals; the water of this layer and the farther ones is clipped out (even-odd: the frame minus the water)
          if (Lx && Lx.shadow && !(env && env.own.shadows) && byLayer[l].some(i => C.items[i].shadow)) {
            const wet = C.water.filter(w => w.layer <= l && w.d);
            if (wet.length) { const clip = new Path2D('M-4000 -4000H6000V6000H-4000Z'); for (const w of wet) clip.addPath(_sccPath(w.d)); gx.save(); gx.setTransform(...TG); gx.clip(clip, 'evenodd'); }
            for (const i of byLayer[l]) { const it = C.items[i]; if (it.shadow) _sccShadow(gx, TG, it, Lx); }
            if (wet.length) gx.restore();
          }
          // v2: the passes under the layer's objects (water 20, shadows 30)
          if (env) { sceneRunPasses(env, 'layer:under', [l, gx, 'under']); _sccReset(gx); }
        } else if (rg) {
          // restored: the v1 water's moving light still plays (its stillness is in the bitmap)
          for (const w of C.water) if (w.layer === l && !(env && env.own.water.has(w)) && (w.shimmer || w.lightPath)) grp.water.push(_sccWaterFx(w, Lx, vs, ox, oy, C.id));
        }
        // the items: static ones into the bitmap; moving parts into the group's draw list
        for (const i of byLayer[l]) {
          const it = C.items[i];
          if (it.strip >= 0) continue;
          if (env && it.direct) { if (gx) drawDirect(gx, TG, it, colourFn(Lx, v2Haze(i, it, hz(l)), it.tint, false, v2Lift(i), env.liftCol), Lx, env.windowShare); yield* slice(gx); continue; }
          const x2 = env ? { env, flip: it.flip, lift: v2Lift(i), cls: it.cls, i } : undefined, haze = env ? v2Haze(i, it, hz(l)) : hz(l);
          // a floater on the water sits in it (10 Oct): drawn its sink lower, clipped at its waterline
          const fcls = it.cls || (typeof sceneObjClassOf === 'function' ? sceneObjClassOf(it.o) : null);
          const sinkU = fcls === 'bird-water' || fcls === 'boat' ? _sccSinkOf(C, it.o, it.x, it.y, it.g && it.g.d) : 0, wl = sinkU ? it.y * vs + oy : null;
          const M = _sccSunk(placeM(it.x, it.y, it.s, it.flip), sinkU), sc = bucket(it.s) * vs;
          const moving = it.anim && it.anim.length ? it.anim : null;
          const night = !!(Lx && Lx.windows);
          let skip = null, litMoves = false;
          // (flat ground marks, leaf litter and seasonal cover lie in front of a mover's feet, never over it: not occluders)
          const flat = it.cls === 'cover' || (/^ground\./.test(it.o) && !/log|fallen|stone|rock|boulder/.test(it.o));
          const shI = flat ? null : sceneObjShapes(it.o, it.v, it.season), occ = (which) => { if (shI) _sccOccAdd(grp, { ord: occOrd++, layer: l, z: it.z != null ? it.z : it.y, box: box(itemBox(it, shI)), M, wl, Lx, lk, o: it.o, v: it.v, season: it.season, which, haze, tint: it.tint, sc, x2, sp: null }); };
          if (!moving) { if (gx) _sccAbove(gx, wl == null ? null : wl - grp.y, () => drawSprite(gx, keepStatic(sprite(Lx, lk, it.o, it.v, it.season, '*', haze, it.tint, sc, false, false, x2)), toG(M))); occ('*'); }
          else {
            // after real dusk: the moving sprites carry their lit glows (every one, when any of the placement's is on) and, for
            // a whole-object hook, the lit part; the parts that stay get their glows in the bitmap below, as a static placement
            const whole = moving.find(a => _scAnimParts(a)[0] === '*'), moved = whole ? [] : [...new Set(moving.flatMap(_scAnimParts))];
            if (!whole && gx) _sccAbove(gx, wl == null ? null : wl - grp.y, () => drawSprite(gx, keepStatic(sprite(Lx, lk, it.o, it.v, it.season, 'rest:' + moved.join(','), haze, it.tint, sc, false, false, x2)), toG(M)));
            if (!whole) occ('rest:' + moved.join(','));
            const lit = night && !!it.glowOn && it.glowOn.some(Boolean);
            litMoves = !!whole && night && it.lit; skip = whole ? sceneObjShapes(it.o, it.v, it.season).order : moved;
            const parts = whole ? [{ a: whole, sp: keep(sprite(Lx, lk, it.o, it.v, it.season, '*', haze, it.tint, sc, lit, litMoves, x2)) }]
              : moving.flatMap(a => _scAnimParts(a).map((p, j) => ({ a, j, sp: keep(sprite(Lx, lk, it.o, it.v, it.season, p, haze, it.tint, sc, lit, false, x2)) })));
            grp.movers.push({ kind: 'item', y: it.y, x: it.x, M, parts, b: itemBox(it, sceneObjShapes(it.o, it.v, it.season)), z: it.z != null ? it.z : it.y, layer: l, wl });
          }
          if (gx && night) {
            if (it.lit && !litMoves) drawSprite(gx, keepStatic(sprite(Lx, lk, it.o, it.v, it.season, 'lit', 0, null, sc, false, false, x2 ? { env, flip: it.flip, lift: 0, cls: it.cls, i } : undefined)), toG(M));
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
        // actors and flocks of this layer: moving every frame (a v2 ground actor in each group its depth bands reach, 10 Oct)
        for (let ai = 0; ai < actorsB.length; ai++) {
          const a = actorsB[ai];
          if (!actorLays[ai].includes(l) || actorCopies[ai].includes(gi)) continue;
          if (_sccBugOff(life, a.o)) continue;   // out of its months, by night, in the wet or the cold
          const sh = sceneObjShapes(a.o, a.v, C.season); if (!sh) continue;
          const sMax = (a.s || 1) * (a.sByY ? Math.max(...a.sByY.map(p => p[1])) : 1), sc = bucket(sMax) * vs, lit = !!(Lx && Lx.windows);
          // the lit part rides in the rest sprite (it moves with the body, at no extra draw)
          const mkParts = (oid, vv, anim, shp) => {
            const whole = anim.find(h => _scAnimParts(h)[0] === '*'), moved = [...new Set(anim.flatMap(_scAnimParts))].filter(p => p !== '*');
            return [{ a: whole || null, sp: keep(sprite(Lx, lk, oid, vv, C.season, moved.length ? 'rest:' + moved.join(',') : '*', hz(l), null, sc, lit, lit && !!(shp.parts.lit && shp.parts.lit.length))), rest: true }]
              .concat(anim.filter(h => _scAnimParts(h)[0] !== '*').flatMap(h => _scAnimParts(h).map((p, j) => ({ a: h, j, sp: keep(sprite(Lx, lk, oid, vv, C.season, p, hz(l), null, sc, lit)) }))));
          };
          const parts = mkParts(a.o, a.v, a.anim || [], sh);
          // the other views (4.3: front, back, three-quarter), built on first use: { parts, box, k (drawn-height ratio) } by object
          const viewOf = (oid, vv) => {
            const vsh = sceneObjShapes(oid, vv, C.season);
            if (!vsh) return null;
            const anim = (a.anim && a.anim.length) ? (vsh.anim || []) : [], hb = (b) => Math.max(1e-3, b[3] - b[1]);
            return { parts: mkParts(oid, vv, anim, vsh), box: vsh.box, k: hb(sh.box) / hb(vsh.box) };
          };
          actorCopies[ai].push(gi);
          grp.movers.push({ kind: 'actor', actor: a, parts, box: sh.box, y: 0, gi, copies: actorCopies[ai], layer: l, sinkU: typeof sceneMoverSize === 'function' ? sceneMoverSize(a.o).sink : 0, viewOf, views: new Map() });
        }
        for (const f of C.flocks) if (f.layer === l) {
          if (_sccBugOff(life, f.o)) continue;
          const sh = sceneObjShapes(f.o, 0, C.season); if (!sh) continue;
          const sc = bucket((f.s || 0.5) * 1.15) * vs, flap = (sh.anim || []).find(h => h.kind === 'flap');
          const parts = flap ? [{ sp: keep(sprite(Lx, lk, f.o, 0, C.season, 'rest:' + flap.part, hz(l), null, sc, false)), rest: true }, { a: Object.assign({ period: 0.5, phase: 0, pivot: [0, 0] }, flap), sp: keep(sprite(Lx, lk, f.o, 0, C.season, flap.part, hz(l), null, sc, false)) }]
            : [{ sp: keep(sprite(Lx, lk, f.o, 0, C.season, '*', hz(l), null, sc, false)), rest: true }];
          for (let i = 0; i < f.n; i++) grp.movers.push({ kind: 'bird', flock: f, i, parts, box: sh.box, y: 0 });
        }
      }
      // wind strips of this group's layers: one bitmap each, skewed per frame
      phMark('strips');
      if (rg) for (const [k, s] of (rg.strips || []).entries()) {
        const c = R.get('s' + gi + '.' + k);
        if (c) { grp.strips.push(s.dw ? { c, x: s.x, y: s.y, base: s.base, xMid: s.xMid, amp: s.amp, dw: s.dw, dh: s.dh } : { c, x: s.x, y: s.y, base: s.base, xMid: s.xMid, amp: s.amp }); out.sprites.add({ c, bytes: c.width * c.height * 4 }); }
      }
      else for (const s of C.strips) if (gr.layers.includes(s.layer)) {
        let sb = null;
        const its = s.items.map(i => C.items[i]);
        for (const it of its) { const sh = sceneObjShapes(it.o, it.v, it.season); if (sh) sb = union(sb, itemBox(it, sh)); }
        if (!sb) continue;
        const d = clipBox(box(sb));
        if (d[2] <= d[0] || d[3] <= d[1]) continue;
        const c = _sccCanvas(d[2] - d[0], d[3] - d[1]), cx = c.getContext('2d', _SCC_CPU);
        for (const it of its) { const M = placeM(it.x, it.y, it.s, it.flip); drawSprite(cx, keepStatic(sprite(Lx, lk, it.o, it.v, it.season, '*', hz(s.layer), it.tint, bucket(it.s) * vs, false)), [M[0], M[1], M[2], M[3], M[4] - d[0], M[5] - d[1]]); }
        flushCx(cx);
        const srec = { c, x: d[0], y: d[1], base: s.y1 * vs + oy, xMid: (s.x0 + s.x1) / 2, amp: s.amp || 1 };
        grp.strips.push(srec);
        for (const it of its) { const sh = sceneObjShapes(it.o, it.v, it.season); if (sh) _sccOccAdd(grp, { ord: occOrd++, layer: s.layer, z: it.z != null ? it.z : it.y, box: box(itemBox(it, sh)), M: placeM(it.x, it.y, it.s, it.flip), wl: null, Lx, lk, o: it.o, v: it.v, season: it.season, which: '*', haze: hz(s.layer), tint: it.tint, sc: bucket(it.s) * vs, x2: undefined, sp: null, strip: srec }); }
        out.sprites.add({ c, bytes: c.width * c.height * 4 });
        yield* slice();
      }
      // fog: mist bands baked into the nearest group
      if (gx && Lx && Lx.fog && gi === plan.length - 1) {
        gx.setTransform(...TG);
        for (let i = 0; i < 4; i++) { const y = hor + 40 + i * 70, mg = gx.createLinearGradient(0, y - 40, 0, y + 40), c = _scHex(_scMixHex('#f0f2f2', '#3a4256', Lx.dark || 0)); mg.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},0)`); mg.addColorStop(0.5, `rgba(${c[0]},${c[1]},${c[2]},0.45)`); mg.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`); gx.globalAlpha = 1; gx.fillStyle = mg; gx.fillRect(-200, y - 40, 2000, 80); }
      }
      // v2: the group bitmap is complete (water: reflection bitmaps and masks; atmosphere: the depth veil); restored: the
      // passes take back what they kept (the 'restore' stage) and draw nothing
      if (env) { if (rg) sceneRunPasses(env, 'restore', [grp, R]); else sceneRunPasses(env, 'group', [grp]); if (gx) _sccReset(gx); }
      if (gx) flushCx(gx);
      phMark('layers');
      yield* slice();
    }
    // 3. where each bitmap is fully opaque from some row down (it hides everything farther there: smaller blits)
    phMark('opaque');
    out.groups.forEach((grp, gi) => { grp.opaqueY = R ? R.meta.groups[gi].opaqueY : _sccOpaqueFromGround(C, grp.layers, vs, ox, oy, W); });
    yield* slice();
    phMark('particles');
    // 4. particles (the season's) and weather (live)
    if (C.particles && C.particles.kind !== 'none' && C.particles.n && (life.flakes || C.particles.kind !== 'snow')) out.particles = sceneParticleSet(C.particles.kind, Math.min(250, Math.round(C.particles.n * Math.max(0.3, lod))), _scHashS(C.id + '|p'));
    if (Lx && Lx.rain) out.rain = sceneParticleSet('rain', Math.round(250 * Math.max(0.4, lod)), 91);
    if (Lx && Lx.snow) out.snow = sceneParticleSet('wsnow', Math.round(200 * Math.max(0.4, lod)), 93);
    out.fogVeil = Lx && Lx.fog ? `rgba(${_scHex(_scMixHex('#dfe4e6', '#2a3040', Lx.dark || 0)).join(',')},0.32)` : null;
    out.pcol = (c) => (C.particles.kind === 'motes' || !Lx ? c : colourFn(Lx, 0, null)(c));
    out.rasterWait = rasterWait;
    out.restored = !!R;
    out.kept = R ? R.all : null;
    out.borrowed = !!(R && R.borrowed);
    phMark('end');
    return out;
  }

  /* ---------- frames ---------- */
  const flush = () => { try { ctx.getImageData(0, 0, 1, 1); } catch (e) { /* nothing to force */ } };
  // o.layers() (the prebaked player's DOM stack): { sky: ctx, groups: [ctx, ...] } transparent canvases between the land images
  // (the browser composites those on the GPU): the frame draws the stars and clouds into sky, each group's strips, water and
  // movers into its own canvas, and skips every bitmap blit; null: one canvas as always
  function frame(t) {
    const LY = !warming && S && typeof o.layers === 'function' ? o.layers() : null, c0 = ctx;
    if (!LY) { frameBody(t, null); return; }
    for (const c of [LY.sky].concat(LY.groups)) if (c) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, c.canvas.width, c.canvas.height); }
    ctx = LY.sky;
    try { frameBody(t, LY); } finally { ctx = c0; }
  }
  function frameBody(t, LY) {
    if (!S || destroyed) return;
    const F = o.flush || false, tStart = _sccNow(), P = o.profile ? prof : null;
    let pm = tStart;
    const mark = P ? (name) => { flush(); const n = _sccNow(); P[name] = (P[name] || 0) + n - pm; pm = n; } : () => {};
    let blit = 0, blitPx = 0, draws = 0, occDraws = 0;
    const Lx = L || S.L, W = S.W, H = S.H, vs = S.vs, ox = S.ox, oy = S.oy;
    // the drawn-vs-simulated contract (merge package "crowd", 15 Oct): window.__sceneOpts.records -> stats().movers, this frame's
    // movers [{ id ('a' + actor index, 'f' + flow.lane.key: sceneXCrowdAt's ids), box (scene units, 1600 x 900), drawn, occludedBy
    // (the nearer statics drawn over it) }]; window.__sceneOpts.moversOff -> the frame without movers (actors, flock birds, flow
    // agents, and so their shadows, reflections and wakes)
    const so = typeof window !== 'undefined' && window.__sceneOpts ? window.__sceneOpts : null, moversOff = !!(so && so.moversOff);
    const recs = so && so.records ? [] : null;
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
    if (env && moversOff) env.actorsNow.length = 0;
    mark('pre'); if (!LY) blitAt(S.sky, 0, 0, 0, hb); mark('blit');
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
      if (LY) ctx = LY.groups[gi] || LY.groups[LY.groups.length - 1] || ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
      mark(gi ? 'movers' : 'clouds'); if (g.c && !LY) blitAt(g.c, g.x, g.y, 0, below);
      // prebaked (setMix): the other light key's bitmap over it at the blend weight, then the night lights (additive)
      const mg = MX && MX.groups[gi];
      if (mg && !LY) {
        if (mg.c && MX.w > 0.004) { ctx.globalAlpha = MX.w; blitAt(mg.c, mg.x, mg.y, 0, below); }
        if (mg.lit && MX.la > 0.004) { ctx.globalAlpha = MX.la; ctx.globalCompositeOperation = 'lighter'; blitAt(mg.lit, mg.lx, mg.ly, 0, below); ctx.globalCompositeOperation = 'source-over'; }
        ctx.globalAlpha = 1;
      }
      mark('blit');
      const ms = mg && MX.w > 0.004 ? mg.strips : null;
      g.strips.forEach((s, si) => {
        if (s.y >= below) return;
        const k = (s.amp || 1) * sceneWindSafe(t, s.xMid, Lx) * 0.02;
        ctx.setTransform(1, 0, k, 1, -k * s.base, 0);
        if (s.dw) ctx.drawImage(s.c, s.x, s.y, s.dw, s.dh); else ctx.drawImage(s.c, s.x, s.y);
        draws++;
        const s2 = ms && ms[si];
        if (s2) { ctx.globalAlpha = MX.w; if (s2.dw) ctx.drawImage(s2.c, s2.x, s2.y, s2.dw, s2.dh); else ctx.drawImage(s2.c, s2.x, s2.y); ctx.globalAlpha = 1; draws++; }
      });
      mark('strips'); for (const w of g.water) _sccWaterFrame(ctx, w, t); mark('water');
      // v2: the frame passes of this group (flows 10, water 20, actor shadows 25, puddle rings 50), before its movers
      if (env) { draws += sceneRunPasses(env, 'frameGroup', [g, ctx, t, below], true); _sccReset(ctx); mark('passes'); }
      // the movers, y-sorted (actors and birds are placed now)
      let list = g.movers;
      if (!env) for (const m of list) {
        if (m.kind === 'actor') { const p = sceneActorAt(m.actor, t); p.face = _sccFace(m.actor, t, p, null); m.p = p; m.y = p.y; }
        else if (m.kind === 'bird') { const p = sceneFlockAt(m.flock, m.i, t); m.p = p; m.y = p.y; }
      }
      if (env) { const extra = []; sceneRunPasses(env, 'movers', [g, t, (m) => { if (m && typeof m.draw === 'function') extra.push(Object.assign({ kind: 'custom' }, m)); }], true); if (extra.length) list = list.concat(extra); }
      list.sort((a, b) => a.y - b.y);
      // the static sprites of this group nearer than a mover, drawn again over it inside its box (10 Oct: the depth order)
      const v1o = !env || S.C.v !== 2;
      const occlude = (sb, z, layer) => {
        if (!g.occ || !sb) return;
        const db = [sb[0] * vs + ox, sb[1] * vs + oy, sb[2] * vs + ox, Math.min(sb[3] * vs + oy, below)];
        if (db[2] <= db[0] || db[3] <= db[1]) return;
        if (occDraws >= SCENE_OCC_FRAME) return;   // the frame's budget of redraws (counted apart from the animated draws: st.occDraws)
        const recs = _sccOccOf(g, db, z, layer, v1o);
        if (!recs.length) return;
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.beginPath(); ctx.rect(db[0] - 1, db[1] - 1, db[2] - db[0] + 2, db[3] - db[1] + 2); ctx.clip();
        for (const r of recs) {
          if (!r.sp) { r.sp = sprite(r.Lx, r.lk, r.o, r.v, r.season, r.which, r.haze, r.tint, r.sc, false, false, r.x2); if (r.sp && S.sprites) S.sprites.add(r.sp); }
          if (!r.sp || !r.sp.c) continue;
          let M = r.M;
          if (r.strip) { const st = r.strip, k = (st.amp || 1) * sceneWindSafe(t, st.xMid, Lx) * 0.02; M = [M[0] + k * M[1], M[1], M[2] + k * M[3], M[3], M[4] + k * M[5] - k * st.base, M[5]]; }
          if (_sccAbove(ctx, r.wl, () => drawSprite(ctx, r.sp, M, 1))) occDraws++;
          if (occDraws >= SCENE_OCC_FRAME) break;
        }
        ctx.restore();
      };
      const boxAt = (p, b, fc) => { const fl = fc < 0; return [fl ? p.x - b[2] * p.s : p.x + b[0] * p.s, p.y + b[1] * p.s, fl ? p.x - b[0] * p.s : p.x + b[2] * p.s, p.y + b[3] * p.s]; };
      const agentBox = (a) => { const sh = a && a.o ? sceneObjShapes(a.o, a.v || 0, S.C.season) : null; return sh ? boxAt({ x: a.X, y: a.Y, s: a.s }, sh.box, a.flip ? -1 : 1) : null; };
      const record = (id, sb, drawn, z, layer) => {
        let occ = [];
        if (drawn && g.occ && sb) {
          const db = [sb[0] * vs + ox, sb[1] * vs + oy, sb[2] * vs + ox, Math.min(sb[3] * vs + oy, below)];
          if (db[2] > db[0] && db[3] > db[1]) occ = _sccOccOf(g, db, z, layer, v1o).map(r => r.o);
        }
        recs.push({ id, box: sb ? sb.map(v => Math.round(v * 10) / 10) : null, drawn: !!drawn, occludedBy: [...new Set(occ)] });
      };
      const drawMover = (m) => {
        if (m.kind === 'sign') { if (m.top < below) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.drawImage(m.c, m.x, m.top); } return; }
        if (moversOff && (m.kind === 'custom' || m.kind === 'actor' || m.kind === 'bird')) return;
        if (m.kind === 'custom') {
          const n = m.draw(ctx); if (n > 0) draws += n; _sccReset(ctx);
          const a = m.agent;
          if (recs && a && a.flow != null) { const zz = Number.isFinite(a.d) && env && env.cam ? env.cam.horizon + env.cam.f * env.cam.eye / Math.max(0.01, a.d) : a.Y; record('f' + a.flow + '.' + a.lane + '.' + a.k, agentBox(a), n > 0, zz, a.layer); }
          if (n > 0 && a && Number.isFinite(a.d) && env && env.cam) occlude(agentBox(a), env.cam.horizon + env.cam.f * env.cam.eye / Math.max(0.01, a.d), a.layer);
          return;
        }
        if (m.kind === 'item') {
          if (m.b[1] * vs + oy > below) return;
          _sccAbove(ctx, m.wl, () => {
            for (const pt of m.parts) {
              const pose = sceneAnimPose(pt.a, t, Lx, m.x), A = pt.j === 1 && pose.m2 ? pose.m2 : pose.m, al = _scPartAlpha(pose, pt.j || 0);
              if (al > 0 && drawSprite(ctx, pt.sp, _scMul(m.M, A), al)) draws++;
            }
          });
          if (m.z != null) occlude(m.b, m.z, m.layer);
        } else {
          if (m.kind === 'actor' && m.active === false) return;   // drawn by its copy in the group of its depth now
          let p = m.p, b = m.box, parts = m.parts;
          // the view of its heading (4.3, _sccHeading): another object's parts, scaled to the same drawn height
          if (m.kind === 'actor' && p.vo && p.vo !== m.actor.o && m.viewOf) {
            const vv = p.vv == null ? m.actor.v : p.vv, key = p.vo + '|' + vv;
            let vw = m.views.get(key);
            if (vw === undefined) { vw = m.viewOf(p.vo, vv); m.views.set(key, vw); }
            if (vw) { parts = vw.parts; b = vw.box; p = Object.assign({}, p, { s: p.s * vw.k }); }
          }
          const fl = p.dir < 0, shown = sceneMoverDrawn(p, b, vs, ox, oy, W, below);
          if (recs && m.kind === 'actor') { const ai = typeof sceneMotionFixed === 'function' ? sceneMotionFixed(S.C).indexOf(m.actor) : S.C.actors.indexOf(m.actor); record('a' + ai, boxAt(p, b, fl ? -1 : 1), shown && !(p.alpha != null && !(p.alpha > 0)), m.z != null ? m.z : p.y, m.layer != null ? m.layer : m.actor.layer); }
          if (!shown) return;   // the shadow pass asks the same (78-scene-shadow.js)
          // the facing (from -1 to 1: an actor turning round narrows through side-on) and the walk's swing (0 to 1: legs at rest
          // while a scripted mover waits; sceneActorAt's go)
          // front and back views are never mirrored; side and three-quarter views take the facing (it narrows through a reversal)
          const head = p.view === 'front' || p.view === 'back';
          const fc = head ? 1 : Number.isFinite(p.face) ? p.face : (fl ? -1 : 1), go = Number.isFinite(p.go) ? p.go : 1;
          let M = [vs * p.s * fc, 0, 0, vs * p.s, vs * p.x + ox, vs * p.y + oy];
          if (p.lean) { const c = Math.cos(p.lean), sn = Math.sin(p.lean), f = fc < 0 ? -1 : 1; M = _scMul(M, [c, f * sn, -f * sn, c, 0, 0]); }
          // the stride foreshortens with the heading (fs 1 side-on, 0 head-on): narrower swing, smaller bob, legs that lift instead
          const fs = Number.isFinite(p.fs) ? p.fs : 1;
          const hook = (h) => (m.kind === 'bird' ? Object.assign({}, h, { phase: p.phase }) : h.kind === 'walk' && (go < 1 || fs < 1) ? Object.assign({}, h, { deg: (h.deg || 22) * go * fs, bob: (h.bob == null ? 1.5 : h.bob) * go * (0.45 + 0.55 * fs) }) : h);
          const liftU = m.kind === 'actor' && fs < 1 ? (1 - fs) * go * (b[3] - b[1]) * 0.03 : 0;
          let bob = 0;
          if (m.kind === 'actor') for (const pt of parts) if (pt.a && pt.a.kind === 'walk') { bob = sceneAnimPose(hook(pt.a), t, Lx, p.x).bob || 0; break; }
          // a floater on the water sits in it: its sink lower, clipped at its waterline (10 Oct)
          const sink = m.kind === 'actor' && m.sinkU ? _sccSinkOf(S.C, m.actor.o, p.x, p.y, p.d) : 0;
          if (sink) M[5] += sink * vs * p.s;
          _sccAbove(ctx, sink ? p.y * vs + oy : null, () => {
            for (const pt of parts) {
              let A = _SC_ID, al = 1;
              if (pt.a) {
                const a = hook(pt.a), pose = sceneAnimPose(a, t, Lx, p.x);
                A = pt.j === 1 && pose.m2 ? pose.m2 : pose.m;
                if (!pt.rest && pose.alphas) al = pose.alphas[pt.j || 0];   // a frames hook: one part at a time (an actor part never took the pose alpha)
              }
              if (al <= 0) continue;
              const MM = _scMul(M, A);
              if (pt.rest && bob) MM[5] += bob * vs * p.s;
              if (liftU && pt.a && pt.a.kind === 'walk' && !pt.rest) MM[5] -= Math.max(0, Math.sin(2 * Math.PI * (t / (pt.a.period || 0.9) + (pt.a.phase || 0)) + (pt.j || 0) * Math.PI)) * liftU * vs * p.s;
              if (drawSprite(ctx, pt.sp, MM, (p.alpha == null ? 1 : p.alpha) * al)) draws++;
            }
          });
          if (m.kind === 'actor') occlude(boxAt(p, b, fc), m.z != null ? m.z : p.y, m.layer != null ? m.layer : m.actor.layer);
        }
      };
      if (!P) for (const m of list) drawMover(m);
      else for (const m of list) { mark('movers'); drawMover(m); mark('m:' + m.kind + (m.parts && m.parts[0] && m.parts[0].a ? ':' + m.parts[0].a.kind : '')); }
      ctx.globalAlpha = 1;
    });
    // prebaked: the cheap global grade toward the live light (one fill over the land: the sky is painted live)
    if (MX && MX.grade && MX.grade.a > 0.004) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = MX.grade.a; ctx.globalCompositeOperation = MX.grade.op || 'source-over';
      ctx.fillStyle = MX.grade.col; const gy = Math.max(0, Math.min(H, MX.grade.y || 0)); ctx.fillRect(0, gy, W, H - gy);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
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
    if (warming) return;   // a warm-up frame (unseen, overdrawn at once): no stats, no governor
    const total = _sccNow() - tStart;
    drawTimes.push(total); dynTimes.push(Math.max(0, total - blit));
    if (drawTimes.length > 900) { drawTimes.splice(0, 300); dynTimes.splice(0, 300); }
    st.blitPx = blitPx; st.animatedDraws = draws; st.occDraws = occDraws;
    st.movers = recs || undefined;
    if (env && !o.still && t > 0) _sccGovern(env, Math.max(0, total - blit), o);
  }

  /* ---------- bake runners ---------- */
  function bakeSync(W, H) {
    ph = {}; phNew = { sprites: 0, bytes: 0 };
    const a = _sccNow(), C = compile(); phAdd('compileMs', _sccNow() - a);
    const it = bake(W, H, L, C);
    let r = it.next();
    while (!r.done) r = it.next();
    adopt(r.value, W, H);
    if (o.onBaked) try { o.onBaked(); } catch (e) { /* the host's business */ }
    st.bakeMs = Math.round((_sccNow() - a) * 10) / 10;
    if (!st.bakes) st.firstBakeMs = st.bakeMs;
    st.bakes++;
    warmUp(S, true);
  }
  /**
   * The warm-up after a bake, before the canvas shows (the host's onReady): every sprite and bitmap the scene can draw goes to
   * the raster once (a GPU canvas uploads a sprite on its first draw: hundreds of uploads over the first frames were the lag at
   * the start), at most _SCC_WARM_BYTES a step with a snapshot in between; then unseen frames at the sample times build what a
   * frame builds on first sight (flow sprites for the next half minute's agents, shadow silhouettes, wakes); then the real
   * frame. Each step ends with the real frame drawn over, so a re-bake's warm-up never shows. Stills skip it (o.warm false too).
   * Always ends in o.onReady (once per bake).
   */
  function warmUp(state, eager) {
    const wa = _sccNow();
    const done = () => {
      if (warmed !== state) return;
      warmed = true; shown = true;
      tl('ready');
      st.warmWallMs = Math.round((_sccNow() - wa) * 10) / 10;
      // the kept still was showing: the live scene starts from that same first frame (the host restarts its clock) as it shows
      if (state.stillShown && o.onLive && S === state) try { o.onLive(); } catch (e) { /* the host's business */ }
      if (!destroyed && S === state && !running) frame(o.still ? 0 : timeFn());
      if (o.onReady) try { o.onReady(); } catch (e) { /* the host's business */ }
      cacheSave(state);
    };
    warmed = state;
    if (o.warm === false || o.still || typeof document === 'undefined') { done(); return; }
    let list = null, i = 0, k = 0, passed = false;
    const later = eager ? _sccSoon : _sccIdle, now = () => (o.still ? 0 : timeFn());
    const step = () => {
      if (destroyed || S !== state || warmed !== state) return;
      const a = _sccNow();
      try {
        if (!passed) {
          // 1. the passes' own first-sight work (the flows: the sprites of the agents of the next minute and a half)
          passed = true;
          if (state.env) { state.env.warming = true; try { sceneRunPasses(state.env, 'warm', [now()]); } finally { state.env.warming = false; } }
          phAdd('warmPassesMs', _sccNow() - a); tl('w:passes');
          later(step);
          return;
        }
        // o.warmFrames === false (a prebaked scene: its frame sprites were rasterised at build time): no unseen frames
        if (o.warmFrames === false) k = _SCC_WARM_T.length;
        if (k < _SCC_WARM_T.length) {
          // 2. unseen frames at the sample times build what a frame builds on first sight (flow sprites, shadow silhouettes,
          // wakes), drawn into a 1 x 1 scratch: the sprites are made, no full-screen raster is paid (24 full frames queued on
          // the GPU held the first real frames back by a tenth of a second or more)
          const t = now(), real = ctx;
          if (!_sccWarmCx) _sccWarmCx = _sccCanvas(1, 1).getContext('2d', { alpha: false });
          warming = true; ctx = _sccWarmCx;
          if (state.env) state.env.warming = true;
          try { while (k < _SCC_WARM_T.length && _sccNow() - a < SCENE_SLICE_MS) frame(t + _SCC_WARM_T[k++]); }
          finally { ctx = real; warming = false; if (state.env) state.env.warming = false; }
          phAdd('warmFramesMs', _sccNow() - a); tl('w:frames' + k);
          later(step);
          return;
        }
        // o.layers (a prebaked scene): the frames draw into the player's layer canvases, which took the bitmaps already
        if (!list && typeof o.layers === 'function') list = [];
        if (!list) {
          // 3. what a frame draws goes to the raster once: the sky, the bitmaps, and the sprites and canvases of the movers,
          // strips, clouds, signs and passes, with those the unseen frames made (a static placement's sprite is in a bitmap
          // already: sending it would only fill the GPU)
          list = [state.sky, ...state.groups.map(g => g.c), ...[...state.sprites].filter(x => !x.sc || state.frameSprites.has(x))]
            .filter(Boolean).map(x => (x.c !== undefined ? x.c : x)).filter(c => c && c.width && c.height);
        }
        if (i < list.length) {
          ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
          let bytes = 0;
          // eager (a scene about to show): everything in one step and one wait at the end (each wait is a GPU round trip);
          // in idle time: at most _SCC_WARM_BYTES a step with a wait between, so other frames on the page never wait long
          const cap = eager ? Infinity : _SCC_WARM_BYTES;
          while (i < list.length && bytes < cap) { const c = list[i++]; ctx.drawImage(c, 0, 0); bytes += c.width * c.height * 4; }
          ph.warmMB = Math.round(((ph.warmMB || 0) + bytes / 1048576) * 10) / 10;
          phAdd('warmUploadMs', _sccNow() - a); ph.warmUploadSteps = (ph.warmUploadSteps || 0) + 1; tl('w:upload');
          if (i < list.length) { const wa = _sccNow(); _sccFlushAsync(canvas).then(() => { phAdd('warmUploadWaitMs', _sccNow() - wa); later(step); }); return; }
        }
        // 4. the real frame over it all, then one wait for the raster
        frame(now());
        const wb = _sccNow();
        _sccFlushAsync(canvas).then(() => { phAdd('warmWaitMs', _sccNow() - wb); tl('w:flushed'); done(); });
        return;
      } catch (e) { ctx = ctx || canvas.getContext('2d', { alpha: false }); warming = false; if (state.env) state.env.warming = false; }
      done();
    };
    later(step);
  }
  let rasterRetry = 0, rasterBake = false;
  function adopt(next, W, H) {
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const old = S;
    S = next;
    // raster objects decode lazily: when an image was not ready, bake again once every pending image has decoded (a few tries)
    if (next.rasterWait && rasterRetry < 4 && typeof sceneRasterWhenReady === 'function') {
      rasterRetry++; rasterBake = true;
      sceneRasterWhenReady().then(() => { rasterBake = false; if (!destroyed && S === next) bakeLater(next.W, next.H); });
    }
    if (old) _sccFreeState(old);
  }
  /**
   * Re-bake in idle slices (8 ms or less each) into new bitmaps; the old ones draw until the swap. eager: the slices back to
   * back (a scene about to show: frames still run in between), not in idle time. The compile is a slice of its own.
   */
  function bakeLater(W, H, eager) {
    if (pending) pending.cancel = true;
    const job = { cancel: false, ms: 0, eager: !!eager }, next = () => (job.eager ? _sccSoon : _sccIdle);
    pending = job;
    let it = null;
    const fail = (e) => {
      pending = null;
      if (o.onError) { try { o.onError(e); } catch (e2) { /* the host's business */ } }
      else if (typeof console !== 'undefined') console.warn('scene bake failed:', e && e.message);
    };
    const step = () => {
      if (job.cancel || destroyed) return;
      const a = _sccNow();
      let r;
      try {
        if (!it) { const C = compile(); phAdd('compileMs', _sccNow() - a); it = bake(W, H, L, C, job.R || null); r = { done: false }; }
        else { r = it.next(); while (!r.done && _sccNow() - a < SCENE_SLICE_MS) r = it.next(); }
      } catch (e) { fail(e); return; }
      const took = _sccNow() - a;
      job.ms += took; job.maxSlice = Math.max(job.maxSlice || 0, took);
      if (!r.done) { next()(step); return; }
      pending = null;
      tl('baked');
      if (job.bk && !job.R) r.value.cacheKey = job.bk;
      adopt(r.value, W, H);
      st.restored = job.R ? { names: job.R.all.length, lookupMs: job.lookupMs } : null;
      if (job.still) S.stillShown = true;
      st.bakeMs = Math.round(job.ms * 10) / 10; st.maxSliceMs = Math.round(job.maxSlice * 10) / 10; st.bakeWallMs = Math.round((_sccNow() - job.t0) * 10) / 10;
      if (!st.bakes) st.firstBakeMs = st.bakeMs;
      st.bakes++;
      // (a prebaked scene's layers: the player's own loop draws the next frame, not this task)
      if (!running && typeof o.layers !== 'function') frame(o.still ? 0 : timeFn());
      if (o.onBaked) try { o.onBaked(); } catch (e) { /* the host's business */ }
      warmUp(S, job.eager);
    };
    ph = {}; phNew = { sprites: 0, bytes: 0 }; job.t0 = tl0 = _sccNow();
    const begin = () => { if (!job.cancel && !destroyed) next()(step); };
    if (typeof o.restore === 'function') {
      // prebaked (78-scene-player.js): the bitmaps come from the scene's prebaked images, already decoded and fitted to W x H
      Promise.resolve().then(() => o.restore(W, H, job)).then((R) => {
        job.lookupMs = Math.round((_sccNow() - job.t0) * 10) / 10;
        if (job.cancel || destroyed) return;
        job.R = R || null; begin();
      }, () => begin());
    } else if (cacheOn()) {
      cacheLookup(W, H, job).then((R) => {
        job.lookupMs = Math.round((_sccNow() - job.t0) * 10) / 10;
        if (job.cancel || destroyed) { if (R) R.all.forEach(_sccFree); return; }
        job.R = R; begin();
      }, () => begin());
    } else begin();
  }

  /* ---------- the persistent bake cache (78-scene-cache.js) ---------- */
  // o.cache: the scene's id in the cache (the host gives a registry item's ref), or nothing (no cache)
  const cacheOn = () => !!o.cache && !fixed && typeof sceneStoreOn === 'function' && sceneStoreOn();
  const isV2 = (C) => typeof sceneRenderIsV2 === 'function' && typeof sceneRunPasses === 'function' && sceneRenderIsV2(C);
  /**
   * Before a bake: the compiled scene (the memo, else the cache, else compiled now and kept), then the bake of this size and
   * light key. Resolves to a restore ({ meta, get(name), all, still }) or null (bake as usual; job.bk: where to keep it).
   * While the bitmaps decode, the kept still of the first frame goes to the host (o.onStill(blob)) when nothing is shown yet.
   */
  async function cacheLookup(W, H, job) {
    const ver = await sceneStoreVersion();
    tl('ver');
    if (job.cancel || destroyed || ver === 'none') return null;
    let C = typeof sceneCompileMemo === 'function' ? sceneCompileMemo(data, season, lod) : null;
    if (!C) {
      const ck = 'C|' + o.cache + '|' + season + '|' + lod + '|' + ver, t = _sccNow();
      const rc = await sceneStoreGet(ck);
      phAdd('cacheCMs', _sccNow() - t);
      if (job.cancel || destroyed) return null;
      if (rc && rc.C && typeof sceneCompileSeed === 'function' && sceneCompileSeed(data, season, lod, rc.C)) C = rc.C;
      else {
        const a = _sccNow();
        C = compile();
        phAdd('compileMs', _sccNow() - a);
        try { sceneStorePut({ k: ck, C }, 400 * C.items.length + 4096); } catch (e) { /* not kept */ }
      }
    }
    if (typeof sceneRenderPassesCacheable === 'function' && !sceneRenderPassesCacheable(C)) return null;
    const lk = sceneLightKey(L, C.season, isV2(C) ? C : undefined);
    const lifeK = _sccLife(L, C).key;
    job.bk = 'B|' + o.cache + '|' + W + 'x' + H + '|' + lod + '|' + lk + (lifeK ? '|' + lifeK : '') + '|' + ver;
    tl('C');
    const t = _sccNow(), rec = await sceneStoreGet(job.bk);
    tl('rec');
    phAdd('cacheGetMs', _sccNow() - t);
    if (!rec || job.cancel || destroyed || !rec.meta || rec.meta.W !== W || rec.meta.H !== H) return null;
    // the kept first frame: the host shows it (an image under the canvas, decoded and composited by the browser off the main
    // thread) until the live canvas is ready; the live scene then starts from that same frame (o.onLive)
    if (rec.still && !S && o.onStill) {
      job.still = true;
      try { o.onStill(rec.still); } catch (e) { /* the host's business */ }
    }
    const td = _sccNow(), bitmaps = await sceneStoreDecode(rec.blobs || []);
    phAdd('cacheDecodeMs', _sccNow() - td);
    tl('decoded');
    const map = new Map();
    (rec.names || []).forEach((n, i) => map.set(n, bitmaps[i]));
    const whole = bitmaps.every(Boolean) && rec.meta.groups.every((g, gi) => !g.w || map.get('g' + gi)) && map.get('sky');
    if (!whole || job.cancel || destroyed) { bitmaps.forEach(_sccFree); return null; }
    // a decoded bitmap is copied into a CPU canvas on first use, inside the restore's slices: a frame then draws it as cheaply
    // as a baked one (sending a decoded ImageBitmap to a GPU canvas costs the main thread several ms a megabyte)
    const conv = new Map(), all = bitmaps.slice();
    const get = (n) => {
      if (conv.has(n)) return conv.get(n);
      const b = map.get(n);
      if (!b) return null;
      const c = _sccCanvas(b.width, b.height), cx = c.getContext('2d', _SCC_CPU);
      cx.drawImage(b, 0, 0);
      try { cx.getImageData(0, 0, 1, 1); } catch (e) { /* drawn on first use */ }
      _sccFree(b);
      conv.set(n, c); all.push(c);
      // nothing shows yet (the first bake): send it to the (still hidden) canvas now, so the raster takes it while the restore
      // goes on, instead of all at once in the warm-up
      if (!S && pending === job) {
        if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.drawImage(c, 0, 0);
      }
      return c;
    };
    return { meta: rec.meta, get, all };
  }
  /** The first frame (t = 0) drawn into another canvas (the still kept with a bake). */
  function frameInto(state, c, t) {
    const keepCx = ctx, keepWarm = warming, keepS = S;
    ctx = c.getContext('2d', { alpha: false }); warming = true; S = state;
    try { frame(t || 0); } finally { ctx = keepCx; warming = keepWarm; S = keepS; }
  }
  /**
   * What a restore needs of a baked state: { names, list (canvases), meta: { W, H, lk, groups: [{ x, y, w, h, opaqueY, strips }] } }
   * (the sky, the clouds 'cl<i>', the groups 'g<i>', their wind strips 's<g>.<k>', and what the passes keep: 'save'), or null.
   * The persistent cache keeps it; the prebake tool (tools/lib/scene-cmd/prebake.mjs) writes it out as images.
   */
  function exportState(state) {
    const names = [], list = [];
    const put = (n, c) => { if (c && c.width && c.height && typeof c.getContext === 'function') { names.push(n); list.push(c); return true; } return false; };
    put('sky', state.sky);
    state.clouds.forEach((cl, i) => put('cl' + i, cl.c));
    const meta = { W: state.W, H: state.H, lk: state.lk, groups: state.groups.map((g, gi) => {
      if (g.c && !put('g' + gi, g.c)) return null;
      const strips = [];
      g.strips.forEach((sp) => { if (put('s' + gi + '.' + strips.length, sp.c)) strips.push({ x: sp.x, y: sp.y, base: sp.base, xMid: sp.xMid, amp: sp.amp }); });
      return { x: g.x, y: g.y, w: g.c ? g.w : 0, h: g.c ? g.h : 0, opaqueY: g.opaqueY, strips };
    }) };
    if (meta.groups.some(g => !g)) return null;
    if (state.env) for (const p of sceneRenderPasses('save', state.C)) { try { p.save(state.env, put); } catch (e) { return null; } }
    return { names, list, meta };
  }
  /** Keep a finished bake (once it is ready, in idle time; the encoding runs in a worker where it can). */
  // o.onSaved(kept): called once per bake when the cache is on (kept: false when there was nothing to keep or it failed)
  function cacheSave(state) {
    const saved = (ok) => { if (o.onSaved) try { o.onSaved(ok); } catch (e) { /* the host's business */ } };
    if (!state || !state.cacheKey || state.restored || state.rasterWait || !cacheOn()) { if (cacheOn()) saved(false); return; }
    const key = state.cacheKey;
    state.cacheKey = null;
    // a few seconds after the scene shows (its first seconds play undisturbed), then in idle time
    setTimeout(() => _sccIdle(() => {
      if (destroyed || S !== state) { saved(false); return; }
      const ex = exportState(state);
      if (!ex) { saved(false); return; }
      const { names, list, meta } = ex;
      let still = null;
      try { still = _sccCanvas(state.W, state.H); frameInto(state, still); } catch (e) { still = null; }
      sceneStoreEncode(still ? list.concat([still]) : list).then((blobs) => {
        const sb = still ? blobs.pop() : null;
        if (still) _sccFree(still);
        const bytes = blobs.reduce((n, b) => n + b.size, sb ? sb.size : 0);
        return sceneStorePut({ k: key, names, meta, blobs, still: sb }, bytes);
      }).then((ok) => saved(!!ok), () => saved(false));
    }), o.hideUntilReady ? 4000 : 0);
  }
  function loop() {
    if (!running) return;
    // o.hideUntilReady (the host: its canvas shows from onReady): the first warm-up is not held back by unseen full frames
    if (S && !(o.hideUntilReady && !shown)) frame(timeFn());
    raf = requestAnimationFrame(loop);
  }
  const api = {
    get baked() { return !!S; },
    /** The v2 env of the current bake (V2 13.1; tests and tools read the passes' state), or null (v1). */
    get env() { return S ? S.env || null : null; },
    /** The last bake left out a raster image that is still decoding (a re-bake follows when it is ready). */
    get waiting() { return rasterBake || (!!pending && !!S && !!S.rasterWait); },
    /** A bake is running in idle slices. */
    get baking() { return !!pending; },
    /** Baked and warmed up (every sprite sent to the raster, the first-sight work done): the canvas may show. */
    get ready() { return !!S && warmed === true; },
    /** The first bake in slices: in idle time (gallery tiles: no long task while a page of tiles mounts), or eager (a live scene about to show). */
    bakeIdle(w, h, opt) { cssW = w || cssW; cssH = h || cssH; if (S || pending) return; const [W, H] = deviceSize(cssW, cssH); bakeLater(W, H, !!(opt && opt.eager)); },
    /** The css size of the box (the backing store follows: dpr-aware, capped). A resize re-bakes (in slices once there is a frame). */
    resize(w, h) {
      cssW = w || cssW; cssH = h || cssH;
      const [W, H] = deviceSize(cssW, cssH);
      if (S && S.W === W && S.H === H) return;
      if (!S) { if (pending) bakeLater(W, H, pending.eager); else { bakeSync(W, H); frame(o.still ? 0 : timeFn()); } }
      else bakeLater(W, H);
    },
    /** A new light (sceneLight). Re-bakes only when the quantised light key changes. */
    setLight(nl) {
      if (!nl) return;
      const before = S ? S.lk : null;
      L = nl;
      if (!S) return;
      const v2 = S.env ? S.C : undefined;
      // (or the day's life: snow falling, insects on the wing, which the light key does not hold)
      if (sceneLightKey(nl, season, v2) !== before || _sccLife(nl, S.C).key !== (S.life || '')) bakeLater(S.W, S.H);
      else if (S.env) { S.env.Lnow = nl; sceneRunPasses(S.env, 'relight', [nl]); }   // v2: a refresh that needs no re-bake (flow density)
    },
    setSeason(s) { if (!s || s === season) return; season = s; if (S) bakeLater(S.W, S.H); },
    setLod(k) { if (k == null || k === lod) return; lod = k; if (S) bakeLater(S.W, S.H); },
    start() { if (running || destroyed) return; if (!S && !pending) api.resize(cssW, cssH); running = true; raf = requestAnimationFrame(loop); },
    stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    get running() { return running; },
    /** Draw one frame at time t (seconds). The still (reduced motion, tiles) is frame(0). */
    frame(t) { if (!S && !pending) api.resize(cssW, cssH); if (S) frame(t || 0); },
    /** The current bake for a restore ({ names, list, meta }; the prebake tool), or null. */
    exportBake() { return S ? exportState(S) : null; },
    /** The compiled scene of the current bake (the prebake tool), or null. */
    get compiled() { return S ? S.C : null; },
    /** The current bake's geometry and clouds ({ W, H, vs, ox, oy, lk, clouds: [{ w, h, x0, y, sp }] }), or null. */
    get geometry() { return S ? { W: S.W, H: S.H, vs: S.vs, ox: S.ox, oy: S.oy, lk: S.lk, clouds: S.clouds.map(c => ({ w: c.w, h: c.h, x0: c.x0, y: c.y, sp: c.sp })) } : null; },
    /** Prebaked scenes: the second light key's bitmaps blended over the first ({ w, la, groups: [{ c, x, y, strips: [{ c, x, y }], lit, lx, ly }], grade: { col, a, op, y } }), or null. */
    setMix(m) { MX = m || null; },
    /** Prebaked scenes: the live light for the frame passes (their grade, the hour's life, flow density) with no re-bake. */
    setLiveLight(nl) { if (nl && S && S.env) { S.env.Lnow = nl; sceneRunPasses(S.env, 'relight', [nl]); } },
    /** Prebaked scenes: re-bake (in idle slices) from another restore (a new size or light key) with that key's light. */
    restoreWith(fn, nl, w, h) {
      o.restore = fn; if (nl) L = nl; cssW = w || cssW; cssH = h || cssH;
      const [W, H] = deviceSize(cssW, cssH);
      if (S || pending) bakeLater(W, H);
    },
    /** The frame at t (seconds) drawn into a new canvas of the backing size (tools and tests), or null before the first bake. */
    snapshot(t) { if (!S) return null; const c = _sccCanvas(S.W, S.H); frameInto(S, c, t || 0); return c; },
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
        bitmaps: S ? 1 + S.groups.filter(g => g.c).length : 0, blitPx: st.blitPx, movers: st.movers, animatedDraws: st.animatedDraws, occDraws: st.occDraws || 0, actors: S ? S.C.actors.length : 0, placements: S ? S.C.items.length : 0,
        lightKey: S ? S.lk : null, size: S ? [S.W, S.H] : null, profile: o.profile ? Object.fromEntries(Object.entries(prof).map(([k, v]) => [k, k === 'frames' ? v : Math.round(v / Math.max(1, prof.frames) * 100) / 100])) : undefined,
        passes: S && S.env ? _sccPassStats(S.env) : undefined,
        restored: st.restored || null, bakeWallMs: st.bakeWallMs || 0, warmWallMs: st.warmWallMs || 0, newSprites: phNew.sprites, newSpriteBytes: phNew.bytes, sharedSprites: sceneSprites.size, sharedSpriteBytes: sceneSprites.bytes,
        phases: Object.fromEntries(Object.entries(ph).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v * 10) / 10 : v])), governor: S && S.env ? { level: S.env.gov.level, log: S.env.gov.log.slice() } : undefined };
    },
    resetStats() { drawTimes.length = 0; dynTimes.length = 0; for (const k in prof) delete prof[k]; if (S && S.env) for (const k in S.env.passStats) { const p = S.env.passStats[k]; p.frameMs = 0; p.frames = 0; } },
    destroy() {
      api.stop(); destroyed = true;
      if (pending) pending.cancel = true;
      if (S) { _sccFreeState(S); S = null; }
    },
  };
  return api;
}
/**
 * The sky of a light: gradient, the sun's glow and disc, the moon in its real phase, drawn into sx with T (scene units -> device
 * px). Returns the horizon row (scene units). The bake paints its sky bitmap with it; the prebaked player (78-scene-player.js)
 * paints the LIVE sky with it behind the baked land. kept: a context that draws nothing (a restored sky; Path2D skipped).
 */
function sceneSkyPaint(sx, Lx, C, T, kept) {
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
      if (!kept) sx.fill(new Path2D(typeof almMoonDiscPath === 'function' ? almMoonDiscPath(_scClamp(f, 0.001, 0.4995), mr) : sceneD.circ(0, 0, mr)));
      sx.restore();
    }
    if (sun.show && C.sky.sunR) {
      const sr = C.sky.sunR, core = _scMixHex('#fff9e8', Lx.lowSun || low, _scClamp(1 - Lx.alt / 12, 0, 0.85));
      sx.globalAlpha = 0.35; sx.fillStyle = core; sx.beginPath(); sx.arc(sun.x, sun.y, sr * 1.8, 0, Math.PI * 2); sx.fill();
      sx.globalAlpha = 1; sx.beginPath(); sx.arc(sun.x, sun.y, sr, 0, Math.PI * 2); sx.fill();
    }
  }
  return hor;
}
/** sceneWind when the core has it, else a gentle sine (the renderer never fails on a missing core function). */
function sceneWindSafe(t, x, L) { return typeof sceneWind === 'function' ? sceneWind(t, x, L) : Math.sin(t + x * 0.003); }
const SCENE_W_SAFE = 1600, SCENE_H_SAFE = 900;

/* ---------- raster objects (70-scene-0raster.js): lazy decoding and drawing ---------- */
const _sccRasterImgs = new Map();   // asset key -> { img, ready, failed, p }
/**
 * The decoded image of an asset key, or null while it decodes (the first call starts it: the embedded base64 block becomes a
 * data: URL, decoded off the main thread by img.decode()). A key without bytes is marked failed and draws nothing.
 */
function sceneRasterImage(key) {
  let r = _sccRasterImgs.get(key);
  if (!r) {
    const url = typeof sceneRasterUrl === 'function' ? sceneRasterUrl(key) : null;
    r = { img: null, ready: false, failed: !url, p: null };
    _sccRasterImgs.set(key, r);
    if (url && typeof Image === 'function') {
      const img = new Image();
      r.img = img;
      img.src = url;
      r.p = (typeof img.decode === 'function' ? img.decode() : new Promise((res, rej) => { img.onload = res; img.onerror = rej; }))
        .then(() => { r.ready = true; }, () => { r.failed = true; });
    } else r.failed = true;
  }
  return r.ready ? r.img : null;
}
/** Resolves when every image asked for so far has decoded (or failed). */
function sceneRasterWhenReady() { return Promise.all([..._sccRasterImgs.values()].map(r => r.p).filter(Boolean)).then(() => true); }
/**
 * Draw one image shape into a sprite (cx carries the sprite's transform): the image at device size into a scratch canvas,
 * its pixels through the colour matrix (the season derivation, then the fitted grade: sceneRasterMatrix), mask_lit as alpha,
 * then onto the sprite. Once per sprite (object, variant, part, season, haze, tint, scale bucket, light key): the cache keeps it.
 * Returns false while an image is still decoding.
 */
function _sccRasterDraw(cx, sh, col, Lx) {
  const im = sh.img, pick = sceneRasterPick(im, Lx);
  if (pick.skip) return true;
  sceneRasterImage(pick.key);
  const rec = _sccRasterImgs.get(pick.key);
  if (rec.failed) return true;
  if (!rec.ready) return false;
  let mrec = null;
  if (im.mask) { sceneRasterImage(im.mask); mrec = _sccRasterImgs.get(im.mask); if (mrec.failed) return true; if (!mrec.ready) return false; }
  cx.save();
  if (sh.m) cx.transform(sh.m[0], sh.m[1], sh.m[2], sh.m[3], sh.m[4], sh.m[5]);
  const T = cx.getTransform(), kx = Math.hypot(T.a, T.b), ky = Math.hypot(T.c, T.d);
  const dw = Math.max(1, Math.min(2048, Math.ceil(im.w * kx))), dh = Math.max(1, Math.min(2048, Math.ceil(im.h * ky)));
  const tmp = _sccCanvas(dw, dh), tx = tmp.getContext('2d', _SCC_CPU);
  tx.imageSmoothingEnabled = true; tx.imageSmoothingQuality = 'high';
  tx.drawImage(rec.img, 0, 0, dw, dh);
  const M = sceneRasterMatrix(pick.night && col.ng ? col.ng : col, pick.night ? null : im.fx);
  if (!sceneRasterIsId(M) || mrec) {
    const data = tx.getImageData(0, 0, dw, dh), px = data.data;
    if (!sceneRasterIsId(M)) sceneRasterApply(M, px);
    if (mrec) {
      const mc = _sccCanvas(dw, dh), mx = mc.getContext('2d', _SCC_CPU);
      mx.drawImage(mrec.img, 0, 0, dw, dh);
      const mp = mx.getImageData(0, 0, dw, dh).data;
      for (let i = 0; i < px.length; i += 4) px[i + 3] = (px[i + 3] * ((mp[i] * 0.3 + mp[i + 1] * 0.59 + mp[i + 2] * 0.11) / 255) * (mp[i + 3] / 255)) | 0;
      mc.width = 0;
    }
    tx.putImageData(data, 0, 0);
  }
  cx.globalAlpha = sh.op == null ? 1 : sh.op;
  cx.drawImage(tmp, im.x, im.y, im.w, im.h);
  cx.restore();
  return true;
}

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
 * A window's lit threshold in [0, 1) from its key (seed|w|k). The plain FNV hash barely moves when only the last character
 * changes, so every window of a placement got almost the same threshold (a building all lit or all dark at a share of
 * 0.4): the murmur3 finaliser spreads them.
 */
function _sccWindowU(key) {
  let h = _scHashS(key);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
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
  const on = share == null ? (k) => it.glowOn[k % it.glowOn.length] : (k) => _sccWindowU((it.seed | 0) + '|w|' + k) < share;
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
  // (engine fix, 9 Oct) a HOLE in this group's ground: a narrow stream or water region kept in a farther layer that runs
  // down past this row (near the camera, off a frame edge) is cut out of the nearer layers' ground, and the column test above
  // only sees each column's top edge, so it called the hole covered: the farther bitmap stopped above it and the hole baked
  // black. Each farther ground or water shape that reaches below the row is sampled (a coarse grid over its box, below the
  // row): a point of it that no ground of this group covers pushes the row below that point.
  const lo0 = Math.min(...layers), far = [];
  for (const g of C.ground) if (g.layer < lo0) far.push(g.d);
  for (const w of C.water || []) if (w.layer < lo0) far.push(w.d);
  for (const d of far) {
    const b = scenePathBox(d);
    if (!b || b[3] <= worst + 2 || b[2] < xa || b[0] > xb) continue;
    const fp = _sccPath(d), x0 = Math.max(xa, b[0]), x1 = Math.min(xb, b[2]), y0 = Math.max(worst + 2, b[1]), y1 = Math.min(yBottom, b[3]);
    const nx = 32, ny = Math.max(2, Math.min(24, Math.ceil((y1 - y0) / 6)));
    for (let j = ny; j >= 0; j--) {
      const y = y0 + (y1 - y0) * j / ny;
      if (y <= worst + 2) break;
      let open = false;
      for (let i = 0; i <= nx && !open; i++) {
        const x = x0 + (x1 - x0) * i / nx;
        if (_sccHit.isPointInPath(fp, x, y) && !paths.some(p => _sccHit.isPointInPath(p, x, y))) open = true;
      }
      if (open) { worst = Math.max(worst, y + (y1 - y0) / ny); break; }
    }
  }
  return Math.ceil((worst + 2) * vs + oy);
}

/* ---------- the season's life at bake: falling snow, butterflies, bees, dragonflies (every scene, v1 and v2) ---------- */
const _sccBugMemo = new Map();
/**
 * The insect kind of an object (by id or tags): 'b' butterflies and bees (sceneInsectsOut: April to September), 'd' dragonflies,
 * damselflies and their gnat swarms (sceneInsectsOut(.., 'dragonfly'): May to September), or '' (anything else).
 */
function _sccBugKind(o) {
  if (!o) return '';
  if (_sccBugMemo.has(o)) return _sccBugMemo.get(o);
  let k = /^animal\.(butterfly|bee|bumblebee)/.test(o) ? 'b' : /dragonfly|damselfly|swarm|midge|gnat/.test(o) ? 'd' : '';
  if (!k && typeof sceneObj === 'function') {
    try {
      const def = sceneObj(o), tg = (def && def.tags) || [];
      k = tg.some(t => t === 'dragonfly' || t === 'damselfly' || t === 'swarm' || t === 'midge' || t === 'gnat') ? 'd' : tg.some(t => t === 'butterfly' || t === 'bee' || t === 'bumblebee') ? 'b' : '';
    } catch (e) { /* unknown: not an insect */ }
  }
  _sccBugMemo.set(o, k);
  return k;
}
const _sccBugsOf = new WeakMap();
/** The insect kinds among a compiled scene's actors and flocks: '', 'b', 'd' or 'bd'. */
function _sccBugs(C) {
  if (!C) return '';
  if (_sccBugsOf.has(C)) return _sccBugsOf.get(C);
  const ks = new Set();
  for (const a of C.actors || []) { const k = a && _sccBugKind(a.o); if (k) ks.add(k); }
  for (const f of C.flocks || []) { const k = f && _sccBugKind(f.o); if (k) ks.add(k); }
  const s = (ks.has('b') ? 'b' : '') + (ks.has('d') ? 'd' : '');
  _sccBugsOf.set(C, s);
  return s;
}
/**
 * What of the season's life a bake keeps (user request, 9 Oct: no butterflies in autumn or winter, flakes only on snow
 * days): { flakes, b, d, key }. flakes: the season's 'snow' particles fall only when sceneSnowFalling says so (a v1 scene
 * with weather 'none' keeps its authored particles); b / d: butterflies and bees, dragonflies and their swarms, on the wing
 * only when sceneInsectsOut says so. key: what changes when any of them changes ('' when the scene has none of them), so a
 * new light that turns them on or off re-bakes. The weather: the light's (L.wx), else resolved here from the scene's input.
 */
function _sccLife(L, C) {
  const out = { flakes: true, b: true, d: true, key: '' };
  if (!L || !C) return out;
  const bugs = _sccBugs(C), snowP = !!(C.particles && C.particles.kind === 'snow');
  if (!bugs && !snowP) return out;
  const input = typeof _scwxInputOf === 'function' ? _scwxInputOf(C) : 'live';
  let wx = L.wx || null;
  if (!wx && typeof sceneWeather === 'function') { try { wx = sceneWeather(input, L, {}); } catch (e) { wx = null; } }
  if (snowP && typeof sceneSnowFalling === 'function' && (C.v === 2 || input !== 'none')) out.flakes = sceneSnowFalling(wx);
  if (typeof sceneInsectsOut === 'function') {
    if (bugs.includes('b')) out.b = sceneInsectsOut(L, wx);
    if (bugs.includes('d')) out.d = sceneInsectsOut(L, wx, 'dragonfly');
  }
  out.key = (snowP ? (out.flakes ? 'f1' : 'f0') : '') + (bugs.includes('b') ? (out.b ? 'b1' : 'b0') : '') + (bugs.includes('d') ? (out.d ? 'd1' : 'd0') : '');
  return out;
}
/** Is this actor or flock (object id) grounded by the bake's life gate? */
function _sccBugOff(life, o) { const k = _sccBugKind(o); return (k === 'b' && !life.b) || (k === 'd' && !life.d); }

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
  return { C, L, Lnow: L, W: a.W, H: a.H, vs: a.vs, ox: a.ox, oy: a.oy, T: a.T, lod: a.lod, still: a.still, restoring: !!a.restoring, cam: sceneRenderCam(C),
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
  const cam = env.cam, memo = env.apNow || (env.apNow = new Map()), bands = env.C && env.C.cam && env.C.cam.bands;
  memo.clear();
  // every actor's base place first (an actor registered in several groups, by depth, is placed once a frame), then the crowd pass
  // (78-scene-x-crowd.js: actors and flow agents together, a pure function of t) moves the ones that would walk into each other
  for (const g of S.groups) for (const m of g.movers) {
    if (m.kind !== 'actor' || memo.has(m.actor)) continue;
    const a = m.actor;
    let p = null;
    if (a.ground && typeof sceneActorAtV2 === 'function') {
      try { const q = sceneActorAtV2(a, t, cam); if (q) p = { x: q.X != null ? q.X : q.x, y: q.Y != null ? q.Y : q.y, s: q.s, dir: q.dir != null ? q.dir : q.flip ? -1 : 1, alpha: q.alpha == null ? 1 : q.alpha, d: q.d, gx: q.x }; } catch (e) { p = null; }
    }
    if (!p) p = sceneActorAt(a, t);
    p.face = _sccFace(a, t, p, cam);
    _sccHeading(a, t, cam, p);
    memo.set(a, p);
  }
  _sccCrowd(env, t, L, memo);
  S.groups.forEach((g, gi) => {
    for (const m of g.movers) {
      if (m.kind === 'actor') {
        const a = m.actor, p = memo.get(a);
        m.p = p; m.y = p.y;
        // drawn in the group of the depth band it is in now (10 Oct); the nearest of its groups when that one holds none of it
        if (m.copies && m.copies.length > 1 && Number.isFinite(p.d)) {
          const bi = _sccBandOf(bands, p.d), tg = bi != null && env.layerOfGroup[bi] != null ? env.layerOfGroup[bi] : m.copies[0];
          let best = m.copies[0];
          for (const c of m.copies) if (Math.abs(c - tg) < Math.abs(best - tg)) best = c;
          m.active = best === gi;
        } else m.active = true;
        m.z = Number.isFinite(p.d) && cam ? cam.horizon + cam.f * cam.eye / Math.max(0.01, p.d) : p.y;
        if (!m.active) continue;
        const d = Number.isFinite(p.d) ? p.d : sceneCamDepthAt(cam, p.y);
        env.actorsNow.push({ m, a, gi, x: p.x, y: p.y, s: p.s, dir: p.dir, face: p.face, alpha: p.alpha == null ? 1 : p.alpha, d, o: a.o, v: a.v, cls: a.cls || sceneObjClassOf(a.o),
          sp: m.parts && m.parts[0] ? m.parts[0].sp : null, box: m.box, speed: a.speed || 0 });
      } else if (m.kind === 'bird') { const p = sceneFlockAt(m.flock, m.i, t); m.p = p; m.y = p.y; }
    }
  });
}
/**
 * The crowd pass of a frame (merge package "crowd", 15 Oct; 78-scene-x-crowd.js): the actors' base places (memo: actor -> p) and the
 * flow agents of this t (the flow layer's own list, which the flow pass then draws) go through sceneXCrowdAt together, and the
 * resolved places are written back (p.x, p.y, p.s, p.d; an agent's X, Y, s, x, d), so the shadows, reflections and wakes the
 * passes draw follow them. env.crowdNow keeps the records (the drawn-vs-simulated check reads them). Off: window.__sceneOpts.x.crowd
 * === false (or C.x.crowd === false): nothing moves.
 */
function _sccCrowd(env, t, L, memo) {
  env.crowdNow = null;
  const C = env.C;
  if (!C || typeof sceneXCrowdAt !== 'function' || (typeof sceneXCrowdOn === 'function' && !sceneXCrowdOn(C))) return;
  let flows = [];
  if (Array.isArray(C.flows) && C.flows.length && typeof _scflfLayerOf === 'function') { try { flows = _scflfLayerOf(env).layer.agents(t) || []; } catch (e) { flows = []; } }
  if (memo.size + flows.length < 2) return;
  const pre = new Map();
  for (const [a, p] of memo) pre.set(a, { X: p.x, Y: p.y, s: p.s, alpha: p.alpha, x: p.gx, d: p.d, v2: !!(a.ground && Number.isFinite(p.gx) && Number.isFinite(p.d)) });
  let recs;
  try { recs = sceneXCrowdAt(C, t, L, { actors: typeof sceneMotionFixed === 'function' ? sceneMotionFixed(C) : C.actors, flows, pre, cam: env.cam }); } catch (e) { return; }
  for (const r of recs) {
    if (r.x === r.bx && r.d === r.bd) continue;
    if (r.kind === 'actor') {
      const p = memo.get(r.ref);
      if (!p) continue;
      p.x = r.X; p.y = r.Y; p.s = r.s;
      if (Number.isFinite(p.d)) p.d = r.d;
      if (Number.isFinite(p.gx)) p.gx = r.x;
    } else if (r.ref) { const ag = r.ref; ag.X = r.X; ag.Y = r.Y; ag.s = r.s; ag.x = r.x; ag.d = r.d; }
  }
  env.crowdNow = recs;
}
/**
 * An actor's facing from its GROUND heading (4.3, user request 10 Oct: movers face the way they travel): its place half a
 * second before and after (a v2 actor's ground path; a v1 pixel path unprojected through the camera) -> on p: view, vo (the
 * object of that view), vv, fs (foreshortening), lean (a cyclist's bank in a turn), heading [tx, td]. Hysteresis on a.$hv, so a
 * corner switches the view once; a mover standing still keeps its last view.
 */
const _SCC_HEAD_DT = 0.5;
function _sccHeading(a, t, cam, p) {
  if (!cam || !(cam.f > 0) || typeof sceneHeadingView !== 'function') return;
  const cls = a.cls || (typeof sceneObjClassOf === 'function' ? sceneObjClassOf(a.o) : '');
  const v2 = !!(a.ground && typeof sceneActorAtV2 === 'function'), lift = (cls === 'boat' || cls === 'bird-water') && Number.isFinite(cam.water) ? cam.water : 0;
  const at = (tt) => {
    try {
      if (v2) { const q = sceneActorAtV2(a, tt, cam); return q && Number.isFinite(q.x) && Number.isFinite(q.d) ? [q.x, q.d] : null; }
      const q = sceneActorAt(a, tt);
      if (!q || !(q.s > 0) || !(q.y - cam.horizon > 0.5)) return null;
      const d = cam.f * Math.max(0.1, cam.eye - lift) / (q.y - cam.horizon);
      return [(q.x - cam.x0) * d / cam.f, d];
    } catch (e) { return null; }
  };
  const P0 = at(t - _SCC_HEAD_DT), P1 = at(t), P2 = at(t + _SCC_HEAD_DT);
  if (!P1) return;
  const prev = a.$hv || null;
  const tx = P2 && P0 ? P2[0] - P0[0] : 0, td = P2 && P0 ? P2[1] - P0[1] : 0, len = Math.hypot(tx, td);
  if (len < 0.05) { if (prev) Object.assign(p, prev.p); return; }   // standing (or turning on the spot): the last view
  const r = sceneHeadingView(a.o, tx, td, P1[0], P1[1], prev);
  const lean = (cls === 'cyclist' || cls === 'bike') && typeof sceneTurnLean === 'function' ? sceneTurnLean(P1[0] - P0[0], P1[1] - P0[1], P2[0] - P1[0], P2[1] - P1[1], len / 2, len / (2 * _SCC_HEAD_DT), P1[0], P1[1]) : 0;
  const out = { view: r.view, vo: r.o, vv: r.v, fs: r.fs, lean, heading: [tx / len, td / len] };
  a.$hv = { view: r.view, flip: r.flip, p: out };
  Object.assign(p, out);
}
/**
 * Is a mover drawn this frame? p: its place ({ x, y, s, dir, alpha }), b: its box. The one test of the sprite draw (drawMover)
 * and of its shadow (78-scene-shadow.js): a mover hidden by its timeline (scale 0 under its row, alpha 0), off the canvas
 * sideways, or wholly under the nearer bitmaps casts no shadow either, so no shadow is ever left without its mover.
 */
function sceneMoverDrawn(p, b, vs, ox, oy, W, below) {
  if (!p || !b || !(p.s > 0) || (p.alpha != null && !(p.alpha > 0))) return false;
  const fl = p.dir < 0, x0 = fl ? p.x - b[2] * p.s : p.x + b[0] * p.s, x1 = fl ? p.x - b[0] * p.s : p.x + b[2] * p.s;
  return !(x1 * vs + ox < 0 || x0 * vs + ox > W || (p.y + b[1] * p.s) * vs + oy > below);
}
/**
 * An actor's facing now, from -1 to 1 (sceneActorFacing: a reversal in view turns over a.turn seconds instead of snapping
 * round in one frame). p: its place now; cam: the v2 camera for an actor on the ground (else its path).
 */
function _sccFace(a, t, p, cam) {
  if (typeof sceneActorFacing !== 'function') return p.dir;
  const v2 = !!(cam && a.ground && typeof sceneActorAtV2 === 'function');
  const pos = v2 ? (tt) => { try { const q = sceneActorAtV2(a, tt, cam); return { dir: q.dir != null ? q.dir : q.flip ? -1 : 1, s: q.s }; } catch (e) { return { dir: p.dir, s: 0 }; } } : (tt) => sceneActorAt(a, tt);
  return sceneActorFacing(a, t, pos, { dir: p.dir, s: p.s });
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

/* ---------- movers in depth (user request, 10 Oct: the animation overhaul) ----------
   1. A v2 ground actor is registered in EVERY bake group its path passes through (by its depth bands) and drawn, each frame, only
      in the group of the band it is in now: it goes behind the nearer bitmaps and over the farther ones as it moves.
   2. Within its group a mover is drawn over the group's bitmap, which also holds the things NEARER than it (a reed clump, a
      moored boat, a tree, a wall, a seated figure). Each group keeps a grid of the static sprites it baked (and of its wind-strip
      items); after a mover is drawn, those nearer than it (z, the flat-ground row of their depth; in a v1 scene a later layer, or
      the same layer and a lower row) that overlap it are drawn again over it, clipped to its box. The depth order is right
      whatever the bake merged, with no per-scene work, at a few extra draws per mover.
   3. What floats (ducks, swans, coots, boats) sits IN the water: on water it is drawn sceneMoverSize(id).sink object units lower
      and clipped at its waterline. Static, animated and moving floaters alike. */
const _SCC_CELL = 96, _SCC_OCC_MAX = 32, SCENE_OCC_FRAME = 160;
function _sccBandOf(bands, d) { for (const b of bands || []) if (b.d0 != null && d >= b.d0 && (b.d1 == null || d < b.d1)) return b.i; return null; }
/** The layers an actor's path passes through: a v2 ground actor's depth bands (unless its layer was forced), else its layer. */
function _sccActorLayers(C, a) {
  const bands = C.cam && Array.isArray(C.cam.bands) ? C.cam.bands : null;
  if (!bands || !Array.isArray(a.ground) || a.layerForced) return [a.layer];
  const set = new Set();
  for (const p of a.ground) { const b = _sccBandOf(bands, p[1]); if (b != null) set.add(b); }
  return set.size ? [...set].sort((u, v) => u - v) : [a.layer];
}
/** The object units a floater sinks below its waterline at screen (X, Y) (depth d when known): its sink on water, else 0. */
function _sccSinkOf(C, o, X, Y, d) {
  if (typeof sceneMoverSize !== 'function' || typeof sceneMotionWorld !== 'function') return 0;
  let ms;
  try { ms = sceneMoverSize(o); } catch (e) { return 0; }
  if (!ms || !ms.sink) return 0;
  const W = sceneMotionWorld(C);
  if (!W) return 0;
  const g = Number.isFinite(d) && d > 0 ? [(X - W.cam.x0) * d / W.cam.f, d] : W.unproj(X, Y, W.cam.water);
  return g && W.water(g[0], g[1]) ? ms.sink : 0;
}
/** A matrix moved down by u object units (M: a placement matrix, M[3] its device scale). */
const _sccSunk = (M, u) => (u ? [M[0], M[1], M[2], M[3], M[4] + M[2] * u, M[5] + M[3] * u] : M);
/** Run draw() with the context clipped above device row y (a floater's waterline); y null: no clip. */
function _sccAbove(cx, y, draw) {
  if (y == null) return draw();
  cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.beginPath(); cx.rect(-1e5, -1e5, 2e5, 1e5 + y); cx.clip();
  try { return draw(); } finally { cx.restore(); }
}
/** Add a static sprite record to a group's occluder grid (rec.box: its device box). */
function _sccOccAdd(grp, rec) {
  const g = grp.occ || (grp.occ = { cells: new Map(), n: 0 }), b = rec.box;
  rec.id = g.n++;
  const c0 = Math.floor(b[0] / _SCC_CELL), c1 = Math.floor(b[2] / _SCC_CELL), r0 = Math.floor(b[1] / _SCC_CELL), r1 = Math.floor(b[3] / _SCC_CELL);
  if ((c1 - c0 + 1) * (r1 - r0 + 1) > 400) return;   // a huge sprite (a whole hillside): never an occluder of a mover
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const k = r * 4096 + c; let l = g.cells.get(k); if (!l) g.cells.set(k, l = []); l.push(rec); }
}
/**
 * The group's static sprites nearer than a mover that overlap its device box, in their bake order. z: the mover's draw key
 * (flat-ground row); layer: its layer (v1: a later layer occludes, the same layer only with a larger z); v1: the layer rule.
 */
function _sccOccOf(grp, box, z, layer, v1) {
  const g = grp.occ;
  if (!g || !box) return [];
  const seen = new Set(), out = [];
  const c0 = Math.floor(box[0] / _SCC_CELL), c1 = Math.floor(box[2] / _SCC_CELL), r0 = Math.floor(box[1] / _SCC_CELL), r1 = Math.floor(box[3] / _SCC_CELL);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const l = g.cells.get(r * 4096 + c);
    if (l) for (const rec of l) {
      if (seen.has(rec.id)) continue;
      seen.add(rec.id);
      const nearer = v1 ? (rec.layer > layer || (rec.layer === layer && rec.z > z + 0.01)) : rec.z > z + 0.01;
      if (!nearer || rec.box[2] <= box[0] || rec.box[0] >= box[2] || rec.box[3] <= box[1] || rec.box[1] >= box[3]) continue;
      out.push(rec);
    }
  }
  out.sort((a, b) => a.ord - b.ord);
  return out.length > _SCC_OCC_MAX ? out.slice(out.length - _SCC_OCC_MAX) : out;
}
