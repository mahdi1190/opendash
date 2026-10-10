/* ============================================================
   SCENE ENGINE: the PREBAKED player (browser; the pure helpers at the top also load in Node).

   A canvas scene's static picture (the compile, every sprite rasterised, the layer bakes, the shadows, the water and its
   reflections, the grade) is the slow part of showing it. For a scene with a prebaked manifest it is done ONCE, at build
   time (node tools/anim-pack.mjs scene prebake <ref>: the same renderer in headless Chrome), per season and per light key
   (day, golden, dusk, night), and kept as WebP images under assets/scenes/<pack>/<id>/ with a manifest. Here, at runtime:

     1. the manifest and the images of the season and the two light keys around the live sun are fetched and decoded off
        the main thread (fetch + createImageBitmap), fitted to the screen (resized off the main thread too);
     2. the FIRST PICTURE: the live sky (sceneSkyPaint, the live sun, moon and stars) with the baked land, its wind strips
        swaying and the clouds drifting, drawn straight from those images (no compile, no bake): visible and moving at once;
     3. meanwhile the canvas renderer (78-scene-canvas.js) is created on the same canvas with the prebaked compiled scene
        (only what moves: the movers, the flows, the water's geometry; o.compiled), the images as its restored bake
        (o.restore) and the frame sprites pre-rasterised at build time (an atlas put into the shared sprite cache), in idle
        slices; when it is ready it takes over the frames: the actors, flows, birds, the scene's own life (heron, kingfisher),
        the water's ripple and glints, the moving shadows, particles and weather, all the same code as the live path.
     4. the light: the two baked keys around the live sun altitude are cross-faded (setMix: the second key's bitmaps over the
        first at the blend weight), the sky is painted live, and a cheap global grade follows the live darkness; the frame
        passes get the live light (setLiveLight: their grade, the hour's life). A new key pair is fetched in idle time.

   No runtime cache is needed (no IndexedDB, no persistent bake): every load is the same few fetches and decodes.
   The current canvas path stays the fallback: no manifest, a fetch that fails, a missing image -> sceneRendererCreate as before.

     scenePrebakedLight(data, season, ms)      the light of a key moment (the host's v2 light without the live weather)
     scenePrebakedBlend(alt, anchors)          { a, b, w }: the two keys around a sun altitude and the weight of b
     scenePrebakedReduce(C)                    the compiled scene a prebaked runtime needs (what moves; the statics are images)
     scenePrebakedBase()                       where the assets are served ('/api/scene-assets/'; window.__scenePrebakedBase)
     scenePrebakedPlayer(canvas, item, data, o) a renderer-shaped player (start, stop, frame, resize, setLight, setSeason, ...)
   ============================================================ */
const SCENE_PREBAKE_KEYS = Object.freeze(['day', 'golden', 'dusk', 'night']);
/** The sun altitudes (degrees) where each key holds alone; between two anchors the keys cross-fade. day: at most its bake's altitude. */
const SCENE_PREBAKE_ANCHORS = Object.freeze({ day: 24, golden: 6, dusk: -4, night: -11 });

/** The light of a key moment: what the host gives a v2 scene (_schLight with a fixed season), without the live weather. */
function scenePrebakedLight(data, season, ms) {
  const v = (data && data.view) || {}, cam = (data && data.camera) || {};
  const lat = Number.isFinite(v.lat) ? v.lat : cam.lat, lon = Number.isFinite(v.lon) ? v.lon : cam.lon;
  const sky = typeof almSceneLight === 'function' ? almSceneLight(ms, lat, lon, 'UTC') : null;
  const o = sky ? { sky, season } : { season };
  const view = Object.assign({}, v, { season, at: data.at || v.at });
  if (typeof sceneLightV2 === 'function') return sceneLightV2(o, view, data);
  return typeof sceneLight === 'function' ? sceneLight(o, view) : null;
}
/**
 * The two light keys around a sun altitude: { a, b, w } (draw a, then b over it at weight w). anchors: { day, golden, dusk,
 * night } altitudes (a season's own: its day key's altitude caps the day anchor); keys missing from the manifest are skipped.
 */
function scenePrebakedBlend(alt, anchors, have) {
  const A = Object.assign({}, SCENE_PREBAKE_ANCHORS, anchors || {});
  const ks = SCENE_PREBAKE_KEYS.filter(k => !have || have.includes(k)).sort((x, y) => A[y] - A[x]);
  if (!ks.length) return null;
  if (!Number.isFinite(alt) || alt >= A[ks[0]]) return { a: ks[0], b: null, w: 0 };
  for (let i = 0; i + 1 < ks.length; i++) {
    const hi = A[ks[i]], lo = A[ks[i + 1]];
    if (alt >= lo) { const u = (hi - alt) / Math.max(1e-6, hi - lo), s = u * u * (3 - 2 * u); return s < 0.5 ? { a: ks[i], b: ks[i + 1], w: s } : { a: ks[i + 1], b: ks[i], w: 1 - s }; }
  }
  return { a: ks[ks.length - 1], b: null, w: 0 };
}
/**
 * The compiled scene a prebaked runtime needs: the static placements are in the images, so only the items that move (an
 * animation hook) and those the frame passes read (birds on the water: their rings) are kept, re-indexed; the wind strips keep
 * their layer and box but no items (their bitmaps are images); everything else (layers, water geometry, actors, flows,
 * camera, surfaces, buildings) as compiled. The bake plan is unchanged (it counts moving items and strips per layer).
 */
function scenePrebakedReduce(C) {
  const map = new Map(), items = [];
  C.items.forEach((it, i) => {
    if (it.strip >= 0) return;
    const cls = it.cls || (typeof sceneObjClassOf === 'function' ? sceneObjClassOf(it.o) : '');
    if ((it.anim && it.anim.length) || cls === 'bird-water') { map.set(i, items.length); items.push(it); }
  });
  const out = Object.assign({}, C, { items, strips: (C.strips || []).map(s => Object.assign({}, s, { items: [] })) });
  if (Array.isArray(C.lights)) out.lights = C.lights.filter(l => !Number.isFinite(l.i) || map.has(l.i)).map(l => (Number.isFinite(l.i) ? Object.assign({}, l, { i: map.get(l.i) }) : l));
  out.prebaked = true;
  return out;
}
/** Where the prebaked assets are served from (the server's /api/scene-assets/ route; tools may point elsewhere). */
function scenePrebakedBase() {
  return (typeof window !== 'undefined' && typeof window.__scenePrebakedBase === 'string') ? window.__scenePrebakedBase : '/api/scene-assets/';
}

/* ---------- runtime (browser) ---------- */
const _scpbManifests = new Map();   // url -> Promise<manifest>
const _scpbBlobs = new Map();       // url -> Promise<Blob> (this page's session only: a resize or a key change refits from them)
const _scpbNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
/** The manifest of an item (item.prebaked: '<pack>/<id>' under the asset base), or a rejected promise. */
function scenePrebakedManifest(item) {
  const id = item && item.prebaked;
  if (!id || !/^[a-z0-9-]+\/[a-z0-9-]+$/.test(id)) return Promise.reject(new Error('no prebaked manifest'));
  const url = scenePrebakedBase() + id + '/manifest.json';
  if (!_scpbManifests.has(url)) {
    const p = fetch(url).then(r => { if (!r.ok) throw new Error('manifest ' + r.status); return r.json(); }).then(m => { m.dir = url.slice(0, url.lastIndexOf('/') + 1); return m; });
    _scpbManifests.set(url, p);
    p.catch(() => _scpbManifests.delete(url));
  }
  return _scpbManifests.get(url);
}
function _scpbBlob(url) {
  if (!_scpbBlobs.has(url)) { const p = fetch(url).then(r => { if (!r.ok) throw new Error(url + ' ' + r.status); return r.blob(); }); _scpbBlobs.set(url, p); p.catch(() => _scpbBlobs.delete(url)); }
  return _scpbBlobs.get(url);
}
/** A file of the manifest as JSON (the compiled scene, the sprite map). */
function _scpbJson(man, file) { return _scpbBlob(man.dir + file).then(b => b.text()).then(t => JSON.parse(t)); }
/**
 * Decode one image off the main thread; w x h (device px; 0: as is): scaled by a drawImage into a canvas of that size (the
 * raster does it; createImageBitmap's own resize filters on the main thread: 200 ms for a water reflection on a slow CPU).
 */
function _scpbDecode(blob, w, h) {
  return createImageBitmap(blob, { premultiplyAlpha: 'premultiply' }).then((bm) => {
    if (!w || !h) return bm;
    const W = Math.max(1, Math.round(w)), H = Math.max(1, Math.round(h));
    if (W === bm.width && H === bm.height) return bm;
    const c = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(W, H) : Object.assign(document.createElement('canvas'), { width: W, height: H });
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(bm, 0, 0, W, H);
    try { bm.close(); } catch (e) { /* gone */ }
    return c;
  });
}
/**
 * A DOM image of a file, decoded (off the main thread; the compositor's raster threads upload and scale it: no main-thread
 * pixel work. A bitmaprenderer canvas decodes several at once but uploads on the main thread: a 150 ms stall at the reveal).
 */
function _scpbImg(url) {
  const img = new Image();
  img.decoding = 'async'; img.alt = ''; img.setAttribute('aria-hidden', 'true'); img.draggable = false;
  img.src = url;
  return (typeof img.decode === 'function' ? img.decode() : new Promise((res, rej) => { img.onload = res; img.onerror = rej; })).then(() => img);
}
/** The device size a host of css w x h draws at (the canvas renderer's: dpr-aware, capped by pixel count). */
function _scpbDevice(w, h, dpr) {
  const W = Math.max(1, Math.round(w * dpr)), H = Math.max(1, Math.round(h * dpr));
  const k = Math.min(1, Math.sqrt((SCENE_BACKING_MAX[0] * SCENE_BACKING_MAX[1]) / (W * H)));
  return [Math.max(1, Math.round(W * k)), Math.max(1, Math.round(H * k))];
}
/** The geometry of a device size: scene units -> device px (the renderer's: the 1600 x 900 safe frame covers the screen). */
function _scpbGeo(W, H) { const vs = Math.max(W / SCENE_W_SAFE, H / SCENE_H_SAFE); return { W, H, vs, ox: (W - SCENE_W_SAFE * vs) / 2, oy: (H - SCENE_H_SAFE * vs) / 2 }; }
/**
 * Load one light key fitted to a device geometry G: { groups: [{ img, x, y, w, h (device px), opaqueY, strips: [{ c, x, y, dw, dh,
 * base, xMid, amp }], lit: { img, x, y, w, h } }], clouds: [{ c, w, h, x0, y, sp }], pass: { name -> bitmap } }. The land is DOM
 * images (decoded and scaled by the browser); the strips are bitmaps at the build's resolution drawn scaled; the clouds and the
 * water pass's reflection and mask are resized to the device (small, off the main thread).
 */
async function _scpbLoadKey(man, K, G) {
  const k = G.vs / man.vs, X = (x) => (x - man.ox) * k + G.ox, Y = (y) => (y - man.oy) * k + G.oy;
  // whole device pixels at both edges: neighbouring tiles share their edges exactly (fractional edges blend twice: a seam)
  const box = (e) => { const x0 = Math.round(X(e.x)), y0 = Math.round(Y(e.y)), x1 = Math.round(X(e.x + e.w)), y1 = Math.round(Y(e.y + e.h)); return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) }; };
  const blob = (f) => _scpbBlob(man.dir + f);
  const fit = (w, h) => (Math.abs(k - 1) < 1e-6 ? [0, 0] : [w * k, h * k]);
  const groups = await Promise.all(K.groups.map(async (g) => {
    const tl = g.tiles || (g.file ? [Object.assign({ file: g.file }, g)] : []);
    const out = Object.assign({ tiles: [], opaqueY: Number.isFinite(g.opaqueY) ? Math.round(Y(g.opaqueY)) : G.H + 1, strips: [], lit: null }, tl.length ? box(g) : { x: 0, y: 0, w: 0, h: 0 });
    const jobs = [];
    tl.forEach((t, ti) => jobs.push(_scpbImg(man.dir + t.file).then(img => { const b = box(t); out.tiles[ti] = Object.assign({ img, core: t.core ? box({ x: t.core[0], y: t.core[1], w: t.core[2], h: t.core[3] }) : null }, b); })));
    if (g.lit) jobs.push(_scpbImg(man.dir + g.lit.file).then(img => { out.lit = Object.assign({ img }, box(g.lit)); }));
    (g.strips || []).forEach((s, si) => jobs.push(blob(s.file).then(b => _scpbDecode(b)).then(c => { out.strips[si] = { c, x: Math.round(X(s.x)), y: Math.round(Y(s.y)), dw: s.w * k, dh: s.h * k, base: Y(s.base), xMid: s.xMid, amp: s.amp }; })));
    await Promise.all(jobs);
    out.strips = out.strips.filter(Boolean);
    return out;
  }));
  const clouds = await Promise.all((K.clouds || []).map(c => blob(c.file).then(b => _scpbDecode(b, ...fit(c.pw, c.ph))).then(bm => ({ c: bm, w: c.w, h: c.h, x0: c.x0, y: c.y, sp: c.sp }))));
  return { groups, clouds, pass: null, K, k };
}
/** The water pass's reflection and mask of a loaded key (only the renderer needs them: loaded with it, in the background). */
async function _scpbLoadPass(man, KS) {
  if (KS.pass) return KS.pass;
  const pass = {}, k = KS.k;
  await Promise.all(Object.entries(KS.K.pass || {}).map(([n, p]) => _scpbBlob(man.dir + p.file).then(b => _scpbDecode(b, ...(Math.abs(k - 1) < 1e-6 ? [0, 0] : [p.w * k, p.h * k]))).then(bm => { pass[n] = bm; })));
  KS.pass = pass;
  return pass;
}
/** Free a loaded key's bitmaps. */
function _scpbFreeKey(KS) {
  if (!KS) return;
  const close = (c) => { try { if (c && typeof c.close === 'function') c.close(); } catch (e) { /* gone */ } };
  for (const g of KS.groups) for (const s of g.strips) close(s.c);
  for (const c of KS.clouds) close(c.c);
  for (const n in KS.pass || {}) close(KS.pass[n]);
}
let _scpbDot = null;
/** A 1 x 1 stand-in for the bitmaps the DOM shows (the land, the sky): the renderer keeps the layout, draws none of them. */
function _scpbStandIn() { if (!_scpbDot) { _scpbDot = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(1, 1) : document.createElement('canvas'); } return _scpbDot; }
/** A restore for the canvas renderer (its bake's R) from a loaded key: { meta, get(name), all, borrowed }. */
function _scpbRestore(KS) {
  const dot = _scpbStandIn(), map = new Map([['sky', dot]]);
  KS.groups.forEach((g, gi) => { if (g.tiles.length) map.set('g' + gi, dot); g.strips.forEach((s, k) => map.set('s' + gi + '.' + k, s.c)); });
  KS.clouds.forEach((c, i) => map.set('cl' + i, c.c));
  for (const n in KS.pass || {}) map.set(n, KS.pass[n]);
  const meta = { groups: KS.groups.map(g => ({ x: Math.round(g.x), y: Math.round(g.y), w: g.tiles.length ? Math.max(1, Math.round(g.w)) : 0, h: g.tiles.length ? Math.max(1, Math.round(g.h)) : 0, opaqueY: g.opaqueY,
    strips: g.strips.map(s => ({ x: s.x, y: s.y, base: s.base, xMid: s.xMid, amp: s.amp, dw: s.dw, dh: s.dh })) })) };
  return { meta, get: (n) => map.get(n) || null, all: [], borrowed: true };
}
/** Put a key's pre-rasterised frame sprites into the shared sprite cache (sceneSprites) under their build-time keys. */
async function _scpbSprites(man, K) {
  if (!K.atlas || !K.sprites || typeof sceneSprites === 'undefined') return 0;
  const [list, pages] = await Promise.all([_scpbJson(man, K.sprites), Promise.all(K.atlas.map(f => _scpbBlob(man.dir + f).then(b => createImageBitmap(b, { premultiplyAlpha: 'premultiply' }))))]);
  let n = 0;
  await Promise.all(list.map(async (e) => {
    const [key, pg, ax, ay, cw, ch, x0, y0, w, h, sc] = e;
    if (sceneSprites.has(key)) return;
    if (pg < 0) { sceneSprites.get(key, () => ({ c: null, x0: 0, y0: 0, w: 0, h: 0, sc: sc || 1, bytes: 0 })); return; }
    const c = await createImageBitmap(pages[pg], ax, ay, cw, ch);
    if (!sceneSprites.has(key)) { sceneSprites.get(key, () => ({ c, x0, y0, w, h, sc, bytes: cw * ch * 4 })); n++; }
  }));
  for (const p of pages) try { p.close(); } catch (e) { /* gone */ }
  return n;
}

/**
 * The player: a renderer-shaped object for the host (78-scene-host.js). el: the host element (the player's layers go in it; its
 * own canvas stays hidden); item, data: the registry item (item.prebaked) and its scene data; o: { lod, still, season, L (the
 * live light), dpr, time, onReady, onLive, onError }. The picture is a stack the browser composites on the GPU, as the v1 scenes:
 *   the live sky (a canvas painted on a light change) | stars and clouds (a canvas) | per depth group: the land image of the
 *   light key, the second key's image over it at the blend weight, the night lights (plus-lighter), a canvas for what moves
 *   in that group (its wind strips, water ripple and glints, movers, shadows) | the grade.
 * onReady fires with the FIRST PICTURE (already moving: strips, clouds, stars); onLive once the full renderer draws the frames.
 */
function scenePrebakedPlayer(el, item, data, o) {
  o = o || {};
  // world engine (format v3, docs/dev/WORLD_ENGINE.md): its own renderer, same player surface
  if (data && data.v === 3 && typeof worldRendererFor === 'function') return worldRendererFor(item, el, Object.assign({ data }, o));
  const hostCanvas = el.querySelector('canvas.sc-canvas');
  const dpr = o.dpr || (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1), lod = o.lod == null ? 1 : o.lod;
  let cssW = el.clientWidth || 1600, cssH = el.clientHeight || 900, season = o.season, Llive = o.L;
  let man = null, G = null, A = null, B = null, mix = { a: null, b: null, w: 0 }, r = null, live = false;
  let raf = 0, running = false, destroyed = false, shown = false, gen = 0, loadingPair = null, stars = [];
  let stack = null, skyC = null, upC = null, LY = null, gradeEl = null;
  const t00 = _scpbNow(), timeFn = o.time || (() => (_scpbNow() - t00) / 1000);
  const ph = { tl: [] }, tl = (s) => ph.tl.push(s + '@' + Math.round(_scpbNow() - t00));
  const frameTimes = [];
  const fail = (e) => { if (o.onError) { try { o.onError(e); } catch (e2) { /* the host's business */ } } else if (typeof console !== 'undefined') console.warn('prebaked scene failed:', e && e.message); };
  const keyOf = (k) => man && man.seasons[season] && man.seasons[season].keys[k];
  const pairFor = (L) => { const S = man.seasons[season]; return scenePrebakedBlend(L && Number.isFinite(L.alt) ? L.alt : NaN, S.anchors, Object.keys(S.keys)); };
  const css = (n) => (n / dpr) + 'px';
  const place = (node, x, y, w, h, z) => { const s = node.style; s.position = 'absolute'; s.left = css(x); s.top = css(y); s.width = css(w); s.height = css(h); s.zIndex = String(z); s.pointerEvents = 'none'; s.maxWidth = 'none'; };
  const layerCanvas = (z) => { const c = document.createElement('canvas'); c.width = G.W; c.height = G.H; place(c, 0, 0, G.W, G.H, z); return c; };
  /** The live sky (sceneSkyPaint with the live light) and the stars' places. */
  const paintSky = () => {
    if (!skyC || !G || !man) return;
    const Lx = Llive || (A && A.L), C = { view: man.view, sky: man.sky };
    sceneSkyPaint(skyC.getContext('2d', { alpha: false }), Lx, C, [G.vs, 0, 0, G.vs, G.ox, G.oy], false);
    stars = [];
    if (Lx && man.sky) {
      const hor = Lx.horizon || man.view.horizon || 560, ns = Math.min(220, Math.round((man.sky.stars || 0) * (Lx.stars || 0) * Math.max(0.3, lod))), rr = _scRndOf(41);
      for (let i = 0; i < ns; i++) { const x = -100 + rr() * 1800, y = Math.pow(rr(), 1.4) * (hor - 30), s = 0.7 + rr() * 1.2; stars.push([x * G.vs + G.ox, y * G.vs + G.oy, Math.max(1, s * G.vs * 1.2), i % 3]); }
    }
  };
  /** The grade toward the live darkness: what the blend of the two keys misses (the live sun between their altitudes). A DOM layer. */
  const applyGrade = () => {
    if (!gradeEl || !G) return;
    let a = 0, col = '#0b1226', blend = 'normal';
    if (Llive && A) {
      const da = A.L ? A.L.dark || 0 : 0, db = B && B.L ? B.L.dark || 0 : da, have = da + (db - da) * (B ? mix.w : 0), d = (Llive.dark || 0) - have;
      if (d > 0.03) a = Math.min(0.45, d * 0.7); else if (d < -0.03) { a = Math.min(0.2, -d * 0.35); col = '#fff0d8'; blend = 'soft-light'; }
    }
    const y = Math.max(0, Math.round(((Llive && Llive.horizon) || man.view.horizon || 560) * G.vs + G.oy - 30 * G.vs));
    place(gradeEl, 0, y, G.W, Math.max(1, G.H - y), 900);
    gradeEl.style.background = col; gradeEl.style.mixBlendMode = blend; gradeEl.style.opacity = String(Math.round(a * 1000) / 1000);
  };
  /** The night key's lights (lit windows, lamps) at the live window share while the night key is only partly blended in. */
  const laOf = () => (B && B.k === 'night' && Llive && Llive.windows ? (1 - mix.w) * (Number.isFinite(Llive.windowShare) ? Math.min(1, Llive.windowShare / 0.6) : 1) : 0);
  const applyMix = () => {
    if (!A) return;
    A.S.groups.forEach((g) => { for (const t of g.tiles) t.img.style.opacity = '1'; });
    if (B) B.S.groups.forEach((g) => { for (const t of g.tiles) t.img.style.opacity = String(Math.round(mix.w * 1000) / 1000); if (g.lit) g.lit.img.style.opacity = '0'; });
    const night = B && B.k === 'night' ? B : null, la = laOf();
    if (night) night.S.groups.forEach((g) => { if (g.lit) g.lit.img.style.opacity = String(Math.round(la * 1000) / 1000); });
    applyGrade();
    if (r && live) r.setMix(mixObj());
  };
  const mixObj = () => ({ w: B ? mix.w : 0, la: 0, groups: B ? B.S.groups.map(g => ({ c: null, strips: g.strips })) : [], grade: null });
  /** Put a loaded key pair into the stack (images under each group's canvas), replacing the old pair's images. */
  const mount = (oldA, oldB) => {
    const zOf = (gi, k) => 10 + gi * 10 + k;
    const put = (K, k0) => K && K.S.groups.forEach((g, gi) => {
      for (const t of g.tiles) {
        place(t.img, t.x, t.y, t.w, t.h, zOf(gi, k0));
        // the tile's bleed clipped off: its core's edges are whole device pixels, shared with its neighbours'
        if (t.core) t.img.style.clipPath = 'inset(' + css(t.core.y - t.y) + ' ' + css(t.x + t.w - t.core.x - t.core.w) + ' ' + css(t.y + t.h - t.core.y - t.core.h) + ' ' + css(t.core.x - t.x) + ')';
        if (t.img.parentNode !== stack) stack.appendChild(t.img);
      }
      if (g.lit) { place(g.lit.img, g.lit.x, g.lit.y, g.lit.w, g.lit.h, zOf(gi, 3)); g.lit.img.style.mixBlendMode = 'plus-lighter'; g.lit.img.style.opacity = '0'; if (g.lit.img.parentNode !== stack) stack.appendChild(g.lit.img); }
    });
    put(A, 1); put(B, 2);
    for (const K of [oldA, oldB]) if (K && K !== A && K !== B) K.S.groups.forEach(g => { for (const t of g.tiles) t.img.remove(); if (g.lit) g.lit.img.remove(); });
    applyMix();
  };
  /** The stack: built (or rebuilt at a new size) once a key is loaded. */
  const build = () => {
    if (stack) stack.remove();
    stack = document.createElement('div');
    stack.className = 'sc-pb'; stack.setAttribute('aria-hidden', 'true');
    Object.assign(stack.style, { position: 'absolute', inset: '0', overflow: 'hidden', pointerEvents: 'none', contain: 'strict' });
    skyC = layerCanvas(1); upC = layerCanvas(2);
    stack.appendChild(skyC); stack.appendChild(upC);
    const groups = [];
    A.S.groups.forEach((g, gi) => { const c = layerCanvas(10 + gi * 10 + 5); stack.appendChild(c); groups.push(c.getContext('2d')); });
    gradeEl = document.createElement('div'); stack.appendChild(gradeEl);
    LY = { sky: upC.getContext('2d'), groups };
    if (hostCanvas) { hostCanvas.style.visibility = 'hidden'; el.insertBefore(stack, hostCanvas); } else el.appendChild(stack);
  };
  /** The first picture's frames (before the renderer takes over): stars, clouds, each group's strips. */
  const frame1 = (t) => {
    if (!A || !G || !LY) return;
    const S = A.S, W = G.W, H = G.H, Lx = A.L;
    for (const c of [LY.sky].concat(LY.groups)) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.clearRect(0, 0, W, H); }
    const hideBelow = []; let hb = H;
    for (let i = S.groups.length - 1; i >= 0; i--) { hideBelow[i] = hb; hb = Math.min(hb, S.groups[i].opaqueY); }
    const sx = LY.sky;
    if (stars.length) { sx.fillStyle = '#fffaf0'; const base = 0.35 + 0.65 * ((Llive || Lx).stars || 0); for (let q = 0; q < 3; q++) { sx.globalAlpha = base * (0.65 + 0.35 * Math.sin(t * (1.1 + q * 0.6) + q * 2)); for (const s of stars) if (s[3] === q && s[1] < hb) sx.fillRect(s[0], s[1], s[2], s[2]); } sx.globalAlpha = 1; }
    for (const c of S.clouds) { const x = Math.round(sceneCloudX(c, t) * G.vs + G.ox), y = Math.round((c.y - c.h) * G.vs + G.oy); if (y > hb || x > W || x + c.c.width < 0) continue; sx.drawImage(c.c, x, y); }
    const mw = B ? mix.w : 0;
    S.groups.forEach((g, gi) => {
      const below = hideBelow[gi], g2 = B && B.S.groups[gi], cx = LY.groups[gi];
      g.strips.forEach((s, si) => {
        if (s.y >= below) return;
        const k = (s.amp || 1) * sceneWindSafe(t, s.xMid, Lx) * 0.02;
        cx.setTransform(1, 0, k, 1, -k * s.base, 0); cx.globalAlpha = 1; cx.drawImage(s.c, s.x, s.y, s.dw, s.dh);
        const s2 = g2 && mw > 0.004 ? g2.strips[si] : null;
        if (s2) { cx.globalAlpha = mw; cx.drawImage(s2.c, s2.x, s2.y, s2.dw, s2.dh); cx.globalAlpha = 1; }
      });
    });
  };
  const draw = (t) => {
    const a = _scpbNow();
    if (live && r) r.frame(t); else frame1(t);
    frameTimes.push(_scpbNow() - a); if (frameTimes.length > 900) frameTimes.splice(0, 300);
  };
  const loop = () => { raf = 0; if (!running || destroyed) return; if (shown) draw(timeFn()); raf = requestAnimationFrame(loop); };
  /** The renderer over the first picture (idle time): the compiled scene (what moves), the frame sprites, a restore of the layout. */
  async function makeRenderer(my, ka) {
    const [C] = await Promise.all([_scpbJson(man, man.seasons[season].c), _scpbSprites(man, ka), _scpbLoadPass(man, A.S)]);
    if (my !== gen || destroyed) return;
    tl('compiled');
    const La = scenePrebakedLight(data, season, ka.ms);
    A.L = La; if (B && B.L && B.L.partial) B.L = scenePrebakedLight(data, season, keyOf(B.k).ms);
    const R = _scpbRestore(A.S);
    const off = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(1, 1) : document.createElement('canvas');
    r = sceneRendererCreate(off, null, { compiled: C, restore: () => R, spriteVs: man.vs, lod, still: !!o.still, season, L: La, dpr, time: timeFn, hideUntilReady: true, warmFrames: false,
      layers: () => LY,
      onReady: () => {
        if (destroyed || live) return;
        tl('live');
        if (Llive) r.setLiveLight(Llive);
        r.setMix(mixObj());
        live = true;
        if (o.still || !running) draw(o.still ? 0 : timeFn());
        if (o.onLive) try { o.onLive(); } catch (e) { /* the host's business */ }
      }, onError: fail });
    r.bakeIdle(cssW, cssH);
  }
  /** Load (again: a new size or key pair) the images; the first load shows the first picture, then builds the renderer. */
  async function load() {
    const my = ++gen;
    try {
      tl('start');
      if (!man) { man = await scenePrebakedManifest(item); tl('manifest'); }
      if (my !== gen || destroyed) return;
      if (!man.seasons[season]) season = Object.keys(man.seasons)[0];
      const [W, H] = _scpbDevice(cssW, cssH, dpr), G2 = _scpbGeo(W, H), pair = pairFor(Llive);
      const ka = keyOf(pair.a), kb = pair.b && pair.w > 0.02 ? keyOf(pair.b) : null;
      const [sa, sb] = await Promise.all([_scpbLoadKey(man, ka, G2), kb ? _scpbLoadKey(man, kb, G2) : null]);
      if (my !== gen || destroyed) { _scpbFreeKey(sa); _scpbFreeKey(sb); return; }
      tl('images');
      // the keys' light: the first picture needs only their wind and darkness (in the manifest); the full light is worked out with the renderer
      const La = { wind: ka.wind, dark: ka.dark, stars: 0, partial: true }, Lb = kb ? { wind: kb.wind, dark: kb.dark, partial: true } : null;
      const oldA = A, oldB = B, resized = !G || G.W !== G2.W || G.H !== G2.H;
      G = G2; mix = pair;
      A = { k: pair.a, S: sa, L: La }; B = kb ? { k: pair.b, S: sb, L: Lb } : null;
      if (!r) {
        build(); paintSky(); mount(oldA, oldB);
        // the first picture now, then the renderer in the background
        draw(o.still ? 0 : timeFn());
        tl('shown');
        if (!shown) { shown = true; if (o.onReady) try { o.onReady(); } catch (e) { /* the host's business */ } }
        if (running && !raf && !o.still) raf = requestAnimationFrame(loop);
        _scpbFreeKey(oldA && oldA.S); _scpbFreeKey(oldB && oldB.S);
        await makeRenderer(my, ka);
      } else {
        // the renderer re-bakes from the new layout in idle slices (a new size: the layers are rebuilt at once)
        await Promise.all([_scpbSprites(man, ka), _scpbLoadPass(man, sa)]);
        if (my !== gen || destroyed) return;
        if (resized) { build(); }
        paintSky(); mount(oldA, oldB);
        const R = _scpbRestore(sa), La2 = scenePrebakedLight(data, season, ka.ms);
        A.L = La2; if (B) B.L = scenePrebakedLight(data, season, kb.ms);
        r.restoreWith(() => R, La2, cssW, cssH);
      }
    } catch (e) { if (my === gen && !destroyed) fail(e); }
  }
  /** The live light changed (the host, every 120 s): repaint the sky, re-weigh the keys; a new key pair loads in the background. */
  function relight(L) {
    Llive = L;
    if (!man || !A) return;
    const p = pairFor(L), same = p.a === A.k && (B ? p.b === B.k : !p.b || p.w <= 0.02);
    paintSky();
    if (r && live) r.setLiveLight(L);
    if (same) { mix = p; applyMix(); return; }
    const want = p.a + '|' + p.b;
    if (loadingPair !== want) { loadingPair = want; load().then(() => { if (loadingPair === want) loadingPair = null; }); }
  }
  const api = {
    get baked() { return shown; },
    get env() { return r ? r.env : null; },
    get waiting() { return false; },
    get baking() { return !shown; },
    get ready() { return shown; },
    get live() { return live; },
    bakeIdle(w, h) { cssW = w || cssW; cssH = h || cssH; if (!gen) load(); },
    resize(w, h) {
      cssW = w || cssW; cssH = h || cssH;
      const [W, H] = _scpbDevice(cssW, cssH, dpr);
      if (G && G.W === W && G.H === H) return;
      load();
    },
    setLight(L) { if (L) relight(L); },
    setSeason(s) { if (!s || s === season) return; season = s; if (r) { r.destroy(); r = null; live = false; } if (gen) load(); },
    setLod() { /* the images are the scene at full detail */ },
    start() { if (running || destroyed) return; running = true; if (!gen) load(); if (shown && !raf) raf = requestAnimationFrame(loop); },
    stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    get running() { return running; },
    frame(t) { if (shown) draw(t || 0); },
    /** The frame at t composited into one canvas (tools): the stack's layers in order. */
    snapshot(t) {
      if (!shown || !G || !stack) return null;
      draw(t || 0);
      const c = document.createElement('canvas'); c.width = G.W; c.height = G.H; const x = c.getContext('2d');
      const kids = [...stack.children].sort((a, b) => (+a.style.zIndex) - (+b.style.zIndex));
      for (const n of kids) {
        const op = Number(n.style.opacity === '' ? 1 : n.style.opacity);
        if (!(op > 0)) continue;
        x.globalAlpha = op; x.globalCompositeOperation = n.style.mixBlendMode === 'plus-lighter' ? 'lighter' : n.style.mixBlendMode === 'soft-light' ? 'soft-light' : 'source-over';
        const L = parseFloat(n.style.left) * dpr, T = parseFloat(n.style.top) * dpr, Wd = parseFloat(n.style.width) * dpr, Hd = parseFloat(n.style.height) * dpr;
        if (n.tagName === 'DIV') { x.fillStyle = n.style.background || n.style.backgroundColor; x.fillRect(L, T, Wd, Hd); } else x.drawImage(n, L, T, Wd, Hd);
      }
      return c;
    },
    attach() { /* the player keeps its layers */ },
    stats() {
      const s = r ? r.stats() : { drawMs: _sccStat([]), dynMs: _sccStat([]), sprites: 0, spriteBytes: 0, bitmaps: 0, phases: {} };
      return Object.assign({}, s, { prebaked: { keys: A ? [A.k, B ? B.k : null, Math.round(mix.w * 100) / 100] : null, season, live, tl: ph.tl.slice(), frameMs: _sccStat(frameTimes) } });
    },
    resetStats() { frameTimes.length = 0; if (r) r.resetStats(); },
    destroy() {
      api.stop(); destroyed = true; gen++;
      if (r) { r.destroy(); r = null; }
      _scpbFreeKey(A && A.S); _scpbFreeKey(B && B.S); A = B = null;
      if (stack) { stack.remove(); stack = null; }
      if (hostCanvas) hostCanvas.style.visibility = '';
    },
  };
  return api;
}
