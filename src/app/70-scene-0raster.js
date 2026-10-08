/* ============================================================
   SCENE ENGINE: RASTER OBJECTS (docs/dev/OBJECT_IMPORT.md; SCENE_ENGINE.md 2.9). PURE: no DOM at load, nothing expensive.
   A library object may be backed by PNG (or WebP) images instead of vector shapes:

     sceneObjDefine({ id, kind: 'raster', category, size: [w, h], anchor: 'bottom-centre' | [ax, ay],
                      images: { base, spring?, summer?, autumn?, winter?, night?, lit?, snow?, mask_lit? } | [ {...}, ... one per variant ],
                      parts?: [{ name, image, box: [x, y, w, h], pivot: [x, y], anim: { kind: 'spin' | 'sway' | 'bob' | 'turn' | 'flicker', ... } }],
                      frames?: { images: [key, ...] (2 to 4, or up to 6), period: 0.9 },
                      tags, flippable, reflect, shadow, weight })

   Image values are asset KEYS: paths under assets/objects/ ('building/terrace-ai/base.png'). The bytes are embedded in the
   built page as non-running script elements (type application/octet-stream, attribute data-scene-raster = the key) (build.mjs; never parsed as script)
   and decoded lazily, the first time a scene draws the object (78-scene-canvas.js sceneRasterImage). Node tools install a
   reader with sceneRasterSource(fn) (tools/lib/raster-assets.mjs), so the SVG still embeds them as data: URLs.

   The object resolves (sceneObjShapes) to ordinary parts whose shapes carry an `img`:
     { d: <the image rectangle>, img: { key, x, y, w, h, fx, night, mask, day } }
   so boxes, hooks, sprites, the sprite cache keys and the SVG symbols work unchanged. Parts: 'body' (the image of the
   season), one part per animation part, 'f0'..'fN' (frames: drawn only by the frames hook, never in a still), 'lit'.

   Derivations (only where an image is missing; a real image always wins):
     season   the base (= summer) through a colour matrix: SCENE_RASTER_FX.spring / autumn (warm, greens to ochre) /
              winter (cool, desaturated) plus the import-time snow overlay ('snow': snow on the top edges) when there is one
     night    from real dusk (L.dark >= .5) the night image when there is one, else the base under the live grade (darkened,
              desaturated and cooled exactly like a vector object); the 'lit' part (lit windows) shows from L.windows:
              the lit image (from a sprite sheet's lit column, or auto-detected windows at import), or mask_lit over a warm
              copy of the base
     grade    the live-sky light grade (sceneColour: tint, haze, the grade) is affine per channel, so it is FITTED to a 3 x 4
              colour matrix (sceneRasterFit) and applied to the pixels once per sprite (canvas) or as one feColorMatrix (SVG)

     sceneRasterPrep(def) -> a registry definition     sceneRasterSource(fn)     sceneRasterUrl(key)     sceneRasterKeys(id)
     sceneRasterFit(col) / sceneRasterMul(A, B) / sceneRasterMatrix(col, fx) / sceneRasterApply(M, px) / sceneRasterFilter(M)
     SCENE_RASTER_FX, SCENE_RASTER_BUDGET, SCENE_RASTER_ANCHORS, SCENE_RASTER_IMAGE_NAMES
   ============================================================ */
const SCENE_RASTER_IMAGE_NAMES = Object.freeze(['base', 'spring', 'summer', 'autumn', 'winter', 'night', 'lit', 'snow', 'mask_lit']);
/** Install-size budgets (bytes of the files as stored; the page carries them as base64, x 4/3). object lint enforces them. */
const SCENE_RASTER_BUDGET = Object.freeze({ imageKB: { warn: 96, max: 256 }, objectKB: { warn: 192, max: 512 }, libraryKB: { warn: 2048, max: 6144 }, maxSide: 1024 });
const SCENE_RASTER_ANCHORS = Object.freeze({ 'bottom-centre': [0.5, 1], 'bottom-center': [0.5, 1], centre: [0.5, 0.5], center: [0.5, 0.5], 'bottom-left': [0, 1], 'bottom-right': [1, 1], 'top-centre': [0.5, 0], 'top-center': [0.5, 0] });
/**
 * The derivation matrices, 3 x 4 row-major on 0..255 sRGB values: [rR rG rB r0, gR gG gB g0, bR bG bB b0].
 * autumn: R + .75 (G - B) pushes greens to ochre and rust, greys stay grey; winter: 45 % toward the luminance, cooler and a
 * little lighter; spring: fresher, slightly yellow-green; glow: the warm window light a mask_lit lights.
 */
const SCENE_RASTER_FX = Object.freeze({
  spring: Object.freeze([0.98, 0.06, -0.04, 4, -0.03, 1.06, -0.03, 4, 0, 0, 0.95, 2]),
  summer: Object.freeze([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]),
  autumn: Object.freeze([1, 0.75, -0.75, 0, 0.3, 0.6, 0.1, 0, 0.05, 0.05, 0.82, 0]),
  winter: Object.freeze([0.651, 0.252, 0.047, 6, 0.132, 0.799, 0.049, 6, 0.14, 0.276, 0.623, 14]),
  glow: Object.freeze([0.3, 0.3, 0.1, 150, 0.25, 0.25, 0.1, 110, 0.06, 0.06, 0.04, 40]),
});
const _SC_RID = Object.freeze([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]);

/* ---------- the definition ---------- */
const _scRasterDefs = new Map();
/** The anchor fractions [ax, ay] of a name or a pair (default bottom-centre). */
function _scRasterAnchor(a) {
  if (Array.isArray(a) && a.length === 2 && a.every(Number.isFinite)) return a;
  const k = SCENE_RASTER_ANCHORS[String(a || 'bottom-centre')];
  if (!k) throw new Error('raster object: unknown anchor ' + a + ' (' + Object.keys(SCENE_RASTER_ANCHORS).join(', ') + ', or [ax, ay])');
  return k;
}
const _scR2r = v => Math.round(v * 100) / 100;
/** A raster definition -> a registry definition (a build() that returns image shapes). Called by sceneObjDefine for kind 'raster'. */
function sceneRasterPrep(raw) {
  const id = raw.id;
  const vars = (Array.isArray(raw.images) ? raw.images : [raw.images || {}]).map(v => Object.assign({}, v));
  if (!vars.length || vars.some(v => !v.base)) throw new Error('sceneObjDefine ' + id + ': a raster object needs images.base (for every variant)');
  for (const v of vars) for (const k of Object.keys(v)) if (!SCENE_RASTER_IMAGE_NAMES.includes(k)) throw new Error('sceneObjDefine ' + id + ': unknown raster image "' + k + '" (' + SCENE_RASTER_IMAGE_NAMES.join(', ') + ')');
  if (!Array.isArray(raw.size) || raw.size.length !== 2) throw new Error('sceneObjDefine ' + id + ': a raster object needs size [w, h] (world units)');
  const [w, h] = raw.size, an = _scRasterAnchor(raw.anchor), x0 = _scR2r(-w * an[0]), y0 = _scR2r(-h * an[1]);
  const rect = (x, y, ww, hh) => 'M' + _scR2r(x) + ' ' + _scR2r(y) + 'h' + _scR2r(ww) + 'v' + _scR2r(hh) + 'h' + _scR2r(-ww) + 'z';
  const parts = (raw.parts || []).map(p => Object.assign({}, p));
  for (const p of parts) {
    if (!/^[a-z][a-z0-9-]{0,20}$/.test(p.name || '') || ['body', 'lit'].includes(p.name) || /^f\d+$/.test(p.name)) throw new Error('sceneObjDefine ' + id + ': a raster part needs a name (lower case; not body, lit or f<N>)');
    if (!p.image || !Array.isArray(p.box) || p.box.length !== 4) throw new Error('sceneObjDefine ' + id + ': raster part ' + p.name + ' needs image and box [x, y, w, h]');
  }
  const fr = raw.frames && Array.isArray(raw.frames.images) && raw.frames.images.length ? raw.frames : null;
  if (fr && (fr.images.length < 2 || fr.images.length > 6)) throw new Error('sceneObjDefine ' + id + ': frames need 2 to 6 images');
  const frameNames = fr ? fr.images.map((_, i) => 'f' + i) : [];
  const anim = {};
  for (const p of parts) if (p.anim && p.anim.kind) {
    const a = Object.assign({}, p.anim, { part: p.name, pivot: p.pivot || [p.box[0] + p.box[2] / 2, p.box[1] + p.box[3] / 2] });
    delete a.kind;
    anim[p.anim.kind] = a;
  }
  if (fr) anim.frames = { parts: ['body'].concat(frameNames), hide: 1, period: fr.period || 0.9 };
  Object.assign(anim, raw.anim || {});
  const seasonFx = (se) => (se === 'summer' ? null : se);
  const def = Object.assign({}, raw, {
    kind: 'raster',
    category: raw.category || String(id).split('.')[0],
    variants: vars.length,
    seasonal: raw.seasonal !== false,
    parts: ['body'].concat(parts.map(p => p.name), frameNames, ['lit']),
    animOnly: frameNames,
    anim: Object.keys(anim).length ? anim : undefined,
    box: [Math.floor(Math.min(x0, ...parts.map(p => p.box[0]))) - 2, Math.floor(Math.min(y0, ...parts.map(p => p.box[1]))) - 2,
      Math.ceil(Math.max(x0 + w, ...parts.map(p => p.box[0] + p.box[2]))) + 2, Math.ceil(Math.max(y0 + h, ...parts.map(p => p.box[1] + p.box[3]))) + 2],
    raster: { images: vars, anchor: an, rect: [x0, y0, w, h], parts, frames: fr },
    build(v, rnd, ctx) {
      const im = vars[v] || vars[0], se = (ctx && ctx.season) || 'summer';
      const own = im[se] || (se === 'summer' ? im.base : null);
      const at = { x: x0, y: y0, w, h };
      const body = [{ d: rect(x0, y0, w, h), img: Object.assign({ key: own || im.base, fx: own ? null : seasonFx(se), night: im.night || null, mean: (raw.means || [])[v] || null }, at) }];
      if (!own && se === 'winter' && im.snow) body.push({ d: rect(x0, y0, w, h), img: Object.assign({ key: im.snow, fx: null, night: im.night || null, day: true }, at) });
      const out = { body };
      for (const p of parts) out[p.name] = [{ d: rect(p.box[0], p.box[1], p.box[2], p.box[3]), img: { key: p.image, x: p.box[0], y: p.box[1], w: p.box[2], h: p.box[3], fx: seasonFx(se), night: null } }];
      if (fr) fr.images.forEach((k, i) => { out['f' + i] = [{ d: rect(x0, y0, w, h), img: Object.assign({ key: k, fx: seasonFx(se), night: null }, at) }]; });
      if (im.lit) out.lit = [{ d: rect(x0, y0, w, h), img: Object.assign({ key: im.lit, fx: null, night: null }, at) }];
      else if (im.mask_lit) out.lit = [{ d: rect(x0, y0, w, h), img: Object.assign({ key: im.base, mask: im.mask_lit, fx: 'glow', night: null }, at) }];
      return out;
    },
  });
  _scRasterDefs.set(id, def);
  return def;
}
/** Every asset key an object uses (all variants, parts and frames), or [] for a vector object. */
function sceneRasterKeys(id) {
  const d = typeof sceneObj === 'function' ? sceneObj(id) : _scRasterDefs.get(id);
  if (!d || d.kind !== 'raster' || !d.raster) return [];
  const s = new Set();
  for (const v of d.raster.images) for (const k of Object.keys(v)) s.add(v[k]);
  for (const p of d.raster.parts) s.add(p.image);
  if (d.raster.frames) for (const k of d.raster.frames.images) s.add(k);
  return [...s];
}

/* ---------- the bytes: embedded blocks in the page, or a reader the Node tools install ---------- */
let _scRasterReader = null;
const _scRasterUrls = new Map();
/** Node tools: fn(key) -> base64 string | Buffer | null. Pass null to remove it. */
function sceneRasterSource(fn) { _scRasterReader = typeof fn === 'function' ? fn : null; _scRasterUrls.clear(); }
function sceneRasterMime(key) { return /\.webp$/i.test(String(key)) ? 'image/webp' : 'image/png'; }
/** The data: URL of an asset key, or null when its bytes are not available (yet). */
function sceneRasterUrl(key) {
  if (!key) return null;
  if (_scRasterUrls.has(key)) return _scRasterUrls.get(key);
  let b64 = null;
  if (_scRasterReader) {
    const v = _scRasterReader(key);
    b64 = v == null ? null : typeof v === 'string' ? v : (typeof Buffer !== 'undefined' && Buffer.isBuffer(v) ? v.toString('base64') : null);
  } else if (typeof document !== 'undefined' && document.querySelector) {
    const el = document.querySelector('script[data-scene-raster="' + String(key).replace(/["\\]/g, '') + '"]');
    b64 = el ? el.textContent.replace(/\s+/g, '') : null;
  }
  const url = b64 ? 'data:' + sceneRasterMime(key) + ';base64,' + b64 : null;
  if (url) _scRasterUrls.set(key, url);
  return url;
}

/* ---------- colour matrices (the grade, the season derivations) ---------- */
const _scRasterFits = new WeakMap();
/**
 * Fit a colour function '#rrggbb' -> '#rrggbb' (the grade: sceneColour with L, haze and tint, all affine per channel up to the
 * clamp) to a 3 x 4 matrix, from four probes away from the clamp. Memoised per function.
 */
function sceneRasterFit(col) {
  if (typeof col !== 'function') return _SC_RID;
  const hit = _scRasterFits.get(col);
  if (hit) return hit;
  const hx = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  const rgb = (c) => { const n = parseInt(String(c).replace('#', ''), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const lo = 64, hi = 192, d = hi - lo;
  const o = rgb(col(hx(lo, lo, lo))), cr = rgb(col(hx(hi, lo, lo))), cg = rgb(col(hx(lo, hi, lo))), cb = rgb(col(hx(lo, lo, hi)));
  const M = [];
  for (let i = 0; i < 3; i++) {
    const a = (cr[i] - o[i]) / d, b = (cg[i] - o[i]) / d, c = (cb[i] - o[i]) / d;
    M.push(a, b, c, o[i] - (a + b + c) * lo);
  }
  const out = M.map(v => Math.round(v * 10000) / 10000);
  _scRasterFits.set(col, out);
  return out;
}
/** A after B (B is applied to the pixel first). */
function sceneRasterMul(A, B) {
  const out = [];
  for (let i = 0; i < 3; i++) {
    const a = A.slice(i * 4, i * 4 + 4);
    for (let j = 0; j < 4; j++) out.push(a[0] * B[j] + a[1] * B[4 + j] + a[2] * B[8 + j] + (j === 3 ? a[3] : 0));
  }
  return out.map(v => Math.round(v * 10000) / 10000);
}
function sceneRasterIsId(M) { for (let i = 0; i < 12; i++) if (Math.abs(M[i] - _SC_RID[i]) > (i % 4 === 3 ? 0.5 : 0.002)) return false; return true; }
/** The matrix that draws an image: the season (or glow) derivation first, then the grade (col). */
function sceneRasterMatrix(col, fx) {
  const G = sceneRasterFit(col), F = fx && SCENE_RASTER_FX[fx] ? SCENE_RASTER_FX[fx] : null;
  return F ? sceneRasterMul(G, F) : G;
}
/** Apply a matrix to RGBA8 pixels in place (alpha untouched; fully transparent pixels skipped). */
function sceneRasterApply(M, px) {
  const [a, b, c, d, e, f, g, h, i, j, k, l] = M;
  const cl = v => (v < 0 ? 0 : v > 255 ? 255 : v + 0.5) | 0;
  for (let p = 0; p < px.length; p += 4) {
    if (!px[p + 3]) continue;
    const R = px[p], G = px[p + 1], B = px[p + 2];
    px[p] = cl(a * R + b * G + c * B + d); px[p + 1] = cl(e * R + f * G + g * B + h); px[p + 2] = cl(i * R + j * G + k * B + l);
  }
  return px;
}
/** The feColorMatrix values of a matrix (0..1 units, alpha kept). */
function sceneRasterFilter(M) {
  const r = v => Math.round(v * 10000) / 10000;
  return [M[0], M[1], M[2], 0, r(M[3] / 255), M[4], M[5], M[6], 0, r(M[7] / 255), M[8], M[9], M[10], 0, r(M[11] / 255), 0, 0, 0, 1, 0].join(' ');
}
/** Which image an img shape draws under a light: the night image after real dusk (L.dark >= .5), else its own key; skip: a day-only overlay (snow) while the night image shows. */
function sceneRasterPick(img, L) {
  const on = !!(img.night && L && (L.dark || 0) >= 0.5);
  return { key: on && !img.day ? img.night : img.key, night: on && !img.day, skip: on && !!img.day };
}
