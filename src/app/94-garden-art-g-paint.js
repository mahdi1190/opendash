/* ============================================================
   GARDEN ART, painted figures (Painted village style). The owner, Nov 2026: the people and creatures "look like stickers over the painting".
   The opening scenes' kit (70-scene-lib-*, the faceless people of 70-scene-lib-people-0figure.js, the animals) is flat vector with soft form
   shading lit from the upper left, no ink outlines, colours in the world's own key, and every figure stands in a soft contact shadow.
   This file brings every figure the garden draws into that key WITHOUT redrawing it, so every wardrobe item, pet look, fish and bug keeps
   its own drawing and id, and a friend sees exactly the same figure:

     gardenFigurePaint(svg, kind)   -> the same SVG fragment, painted: kind 'actor' (people), 'pet', 'fish' (side on), 'bug' (from above), 'npc'
       - every opaque flat fill becomes a soft linear gradient across its own box (objectBoundingBox): sunlit at the upper left, the base
         colour through the middle, a shade toward the lower right. The shade is the scenes' own warm-green shadow, never black, so a figure
         picks up the ground it stands on (the kit's tone4: light, base, shade, deep)
       - colours are graded into the scene's key: a little less saturation and a touch of the low sun, so a pure navy or a red is not louder
         than the painting round it
       - an ink outline on a filled shape (the creature art and the villagers have them) becomes a gentle one: the shape's own deep tone,
         thinner and softer. Strokes that ARE the drawing (an arm, a leg, an antenna) keep their width and only take the grade
       - shading and highlight overlays (anything already see-through) keep their flat colour, graded
     gardenFigurePaintOn()          -> true when the garden is open in the Painted village style on the Phaser renderer
     gardenFigureShadowSvg(rx, ry)  -> the soft contact shadow used under painted figures (two nested ellipses, the scene's shadow colour)

   Only paints and stroke widths change: element order, classes, transforms and CSS motion hooks are untouched, so every walk cycle, pose
   and trick plays as before. The gradients are plain SVG <linearGradient> (the native compiler turns each into vertex colours once, then the
   figure's static parts are baked into its cached textures like any flat fill): nothing new is drawn per frame. The result is cached per
   source string (bounded). Pure string work: no DOM, no state, so Node may evaluate it.
   ============================================================ */
const _GFP = Object.freeze({
  sun: [255, 244, 214],        // the low warm sun of the scenes
  shade: [52, 62, 44],         // the scenes' shadow (the painted ground's shadow, a little deeper)
  deep: [40, 38, 30],          // outlines
  grade: [205, 196, 160],      // the world's key: a dry warm green-grey every colour is pulled a little toward
  kinds: {
    // People are built of many overlapping pieces (a sleeve over a cuff over a hand), so their light is gentler and mostly from above:
    // a strong diagonal on every piece reads as blotches. Skin keeps its flat tone (a face shaded per piece looks dirty).
    actor: { lit: 0.1, dk: 0.17, sat: 0.9, key: 0.05, x1: 0.32, y1: 0, x2: 0.56, y2: 1, skin: true },
    npc: { lit: 0.1, dk: 0.18, sat: 0.86, key: 0.07, x1: 0.32, y1: 0, x2: 0.56, y2: 1, skin: true },
    pet: { lit: 0.15, dk: 0.22, sat: 0.94, key: 0.04, x1: 0.1, y1: 0, x2: 0.62, y2: 1 },
    fish: { lit: 0.14, dk: 0.2, sat: 0.95, key: 0.03, x1: 0.3, y1: 0, x2: 0.5, y2: 1 },
    bug: { lit: 0.13, dk: 0.2, sat: 0.95, key: 0.03, x1: 0.1, y1: 0.05, x2: 0.8, y2: 0.95 },
  },
});
const _gfpCache = new Map();
let _gfpSkin = null;
/** The avatar kit's skin tones (and the villagers' own): a face keeps its flat tone. */
function _gfpSkinSet() {
  if (_gfpSkin) return _gfpSkin;
  _gfpSkin = new Set(['#e8b890', '#f0c8a0', '#d8a47c', '#c08860', '#8a5a3a']);
  try { if (typeof PF_SKIN !== 'undefined') for (const k of Object.keys(PF_SKIN)) _gfpSkin.add(String(PF_SKIN[k].hex).toLowerCase()); } catch (e) { /* the kit is not in this build */ }
  return _gfpSkin;
}
function _gfpRgb(c) {
  let h = String(c).trim().slice(1);
  if (h.length === 3) h = h.replace(/./g, ch => ch + ch);
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
function _gfpHex(a) { return '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
function _gfpMix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
/** A colour graded into the scenes' key: saturation eased toward its own grey, then a touch of the world's warm green-grey. */
function _gfpGrade(rgb, K) {
  const grey = rgb[0] * 0.3 + rgb[1] * 0.59 + rgb[2] * 0.11, s = _gfpMix([grey, grey, grey], rgb, K.sat);
  return _gfpMix(s, _GFP.grade, K.key);
}
/** The Painted village style is chosen (and the Phaser renderer, which is the only one that draws it). */
function gardenFigurePaintStyle() {
  try { if (typeof _gdpPrefs !== 'function') return false; const p = _gdpPrefs(); return !!p && p.artStyle === 'painted' && p.renderEngine !== 'standard'; } catch (e) { return false; }
}
function gardenFigurePaintOn() { return gardenFigurePaintStyle() && typeof _gw !== 'undefined' && !!_gw.on; }
function gardenFigureShadowSvg(rx, ry) {
  const x = Math.max(2, Number(rx) || 12), y = Math.max(1, Number(ry) || 3.4), f = v => Math.round(v * 100) / 100;
  // Wide and faint, then a small deeper core where the feet press: the scenes' shadow pass, not a grey disc.
  return `<ellipse cx="0" cy="0.8" rx="${f(x * 1.35)}" ry="${f(y * 1.45)}" fill="#34402b" fill-opacity="0.1"/><ellipse cx="0" cy="0.8" rx="${f(x)}" ry="${f(y)}" fill="#34402b" fill-opacity="0.13"/><ellipse cx="0" cy="0.6" rx="${f(x * 0.62)}" ry="${f(y * 0.6)}" fill="#2a3322" fill-opacity="0.16"/>`;
}
const _GFP_SHAPE = /^(path|rect|circle|ellipse|polygon|polyline|g|use)$/;
function _gfpAttr(attrs, name) { const m = new RegExp('(?:^|\\s)' + name + '="([^"]*)"').exec(attrs); return m ? m[1] : null; }
function _gfpSet(attrs, name, value) {
  const re = new RegExp('((?:^|\\s)' + name + '=")([^"]*)(")');
  return re.test(attrs) ? attrs.replace(re, (_, a, __, c) => a + value + c) : attrs + ' ' + name + '="' + value + '"';
}
function gardenFigurePaint(svg, kind) {
  if (!svg || typeof svg !== 'string') return svg || '';
  const K = _GFP.kinds[kind] || _GFP.kinds.actor, ck = (kind || 'actor') + '|' + svg;
  const hit = _gfpCache.get(ck); if (hit != null) return hit;
  const grads = new Map(), gk = (kind || 'actor').slice(0, 2);
  let out = '';
  try {
    out = svg.replace(/<([a-zA-Z]+)(\s[^<>]*?)?(\/?)>/g, (whole, tag, attrs, close) => {
      if (!_GFP_SHAPE.test(tag) || !attrs) return whole;
      let a = attrs;
      const fill = _gfpAttr(a, 'fill'), stroke = _gfpAttr(a, 'stroke'), op = Number(_gfpAttr(a, 'opacity') || 1), fop = Number(_gfpAttr(a, 'fill-opacity') || 1);
      const fRgb = fill && fill[0] === '#' ? _gfpRgb(fill) : null, sRgb = stroke && stroke[0] === '#' ? _gfpRgb(stroke) : null;
      let base = null;
      if (fRgb) {
        base = _gfpGrade(fRgb, K);
        if (op >= 0.95 && fop >= 0.95 && tag !== 'use' && !(K.skin && _gfpSkinSet().has(fill.toLowerCase()))) {
          const id = 'gfp' + gk + _gfpHex(base).slice(1);
          if (!grads.has(id)) {
            const lit = _gfpMix(base, _GFP.sun, K.lit), dk = _gfpMix(base, _GFP.shade, K.dk);
            grads.set(id, `<linearGradient id="${id}" gradientUnits="objectBoundingBox" x1="${K.x1}" y1="${K.y1}" x2="${K.x2}" y2="${K.y2}"><stop offset="0" stop-color="${_gfpHex(lit)}"/><stop offset="0.5" stop-color="${_gfpHex(base)}"/><stop offset="1" stop-color="${_gfpHex(dk)}"/></linearGradient>`);
          }
          a = _gfpSet(a, 'fill', `url(#${id})`);
        } else a = _gfpSet(a, 'fill', _gfpHex(base));
      }
      if (sRgb) {
        const filled = fill && fill !== 'none';
        if (filled && tag !== 'g') {
          // An ink outline round a filled shape: the shape's own deep tone, thinner and softer (the kit has none; a figure keeps a whisper of one to read at 40 px).
          const own = base || _gfpGrade(sRgb, K), w = Number(_gfpAttr(a, 'stroke-width') || 1);
          a = _gfpSet(a, 'stroke', _gfpHex(_gfpMix(own, _GFP.deep, 0.42)));
          a = _gfpSet(a, 'stroke-width', String(Math.round(w * 0.62 * 100) / 100));
          a = _gfpSet(a, 'stroke-opacity', String(Math.round(Number(_gfpAttr(a, 'stroke-opacity') || 1) * 0.72 * 100) / 100));
        } else {
          // A stroke that is part of the drawing: graded; a near-black line is lifted to a deep warm brown.
          const L = sRgb[0] * 0.3 + sRgb[1] * 0.59 + sRgb[2] * 0.11;
          a = _gfpSet(a, 'stroke', _gfpHex(L < 40 ? _gfpMix(sRgb, [58, 50, 40], 0.6) : _gfpGrade(sRgb, K)));
        }
      }
      return '<' + tag + a + close + '>';
    });
    if (grads.size) out = `<defs>${[...grads.values()].join('')}</defs>` + out;
  } catch (e) { out = svg; }
  if (_gfpCache.size > 160) _gfpCache.delete(_gfpCache.keys().next().value);
  _gfpCache.set(ck, out);
  return out;
}
/** Paint only when the garden is open in the Painted village style (a figure on a profile page or a card keeps its own drawing). */
function gardenFigurePaintIf(svg, kind) { return gardenFigurePaintOn() ? gardenFigurePaint(svg, kind) : svg; }
